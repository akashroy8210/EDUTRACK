import { useState } from 'react';
import { AppState, Subject } from '@/data/types';
import { calculateCourseAttendanceMetrics, getTodayDate } from '@/data/store';
import {
  ChartPieSlice,
  Info,
  CalendarDots,
  Clock,
  MapPin,
  ArrowRight,
} from '@phosphor-icons/react';

/**
 * Props passed into the Attendance Tracker page component.
 */
interface Props {
  /** Root application state containing schedule, subjects, and attendance history */
  state: AppState;
  /** Callback to update subject state in root application store */
  onUpdate: (subjects: Subject[]) => void;
  /** Navigation callback to switch between dashboard pages */
  onNavigate?: (page: string) => void;
  /** Callback to update attendance state */
  onUpdateAttendanceState?: (data: {
    subjects?: Subject[];
  }) => void;
}

/**
 * Visual SVG circular progress ring indicating attendance percentage.
 *
 * @param {Object} props
 * @param {number} props.percent - Attendance percentage (0 - 100)
 * @param {string} props.color - Color code for progress arc stroke
 */
function AttendanceRing({ percent, color }: { percent: number; color: string }) {
  const r = 26;
  const circ = 2 * Math.PI * r;
  const filled = (percent / 100) * circ;
  return (
    <svg width="68" height="68" viewBox="0 0 68 68">
      <circle cx="34" cy="34" r={r} fill="none" stroke="#2d3748" strokeWidth="5" />
      <circle
        cx="34"
        cy="34"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeDasharray={`${filled} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 34 34)"
      />
      <text
        x="34"
        y="38"
        textAnchor="middle"
        fontSize="12"
        fontWeight="700"
        fill={color}
        fontFamily="JetBrains Mono, monospace"
      >
        {percent}%
      </text>
    </svg>
  );
}

/**
 * Attendance Tracker Page Component.
 *
 * Displays:
 * 1. Summary banner with overall attendance and 75% threshold status.
 * 2. Per-course attendance cards showing:
 *    - Total Classes (full semester)
 *    - Conducted Till Now (excluding future classes & holidays)
 *    - Attended ('present') & Missed ('absent')
 *    - Attendance Percentage calculated on conducted classes
 *    - Classes safe to skip or needed to attend for >= 75%
 * 3. Schedule & Attendance Overview summary table at the bottom.
 *
 * Note: Attendance marking buttons ('Present'/'Absent') are strictly restricted to
 * today's classes on the Dashboard, not on this review page.
 */
export default function Attendance({ state, onNavigate }: Props) {
  // Selected course filter (optional detail drill-down)
  const [selectedCourse] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'low'>('all');
  // Real-time current date in YYYY-MM-DD format
  const today = getTodayDate();

  // Unique list of all course names derived from timetable schedule slots and registered subjects
  const uniqueCourseNames = Array.from(
    new Set([
      ...state.schedule.map(c => c.subjectName?.trim()).filter(Boolean),
      ...state.subjects.map(s => s.name?.trim()).filter(Boolean),
    ])
  );

  const courseList = uniqueCourseNames.map(courseName => {
    // Find matching subject from state.subjects if exists
    const subject = state.subjects.find(
      s => s.name.toLowerCase() === courseName.toLowerCase() ||
           s.id === state.schedule.find(c => c.subjectName?.toLowerCase() === courseName.toLowerCase())?.subjectId
    );

    // Classes scheduled for this course
    const scheduledClasses = state.schedule.filter(
      c => c.subjectName?.toLowerCase() === courseName.toLowerCase()
    );

    // Use comprehensive metrics calculated on Conducted Till Now basis
    const metrics = calculateCourseAttendanceMetrics({
      courseName,
      subject,
      scheduledClasses,
      holidays: state.holidays,
      attendanceHistory: state.attendanceHistory,
      validity: state.scheduleValidity,
      todayDate: today,
    });

    return {
      courseName,
      subjectId: subject?.id || scheduledClasses[0]?.subjectId,
      code: subject?.code || courseName.slice(0, 5).toUpperCase(),
      color: subject?.color || '#6366f1',
      totalClasses: metrics.totalClasses,
      conductedClasses: metrics.conductedClasses,
      attendedClasses: metrics.attendedClasses,
      missedClasses: metrics.missedClasses,
      percent: metrics.percent,
      needed75: metrics.needed75,
      canSkip: metrics.canSkip,
      scheduledClasses,
    };
  });

  const overallAtt = Math.round(
    courseList.reduce((acc, c) => acc + c.percent, 0) / Math.max(courseList.length, 1)
  );

  const displayedCourses = courseList.filter(c => filter === 'all' || c.percent < 75);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5" style={{ color: '#e2e8f0' }}>
            <ChartPieSlice size={26} weight="duotone" className="text-indigo-400" />
            <span>Attendance Tracker</span>
          </h1>
          <p className="text-sm mt-0.5 text-slate-400">
            Attendance percentage calculated on conducted classes • 75% threshold required
          </p>
        </div>

        <div className="rounded-xl px-4 py-2 text-right self-start sm:self-auto shadow-sm" style={{ background: '#161b22', border: '1px solid #2d3748' }}>
          <div className="text-xs text-slate-400">Average Attendance</div>
          <div
            className="text-xl font-bold font-mono"
            style={{ color: overallAtt >= 75 ? '#10b981' : '#ef4444' }}
          >
            {overallAtt}%
          </div>
        </div>
      </div>

      {/* Info notice explaining attendance marking policy */}
      <div className="rounded-xl px-4 py-3 flex items-center gap-3 shadow-xs" style={{ background: '#1c2230', border: '1px solid #2d3748' }}>
        <div className="flex-shrink-0">
          <Info size={20} weight="duotone" className="text-indigo-400" />
        </div>
        <div className="text-xs text-slate-300 leading-relaxed">
          Attendance marking is available <strong className="text-emerald-400">exclusively on your Dashboard for today's classes</strong>. Past unrecorded classes are automatically recorded as <strong className="text-rose-400">absent</strong> when a new day starts. Metrics below reflect conducted classes and safe skip allowances.
        </div>
      </div>

      {/* Segmented Filter Control */}
      {courseList.length > 0 && (
        <div className="flex rounded-xl p-1 w-full sm:max-w-xs shadow-xs" style={{ background: '#161b22', border: '1px solid #2d3748' }}>
          <button
            onClick={() => setFilter('all')}
            className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center"
            style={{
              background: filter === 'all' ? '#6366f1' : 'transparent',
              color: filter === 'all' ? '#fff' : '#94a3b8',
            }}
          >
            All Courses ({courseList.length})
          </button>
          <button
            onClick={() => setFilter('low')}
            className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center"
            style={{
              background: filter === 'low' ? '#ef4444' : 'transparent',
              color: filter === 'low' ? '#fff' : '#94a3b8',
            }}
          >
            Below 75% ({courseList.filter(c => c.percent < 75).length})
          </button>
        </div>
      )}

      {/* Empty State when no classes scheduled */}
      {courseList.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center border flex flex-col items-center justify-center space-y-4"
          style={{ background: '#161b22', borderColor: '#2d3748' }}
        >
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <CalendarDots size={30} weight="duotone" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-200">No Scheduled Classes Found</h3>
            <p className="text-xs text-slate-400 max-w-md mt-1 leading-relaxed">
              Your attendance tracker derives courses and sessions directly from your <strong>Class Schedule</strong>. Schedule your timetable classes to start tracking attendance automatically.
            </p>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('schedule')}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 flex items-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <span>Go to Class Schedule</span>
              <ArrowRight size={16} weight="bold" />
            </button>
          )}
        </div>
      ) : (
        /* Course Attendance Cards */
        <div className="grid grid-cols-1 gap-4 sm:gap-5">
          {displayedCourses.map(course => {
            const safe = course.percent >= 85;
            const moderate = course.percent >= 75 && course.percent < 85;
            const risk = course.percent < 75;
            const statusColor = safe ? '#10b981' : moderate ? '#f59e0b' : '#ef4444';
            const statusLabel = safe ? 'Safe' : moderate ? 'Moderate' : 'At Risk';
            const isExpanded = selectedCourse === course.courseName;

            return (
              <div
                key={course.courseName}
                className="rounded-2xl p-5 transition-all shadow-sm"
                style={{
                  background: '#161b22',
                  border: `1px solid ${isExpanded ? course.color : '#2d3748'}`,
                }}
              >
                {/* Course Header Bar */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <AttendanceRing percent={course.percent} color={statusColor} />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-2 py-0.5 rounded font-mono font-medium bg-white/5 text-slate-300">
                          {course.code}
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded font-semibold"
                          style={{ background: `${statusColor}18`, color: statusColor }}
                        >
                          {statusLabel}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          ({course.scheduledClasses.length} session{course.scheduledClasses.length !== 1 ? 's' : ''}/week)
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-100">{course.courseName}</h3>
                    </div>
                  </div>

                  {/* Detailed Metric Pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono w-full lg:w-auto">
                    <div className="rounded-xl bg-black/25 p-2 sm:p-2.5 text-center min-w-[70px] border border-slate-800">
                      <div className="text-[10px] sm:text-[11px] text-slate-400">Total</div>
                      <div className="font-semibold text-slate-200 text-xs sm:text-sm mt-0.5">{course.totalClasses}</div>
                    </div>
                    <div className="rounded-xl bg-black/25 p-2 sm:p-2.5 text-center min-w-[70px] border border-slate-800">
                      <div className="text-[10px] sm:text-[11px] text-slate-400">Conducted</div>
                      <div className="font-semibold text-indigo-300 text-xs sm:text-sm mt-0.5">{course.conductedClasses}</div>
                    </div>
                    <div className="rounded-xl bg-black/25 p-2 sm:p-2.5 text-center min-w-[70px] border border-slate-800">
                      <div className="text-[10px] sm:text-[11px] text-slate-400">Attended</div>
                      <div className="font-semibold text-emerald-400 text-xs sm:text-sm mt-0.5">{course.attendedClasses}</div>
                    </div>
                    <div className="rounded-xl bg-black/25 p-2 sm:p-2.5 text-center min-w-[70px] border border-slate-800">
                      <div className="text-[10px] sm:text-[11px] text-slate-400">Missed</div>
                      <div className="font-semibold text-rose-400 text-xs sm:text-sm mt-0.5">{course.missedClasses}</div>
                    </div>
                  </div>
                </div>

                {/* 75% Threshold Indicators */}
                <div className="mt-4 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-800/80">
                  <div
                    className="rounded-xl p-2.5 text-center text-xs"
                    style={{
                      background: risk ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                      border: `1px solid ${risk ? '#ef444430' : '#10b98130'}`,
                    }}
                  >
                    <span className="font-bold text-sm font-mono mr-1.5" style={{ color: risk ? '#ef4444' : '#10b981' }}>
                      {course.needed75}
                    </span>
                    <span className="text-slate-300">
                      {course.needed75 > 0 ? 'consecutive classes needed to reach 75%' : '75% threshold satisfied'}
                    </span>
                  </div>

                  <div
                    className="rounded-xl p-2.5 text-center text-xs"
                    style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid #6366f130' }}
                  >
                    <span className="font-bold text-sm font-mono text-indigo-400 mr-1.5">
                      {course.canSkip}
                    </span>
                    <span className="text-slate-300">classes you can safely miss</span>
                  </div>
                </div>

                {/* Scheduled Classes & Sessions (Informational only: No marking buttons) */}
                {course.scheduledClasses.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-800">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CalendarDots size={14} className="text-indigo-400" />
                        <span>Weekly Scheduled Sessions:</span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-normal lowercase">
                        (attendance is marked on Dashboard for today's classes)
                      </span>
                    </div>

                    <div className="space-y-2">
                      {course.scheduledClasses.map(cls => (
                        <div
                          key={cls.id}
                          className="rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                          style={{ background: '#0d1117', border: '1px solid #2d374880' }}
                        >
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                              {cls.day}
                            </span>
                            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300">
                              <Clock size={13} className="text-slate-400" />
                              <span>{cls.time}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-slate-400">
                              <MapPin size={13} className="text-slate-500" />
                              <span>{cls.room || 'LH-1'}</span>
                            </div>
                            <span className="text-[11px] px-2 py-0.5 rounded capitalize bg-slate-800 text-slate-400 border border-slate-700">
                              {cls.type || 'lecture'}
                            </span>
                          </div>

                          <div className="text-xs text-slate-400 font-mono">
                            <span className="text-slate-500 text-[11px]">Timetable slot</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Summary Table: Schedule & Attendance Overview */}
      {courseList.length > 0 && (
        <div className="rounded-xl overflow-hidden shadow-sm" style={{ background: '#161b22', border: '1px solid #2d3748' }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: '#2d3748' }}>
            <div className="text-sm font-semibold text-slate-100">Schedule & Attendance Overview</div>
            <div className="text-xs text-slate-400">75% attendance threshold</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono min-w-[640px]">
              <thead>
                <tr style={{ background: '#0d1117', color: '#64748b' }}>
                  {['Course Name', 'Code', 'Total Classes', 'Conducted', 'Attended', 'Missed', 'Attendance %', 'Need for 75%', 'Can Miss', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {courseList.map((c, i) => {
                  const statusColor = c.percent >= 85 ? '#10b981' : c.percent >= 75 ? '#f59e0b' : '#ef4444';
                  const statusLabel = c.percent >= 85 ? 'Safe' : c.percent >= 75 ? 'Moderate' : 'Critical';

                  return (
                    <tr
                      key={c.courseName}
                      style={{ background: i % 2 === 0 ? 'transparent' : '#0d111740', borderBottom: '1px solid #2d374840' }}
                    >
                      <td className="px-4 py-3 font-sans font-medium text-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
                          <span className="truncate">{c.courseName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{c.code}</td>
                      <td className="px-4 py-3 text-slate-200">{c.totalClasses}</td>
                      <td className="px-4 py-3 text-indigo-300 font-semibold">{c.conductedClasses}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-400">{c.attendedClasses}</td>
                      <td className="px-4 py-3 font-semibold text-rose-400">{c.missedClasses}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold" style={{ color: statusColor }}>{c.percent}%</span>
                      </td>
                      <td className="px-4 py-3" style={{ color: c.needed75 > 0 ? '#ef4444' : '#10b981' }}>{c.needed75}</td>
                      <td className="px-4 py-3" style={{ color: c.canSkip > 0 ? '#818cf8' : '#64748b' }}>{c.canSkip}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold" style={{ background: `${statusColor}18`, color: statusColor }}>
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
