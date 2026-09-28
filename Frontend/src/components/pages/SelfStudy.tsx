import { useState, useEffect, useMemo, useRef } from 'react';
import { AppState, SelfStudySession, StudySummary } from '@/data/types';
import { selfStudyApi } from '@/api/client';
import { toast } from 'sonner';
import {
  Timer,
  Play,
  Pause,
  Stop,
  Plus,
  Calendar,
  Clock,
  CheckCircle,
  Hourglass,
  Trash,
  PencilSimple,
  BookOpen,
  ArrowsClockwise,
  Check,
  X,
  TrendUp,
  Fire,
  CalendarCheck,
  CircleNotch,
  ListNumbers,
  Target,
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  state: AppState;
}

const PRESET_TIMERS = [
  { label: 'Pomodoro', minutes: 25, desc: 'Classic focus interval' },
  { label: 'Deep Focus', minutes: 45, desc: 'Ideal for complex problem solving' },
  { label: 'Power Hour', minutes: 60, desc: 'High intensity uninterrupted sprint' },
  { label: 'Quick Sprint', minutes: 15, desc: 'Rapid revision or quiz prep' },
];

const STATUS_CONFIG = {
  upcoming: {
    label: 'Upcoming',
    color: '#60a5fa',
    bg: 'rgba(96, 165, 250, 0.12)',
    border: 'rgba(96, 165, 250, 0.25)',
  },
  'in-progress': {
    label: 'In Progress',
    color: '#fbbf24',
    bg: 'rgba(251, 191, 36, 0.12)',
    border: 'rgba(251, 191, 36, 0.25)',
  },
  completed: {
    label: 'Completed',
    color: '#34d399',
    bg: 'rgba(52, 211, 153, 0.12)',
    border: 'rgba(52, 211, 153, 0.25)',
  },
  missed: {
    label: 'Missed',
    color: '#f87171',
    bg: 'rgba(248, 113, 113, 0.12)',
    border: 'rgba(248, 113, 113, 0.25)',
  },
};

