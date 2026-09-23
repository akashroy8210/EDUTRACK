import { AppState, Subject, ClassSession, Holiday, AttendanceRecord, ScheduleValidity } from './types';

/**
 * Default empty state of the application.
 * All arrays and user fields are initialized to clean, empty values without mock data.
 */
export const DEFAULT_STATE: AppState = {
  // Authentication status of the current user
  isLoggedIn: false,
  // User profile information (name, roll number, email, branch, semester, section, avatar photo)
  user: {
    name: '',
    rollNo: '',
    email: '',
    branch: '',
    semester: '',
    section: '',
    photo: '',
  },
  // Academic courses registered by the student
  subjects: [],
  // Weekly recurring schedule slots (lecture, lab, tutorial)
  schedule: [],
  // Active semester / timetable interval boundaries
  scheduleValidity: {
    startDate: '',
    endDate: '',
    label: '',
  },
  // Official holidays and cancelled sessions
  holidays: [],
  // Examination schedules (mid-sem, end-sem, quizzes, assignments)
  exams: [],
  // Student reflection blog posts and notes
  blogs: [],
  // Task management items (daily and permanent)
  todos: [],
  // Habit tracking items with completion logs
  habits: [],
  // Short-term and long-term goal ambitions
  ambitions: [],
  // Historical attendance log records (present/absent)
  attendanceHistory: [],
  // Daily attendance marked on the Dashboard (keyed by classId -> 'present' | 'absent')
  todayClassAttendance: {},
  // The ISO date (YYYY-MM-DD) for which todayClassAttendance is valid
  todayClassAttendanceDate: '',
};

/**
 * Clears old legacy mock data from browser localStorage to prevent mock values
 * from conflicting with real student data.
 */
export function purgeLegacyMockData(): void {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove = [
      'studentDashboard_v2',
      'studentDashboard_v1',
      'mydashboard_state_v1',
      'studentDashboard',
    ];
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch {}
}

/**
 * Loads application state from localStorage with migration and sanitization.
 * Ensures legacy mock data and outdated hardcoded fallback dates are removed.
 *
 * @returns {AppState} The sanitized application state or DEFAULT_STATE
 */
export function loadState(): AppState {
  try {
    if (typeof window !== 'undefined') {
      // Purge legacy mock data if detected
      const legacy = localStorage.getItem('studentDashboard_v2');
      if (legacy && (legacy.includes('Arjun Sharma') || legacy.includes('21CS301042'))) {
        purgeLegacyMockData();
      }

      const raw = localStorage.getItem('mydashboard_real_state');
      if (raw) {
        const saved = JSON.parse(raw);

        // Ensure ambitions achievements array is valid
        if (saved.ambitions) {
          saved.ambitions = saved.ambitions.map((a: any) => ({
            ...a,
            achievements: Array.isArray(a.achievements) ? a.achievements : [],
          }));
        }

        // Ensure todos default priority is set
        if (saved.todos) {
          saved.todos = saved.todos.map((t: any) => ({
            ...t,
            priority: t.priority || 'medium',
          }));
        }

        // Purge any legacy hardcoded fallback dates from state to enforce real-time dates
        if (saved.scheduleValidity?.startDate === '2026-09-01') {
          saved.scheduleValidity.startDate = '';
        }
        if (saved.scheduleValidity?.endDate === '2026-11-13') {
          saved.scheduleValidity.endDate = '';
        }
        if (Array.isArray(saved.schedule)) {
          saved.schedule = saved.schedule.map((c: any) => ({
            ...c,
            startDate: c.startDate === '2026-09-01' ? '' : c.startDate,
            endDate: c.endDate === '2026-11-13' ? '' : c.endDate,
          }));
        }

        return { ...DEFAULT_STATE, ...saved };
      }
    }
  } catch {}
  return DEFAULT_STATE;
}

/**
 * Persists current application state to browser localStorage.
 *
 * @param {AppState} state - Current dashboard application state
 */
export function saveState(state: AppState): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mydashboard_real_state', JSON.stringify(state));
    }
  } catch {}
}

/**
 * Calculates current attendance percentage for a subject based on conducted classes.
 * Formula: (attendedClasses / conductedClasses) * 100
 *
 * @param {Subject} subject - Subject data object containing attended and conducted classes
 * @returns {number} Integer percentage (0 - 100), defaults to 100% when 0 classes have been conducted
 */
export function calcAttendancePercent(subject: Subject): number {
  const conducted = subject.conductedClasses !== undefined ? subject.conductedClasses : subject.totalClasses;
  if (conducted === 0) return 100;
  return Math.round((subject.attendedClasses / conducted) * 100);
}

/**
 * Calculates how many consecutive upcoming classes a student must attend to reach the 75% threshold.
 * Condition: (attended + x) / (conducted + x) >= 0.75  =>  x >= 3 * conducted - 4 * attended
 *
 * @param {Subject} subject - Subject data object
 * @returns {number} Non-negative integer count of consecutive classes needed
 */
