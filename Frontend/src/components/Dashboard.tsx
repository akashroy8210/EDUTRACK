import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { AppState, Subject, Exam, BlogPost, TodoItem, HabitItem, Ambition, ClassSession, Holiday, UserProfile, AttendanceRecord } from '@/data/types';
import { loadState, saveState, getTodayDate, DEFAULT_STATE } from '@/data/store';
import {
  authApi,
  profileApi,
  academicsApi,
  dailyWorksApi,
  commonWorksApi,
  examsApi,
  goalsApi,
  blogApi,
} from '@/api/client';
import Sidebar from './Sidebar';
import Login from './pages/Login';
import DashboardPage from './pages/Dashboard';
import Attendance from './pages/Attendance';
import Schedule from './pages/Schedule';
import Exams from './pages/Exams';
import Blog from './pages/Blog';
import Todo from './pages/Todo';
import Habits from './pages/Habits';
import Ambitions from './pages/Ambitions';
import Profile from './pages/Profile';
import SocialMedia from './pages/SocialMedia';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SquaresFour,
  ChartPieSlice,
  CalendarDots,
  CheckSquareOffset,
  DotsThreeOutline,
  Fire,
  GraduationCap,
  Globe,
  Target,
  Notebook,
  UserCircle,
  SignOut,
  X,
} from '@phosphor-icons/react';

type Page =
  | 'dashboard'
  | 'attendance'
  | 'schedule'
  | 'exams'
  | 'blog'
  | 'todo'
  | 'habits'
  | 'socialMedia'
  | 'ambitions'
  | 'profile';

