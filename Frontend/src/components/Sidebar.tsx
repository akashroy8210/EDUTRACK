import { UserProfile } from '@/data/types';
import {
  SquaresFour,
  ChartPieSlice,
  CalendarDots,
  GraduationCap,
  Fire,
  CheckSquareOffset,
  Target,
  Notebook,
  UserCircle,
  SignOut,
  Sparkle,
  Globe,
} from '@phosphor-icons/react';
import { motion } from 'framer-motion';

type Page =
  | 'dashboard'
  | 'attendance'
  | 'schedule'
  | 'exams'
  | 'habits'
  | 'todo'
  | 'socialMedia'
  | 'ambitions'
  | 'blog'
  | 'profile';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  user: UserProfile;
  onLogout: () => void;
}

const navItems: { page: Page; label: string; icon: any }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: SquaresFour },
  { page: 'attendance', label: 'Attendance', icon: ChartPieSlice },
  { page: 'schedule', label: 'Class Schedule', icon: CalendarDots },
  { page: 'exams', label: 'Exams & Quizzes', icon: GraduationCap },
  { page: 'habits', label: 'Daily Habits', icon: Fire },
  { page: 'todo', label: 'Daily Tasks', icon: CheckSquareOffset },
  { page: 'socialMedia', label: 'Social Media', icon: Globe },
  { page: 'ambitions', label: 'Ambitions', icon: Target },
  { page: 'blog', label: 'Daily Blog', icon: Notebook },
  { page: 'profile', label: 'Profile', icon: UserCircle },
];

export default function Sidebar({ currentPage, onNavigate, user, onLogout }: SidebarProps) {
  return (
    <aside
      className="fixed left-0 top-0 h-full w-56 hidden md:flex flex-col z-20 select-none"
      style={{ background: '#161b22', borderRight: '1px solid #2d3748' }}
    >
      {/* Brand Header */}
      <div className="px-5 py-5 border-b flex items-center justify-between" style={{ borderColor: '#2d3748' }}>
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase" style={{ color: '#818cf8', fontFamily: 'JetBrains Mono, monospace' }}>
            <Sparkle size={15} weight="fill" className="text-indigo-400" />
            <span>EduTrack</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Student Dashboard</div>
        </div>
        <div
          className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]"
          title="Server Online"
        />
      </div>

      {/* Navigation List */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentPage === item.page;

          return (
            <button
              key={item.page}
              onClick={() => onNavigate(item.page)}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group relative text-left cursor-pointer"
              style={{
                background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                color: isActive ? '#a5b4fc' : '#94a3b8',
                border: `1px solid ${isActive ? 'rgba(99, 102, 241, 0.3)' : 'transparent'}`,
              }}
            >
              <div className="flex-shrink-0 transition-transform group-hover:scale-110">
                <Icon
                  size={18}
                  weight={isActive ? 'duotone' : 'regular'}
                  className={isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200 transition-colors'}
                />
              </div>

              <span className="truncate">{item.label}</span>

              {isActive && (
                <div
                  className="absolute right-2.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_6px_#818cf8]"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Profile & Logout */}
      <div className="p-3 border-t space-y-2" style={{ borderColor: '#2d3748' }}>
        <button
          onClick={() => onNavigate('profile')}
          className="w-full flex items-center gap-3 rounded-xl p-2 transition-all hover:bg-white/5 cursor-pointer text-left"
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: '#fff' }}
          >
            {user.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold truncate text-slate-200">{user.name.split(' ')[0]}</div>
            <div className="text-[10px] truncate text-slate-500 font-mono">{user.rollNo}</div>
          </div>
        </button>

        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 text-xs py-2 rounded-xl transition-all cursor-pointer hover:bg-rose-500/15"
          style={{
            color: '#f87171',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
          }}
        >
          <SignOut size={14} weight="bold" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