export function calcClassesNeededFor75(subject: Subject): number {
  const conducted = subject.conductedClasses !== undefined ? subject.conductedClasses : subject.totalClasses;
  if (conducted === 0) return 0;
  const pct = Math.round((subject.attendedClasses / conducted) * 100);
  if (pct >= 75) return 0;
  return Math.max(0, 3 * conducted - 4 * subject.attendedClasses);
}

/**
 * Calculates the safety buffer of classes a student can afford to skip while keeping attendance >= 75%.
 * Formula: totalClasses - (totalClasses * 75) / 100 - absentClasses
 *
 * @param {Subject} subject - Subject data object
 * @returns {number} Non-negative integer count of classes safe to skip
 */
export function calcClassesCanSkip(subject: Subject): number {
  const total = Math.max(0, subject.totalClasses || 0);
  const missed = Math.max(0, subject.missedClasses || 0);
  const maxAllowed = Math.floor(total - (total * 75) / 100);
  return Math.max(0, maxAllowed - missed);
}

/**
 * Parses a class time interval string (e.g. "09:00 - 10:00") into minutes from midnight.
 *
 * @param {string} time - Time interval string in "HH:MM - HH:MM" format
 * @returns {{ start: number; end: number }} Start and end minutes from midnight (0 - 1439)
 */
