import { useState, useEffect } from 'react';
import { AppState } from '@/data/types';
import { calcAttendancePercent, getClassStatus, getTodayDate } from '@/data/store';
import DashboardChart from '@/components/charts/DashboardChart';
import {
  Sun,
  Moon,
  Target,
  CheckCircle,
  XCircle,
  Fire,
  Lightning,
  Flag,
  Clock,
  MapPin,
  GraduationCap,
  ChartPieSlice,
  CheckSquareOffset,
  Sparkle,
  CalendarBlank,
} from '@phosphor-icons/react';
import { motion } from 'framer-motion';

/**
 * Props passed to the main student Dashboard page.
 */
interface Props {
  /** Root application state containing timetable, subjects, habits, exams, and todos */
  state: AppState;
  /** Navigation callback to switch to another page view */
  onNavigate: (page: any) => void;
  /** Attendance marking callback: strictly allowed for today's classes at any time today */
  onMarkClassAttendance: (classId: string, status: 'present' | 'absent') => void;
  /** Toggle completion status for a todo item */
  onToggleTodo: (id: string) => void;
}

/**
 * Custom React hook that updates current date-time state every 30 seconds
 * to ensure real-time status banners and timetable progress are continuously fresh.
 *
 * @returns {Date} Current Date object
 */
function useNow(): Date {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  return now;
}

/**
 * Styling tokens and badge labels for class session progress status.
 */
const STATUS_STYLE = {
  ongoing: { bg: '#10b98118', border: '#10b98140', dot: '#10b981', label: 'Ongoing' },
  upcoming: { bg: '#6366f118', border: '#6366f140', dot: '#6366f1', label: 'Upcoming' },
  past: { bg: '#2d374840', border: '#2d3748', dot: '#475569', label: 'Done' },
};

/**
 * Primary Student Dashboard Component.
 *
 * Features:
 * 1. Real-time header with student greeting and day-of-week context.
 * 2. Today's Scheduled Classes Widget with instant Present/Absent attendance marking.
 * 3. 75% Attendance Metric summary ring and safety buffer.
 * 4. Daily Habits Streak and Quick Todo Checklist.
 * 5. Upcoming Examinations and Academic Milestone Ambitions.
 */
