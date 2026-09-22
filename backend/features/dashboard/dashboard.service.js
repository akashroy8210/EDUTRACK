const academicsService = require('../academics/academics.service');
const commonWorksService = require('../commonWorks/commonWorks.service');
const dailyWorksService = require('../dailyWorks/dailyWorks.service');
const goalsService = require('../goals/goals.service');
const examsService = require('../exams/exams.service');
const AttendanceRecord = require('../academics/attendance.model');
const Holiday = require('../academics/holiday.model');
const { getTodayDate, getWeekday, parseTimeInterval, addDays } = require('../../utils/dateUtils');

async function getDashboardSummary(userId) {
  const today = getTodayDate();
  const currentDayOfWeek = getWeekday(today);

  // 1. Overall Attendance Summary
  const attendanceSummary = await academicsService.getAttendanceSummary(userId);

  // 2. Schedule for today (filtering out holidays)
  const allSchedules = await academicsService.getSchedule(userId);
  const holidays = await Holiday.find({ userId, date: today });
  const isFullHoliday = holidays.some(h => h.type === 'full' || h.type === 'full-day');

  let todayClasses = [];
  if (!isFullHoliday) {
    const holidayClassIds = new Set(holidays.filter(h => h.classId).map(h => h.classId.toString()));
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const todayAttendance = await AttendanceRecord.find({ userId, date: today });
    const attendanceMap = new Map();
    todayAttendance.forEach(r => {
      if (r.classId) attendanceMap.set(r.classId.toString(), r.status);
    });

    todayClasses = allSchedules
      .filter(s => s.day === currentDayOfWeek && !holidayClassIds.has(s._id.toString()))
      .map(s => {
        let status = 'upcoming';
        if (currentMinutes > s.endMinutes) status = 'past';
        else if (currentMinutes >= s.startMinutes && currentMinutes <= s.endMinutes) status = 'ongoing';

        return {
          id: s._id,
          subjectId: s.subjectId?._id || s.subjectId,
          subjectName: s.subjectId?.name || 'Class',
          subjectCode: s.subjectId?.code || '',
          color: s.subjectId?.color || '#6366f1',
          time: s.time,
          room: s.room,
          type: s.type,
          status,
          attendanceMarked: attendanceMap.get(s._id.toString()) || null,
        };
      })
      .sort((a, b) => {
        const { startMinutes: aStart } = parseTimeInterval(a.time);
        const { startMinutes: bStart } = parseTimeInterval(b.time);
        return aStart - bStart;
      });
  }

  // 3. Habits (Common Works) Streak & Done
  const habits = await commonWorksService.getCommonWorks(userId);
  const totalHabits = habits.length;
  const doneHabitsToday = habits.filter(h => h.doneToday).length;
  const maxStreak = habits.reduce((max, h) => Math.max(max, h.streak), 0);

  // 4. Daily Works (Tasks)
  const allTasks = await dailyWorksService.getDailyWorks(userId);
  const pendingTasksCount = allTasks.filter(t => !t.completed).length;
  const highPriorityTasks = allTasks.filter(t => t.priority === 'high' && !t.completed);

  // 5. Active 1-Month Ambition
  const oneMonthGoals = await goalsService.getGoals(userId, '1-month');
  const activeAmbition = oneMonthGoals.find(g => g.status === 'active') || null;

  // 6. Upcoming Exams
  const allExams = await examsService.getExams(userId);
  const upcomingExams = allExams.filter(e => e.status === 'upcoming');

  // 7. Attendance Trend (Last 7 Days) - Single efficient query
  const startTrendDate = addDays(today, -6);
  const weekRecords = await AttendanceRecord.find({
    userId,
    date: { $gte: startTrendDate, $lte: today },
  });

  const recordsByDate = new Map();
  weekRecords.forEach(r => {
    if (!recordsByDate.has(r.date)) recordsByDate.set(r.date, []);
    recordsByDate.get(r.date).push(r);
  });

  const trendDays = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(today, -i);
    const dateObj = new Date(d);
    const dayLabel = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

    const dayRecords = recordsByDate.get(d) || [];
    const present = dayRecords.filter(r => r.status === 'present').length;
    const total = dayRecords.length;
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;

    trendDays.push({
      day: dayLabel,
      date: d,
      attended: present,
      total,
      pct,
    });
  }

  return {
    today,
    dayOfWeek: currentDayOfWeek,
    isHoliday: isFullHoliday,
    holidayLabel: holidays.find(h => h.type === 'full' || h.type === 'full-day')?.label || null,
    stats: {
      overallAttendance: attendanceSummary.overallPercentage,
      overallStatus: attendanceSummary.overallStatus,
      upcomingExamsCount: upcomingExams.length,
      habitStreak: maxStreak,
      pendingTasksCount,
      highPriorityTasksCount: highPriorityTasks.length,
      habitsDoneToday: `${doneHabitsToday}/${totalHabits}`,
    },
    todayClasses,
    attendanceTrend: trendDays,
    activeAmbition,
    highPriorityTasks,
  };
}

module.exports = {
  getDashboardSummary,
};