export function parseClassTime(time: string): { start: number; end: number } {
  const parts = time.split(' - ');
  const toMin = (t: string) => {
    const [h, m] = (t || '').trim().split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  return { start: toMin(parts[0]), end: toMin(parts[1] || parts[0]) };
}

/**
 * Determines whether a scheduled class session is upcoming, ongoing, or past relative to current clock time.
 *
 * @param {string} time - Time interval string (e.g. "09:00 - 10:00")
 * @returns {'upcoming' | 'ongoing' | 'past'} Real-time session status
 */
export function getClassStatus(time: string): 'upcoming' | 'ongoing' | 'past' {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const { start, end } = parseClassTime(time);
  if (nowMin < start) return 'upcoming';
  if (nowMin >= start && nowMin < end) return 'ongoing';
  return 'past';
}

/**
 * Returns today's real-time local date formatted as YYYY-MM-DD.
 * Uses local machine calendar rather than UTC slices to respect student's local timezone.
 *
 * @returns {string} Today's date in 'YYYY-MM-DD' format
 */
export function getTodayDate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates a dynamic semester end date in real-time (default: 12 weeks from today).
 *
 * @param {number} [weeks=12] - Number of weeks to project into the future
 * @returns {string} Semester end date in 'YYYY-MM-DD' format
 */
export function getRealTimeSemesterEndDate(weeks = 12): string {
  const d = new Date();
  d.setDate(d.getDate() + weeks * 7);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Comprehensive real-time attendance calculation engine for a specific academic course.
 *
 * Evaluates:
 * 1. Total scheduled classes in semester (excluding holidays).
 * 2. Classes conducted strictly till today (excluding future weeks and holidays).
 * 3. Real-time class timing evaluation for today's classes (upcoming classes are not counted as conducted yet).
 * 4. Actual attended records count ('present').
 * 5. Actual missed records count ('absent').
 * 6. Percentage calculated on conducted basis: (attended / conducted) * 100.
 * 7. Classes safe to miss or needed to attend to maintain >= 75%.
 *
 * @param {Object} params
 * @param {string} params.courseName - Subject/course display name
 * @param {Subject} [params.subject] - Optional Subject document from state/database
 * @param {ClassSession[]} params.scheduledClasses - Array of weekly recurring sessions for this course
 * @param {Holiday[]} params.holidays - Configured full-day or class-specific holidays
 * @param {AttendanceRecord[]} params.attendanceHistory - Log of recorded attendances
 * @param {ScheduleValidity} [params.validity] - Optional semester validity bounds
 * @param {string} params.todayDate - Real-time today date (YYYY-MM-DD)
 */
export function calculateCourseAttendanceMetrics({
  courseName,
  subject,
  scheduledClasses,
  holidays,
  attendanceHistory,
  validity,
  todayDate,
}: {
  courseName: string;
  subject?: Subject;
  scheduledClasses: ClassSession[];
  holidays: Holiday[];
  attendanceHistory: AttendanceRecord[];
  validity?: ScheduleValidity;
  todayDate: string;
}) {
  // Set of class session IDs belonging to this course
  const classIdSet = new Set(scheduledClasses.map(c => c.id));

  // Filter attendance records specifically belonging to this subject or any of its class sessions
  const records = attendanceHistory.filter(
    r => (subject && r.subjectId === subject.id) || (r.classId && classIdSet.has(r.classId))
  );

  // Count verified attendances and absences from attendance records
  const attendedRecordsCount = records.filter(r => r.status === 'present').length;
  const absentRecordsCount = records.filter(r => r.status === 'absent').length;

  let totalScheduledInTerm = 0;
  let conductedDatesCount = 0;

  if (scheduledClasses.length > 0) {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    for (const session of scheduledClasses) {
      // Respect explicit session startDate and endDate dynamically
      const start = session.startDate ? session.startDate : (validity?.startDate || todayDate);
      const end = session.endDate ? session.endDate : (validity?.endDate || getRealTimeSemesterEndDate());

      const cur = new Date(start + 'T00:00:00');
      const endDateObj = new Date(end + 'T00:00:00');
      const todayObj = new Date(todayDate + 'T00:00:00');
      const { end: classEndMin } = parseClassTime(session.time);

      // Iterate through each calendar day in the scheduled interval
      while (cur <= endDateObj) {
        const dayName = cur.toLocaleDateString('en-US', { weekday: 'long' });
        if (dayName.toLowerCase() === session.day.toLowerCase()) {
          // Timezone-safe local date formatting to accurately match holiday dates
          const y = cur.getFullYear();
          const m = String(cur.getMonth() + 1).padStart(2, '0');
          const d = String(cur.getDate()).padStart(2, '0');
          const ds = `${y}-${m}-${d}`;

          const isHoliday = holidays.some(
            h => h.date === ds && (h.type === 'full-day' || (h.type as string) === 'full' || (h.type === 'class-specific' && h.classId === session.id))
          );
          if (!isHoliday) {
            totalScheduledInTerm++;
            if (cur < todayObj) {
              // Past day within active schedule interval: counted as conducted
              conductedDatesCount++;
            } else if (cur.getTime() === todayObj.getTime()) {
              // Today: count as conducted if attendance was marked (present or absent) OR if class time has got over.
              // Guaranteed never double-counted since this condition runs at most once per class session today.
              const hasMarked = records.some(r => r.date === todayDate && (!r.classId || r.classId === session.id));
              const isClassOver = classEndMin <= nowMinutes;
              if (hasMarked || isClassOver) {
                conductedDatesCount++;
              }
            }
          }
        }
        cur.setDate(cur.getDate() + 1);
      }
    }
  }

  // Derive consolidated counts
  const attendedCount = records.length > 0 ? attendedRecordsCount : (subject?.attendedClasses || 0);
  const conductedCount = scheduledClasses.length > 0
    ? Math.max(conductedDatesCount, records.length)
    : Math.max(subject?.conductedClasses || 0, records.length);
  // Total classes strictly takes scheduled classes minus holidays (or conductedCount if higher)
  const totalCount = scheduledClasses.length > 0 ? totalScheduledInTerm : Math.max(subject?.totalClasses || 0, conductedCount);
  const missedCount = Math.max(absentRecordsCount, conductedCount - attendedCount, subject?.missedClasses || 0);

  // Percentage calculated strictly on conducted classes basis
  const percent = conductedCount > 0 ? Math.round((attendedCount / conductedCount) * 100) : 100;
  // Margin of classes the student can safely skip: totalClasses - (totalClasses * 75) / 100 - absentClasses
  const maxAllowedAbsences = Math.floor(totalCount - (totalCount * 75) / 100);
  const canSkip = Math.max(0, maxAllowedAbsences - missedCount);
  // Consecutive classes the student must attend to recover back to 75%
  const needed75 = percent < 75 ? Math.max(0, 3 * conductedCount - 4 * attendedCount) : 0;

  return {
    totalClasses: totalCount,
    conductedClasses: conductedCount,
    attendedClasses: attendedCount,
    missedClasses: missedCount,
    percent,
    canSkip,
    needed75,
  };
}

/**
 * Calculates the exact total number of classes scheduled for an individual class session
 * across the recurring interval from startDate to endDate, excluding cancelled/holiday dates.
 */
export function calculateSessionTotalClasses(
  session: { day?: string; startDate?: string; endDate?: string; id?: string },
  holidays: Holiday[] = []
): number {
  if (!session.day) return 0;
  const today = getTodayDate();
  const start = session.startDate || today;
  const end = session.endDate || getRealTimeSemesterEndDate();
  const cur = new Date(start + 'T00:00:00');
  const endObj = new Date(end + 'T00:00:00');
  if (isNaN(cur.getTime()) || isNaN(endObj.getTime()) || cur > endObj) return 0;

  let count = 0;
  while (cur <= endObj) {
    const dayName = cur.toLocaleDateString('en-US', { weekday: 'long' });
    if (dayName.toLowerCase() === session.day.toLowerCase()) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      const ds = `${y}-${m}-${d}`;
      const isHoliday = holidays.some(
        h => h.date === ds && (h.type === 'full-day' || (h.type as string) === 'full' || (h.type === 'class-specific' && h.classId === session.id))
      );
      if (!isHoliday) {
        count++;
      }
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