export default function Dashboard() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [page, setPage] = useState<Page>('dashboard');
  const [isSyncing, setIsSyncing] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);

  const update = useCallback((patch: Partial<AppState>) => {
    setState(prev => {
      const next = { ...prev, ...patch };
      saveState(next);
      return next;
    });
  }, []);

  const refreshBackendData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const [
        subjectsRes,
        scheduleRes,
        holidaysRes,
        dailyRes,
        habitsRes,
        examsRes,
        goalsRes,
        blogRes,
        profileRes,
        summaryRes,
      ] = await Promise.allSettled([
        academicsApi.getSubjects(),
        academicsApi.getSchedule(),
        academicsApi.getHolidays(),
        dailyWorksApi.getAll(),
        commonWorksApi.getAll(),
        examsApi.getAll(),
        goalsApi.getAll(),
        blogApi.getAll(),
        profileApi.get(),
        academicsApi.getSummary(),
      ]);

      const patch: Partial<AppState> = {};

      if (summaryRes.status === 'fulfilled' && summaryRes.value) {
        if (summaryRes.value.history) {
          patch.attendanceHistory = summaryRes.value.history.map((h: any) => ({
            id: h.id || h._id,
            subjectId: typeof h.subjectId === 'object' ? h.subjectId?._id : h.subjectId,
            classId: typeof h.classId === 'object' ? h.classId?._id : h.classId,
            date: h.date,
            status: h.status,
          }));
          const todayStr = getTodayDate();
          const todayMarks: Record<string, 'present' | 'absent'> = {};
          summaryRes.value.history.forEach((h: any) => {
            if (h.date === todayStr && h.classId) {
              todayMarks[h.classId] = h.status;
            }
          });
          patch.todayClassAttendance = todayMarks;
          patch.todayClassAttendanceDate = todayStr;
        }
      }

      if (profileRes.status === 'fulfilled' && profileRes.value?.profile) {
        patch.user = profileRes.value.profile;
      }

      if (subjectsRes.status === 'fulfilled' && subjectsRes.value?.subjects) {
        patch.subjects = subjectsRes.value.subjects.map((s: any) => ({
          id: s.id || s._id,
          name: s.name,
          code: s.code,
          color: s.color || '#6366f1',
          conductedClasses: s.conductedClasses !== undefined ? s.conductedClasses : s.totalClasses,
          attendedClasses: s.attendedClasses || 0,
          totalClasses: s.totalClasses || 0,
          missedClasses: s.missedClasses || 0,
          credits: s.credits || 4,
          instructor: s.instructor || '',
        }));
      }

      if (scheduleRes.status === 'fulfilled' && scheduleRes.value?.schedule) {
        patch.schedule = scheduleRes.value.schedule.map((c: any) => ({
          id: c._id || c.id,
          subjectId: typeof c.subjectId === 'object' ? c.subjectId?._id : c.subjectId,
          subjectName: typeof c.subjectId === 'object' ? c.subjectId?.name : (c.subjectName || 'Class'),
          day: c.day,
          time: c.time,
          room: c.room || 'LH-1',
          type: c.type || 'lecture',
          startDate: c.startDate || '',
          endDate: c.endDate || '',
        }));
      }

      if (holidaysRes.status === 'fulfilled' && holidaysRes.value?.holidays) {
        patch.holidays = holidaysRes.value.holidays.map((h: any) => ({
          id: h._id || h.id,
          date: h.date,
          label: h.label || h.name || 'Holiday',
          type: (h.type === 'class-specific' ? 'class-specific' : 'full-day') as 'full-day' | 'class-specific',
          classId: h.classId,
        }));
      }

      if (dailyRes.status === 'fulfilled' && dailyRes.value?.tasks) {
        patch.todos = dailyRes.value.tasks.map((t: any) => ({
          id: t._id || t.id,
          text: t.title || t.text,
          completed: t.completed,
          type: t.type || 'daily',
          priority: t.priority || 'medium',
          createdAt: t.date || t.createdAt,
          completedAt: t.completedAt,
        }));
      }

      if (habitsRes.status === 'fulfilled' && habitsRes.value?.habits) {
        patch.habits = habitsRes.value.habits.map((h: any) => ({
          id: h.id || h._id,
          text: h.text || h.title,
          icon: h.icon || '🎯',
          color: h.color || '#6366f1',
          streak: h.streak || 0,
          doneToday: h.doneToday || false,
          isEditable: h.isEditable,
          daysRemainingForEdit: h.daysRemainingForEdit,
          lastEditedAt: h.lastEditedAt,
          completionHistory: h.completionHistory || {},
        }));
      }

      if (examsRes.status === 'fulfilled' && examsRes.value?.exams) {
        patch.exams = examsRes.value.exams.map((e: any) => ({
          id: e._id || e.id,
          subjectName: e.subjectName,
          type: e.type,
          date: e.date,
          time: e.time,
          room: e.room,
          syllabus: e.syllabus,
          status: e.status || 'upcoming',
        }));
      }

      if (goalsRes.status === 'fulfilled' && goalsRes.value?.goals) {
        patch.ambitions = goalsRes.value.goals.map((g: any) => ({
          id: g._id || g.id,
          title: g.title,
          description: g.description,
          type: g.type,
          deadline: g.deadline,
          progress: g.progress ?? 0,
          achievements: (g.achievements || []).map((a: any) => ({
            id: a._id || a.id,
            text: a.text,
            date: a.date,
          })),
          status: g.status || 'active',
          createdAt: g.createdAt,
        }));
      }

      if (blogRes.status === 'fulfilled' && blogRes.value?.blogs) {
        patch.blogs = blogRes.value.blogs.map((b: any) => ({
          id: b._id || b.id,
          title: b.title,
          content: b.content,
          mood: b.mood || 'good',
          category: b.category || 'General',
          readTime: b.readTime || '2 min read',
          coverGradient: b.coverGradient || 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
          image: b.imageUrl || b.image,
          time: b.time || '12:00 PM',
          tags: b.tags || [],
          createdAt: b.date || b.createdAt,
          updatedAt: b.updatedAt,
        }));
      }

      update(patch);
    } catch (err) {
      console.error('Failed to sync data with backend:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [update]);

  // Verify auth session (cookie or localStorage token) on initial mount
  useEffect(() => {
    authApi.getMe()
      .then(res => {
        if (res?.user) {
          update({ isLoggedIn: true, user: res.user });
          refreshBackendData();
        }
      })
      .catch(() => {
        localStorage.removeItem('mydashboard_token');
        update({ isLoggedIn: false });
      });
  }, [refreshBackendData, update]);

  // Always fetch latest data from backend on page change and whenever logged in
  useEffect(() => {
    if (state.isLoggedIn) {
      refreshBackendData();
    }
  }, [page, state.isLoggedIn, refreshBackendData]);

  const handleLogin = (userData?: Partial<UserProfile>, isNewRegistration?: boolean) => {
    update({
      isLoggedIn: true,
      user: userData ? { ...state.user, ...userData } : state.user,
    });
    refreshBackendData();
    if (isNewRegistration) {
      setPage('profile');
      toast.info('Welcome! Please complete your student profile credentials.');
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {}
    localStorage.removeItem('mydashboard_token');
    localStorage.removeItem('mydashboard_real_state');
    setState(DEFAULT_STATE);
    toast.info('Logged out successfully.');
  };

  const handleMarkClassAttendance = async (classId: string, status: 'present' | 'absent') => {
    const today = getTodayDate();
    const marked = { ...(state.todayClassAttendanceDate === today ? state.todayClassAttendance : {}), [classId]: status };
    const cls = state.schedule.find(c => c.id === classId);
    const newRecord: AttendanceRecord = {
      id: `att_${Date.now()}`,
      subjectId: cls?.subjectId || '',
      classId,
      date: today,
      status,
    };
    update({
      todayClassAttendance: marked,
      todayClassAttendanceDate: today,
      attendanceHistory: [newRecord, ...state.attendanceHistory],
    });

    if (cls?.subjectId) {
      try {
        await academicsApi.markAttendance({
          subjectId: cls.subjectId,
          classId,
          date: today,
          status,
        });
        // Refresh subjects and attendance summary from server
        const [subs, summary] = await Promise.allSettled([
          academicsApi.getSubjects(),
          academicsApi.getSummary(),
        ]);
        const patch: any = {};
        if (subs.status === 'fulfilled' && subs.value?.subjects) {
          patch.subjects = subs.value.subjects.map((s: any) => ({
            id: s.id || s._id,
            name: s.name,
            code: s.code,
            color: s.color || '#6366f1',
            conductedClasses: s.conductedClasses !== undefined ? s.conductedClasses : s.totalClasses,
            attendedClasses: s.attendedClasses || 0,
            totalClasses: s.totalClasses || 0,
            missedClasses: s.missedClasses || 0,
            credits: s.credits || 4,
            instructor: s.instructor || '',
          }));
        }
        if (summary.status === 'fulfilled' && summary.value?.history) {
          patch.attendanceHistory = summary.value.history;
        }
        if (Object.keys(patch).length > 0) {
          update(patch);
        }
      } catch (err: any) {
        console.warn('Could not sync attendance to backend:', err?.message);
      }
    }

    if (status === 'present') {
      toast.success(`Marked Present for ${cls?.subjectName || 'class'}`);
    } else {
      toast.error(`Marked Absent for ${cls?.subjectName || 'class'}`);
    }
  };

  const handleToggleTodo = async (id: string) => {
    const today = getTodayDate();
    const todo = state.todos.find(t => t.id === id);
    const willBeCompleted = !todo?.completed;
    try {
      await dailyWorksApi.toggle(id, true);
    } catch {}
    update({ todos: state.todos.map(t => t.id === id ? { ...t, completed: !t.completed, completedAt: !t.completed ? today : undefined } : t) });
    if (willBeCompleted) {
      toast.success(`Completed task: "${todo?.text}"`);
    } else {
      toast.info(`Reopened task: "${todo?.text}"`);
    }
  };

  if (!state.isLoggedIn) return <Login onLogin={handleLogin} />;
  const pages: Record<Page, React.ReactNode> = {
    dashboard: <DashboardPage state={state} onNavigate={setPage} onMarkClassAttendance={handleMarkClassAttendance} onToggleTodo={handleToggleTodo} />,
    attendance: (
      <Attendance
        state={state}
        onUpdate={(subjects: Subject[]) => update({ subjects })}
        onNavigate={(p: string) => setPage(p as Page)}
        onUpdateAttendanceState={(data) => update(data)}
      />
    ),
    schedule: (
      <Schedule
        state={state}
        onUpdateSchedule={(schedule: ClassSession[]) => update({ schedule })}
        onUpdateHolidays={(holidays: Holiday[]) => update({ holidays })}
        onUpdateValidity={(scheduleValidity) => update({ scheduleValidity })}
      />
    ),
    exams: <Exams state={state} onUpdate={(exams: Exam[]) => update({ exams })} />,
    habits: <Habits state={state} onUpdate={(habits: HabitItem[]) => update({ habits })} />,
    todo: <Todo state={state} onUpdate={(todos: TodoItem[]) => update({ todos })} />,
    socialMedia: <SocialMedia />,
    ambitions: <Ambitions state={state} onUpdate={(ambitions: Ambition[]) => update({ ambitions })} />,
    blog: <Blog state={state} onUpdate={(blogs: BlogPost[]) => update({ blogs })} />,
    profile: <Profile state={state} onUpdate={(user: UserProfile) => update({ user })} />,
  };
  const isProfileIncomplete = !state.user.rollNo || !state.user.branch || !state.user.semester;

  const bottomTabs = [
    { page: 'dashboard' as Page, label: 'Dashboard', icon: SquaresFour },
    { page: 'attendance' as Page, label: 'Attendance', icon: ChartPieSlice },
    { page: 'schedule' as Page, label: 'Schedule', icon: CalendarDots },
    { page: 'todo' as Page, label: 'Tasks', icon: CheckSquareOffset },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen" style={{ background: '#0d1117' }}>
      {/* Desktop Sidebar (hidden on mobile) */}
      <Sidebar currentPage={page} onNavigate={setPage} user={state.user} onLogout={handleLogout} />

      {/* Mobile Top App Bar (visible on mobile only) */}
      <header
        className="md:hidden sticky top-0 z-30 px-4 py-3 border-b flex items-center justify-between backdrop-blur-md select-none"
        style={{ background: 'rgba(22, 27, 34, 0.9)', borderColor: '#2d3748' }}
      >
        <button
          onClick={() => {
            setPage('profile');
            setMoreSheetOpen(false);
          }}
          className="flex items-center gap-2.5 text-left cursor-pointer"
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
          >
            {state.user.name ? state.user.name.charAt(0).toUpperCase() : 'S'}
          </div>
          <div>
            <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <span>{state.user.name ? state.user.name.split(' ')[0] : 'Student'}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block shadow-[0_0_6px_#34d399]" />
            </div>
            <div className="text-[10px] text-indigo-400 uppercase font-mono tracking-wider font-semibold">
              EduTrack
            </div>
          </div>
        </button>

        <div className="text-[11px] font-mono font-medium text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700/60">
          {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 ml-0 md:ml-56 min-h-screen overflow-y-auto">
        <div className="max-w-5xl mx-auto px-3.5 sm:px-6 py-4 sm:py-8 pb-24 md:pb-8">
          {isProfileIncomplete && page !== 'profile' && (
            <div
              className="mb-5 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border shadow-sm"
              style={{ background: '#6366f115', borderColor: '#6366f140' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-indigo-400 font-bold text-sm">✦</span>
                </div>
                <div className="text-xs text-slate-200 leading-relaxed">
                  <strong className="text-indigo-300 font-semibold">Profile Setup Incomplete:</strong> Add your Roll Number, Branch, and Semester to personalize your attendance calculations.
                </div>
              </div>
              <button
                onClick={() => setPage('profile')}
                className="w-full sm:w-auto text-center px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex-shrink-0 cursor-pointer transition-all shadow"
              >
                Edit Profile →
              </button>
            </div>
          )}
          {pages[page]}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar (visible on mobile only) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t backdrop-blur-lg flex items-center justify-around py-2 px-1 select-none"
        style={{ background: 'rgba(22, 27, 34, 0.95)', borderColor: '#2d3748' }}
      >
        {bottomTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = page === tab.page && !moreSheetOpen;
          return (
            <button
              key={tab.page}
              onClick={() => {
                setPage(tab.page);
                setMoreSheetOpen(false);
              }}
              className="flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer relative"
              style={{ color: isActive ? '#818cf8' : '#94a3b8' }}
            >
              <div className="relative">
                <Icon size={22} weight={isActive ? 'duotone' : 'regular'} />
                {isActive && (
                  <motion.div
                    layoutId="mobileNavPill"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400 shadow-[0_0_6px_#818cf8]"
                  />
                )}
              </div>
              <span className="text-[10px] mt-1 font-medium tracking-tight">{tab.label}</span>
            </button>
          );
        })}

        {/* 5th Tab: More */}
        {(() => {
          const isMoreActive =
            moreSheetOpen ||
            ['habits', 'exams', 'socialMedia', 'ambitions', 'blog', 'profile'].includes(page);
          return (
            <button
              onClick={() => setMoreSheetOpen(prev => !prev)}
              className="flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer relative"
              style={{ color: isMoreActive ? '#818cf8' : '#94a3b8' }}
            >
              <div className="relative">
                <DotsThreeOutline size={22} weight={isMoreActive ? 'fill' : 'regular'} />
                {isMoreActive && (
                  <motion.div
                    layoutId="mobileNavPill"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400 shadow-[0_0_6px_#818cf8]"
                  />
                )}
              </div>
              <span className="text-[10px] mt-1 font-medium tracking-tight">More</span>
            </button>
          );
        })()}
      </nav>

      {/* Slide-Up 'More' Bottom Sheet */}
      <AnimatePresence>
        {moreSheetOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreSheetOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Bottom Sheet Modal */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative z-10 rounded-t-3xl border-t p-5 pb-8 shadow-2xl space-y-4"
              style={{ background: '#161b22', borderColor: '#2d3748' }}
            >
              {/* Sheet Drag Handle */}
              <div className="w-10 h-1 rounded-full bg-slate-600 mx-auto" />

              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-sm font-bold text-slate-200">More Tools & Navigation</h3>
                <button
                  onClick={() => setMoreSheetOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer rounded-lg hover:bg-white/5"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { page: 'habits' as Page, label: 'Daily Habits', icon: Fire, color: '#f59e0b' },
                  { page: 'exams' as Page, label: 'Exams & Quizzes', icon: GraduationCap, color: '#6366f1' },
                  { page: 'socialMedia' as Page, label: 'Social Detox', icon: Globe, color: '#10b981' },
                  { page: 'ambitions' as Page, label: 'Ambitions & Goals', icon: Target, color: '#ec4899' },
                  { page: 'blog' as Page, label: 'Daily Notes & Blog', icon: Notebook, color: '#06b6d4' },
                  { page: 'profile' as Page, label: 'Profile & Settings', icon: UserCircle, color: '#8b5cf6' },
                ].map(item => {
                  const Icon = item.icon;
                  const isCurrent = page === item.page;
                  return (
                    <button
                      key={item.page}
                      onClick={() => {
                        setPage(item.page);
                        setMoreSheetOpen(false);
                      }}
                      className="flex items-center gap-3 p-3 rounded-xl border text-left cursor-pointer transition-all"
                      style={{
                        background: isCurrent ? 'rgba(99, 102, 241, 0.15)' : '#0d1117',
                        borderColor: isCurrent ? 'rgba(99, 102, 241, 0.35)' : '#2d3748',
                        color: isCurrent ? '#a5b4fc' : '#cbd5e1',
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${item.color}15`, color: item.color }}
                      >
                        <Icon size={18} weight={isCurrent ? 'fill' : 'regular'} />
                      </div>
                      <span className="text-xs font-semibold truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Sign Out Button in Sheet */}
              <button
                onClick={() => {
                  setMoreSheetOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer mt-2"
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  borderColor: 'rgba(239, 68, 68, 0.25)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#f87171',
                }}
              >
                <SignOut size={16} weight="bold" />
                <span>Sign Out of EduTrack</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
