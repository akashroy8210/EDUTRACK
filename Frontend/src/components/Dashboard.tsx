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

  return (
    <div className="flex min-h-screen" style={{ background: '#0d1117' }}>
      <Sidebar currentPage={page} onNavigate={setPage} user={state.user} onLogout={handleLogout} />
      <main className="flex-1 ml-56 min-h-screen overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {isProfileIncomplete && page !== 'profile' && (
            <div
              className="mb-6 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border shadow-sm"
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
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex-shrink-0 cursor-pointer transition-all shadow"
              >
                Edit Profile →
              </button>
            </div>
          )}
          {pages[page]}
        </div>
      </main>
    </div>
  );
}