export default function Dashboard({ state, onNavigate, onMarkClassAttendance, onToggleTodo }: Props) {
  // Real-time current clock timestamp
  const now = useNow();
  // Today's local date string (YYYY-MM-DD)
  const today = getTodayDate();
  // Today's full day name (e.g. "Monday")
  const todayDay = now.toLocaleDateString('en', { weekday: 'long' });
  // Today's attendance marking map (resets when calendar day advances)
  const markedToday = state.todayClassAttendanceDate === today ? state.todayClassAttendance : {};

  // Scheduled classes occurring strictly today (excluding full-day and class-specific holidays)
  const todayClasses = state.schedule
    .filter(c => c.day === todayDay)
    .filter(c => !state.holidays.some(h =>
      h.date === today && (h.type === 'full-day' || (h.type === 'class-specific' && h.classId === c.id))
    ))
    .sort((a, b) => a.time.localeCompare(b.time));

  // True if today is marked as a campus-wide holiday
  const isFullDayHoliday = state.holidays.some(h => h.date === today && h.type === 'full-day');

  // Find 1-month goal or active short-term goal
  const oneMonthGoal = state.ambitions.find(a => a.status === 'active' && a.type === 'one-month')
    || state.ambitions.find(a => a.status === 'active' && a.type === 'short-term')
    || state.ambitions.find(a => a.status === 'active');

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const ds = d.toISOString().split('T')[0];
    const records = state.attendanceHistory.filter(r => r.date === ds);
    const present = records.filter(r => r.status === 'present').length;
    return {
      day: d.toLocaleDateString('en', { weekday: 'short' }),
      pct: records.length > 0 ? Math.round((present / records.length) * 100) : 0
    };
  });

  const overallAtt = Math.round(
    state.subjects.reduce((s, sub) => s + calcAttendancePercent(sub), 0) / Math.max(state.subjects.length, 1)
  );
  const greeting = now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening';

  const upcomingExams = state.exams.filter(e => e.status === 'upcoming').length;
  const pendingTodos = state.todos.filter(t => !t.completed).length;

  const streak = (() => {
    let s = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      const allDone = state.habits.length > 0 && state.habits.every(h => h.completionHistory[ds]);
      if (allDone) s++;
      else break;
    }
    return s;
  })();

  return (
    <div className="space-y-6">
      {/* 1. Header (Good morning / evening) placed at top */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="inline-flex">
              {greeting === 'evening' ? (
                <Moon size={26} weight="duotone" className="text-indigo-400" />
              ) : (
                <Sun size={26} weight="duotone" className="text-amber-400" />
              )}
            </div>
            <h1 className="text-2xl font-bold" style={{ color: '#e2e8f0' }}>
              Good {greeting}, {state.user.name.split(' ')[0]}
            </h1>
          </div>
          <p className="text-sm mt-1" style={{ color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>
            {now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            {' · '}{now.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div
            className="rounded-2xl px-4 py-2.5 flex items-center gap-3 border shadow-sm"
            style={{ background: '#161b22', borderColor: '#2d3748' }}
          >
            <div>
              <ChartPieSlice size={24} weight="duotone" className={overallAtt >= 75 ? 'text-emerald-400' : 'text-rose-400'} />
            </div>
            <div>
              <div
                className="text-xl font-bold leading-none"
                style={{
                  color: overallAtt >= 75 ? '#10b981' : '#ef4444',
                  fontFamily: 'JetBrains Mono, monospace'
                }}
              >
                {overallAtt}%
              </div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium mt-0.5">overall attendance</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Ambition banner placed below Good morning, small and compact, showing 1-month goal without progress bar/percent */}
      {oneMonthGoal && (
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => onNavigate('ambitions')}
          className="w-full text-left rounded-2xl px-4 py-3.5 transition-all shadow-sm group cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(6, 182, 212, 0.1) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(99, 102, 241, 0.2)', border: '1px solid rgba(99, 102, 241, 0.35)' }}
              >
                <Target size={20} weight="duotone" className="text-cyan-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ background: '#6366f125', color: '#a5b4fc', border: '1px solid #6366f140' }}
                  >
                    {oneMonthGoal.type === 'one-month' ? '1-Month Goal' : 'Active Goal'}
                  </span>
                  <span className="text-sm font-semibold truncate" style={{ color: '#f1f5f9' }}>
                    {oneMonthGoal.title}
                  </span>
                </div>
                {oneMonthGoal.description && (
                  <p className="text-xs mt-0.5 truncate" style={{ color: '#94a3b8' }}>
                    {oneMonthGoal.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {oneMonthGoal.achievements && oneMonthGoal.achievements.length > 0 && (
                <span
                  className="hidden sm:inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded font-medium"
                  style={{ background: '#10b98118', color: '#34d399', border: '1px solid #10b98130' }}
                >
                  <CheckCircle size={12} weight="fill" />
                  <span>{oneMonthGoal.achievements.length} logged</span>
                </span>
              )}
              <span className="text-xs font-semibold group-hover:translate-x-0.5 transition-transform" style={{ color: '#818cf8' }}>
                View →
              </span>
            </div>
          </div>
        </motion.button>
      )}

      {/* 3. Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Attendance',
            value: `${overallAtt}%`,
            sub: overallAtt >= 75 ? 'Safe threshold' : 'Requires attention',
            icon: ChartPieSlice,
            color: overallAtt >= 75 ? '#10b981' : '#ef4444',
            bg: overallAtt >= 75 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: overallAtt >= 75 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)',
            page: 'attendance',
          },
          {
            label: 'Upcoming Exams',
            value: upcomingExams,
            sub: 'Assessments scheduled',
            icon: GraduationCap,
            color: '#f59e0b',
            bg: 'rgba(245, 158, 11, 0.12)',
            border: 'rgba(245, 158, 11, 0.25)',
            page: 'exams',
          },
          {
            label: 'Habit Streak',
            value: `${streak} Days`,
            sub: 'Consistent discipline',
            icon: Fire,
            color: '#ec4899',
            bg: 'rgba(236, 72, 153, 0.12)',
            border: 'rgba(236, 72, 153, 0.25)',
            page: 'habits',
          },
          {
            label: 'Pending Tasks',
            value: pendingTodos,
            sub: 'Daily work items',
            icon: CheckSquareOffset,
            color: '#6366f1',
            bg: 'rgba(99, 102, 241, 0.12)',
            border: 'rgba(99, 102, 241, 0.25)',
            page: 'todo',
          },
        ].map(item => {
          const Icon = item.icon;
          return (
            <motion.button
              key={item.label}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate(item.page)}
              className="rounded-2xl p-4 text-left transition-all cursor-pointer shadow-sm"
              style={{ background: '#161b22', border: '1px solid #2d3748' }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400 font-medium">{item.label}</span>
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: item.bg, border: `1px solid ${item.border}`, color: item.color }}
                >
                  <Icon size={18} weight="duotone" />
                </div>
              </div>
              <div className="text-xl font-bold font-mono" style={{ color: item.color }}>
                {item.value}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 truncate">{item.sub}</div>
            </motion.button>
          );
        })}
      </div>

      {/* 4. Today's Classes Hero */}
      <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: '#161b22', border: '1px solid #2d3748' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ background: '#1c2230', borderBottom: '1px solid #2d3748' }}>
          <div className="flex items-center gap-2">
            <div className="inline-flex">
              <CalendarBlank size={18} weight="duotone" className="text-indigo-400" />
            </div>
            <span className="text-sm font-semibold text-slate-100">Today's Classes — {todayDay}</span>
          </div>
          <div className="flex items-center gap-3">
            {isFullDayHoliday && (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full" style={{ background: '#f59e0b18', color: '#f59e0b', border: '1px solid #f59e0b30' }}>
                <Sun size={13} weight="fill" />
                <span>Holiday</span>
              </span>
            )}
            <span className="text-xs text-slate-400 font-mono">
              {now.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {isFullDayHoliday ? (
          <div className="px-6 py-10 text-center text-slate-400 space-y-2">
            <div
              className="inline-flex p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20"
            >
              <Sun size={32} weight="duotone" />
            </div>
            <div className="text-sm font-semibold text-slate-200">Scheduled Holiday Today!</div>
            <div className="text-xs text-slate-400">Enjoy your break. No attendance required.</div>
          </div>
        ) : todayClasses.length === 0 ? (
          <div className="px-6 py-10 text-center text-slate-400 space-y-2">
            <div
              className="inline-flex p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
            >
              <Sparkle size={32} weight="duotone" />
            </div>
            <div className="text-sm font-semibold text-slate-200">No scheduled classes for {todayDay}</div>
            <div className="text-xs text-slate-400">Catch up on personal projects or review lecture notes!</div>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/40">
            {todayClasses.map(cls => {
              const status = getClassStatus(cls.time);
              const marked = markedToday[cls.id];
              const subject = state.subjects.find(s => s.id === cls.subjectId);
              const style = STATUS_STYLE[status];
              return (
                <div
                  key={cls.id}
                  className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-colors hover:bg-slate-800/20"
                  style={{
                    background: status === 'ongoing' ? '#10b98108' : 'transparent',
                  }}
                >
                  <div className="flex-shrink-0 w-36 sm:w-40 min-w-fit">
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg font-mono inline-flex items-center gap-1.5 whitespace-nowrap shadow-xs"
                      style={{ color: style.dot, background: style.bg, border: `1px solid ${style.border}` }}
                    >
                      <Clock size={12} className="flex-shrink-0" />
                      <span className="whitespace-nowrap tracking-tight">{cls.time}</span>
                    </span>
                  </div>

                  <div className="hidden sm:block w-1.5 h-10 rounded-full flex-shrink-0" style={{ background: subject?.color || '#6366f1', opacity: status === 'past' ? 0.3 : 1 }} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[11px] px-1.5 py-0.5 rounded font-medium" style={{ background: style.bg, color: style.dot, border: `1px solid ${style.border}` }}>
                        {style.label}
                      </span>
                      <span className="text-xs capitalize text-slate-400">{cls.type}</span>
                    </div>
                    <div className="text-sm font-semibold truncate text-slate-100">
                      {cls.subjectName}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-1 font-mono mt-0.5">
                      <MapPin size={12} className="text-slate-500" />
                      <span>{cls.room}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-shrink-0 self-start sm:self-auto">
                    {marked ? (
                      <span
                        className="text-xs px-3.5 py-1.5 rounded-xl font-semibold inline-flex items-center gap-1.5"
                        style={{
                          background: marked === 'present' ? '#10b98118' : '#ef444418',
                          color: marked === 'present' ? '#10b981' : '#ef4444',
                          border: `1px solid ${marked === 'present' ? '#10b98140' : '#ef444440'}`,
                        }}
                      >
                        {marked === 'present' ? <CheckCircle size={14} weight="bold" /> : <XCircle size={14} weight="bold" />}
                        <span>{marked === 'present' ? 'Present' : 'Absent'}</span>
                      </span>
                    ) : (
                      <>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => onMarkClassAttendance(cls.id, 'present')}
                          className="text-xs px-3.5 py-1.5 rounded-xl font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                          style={{ background: '#10b98118', color: '#10b981', border: '1px solid #10b98140' }}
                          title="Mark Present for today's class"
                        >
                          <CheckCircle size={14} weight="bold" />
                          <span>Present</span>
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => onMarkClassAttendance(cls.id, 'absent')}
                          className="text-xs px-3.5 py-1.5 rounded-xl font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                          style={{ background: '#ef444418', color: '#ef4444', border: '1px solid #ef444440' }}
                          title="Mark Absent for today's class"
                        >
                          <XCircle size={14} weight="bold" />
                          <span>Absent</span>
                        </motion.button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. 7-Day Attendance Trend with Increased Height */}
      <div className="rounded-2xl p-6 shadow-sm" style={{ background: '#161b22', border: '1px solid #2d3748' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-base font-semibold text-slate-100">7-Day Attendance Trend</div>
            <div className="text-xs mt-0.5 text-slate-400">Daily attendance rate across your registered courses</div>
          </div>
          <button onClick={() => onNavigate('attendance')} className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer">
            Full Analytics →
          </button>
        </div>
        <DashboardChart data={last7} />
      </div>

      {/* 6. Daily tasks sorted by Priority with Animated Icons */}
      <div className="rounded-2xl p-6 shadow-sm" style={{ background: '#161b22', border: '1px solid #2d3748' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-100">Today's Priority Tasks</span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              {state.todos.filter(t => t.type === 'daily' && !t.completed).length} pending
            </span>
          </div>
          <button onClick={() => onNavigate('todo')} className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer">
            View All Tasks →
          </button>
        </div>

        {state.todos.filter(t => t.type === 'daily').length === 0 ? (
          <div className="text-sm text-center py-6 text-slate-500">No daily tasks scheduled for today.</div>
        ) : (
          <div className="space-y-2.5">
            {state.todos
              .filter(t => t.type === 'daily')
              .sort((a, b) => {
                if (a.completed !== b.completed) return a.completed ? 1 : -1;
                const po: Record<string, number> = { high: 0, medium: 1, low: 2 };
                return (po[a.priority || 'medium'] ?? 1) - (po[b.priority || 'medium'] ?? 1);
              })
              .map(t => {
                const p = t.priority || 'medium';
                const pColor = p === 'high' ? '#ef4444' : p === 'medium' ? '#f59e0b' : '#10b981';
                const pBg = p === 'high' ? '#ef444415' : p === 'medium' ? '#f59e0b15' : '#10b98115';
                const pBorder = p === 'high' ? '#ef444430' : p === 'medium' ? '#f59e0b30' : '#10b98130';

                return (
                  <motion.button
                    key={t.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => onToggleTodo(t.id)}
                    className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all hover:bg-slate-800/40 cursor-pointer"
                    style={{ background: '#0d111750', border: '1px solid #2d3748' }}
                  >
                    <div
                      className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all"
                      style={{ background: t.completed ? '#6366f1' : 'transparent', borderColor: t.completed ? '#6366f1' : '#4b5563' }}
                    >
                      {t.completed && <CheckCircle size={14} weight="fill" className="text-white" />}
                    </div>

                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0 inline-flex items-center gap-1"
                      style={{ background: pBg, color: pColor, border: `1px solid ${pBorder}` }}
                    >
                      {p === 'high' ? (
                        <Fire size={12} weight="fill" className="text-rose-400" />
                      ) : p === 'medium' ? (
                        <Lightning size={12} weight="fill" className="text-amber-400" />
                      ) : (
                        <Flag size={12} weight="fill" className="text-emerald-400" />
                      )}
                      <span>{p.toUpperCase()}</span>
                    </span>

                    <span className="text-xs sm:text-sm flex-1 truncate" style={{ color: t.completed ? '#475569' : '#e2e8f0', textDecoration: t.completed ? 'line-through' : 'none' }}>
                      {t.text}
                    </span>
                  </motion.button>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