export default function SelfStudy({ state }: Props) {
  // Today's date string YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [sessions, setSessions] = useState<SelfStudySession[]>([]);
  const [summary, setSummary] = useState<StudySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<SelfStudySession | null>(null);

  // Form states for Add/Edit
  const [formSubjectId, setFormSubjectId] = useState<string>('');
  const [formActivity, setFormActivity] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(todayStr);
  const [formStartTime, setFormStartTime] = useState<string>('09:00');
  const [formEndTime, setFormEndTime] = useState<string>('10:00');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formStatus, setFormStatus] = useState<'upcoming' | 'in-progress' | 'completed' | 'missed'>('upcoming');
  const [formColor, setFormColor] = useState<string>('#6366f1');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Active Timer State ---
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [targetDurationMinutes, setTargetDurationMinutes] = useState<number>(25);
  const [timerMode, setTimerMode] = useState<'countdown' | 'stopwatch'>('countdown');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch all sessions and summary analytics
  const fetchData = async () => {
    try {
      const [sessionsRes, summaryRes] = await Promise.allSettled([
        selfStudyApi.getSessions(),
        selfStudyApi.getSummary(),
      ]);

      if (sessionsRes.status === 'fulfilled' && sessionsRes.value?.sessions) {
        setSessions(sessionsRes.value.sessions);
      }
      if (summaryRes.status === 'fulfilled' && summaryRes.value) {
        setSummary(summaryRes.value);
      }
    } catch (err) {
      console.error('Failed to load self study data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Timer Tick Effect
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setSecondsElapsed(prev => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  // Format seconds into MM:SS or HH:MM:SS
  const formatTimerDisplay = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Timer Actions
  const handleStartTimer = (session?: SelfStudySession) => {
    if (session) {
      setActiveSessionId(session.id);
      setTargetDurationMinutes(session.plannedMinutes || 30);
      setSecondsElapsed((session.actualMinutes || 0) * 60);
      // Auto switch status to in-progress if upcoming
      if (session.status === 'upcoming') {
        selfStudyApi.update(session.id, { status: 'in-progress' }).catch(() => {});
        setSessions(prev =>
          prev.map(s => (s.id === session.id ? { ...s, status: 'in-progress' } : s))
        );
      }
    }
    setTimerRunning(true);
    toast.success('Study timer running! Stay focused.');
  };

  const handlePauseTimer = () => {
    setTimerRunning(false);
    toast.info('Study timer paused.');
  };

  const handleResumeTimer = () => {
    setTimerRunning(true);
    toast.success('Timer resumed.');
  };

  const handleFinishTimer = async () => {
    setTimerRunning(false);
    const elapsedMinutes = Math.max(1, Math.round(secondsElapsed / 60));

    if (activeSessionId) {
      try {
        const res = await selfStudyApi.logTimer(activeSessionId, {
          actualMinutes: elapsedMinutes,
          status: 'completed',
        });
        if (res?.session) {
          setSessions(prev =>
            prev.map(s => (s.id === activeSessionId ? res.session : s))
          );
        }
        toast.success(`Session completed! 🎉 Logged ${elapsedMinutes} mins of deep study.`);
        fetchData();
      } catch (err: any) {
        toast.error(err.message || 'Failed to save completed session');
      }
    } else {
      toast.success(`Free focus session ended: ${elapsedMinutes} mins completed!`);
    }

    setActiveSessionId(null);
    setSecondsElapsed(0);
  };

  const handleApplyPreset = (minutes: number, label: string) => {
    setTargetDurationMinutes(minutes);
    setSecondsElapsed(0);
    setTimerMode('countdown');
    setActiveSessionId(null);
    setTimerRunning(true);
    toast.success(`Started ${label} (${minutes} mins)`);
  };

  // Open Add Session Modal
  const handleOpenAddModal = (dateStr?: string) => {
    setEditingSession(null);
    setFormSubjectId(state.subjects[0]?.id || '');
    setFormActivity('Algorithm Practice & Revision');
    setFormDate(dateStr || selectedDate);
    setFormStartTime('09:00');
    setFormEndTime('10:00');
    setFormNotes('');
    setFormStatus('upcoming');
    setFormColor('#6366f1');
    setModalOpen(true);
  };

  // Open Edit Session Modal
  const handleOpenEditModal = (session: SelfStudySession) => {
    setEditingSession(session);
    setFormSubjectId(session.subjectId || '');
    setFormActivity(session.activity);
    setFormDate(session.date);
    setFormStartTime(session.startTime);
    setFormEndTime(session.endTime);
    setFormNotes(session.notes || '');
    setFormStatus(session.status);
    setFormColor(session.color || '#6366f1');
    setModalOpen(true);
  };

  // Submit Add or Edit
  const handleSubmitSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formActivity.trim()) {
      toast.error('Please enter an activity name');
      return;
    }

    const matchedSubject = state.subjects.find(s => s.id === formSubjectId);
    const payload = {
      subjectId: formSubjectId || undefined,
      subjectName: matchedSubject ? matchedSubject.name : (formSubjectId ? 'Subject' : 'General Study'),
      activity: formActivity.trim(),
      date: formDate,
      startTime: formStartTime,
      endTime: formEndTime,
      notes: formNotes.trim(),
      color: formColor,
      status: formStatus,
    };

    setIsSubmitting(true);
    try {
      if (editingSession) {
        const res = await selfStudyApi.update(editingSession.id, payload);
        if (res?.session) {
          setSessions(prev =>
            prev.map(s => (s.id === editingSession.id ? res.session : s))
          );
        }
        toast.success('Study session updated successfully');
      } else {
        const res = await selfStudyApi.create(payload);
        if (res?.session) {
          setSessions(prev => [res.session, ...prev]);
        }
        toast.success('New study session scheduled!');
      }
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save session');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Session
  const handleDeleteSession = async (id: string) => {
    if (!confirm('Are you sure you want to delete this study session?')) return;
    try {
      await selfStudyApi.delete(id);
      setSessions(prev => prev.filter(s => s.id !== id));
      if (activeSessionId === id) {
        setTimerRunning(false);
        setActiveSessionId(null);
        setSecondsElapsed(0);
      }
      toast.success('Study session removed');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete session');
    }
  };

  // Toggle quick status
  const handleQuickStatusChange = async (session: SelfStudySession, newStatus: 'upcoming' | 'in-progress' | 'completed' | 'missed') => {
    try {
      const res = await selfStudyApi.update(session.id, { status: newStatus });
      if (res?.session) {
        setSessions(prev => prev.map(s => (s.id === session.id ? res.session : s)));
      }
      toast.success(`Session status marked as ${newStatus}`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  // Filtered sessions for selected date
  const filteredSessions = useMemo(() => {
    return sessions
      .filter(s => s.date === selectedDate)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [sessions, selectedDate]);

  // Current session & Next session for today
  const { currentSession, nextSession } = useMemo(() => {
    const now = new Date();
    const currentHM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const todaySessions = sessions
      .filter(s => s.date === todayStr)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    let current = todaySessions.find(
      s => s.startTime <= currentHM && s.endTime >= currentHM && s.status !== 'completed'
    );
    // If user has an active timer session running, that takes priority as current
    if (activeSessionId) {
      const activeMatch = sessions.find(s => s.id === activeSessionId);
      if (activeMatch) current = activeMatch;
    }

    const upcoming = todaySessions.filter(
      s => s.startTime > currentHM && s.status === 'upcoming'
    );
    const next = upcoming.length > 0 ? upcoming[0] : null;

    return { currentSession: current || null, nextSession: next };
  }, [sessions, todayStr, activeSessionId]);

  // Calculations for Planned vs Actual vs Remaining for selected date
  const dateMetrics = useMemo(() => {
    const planned = filteredSessions.reduce((acc, s) => acc + (s.plannedMinutes || 0), 0);
    const actual = filteredSessions.reduce((acc, s) => acc + (s.actualMinutes || 0), 0);
    const remaining = Math.max(0, planned - actual);
    const completedCount = filteredSessions.filter(s => s.status === 'completed').length;
    return { planned, actual, remaining, completedCount, totalCount: filteredSessions.length };
  }, [filteredSessions]);

  // Timer Progress Calculation
  const timerRemainingSec = useMemo(() => {
    if (timerMode === 'countdown') {
      const targetSec = targetDurationMinutes * 60;
      return Math.max(0, targetSec - secondsElapsed);
    }
    return secondsElapsed;
  }, [timerMode, targetDurationMinutes, secondsElapsed]);

  const timerPercent = useMemo(() => {
    const targetSec = targetDurationMinutes * 60;
    if (targetSec <= 0) return 0;
    return Math.min(100, Math.round((secondsElapsed / targetSec) * 100));
  }, [secondsElapsed, targetDurationMinutes]);

  const activeSession = useMemo(() => {
    return sessions.find(s => s.id === activeSessionId);
  }, [sessions, activeSessionId]);

  return (
    <div className="space-y-6 select-none">
      {/* Header Banner */}
      <div
        className="rounded-3xl p-6 sm:p-8 border shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6"
        style={{
          background: 'linear-gradient(135deg, #131722 0%, #1e1b4b 60%, #0f172a 100%)',
          borderColor: 'rgba(99, 102, 241, 0.25)',
        }}
      >
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <BookOpen size={14} weight="bold" />
            <span>Productive Self Study & Timetable</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            Self Study Focus Lab
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            Plan your daily study timetable, track real-time focus sessions with active study timers,
            and balance planned vs actual duration effortlessly.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 z-10">
          <button
            onClick={() => handleOpenAddModal()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02]"
          >
            <Plus size={16} weight="bold" />
            <span>Add Study Session</span>
          </button>
          <button
            onClick={() => {
              setIsRefreshing(true);
              fetchData();
            }}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 cursor-pointer transition-all"
            title="Refresh Data"
          >
            <ArrowsClockwise size={18} className={isRefreshing ? 'animate-spin text-indigo-400' : ''} />
          </button>
        </div>
      </div>

      {/* --- Live Interactive Study Timer Card --- */}
      <div
        className="rounded-3xl p-6 border shadow-2xl relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #161b22 0%, #0d1117 100%)',
          borderColor: timerRunning ? 'rgba(99, 102, 241, 0.45)' : '#2d3748',
        }}
      >
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* Left Column: Timer details and Presets */}
          <div className="space-y-4 w-full lg:w-1/2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shadow-inner"
                  style={{
                    background: timerRunning ? 'rgba(99, 102, 241, 0.25)' : 'rgba(148, 163, 184, 0.1)',
                    color: timerRunning ? '#818cf8' : '#94a3b8',
                  }}
                >
                  <Timer size={22} weight={timerRunning ? 'fill' : 'regular'} className={timerRunning ? 'animate-pulse' : ''} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Study Focus Timer
                    {timerRunning && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shadow-[0_0_8px_#34d399] animate-ping" />
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {activeSession ? (
                      <span className="text-indigo-300 font-medium">Session: {activeSession.activity} ({activeSession.subjectName})</span>
                    ) : (
                      'Standalone Quick Study Interval'
                    )}
                  </p>
                </div>
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
                <button
                  onClick={() => setTimerMode('countdown')}
                  className={`px-3 py-1 rounded-lg transition-all font-medium cursor-pointer ${
                    timerMode === 'countdown' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Countdown
                </button>
                <button
                  onClick={() => setTimerMode('stopwatch')}
                  className={`px-3 py-1 rounded-lg transition-all font-medium cursor-pointer ${
                    timerMode === 'stopwatch' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Stopwatch
                </button>
              </div>
            </div>

            {/* Quick Timer Presets */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Quick Focus Presets
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PRESET_TIMERS.map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => handleApplyPreset(preset.minutes, preset.label)}
                    className="p-2.5 rounded-xl border text-left cursor-pointer transition-all hover:border-indigo-500/50 hover:bg-indigo-500/5 group"
                    style={{
                      background: targetDurationMinutes === preset.minutes ? 'rgba(99, 102, 241, 0.12)' : '#12161f',
                      borderColor: targetDurationMinutes === preset.minutes ? 'rgba(99, 102, 241, 0.35)' : '#2d3748',
                    }}
                  >
                    <div className="text-xs font-bold text-white group-hover:text-indigo-300">
                      {preset.label}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      {preset.minutes}m
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Timer Display and Controls */}
          <div className="flex flex-col items-center justify-center w-full lg:w-1/2 p-4 bg-slate-900/60 rounded-2xl border border-slate-800">
            {/* Display Clock */}
            <div className="text-center space-y-1">
              <div
                className="text-5xl sm:text-6xl font-extrabold tracking-tight text-white font-mono"
                style={{ textShadow: timerRunning ? '0 0 20px rgba(99, 102, 241, 0.4)' : 'none' }}
              >
                {timerMode === 'countdown' ? formatTimerDisplay(timerRemainingSec) : formatTimerDisplay(secondsElapsed)}
              </div>
              <div className="text-xs text-slate-400 font-mono">
                {timerMode === 'countdown' ? (
                  <span>Target: {targetDurationMinutes} mins ({timerPercent}% elapsed)</span>
                ) : (
                  <span>Elapsed Focus: {Math.floor(secondsElapsed / 60)}m {secondsElapsed % 60}s</span>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full max-w-xs h-2 bg-slate-800 rounded-full mt-4 overflow-hidden border border-slate-700/50">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400"
                initial={{ width: 0 }}
                animate={{ width: `${timerPercent}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>

            {/* Timer Buttons */}
            <div className="flex items-center gap-3 mt-6">
              {!timerRunning ? (
                <button
                  onClick={() => (secondsElapsed > 0 ? handleResumeTimer() : handleStartTimer())}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-lg shadow-emerald-600/30 transition-all hover:scale-105"
                >
                  <Play size={18} weight="fill" />
                  <span>{secondsElapsed > 0 ? 'Resume Timer' : 'Start Focus'}</span>
                </button>
              ) : (
                <button
                  onClick={handlePauseTimer}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-amber-600 hover:bg-amber-500 text-white cursor-pointer shadow-lg shadow-amber-600/30 transition-all hover:scale-105"
                >
                  <Pause size={18} weight="fill" />
                  <span>Pause Timer</span>
                </button>
              )}

              <button
                onClick={handleFinishTimer}
                disabled={secondsElapsed === 0}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm border transition-all cursor-pointer ${
                  secondsElapsed > 0
                    ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30 hover:scale-105'
                    : 'bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed'
                }`}
              >
                <Stop size={18} weight="fill" />
                <span>Finish & Log</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- Current & Next Session Live Indicator Bar --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Current Study Session */}
        <div
          className="rounded-2xl p-5 border relative overflow-hidden"
          style={{
            background: currentSession ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, #161b22 100%)' : '#161b22',
            borderColor: currentSession ? 'rgba(99, 102, 241, 0.4)' : '#2d3748',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping inline-block" />
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Current Study Session</span>
            </div>
            {currentSession && (
              <span
                className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider"
                style={{
                  background: STATUS_CONFIG[currentSession.status].bg,
                  color: STATUS_CONFIG[currentSession.status].color,
                  border: `1px solid ${STATUS_CONFIG[currentSession.status].border}`,
                }}
              >
                {STATUS_CONFIG[currentSession.status].label}
              </span>
            )}
          </div>

          {currentSession ? (
            <div className="mt-3 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-base font-extrabold text-white">{currentSession.activity}</h4>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <span className="font-semibold text-indigo-300">{currentSession.subjectName}</span>
                  <span>•</span>
                  <span className="font-mono text-slate-400">{currentSession.startTime} - {currentSession.endTime}</span>
                  <span>•</span>
                  <span className="font-mono text-slate-400">{currentSession.plannedMinutes} mins</span>
                </div>
              </div>
              {activeSessionId !== currentSession.id ? (
                <button
                  onClick={() => handleStartTimer(currentSession)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer transition-all shadow"
                >
                  Start Timer
                </button>
              ) : (
                <div className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Active in Timer
                </div>
              )}
            </div>
          ) : (
            <div className="mt-3 text-xs text-slate-400">
              No session currently running right now. Pick a scheduled session or run a quick focus interval!
            </div>
          )}
        </div>

        {/* Next Upcoming Session */}
        <div
          className="rounded-2xl p-5 border relative overflow-hidden"
          style={{ background: '#161b22', borderColor: '#2d3748' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarCheck size={16} className="text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Next Upcoming Session</span>
            </div>
            {nextSession && (
              <span className="text-[11px] font-mono text-slate-400">Today at {nextSession.startTime}</span>
            )}
          </div>

          {nextSession ? (
            <div className="mt-3 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-base font-extrabold text-white">{nextSession.activity}</h4>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <span className="font-semibold text-amber-300">{nextSession.subjectName}</span>
                  <span>•</span>
                  <span className="font-mono text-slate-400">{nextSession.startTime} - {nextSession.endTime}</span>
                  <span>•</span>
                  <span className="font-mono text-slate-400">{nextSession.plannedMinutes} mins planned</span>
                </div>
              </div>
              <button
                onClick={() => handleStartTimer(nextSession)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer transition-all"
              >
                Start Early
              </button>
            </div>
          ) : (
            <div className="mt-3 text-xs text-slate-400">
              All scheduled sessions for today are completed or no more sessions upcoming today!
            </div>
          )}
        </div>
      </div>

      {/* --- Daily Study Summary Stats Grid --- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="rounded-2xl p-4 border" style={{ background: '#161b22', borderColor: '#2d3748' }}>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Planned Study</span>
            <Clock size={16} className="text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {Math.floor(dateMetrics.planned / 60)}h {dateMetrics.planned % 60}m
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Total target for {selectedDate === todayStr ? 'today' : selectedDate}
          </div>
        </div>

        <div className="rounded-2xl p-4 border" style={{ background: '#161b22', borderColor: '#2d3748' }}>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Actual Study</span>
            <Fire size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {Math.floor(dateMetrics.actual / 60)}h {dateMetrics.actual % 60}m
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Logged focus duration
          </div>
        </div>

        <div className="rounded-2xl p-4 border" style={{ background: '#161b22', borderColor: '#2d3748' }}>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Remaining Study</span>
            <Hourglass size={16} className="text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">
            {Math.floor(dateMetrics.remaining / 60)}h {dateMetrics.remaining % 60}m
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Planned balance pending
          </div>
        </div>

        <div className="rounded-2xl p-4 border" style={{ background: '#161b22', borderColor: '#2d3748' }}>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Completed Sessions</span>
            <CheckCircle size={16} className="text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {dateMetrics.completedCount} / {dateMetrics.totalCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {dateMetrics.totalCount > 0
              ? `${Math.round((dateMetrics.completedCount / dateMetrics.totalCount) * 100)}% completion rate`
              : 'No sessions scheduled'}
          </div>
        </div>
      </div>

      {/* --- Weekly Study Overview Bar Chart --- */}
      {summary?.weeklyTrend && (
        <div
          className="rounded-3xl p-6 border shadow-xl"
          style={{ background: '#161b22', borderColor: '#2d3748' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendUp size={20} className="text-indigo-400" />
                <span>Weekly Study Overview (Past 7 Days)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Compare your planned study hours vs actual logged hours per day
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-indigo-500/40 border border-indigo-400" />
                <span className="text-slate-300">Planned Hours</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="text-slate-300">Actual Hours</span>
              </div>
            </div>
          </div>

          {/* Bar Chart Visualization */}
          <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end pt-8 pb-2 border-b border-slate-800 h-52">
            {summary.weeklyTrend.map(item => {
              const maxHours = Math.max(
                4,
                ...summary.weeklyTrend.map(t => Math.max(t.plannedHours, t.actualHours))
              );
              const plannedHeightPercent = Math.min(100, Math.round((item.plannedHours / maxHours) * 100));
              const actualHeightPercent = Math.min(100, Math.round((item.actualHours / maxHours) * 100));
              const isToday = item.date === todayStr;

              return (
                <div key={item.date} className="flex flex-col items-center h-full justify-end group">
                  <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-36">
                    {/* Planned Bar */}
                    <div
                      className="w-1/2 rounded-t-md transition-all group-hover:brightness-125"
                      style={{
                        height: `${Math.max(6, plannedHeightPercent)}%`,
                        background: 'rgba(99, 102, 241, 0.35)',
                        border: '1px dashed rgba(99, 102, 241, 0.7)',
                      }}
                      title={`Planned: ${item.plannedHours}h`}
                    />
                    {/* Actual Bar */}
                    <div
                      className="w-1/2 rounded-t-md transition-all group-hover:brightness-125 shadow-md"
                      style={{
                        height: `${Math.max(6, actualHeightPercent)}%`,
                        background: 'linear-gradient(180deg, #10b981 0%, #059669 100%)',
                      }}
                      title={`Actual: ${item.actualHours}h`}
                    />
                  </div>
                  {/* Day Label */}
                  <div className="mt-2 text-center">
                    <div className={`text-[11px] font-bold ${isToday ? 'text-indigo-400' : 'text-slate-300'}`}>
                      {item.day}
                    </div>
                    <div className="text-[9px] font-mono text-slate-500">
                      {item.actualHours}h / {item.plannedHours}h
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- Daily Study Timetable & Session List --- */}
      <div
        className="rounded-3xl p-6 border shadow-xl space-y-6"
        style={{ background: '#161b22', borderColor: '#2d3748' }}
      >
        {/* Timetable Header with Date Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar size={20} className="text-indigo-400" />
              <span>Daily Study Timetable</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Scheduled study periods and subject activities for {selectedDate === todayStr ? 'today' : selectedDate}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500 cursor-pointer"
            />
            {selectedDate !== todayStr && (
              <button
                onClick={() => setSelectedDate(todayStr)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30 cursor-pointer transition-all"
              >
                Today
              </button>
            )}
          </div>
        </div>

        {/* Timetable Sessions List */}
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
            <CircleNotch size={28} className="animate-spin text-indigo-400" />
            <span className="text-xs font-mono">Loading study schedule...</span>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
              <CalendarCheck size={24} />
            </div>
            <div className="text-sm font-bold text-slate-200">No Study Sessions Scheduled</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              You have no self-study blocks scheduled for this date. Create one to keep your academic goals on track!
            </p>
            <button
              onClick={() => handleOpenAddModal(selectedDate)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow transition-all"
            >
              <Plus size={15} weight="bold" />
              <span>Schedule Session</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSessions.map(session => {
              const statusCfg = STATUS_CONFIG[session.status];
              const isCurrent = currentSession?.id === session.id;
              const isActiveInTimer = activeSessionId === session.id;

              return (
                <div
                  key={session.id}
                  className="rounded-2xl p-4 sm:p-5 border transition-all hover:border-slate-600 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  style={{
                    background: isCurrent ? 'rgba(99, 102, 241, 0.08)' : '#0d1117',
                    borderColor: isCurrent ? 'rgba(99, 102, 241, 0.35)' : '#2d3748',
                  }}
                >
                  {/* Left: Timing & Activity */}
                  <div className="flex items-start gap-4">
                    {/* Time Pillar */}
                    <div className="flex flex-col items-center justify-center w-20 py-2 rounded-xl bg-slate-900 border border-slate-800 flex-shrink-0 text-center">
                      <span className="text-xs font-bold font-mono text-white">{session.startTime}</span>
                      <span className="text-[10px] text-slate-500 font-mono">to</span>
                      <span className="text-xs font-bold font-mono text-slate-300">{session.endTime}</span>
                    </div>

                    {/* Details */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                          style={{
                            background: `${session.color || '#6366f1'}20`,
                            color: session.color || '#818cf8',
                            border: `1px solid ${session.color || '#6366f1'}40`,
                          }}
                        >
                          {session.subjectName || 'Self Study'}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
                          style={{
                            background: statusCfg.bg,
                            color: statusCfg.color,
                            border: `1px solid ${statusCfg.border}`,
                          }}
                        >
                          {statusCfg.label}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-white leading-snug">
                        {session.activity}
                      </h4>

                      {session.notes && (
                        <p className="text-xs text-slate-400 line-clamp-1 italic">
                          "{session.notes}"
                        </p>
                      )}

                      {/* Duration comparison */}
                      <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 pt-1">
                        <span>Planned: <strong className="text-slate-200">{session.plannedMinutes}m</strong></span>
                        <span>•</span>
                        <span>Actual: <strong className={session.actualMinutes > 0 ? 'text-emerald-400' : 'text-slate-400'}>{session.actualMinutes}m</strong></span>
                        {session.actualMinutes > 0 && session.plannedMinutes > 0 && (
                          <span className="text-slate-500">
                            ({Math.round((session.actualMinutes / session.plannedMinutes) * 100)}% achieved)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end">
                    {/* Status dropdown quick toggle */}
                    <select
                      value={session.status}
                      onChange={e => handleQuickStatusChange(session, e.target.value as any)}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="missed">Missed</option>
                    </select>

                    {/* Timer trigger */}
                    {session.status !== 'completed' && (
                      <button
                        onClick={() => handleStartTimer(session)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isActiveInTimer
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow'
                        }`}
                      >
                        <Play size={14} weight="fill" />
                        <span>{isActiveInTimer ? 'Active' : 'Timer'}</span>
                      </button>
                    )}

                    {/* Edit Button */}
                    <button
                      onClick={() => handleOpenEditModal(session)}
                      className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 cursor-pointer transition-all"
                      title="Edit Session Schedule"
                    >
                      <PencilSimple size={16} />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeleteSession(session.id)}
                      className="p-2 rounded-xl text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 cursor-pointer transition-all"
                      title="Delete Study Session"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- Study Session History: Planned vs Actual Duration Table --- */}
      <div
        className="rounded-3xl p-6 border shadow-xl space-y-4"
        style={{ background: '#161b22', borderColor: '#2d3748' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ListNumbers size={20} className="text-indigo-400" />
              <span>Study Session History & Performance Log</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Comprehensive log of all scheduled study events with planned vs actual focus duration
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {sessions.length} total sessions tracked
          </span>
        </div>

        {sessions.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No study sessions logged yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono">
                  <th className="pb-3 font-semibold">Date</th>
                  <th className="pb-3 font-semibold">Subject / Activity</th>
                  <th className="pb-3 font-semibold">Time Window</th>
                  <th className="pb-3 font-semibold">Planned</th>
                  <th className="pb-3 font-semibold">Actual Focus</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {sessions.slice(0, 15).map(session => {
                  const cfg = STATUS_CONFIG[session.status];
                  const diffMinutes = session.actualMinutes - session.plannedMinutes;

                  return (
                    <tr key={session.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 font-mono text-slate-300">
                        {session.date}
                      </td>
                      <td className="py-3">
                        <div className="font-semibold text-white">{session.activity}</div>
                        <div className="text-[11px] text-indigo-400">{session.subjectName}</div>
                      </td>
                      <td className="py-3 font-mono text-slate-400">
                        {session.startTime} - {session.endTime}
                      </td>
                      <td className="py-3 font-mono text-slate-300">
                        {session.plannedMinutes} mins
                      </td>
                      <td className="py-3 font-mono">
                        <span className={session.actualMinutes >= session.plannedMinutes && session.plannedMinutes > 0 ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                          {session.actualMinutes} mins
                        </span>
                        {session.actualMinutes > 0 && session.plannedMinutes > 0 && (
                          <span className={`ml-2 text-[10px] ${diffMinutes >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                            ({diffMinutes >= 0 ? `+${diffMinutes}m` : `${diffMinutes}m`})
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider inline-block"
                          style={{
                            background: cfg.bg,
                            color: cfg.color,
                            border: `1px solid ${cfg.border}`,
                          }}
                        >
                          {cfg.label}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(session)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-all"
                            title="Edit"
                          >
                            <PencilSimple size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteSession(session.id)}
                            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer transition-all"
                            title="Delete"
                          >
                            <Trash size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- Add / Edit Session Modal --- */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-10 w-full max-w-lg rounded-3xl p-6 sm:p-7 border shadow-2xl space-y-5"
              style={{ background: '#161b22', borderColor: '#2d3748' }}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Target size={20} className="text-indigo-400" />
                  <span>{editingSession ? 'Edit Study Session' : 'Schedule Study Session'}</span>
                </h3>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmitSession} className="space-y-4 text-xs">
                {/* Subject Selector */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Select Subject or Category
                  </label>
                  <select
                    value={formSubjectId}
                    onChange={e => setFormSubjectId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="">General Self Study / Project</option>
                    {state.subjects.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code || 'Academic'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Activity / Topic */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Activity / Focus Topic *
                  </label>
                  <input
                    type="text"
                    required
                    value={formActivity}
                    onChange={e => setFormActivity(e.target.value)}
                    placeholder="e.g. Dynamic Programming Practice, Chapter 4 Notes"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Date & Time Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Date</label>
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={e => setFormDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Start Time</label>
                    <input
                      type="time"
                      required
                      value={formStartTime}
                      onChange={e => setFormStartTime(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">End Time</label>
                    <input
                      type="time"
                      required
                      value={formEndTime}
                      onChange={e => setFormEndTime(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Status & Color */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Status</label>
                    <select
                      value={formStatus}
                      onChange={e => setFormStatus(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="missed">Missed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Tag Accent Color</label>
                    <div className="flex items-center gap-2 pt-1">
                      {['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6'].map(col => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => setFormColor(col)}
                          className={`w-6 h-6 rounded-full cursor-pointer transition-transform ${
                            formColor === col ? 'scale-125 ring-2 ring-white shadow' : 'hover:scale-110'
                          }`}
                          style={{ background: col }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Notes / Objectives</label>
                  <textarea
                    rows={2}
                    value={formNotes}
                    onChange={e => setFormNotes(e.target.value)}
                    placeholder="Specific questions to solve or concepts to memorize..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-slate-800 cursor-pointer font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer shadow-lg shadow-indigo-600/30 transition-all"
                  >
                    {isSubmitting && <CircleNotch size={14} className="animate-spin" />}
                    <span>{editingSession ? 'Update Session' : 'Save Session'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
