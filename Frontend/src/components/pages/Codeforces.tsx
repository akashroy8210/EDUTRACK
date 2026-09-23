import { useState, useEffect, useMemo } from 'react';
import { AppState, UserProfile, CodeforcesUser, CodeforcesContest, CodeforcesRatingChange, CodeforcesStatus } from '@/data/types';
import { codeforcesApi } from '@/api/client';
import { toast } from 'sonner';
import {
  Trophy,
  Calendar,
  Clock,
  ArrowSquareOut,
  ArrowsClockwise,
  CheckCircle,
  WarningCircle,
  Sparkle,
  Fire,
  ChartLineUp,
  Code,
  CalendarPlus,
  MagnifyingGlass,
  ListBullets,
  Timer,
  ShieldCheck,
  User,
  Medal,
  GlobeHemisphereWest,
  Lightning,
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  state: AppState;
  onUpdateUser: (user: UserProfile) => void;
  onNavigateToProfile?: () => void;
}

// Codeforces official rank color mapper
export function getCodeforcesRankColor(rankOrRating: string | number): { color: string; bg: string; border: string; title: string } {
  let rating = 0;
  let title = '';

  if (typeof rankOrRating === 'number') {
    rating = rankOrRating;
  } else {
    title = (rankOrRating || '').toLowerCase();
    if (title.includes('newbie')) rating = 1100;
    else if (title.includes('pupil')) rating = 1300;
    else if (title.includes('specialist')) rating = 1500;
    else if (title.includes('expert')) rating = 1750;
    else if (title.includes('candidate master')) rating = 2050;
    else if (title.includes('master')) rating = 2250;
    else if (title.includes('grandmaster')) rating = 2500;
  }

  if (rating < 1200) {
    return { color: '#9ca3af', bg: 'rgba(156, 163, 175, 0.12)', border: 'rgba(156, 163, 175, 0.3)', title: 'Newbie' };
  } else if (rating < 1400) {
    return { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)', border: 'rgba(34, 197, 94, 0.3)', title: 'Pupil' };
  } else if (rating < 1600) {
    return { color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.12)', border: 'rgba(6, 182, 212, 0.3)', title: 'Specialist' };
  } else if (rating < 1900) {
    return { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)', title: 'Expert' };
  } else if (rating < 2200) {
    return { color: '#a855f7', bg: 'rgba(168, 85, 247, 0.12)', border: 'rgba(168, 85, 247, 0.3)', title: 'Candidate Master' };
  } else if (rating < 2400) {
    return { color: '#f97316', bg: 'rgba(249, 115, 22, 0.12)', border: 'rgba(249, 115, 22, 0.3)', title: 'Master' };
  } else {
    return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)', title: 'Grandmaster' };
  }
}

// Convert Unix seconds to formatted IST Date & Time
function formatIST(seconds?: number): { full: string; date: string; time: string } {
  if (!seconds) return { full: 'TBD', date: 'TBD', time: 'TBD' };
  const d = new Date(seconds * 1000);
  const optionsDate: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  };
  const optionsTime: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  };

  const dateStr = d.toLocaleDateString('en-IN', optionsDate);
  const timeStr = d.toLocaleTimeString('en-IN', optionsTime);

  return {
    full: `${dateStr} at ${timeStr} IST`,
    date: dateStr,
    time: `${timeStr} IST`,
  };
}

// Format duration
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (minutes === 0) return `${hours} hrs`;
  return `${hours} hrs ${minutes} mins`;
}

// Determine Contest Division & Suitability
function analyzeContestSuitability(contestName: string, userRating: number = 0): {
  level: 'beginner' | 'moderate' | 'advanced';
  division: string;
  badgeText: string;
  badgeColor: string;
  matchScore: number;
  explanation: string;
} {
  const lower = contestName.toLowerCase();
  let division = 'Div 2';
  let level: 'beginner' | 'moderate' | 'advanced' = 'moderate';
  let matchScore = 80;
  let explanation = '';

  if (lower.includes('div. 4') || lower.includes('div 4')) {
    division = 'Div. 4';
    level = 'beginner';
    matchScore = userRating < 1400 ? 98 : 70;
    explanation =
      userRating < 1400
        ? 'Prime rating-gain territory! Focus on swift, accurate implementations of problems A to D in the first 45 minutes.'
        : 'Beginner-focused round (unrated for ratings ≥ 1400). Great for speed warm-up and zero-penalty speedruns.';
  } else if (lower.includes('div. 3') || lower.includes('div 3')) {
    division = 'Div. 3';
    level = 'beginner';
    matchScore = userRating < 1600 ? 95 : 75;
    explanation =
      userRating < 1600
        ? 'Ideal contest match! Focus on A, B, and C with zero WA penalties. Solving problem D or E will yield significant rating surges.'
        : 'Accessible round for practicing core implementation speed and standard mathematical patterns.';
  } else if (lower.includes('div. 1') || lower.includes('div 1')) {
    division = 'Div. 1';
    level = 'advanced';
    matchScore = userRating >= 1900 ? 95 : 55;
    explanation =
      userRating >= 1900
        ? 'Officially rated for your tier! Highly sophisticated algorithmic puzzles covering advanced DP, trees, and graphs.'
        : 'Demanding round targeted at Expert and Master coders. Excellent for observation skills and learning top-tier solutions post-contest.';
  } else if (lower.includes('educational') || lower.includes('edu')) {
    division = 'Educational (Div. 2)';
    level = 'moderate';
    matchScore = userRating >= 1200 && userRating <= 1800 ? 94 : 82;
    explanation =
      'Curated round designed to teach foundational CP concepts (two pointers, binary search, prefix sums, DP). Strongly recommended!';
  } else if (lower.includes('global')) {
    division = 'Global (Div. 1+2)';
    level = 'moderate';
    matchScore = 88;
    explanation =
      'Combined round open to all ratings with a balanced difficulty gradient from beginner-accessible (A/B) to elite Grandmaster (G/H).';
  } else {
    division = 'Div. 2';
    level = 'moderate';
    matchScore = userRating < 1600 ? 90 : 85;
    explanation =
      userRating < 1400
        ? 'Rated for you! Prioritize solving problems A & B cleanly. Target problem C for guaranteed rating boost.'
        : 'Standard rated division contest. High participation numbers with tremendous rating upside for solving through problem D.';
  }

  const badgeColor =
    level === 'beginner'
      ? '#22c55e'
      : level === 'moderate'
      ? '#f59e0b'
      : '#ef4444';

  const badgeText =
    level === 'beginner'
      ? '🟢 Beginner Friendly'
      : level === 'moderate'
      ? '🟡 Moderate Challenge'
      : '🔴 Advanced Arena';

  return { level, division, badgeText, badgeColor, matchScore, explanation };
}

// Build Google Calendar Event URL
function buildGoogleCalendarUrl(contest: CodeforcesContest): string {
  if (!contest.startTimeSeconds) return 'https://calendar.google.com';
  const start = new Date(contest.startTimeSeconds * 1000).toISOString().replace(/-|:|\.\d\d\d/g, '');
  const end = new Date((contest.startTimeSeconds + contest.durationSeconds) * 1000)
    .toISOString()
    .replace(/-|:|\.\d\d\d/g, '');

  const title = encodeURIComponent(`Codeforces: ${contest.name}`);
  const details = encodeURIComponent(
    `Official Codeforces Contest.\nContest Link: https://codeforces.com/contest/${contest.id}\nDuration: ${formatDuration(
      contest.durationSeconds
    )}\nStart Time: ${formatIST(contest.startTimeSeconds).full}`
  );
  const location = encodeURIComponent(`https://codeforces.com/contest/${contest.id}`);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
}

export default function Codeforces({ state, onNavigateToProfile }: Props) {
  const currentHandle = state.user.codeforcesHandle?.trim() || '';

  // Data states
  const [cfUser, setCfUser] = useState<CodeforcesUser | null>(null);
  const [contests, setContests] = useState<CodeforcesContest[]>([]);
  const [ratingHistory, setRatingHistory] = useState<CodeforcesRatingChange[]>([]);
  const [statusStats, setStatusStats] = useState<CodeforcesStatus | null>(null);

  // Loading states
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingContests, setIsLoadingContests] = useState(false);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);

  // Division Filter & Search for Upcoming Contests
  const [selectedDivisionFilter, setSelectedDivisionFilter] = useState<string>('all');
  const [contestSearchQuery, setContestSearchQuery] = useState('');

  // Live timer tick
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Chart tooltip state
  const [hoveredRating, setHoveredRating] = useState<CodeforcesRatingChange | null>(null);

  // Profile avatar error tracking
  const [avatarImgError, setAvatarImgError] = useState(false);

  useEffect(() => {
    setAvatarImgError(false);
  }, [currentHandle, cfUser?.avatar]);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Contests List
  const fetchContests = async () => {
    setIsLoadingContests(true);
    try {
      const res = await codeforcesApi.getContests();
      if (res.contests) {
        setContests(res.contests);
      }
    } catch (err: any) {
      console.warn('Could not fetch contests:', err);
    } finally {
      setIsLoadingContests(false);
    }
  };

  // Fetch User Info & History
  const fetchUserData = async (handle: string) => {
    if (!handle.trim()) return;
    setIsLoadingProfile(true);
    try {
      const [userRes, ratingRes, statusRes] = await Promise.allSettled([
        codeforcesApi.getUser(handle),
        codeforcesApi.getRatingHistory(handle),
        codeforcesApi.getUserStatus(handle),
      ]);

      if (userRes.status === 'fulfilled' && userRes.value?.user) {
        setCfUser(userRes.value.user);
      }

      if (ratingRes.status === 'fulfilled' && ratingRes.value?.ratingHistory) {
        setRatingHistory(ratingRes.value.ratingHistory);
      }

      if (statusRes.status === 'fulfilled' && statusRes.value?.status) {
        setStatusStats(statusRes.value.status);
      }
    } catch (err: any) {
      console.warn('Failed to fetch user data:', err);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // Initial Load
  useEffect(() => {
    if (currentHandle) {
      fetchContests();
      fetchUserData(currentHandle);
    }
  }, [currentHandle]);

  // Refresh All Data
  const handleRefreshAll = async () => {
    if (!currentHandle) return;
    setIsRefreshingAll(true);
    await Promise.allSettled([
      fetchContests(),
      fetchUserData(currentHandle),
    ]);
    setIsRefreshingAll(false);
    toast.success('Codeforces live stats refreshed!');
  };

  // Identify Next Contest & Live Contest
  const { nextContest, isLive, countdownBlocks } = useMemo(() => {
    if (!contests || contests.length === 0) {
      return {
        nextContest: null,
        isLive: false,
        countdownBlocks: { days: 0, hours: 0, minutes: 0, seconds: 0 },
      };
    }

    const nowSec = Math.floor(currentTime / 1000);

    // Look for currently coding contest first
    const liveContest = contests.find(c => {
      if (c.phase === 'CODING') return true;
      if (c.startTimeSeconds && c.durationSeconds) {
        return nowSec >= c.startTimeSeconds && nowSec < c.startTimeSeconds + c.durationSeconds;
      }
      return false;
    });

    const upcoming = contests.filter(c => (c.startTimeSeconds || 0) > nowSec);
    const primary = liveContest || upcoming[0] || contests[0];

    const isRunning =
      primary?.phase === 'CODING' ||
      (primary?.startTimeSeconds &&
        nowSec >= primary.startTimeSeconds &&
        nowSec < primary.startTimeSeconds + primary.durationSeconds);

    if (isRunning) {
      return {
        nextContest: primary,
        isLive: true,
        countdownBlocks: { days: 0, hours: 0, minutes: 0, seconds: 0 },
      };
    }

    if (!primary || !primary.startTimeSeconds) {
      return {
        nextContest: primary,
        isLive: false,
        countdownBlocks: { days: 0, hours: 0, minutes: 0, seconds: 0 },
      };
    }

    const diff = Math.max(0, primary.startTimeSeconds - nowSec);
    const days = Math.floor(diff / (24 * 3600));
    const hours = Math.floor((diff % (24 * 3600)) / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;

    return {
      nextContest: primary,
      isLive: false,
      countdownBlocks: { days, hours, minutes, seconds },
    };
  }, [contests, currentTime]);

  const suitability = nextContest
    ? analyzeContestSuitability(nextContest.name, cfUser?.rating || 0)
    : null;

  const nextContestIST = nextContest ? formatIST(nextContest.startTimeSeconds) : null;
  const userRankTheme = getCodeforcesRankColor(cfUser?.rank || cfUser?.rating || 0);

  // Determine avatar source with protocol normalization and fallbacks
  const avatarSrc = useMemo(() => {
    const normalize = (u?: string) => {
      if (!u) return '';
      if (u.startsWith('//')) return `https:${u}`;
      return u;
    };

    const cfAv = normalize(cfUser?.avatar);
    const cfTitle = normalize(cfUser?.titlePhoto);

    // 1. If Codeforces user has a custom avatar (not no-avatar placeholder)
    if (cfAv && !cfAv.includes('no-avatar')) {
      return cfAv;
    }
    // 2. Fall back to student dashboard profile photo if uploaded
    if (state.user.photo) {
      return state.user.photo;
    }
    // 3. Fall back to Codeforces title photo if available
    if (cfTitle && !cfTitle.includes('no-avatar')) {
      return cfTitle;
    }
    // 4. Fall back to Codeforces avatar even if default
    if (cfAv) {
      return cfAv;
    }
    return '';
  }, [cfUser, state.user.photo]);

  // Filtered upcoming contests list
  const filteredContests = useMemo(() => {
    const nowSec = Math.floor(currentTime / 1000);
    let list = contests.filter(c => (c.startTimeSeconds || 0) > nowSec);

    if (selectedDivisionFilter !== 'all') {
      list = list.filter(c => {
        const lower = c.name.toLowerCase();
        if (selectedDivisionFilter === 'div1') return lower.includes('div. 1') || lower.includes('div 1');
        if (selectedDivisionFilter === 'div2') return lower.includes('div. 2') || lower.includes('div 2');
        if (selectedDivisionFilter === 'div3') return lower.includes('div. 3') || lower.includes('div 3');
        if (selectedDivisionFilter === 'div4') return lower.includes('div. 4') || lower.includes('div 4');
        if (selectedDivisionFilter === 'edu') return lower.includes('edu');
        return true;
      });
    }

    if (contestSearchQuery.trim()) {
      const q = contestSearchQuery.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || String(c.id).includes(q));
    }

    return list;
  }, [contests, currentTime, selectedDivisionFilter, contestSearchQuery]);

  // ==========================================
  // 1. UNCONNECTED STATE (ENFORCED PROFILE-ONLY)
  // ==========================================
  if (!currentHandle) {
    return (
      <div className="max-w-4xl mx-auto py-8 sm:py-14 px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-8 sm:p-12 relative overflow-hidden border shadow-2xl text-center space-y-8"
          style={{
            background: 'radial-gradient(ellipse at 50% 0%, #1e1b4b 0%, #0d1117 75%)',
            borderColor: '#3730a3',
          }}
        >
          {/* Subtle decorative glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 bg-indigo-500/10 blur-3xl pointer-events-none" />

          {/* Floating Trophy Icon */}
          <div className="relative mx-auto w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.25)]">
            <Trophy size={48} weight="duotone" />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 rounded-3xl border border-dashed border-amber-400/40"
            />
          </div>

          {/* Heading & Notice */}
          <div className="max-w-xl mx-auto space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
              <Sparkle size={13} weight="fill" />
              <span>Competitive Programming Hub</span>
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              Connect Your Codeforces Profile
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              To activate live contest countdowns, personalized division suitability analysis, rating progression charts, and solved statistics, please configure your Codeforces username in your Student Profile.
            </p>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto text-left">
            {[
              {
                icon: Timer,
                color: '#f59e0b',
                title: 'Live Contest Radar',
                desc: 'Digital countdown clocks and automatic detection for active rounds in IST.',
              },
              {
                icon: ShieldCheck,
                color: '#10b981',
                title: 'AI Suitability Assessment',
                desc: 'Strategic recommendations matched to your specific Codeforces rating tier.',
              },
              {
                icon: ChartLineUp,
                color: '#6366f1',
                title: 'Interactive Rating Graph',
                desc: 'Spline curve visualization with rank milestone beacons and hover deltas.',
              },
              {
                icon: CalendarPlus,
                color: '#06b6d4',
                title: '1-Click Calendar Sync',
                desc: 'Instant Google Calendar event creation with Indian Standard Time accuracy.',
              },
            ].map(f => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="p-4 rounded-2xl border transition-all"
                  style={{ background: '#161b22', borderColor: '#2d3748' }}
                >
                  <div className="flex items-center gap-3 mb-1.5">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${f.color}15`, color: f.color }}
                    >
                      <Icon size={18} weight="duotone" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-200">{f.title}</h4>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed pl-11">{f.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Primary Action to Profile */}
          <div className="pt-2">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onNavigateToProfile}
              className="px-8 py-3.5 rounded-2xl font-bold text-sm text-white shadow-xl cursor-pointer flex items-center gap-2.5 mx-auto transition-all"
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                boxShadow: '0 8px 24px -4px rgba(99, 102, 241, 0.4)',
              }}
            >
              <User size={18} weight="bold" />
              <span>Configure Handle in Profile →</span>
            </motion.button>
            <p className="text-[11px] text-slate-500 mt-3 font-mono">
              Only verified Codeforces usernames will activate this dashboard.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // ==========================================
  // 2. CONNECTED ARENA VIEW (PREMIUM REDESIGN)
  // ==========================================
  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* 2.1 PAGE TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md">
            <Trophy size={28} weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-100">
                Codeforces Arena
              </h1>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                LIVE API
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live rounds, Indian Standard Time radar, personalized division match, and rating analytics
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {onNavigateToProfile && (
            <button
              onClick={onNavigateToProfile}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer"
              title="Edit Codeforces Handle in Profile"
            >
              <User size={14} weight="bold" />
              <span>@{currentHandle}</span>
            </button>
          )}

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleRefreshAll}
            disabled={isRefreshingAll}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-colors cursor-pointer shadow-sm"
          >
            <ArrowsClockwise
              size={14}
              weight="bold"
              className={isRefreshingAll ? 'animate-spin text-white' : 'text-indigo-200'}
            />
            <span>{isRefreshingAll ? 'Updating...' : 'Sync Data'}</span>
          </motion.button>
        </div>
      </div>

      {/* 2.2 USER CP BADGE & KPI METRICS */}
      <div
        className="rounded-3xl p-6 sm:p-7 shadow-xl relative overflow-hidden border"
        style={{
          background: 'linear-gradient(135deg, #161b22 0%, #0d1117 100%)',
          borderColor: userRankTheme.border,
        }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Avatar & Identity */}
          <div className="flex items-center gap-4 sm:gap-5 min-w-0">
            <div className="relative flex-shrink-0">
              <div
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shadow-xl border-2 flex items-center justify-center bg-slate-900"
                style={{ borderColor: userRankTheme.color }}
              >
                {avatarSrc && !avatarImgError ? (
                  <img
                    src={avatarSrc}
                    alt={currentHandle}
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    onError={() => setAvatarImgError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center font-black text-2xl sm:text-3xl text-white select-none"
                    style={{
                      background: `linear-gradient(135deg, ${userRankTheme.color} 0%, #0f172a 100%)`,
                    }}
                  >
                    {(currentHandle || state.user.name || 'C').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow"
                style={{ background: userRankTheme.color }}
              >
                ★
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={`https://codeforces.com/profile/${currentHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xl sm:text-2xl font-black font-mono tracking-tight hover:underline flex items-center gap-1.5"
                  style={{ color: userRankTheme.color }}
                >
                  <span>{currentHandle}</span>
                  <ArrowSquareOut size={14} className="text-slate-500" />
                </a>

                <span
                  className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                  style={{
                    background: userRankTheme.bg,
                    color: userRankTheme.color,
                    border: `1px solid ${userRankTheme.border}`,
                  }}
                >
                  {cfUser?.rank || userRankTheme.title}
                </span>
              </div>

              <div className="text-xs text-slate-400 mt-1 flex items-center gap-3 flex-wrap">
                {cfUser?.organization && (
                  <span className="truncate max-w-xs">{cfUser.organization}</span>
                )}
                {(cfUser?.city || cfUser?.country) && (
                  <span className="flex items-center gap-1">
                    <GlobeHemisphereWest size={13} className="text-slate-500" />
                    <span>{[cfUser.city, cfUser.country].filter(Boolean).join(', ')}</span>
                  </span>
                )}
                <span className="font-mono text-slate-500">
                  Contrib: {cfUser?.contribution ?? 0}
                </span>
              </div>
            </div>
          </div>

          {/* Right: 4 High-Impact KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-shrink-0">
            {/* Current Rating */}
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-center min-w-[100px] shadow-inner">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Rating</span>
              <span
                className="text-xl sm:text-2xl font-black font-mono"
                style={{ color: userRankTheme.color }}
              >
                {cfUser?.rating ?? 0}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
                {cfUser?.rank || 'Unrated'}
              </span>
            </div>

            {/* Peak Rating */}
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-center min-w-[100px] shadow-inner">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Peak Rating</span>
              <span className="text-xl sm:text-2xl font-black font-mono text-amber-400">
                {cfUser?.maxRating ?? 0}
              </span>
              <span className="text-[10px] text-amber-300/80 block mt-0.5 truncate">
                {cfUser?.maxRank || 'Newbie'}
              </span>
            </div>

            {/* Contests Attended */}
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-center min-w-[100px] shadow-inner">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Contests</span>
              <span className="text-xl sm:text-2xl font-black font-mono text-indigo-400">
                {ratingHistory.length}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Participated</span>
            </div>

            {/* Problems Solved */}
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-center min-w-[100px] shadow-inner">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Solved</span>
              <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
                {statusStats?.solvedCount ?? 0}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Problems</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2.3 COMPACT FEATURED CONTEST ARENA CARD */}
      {nextContest && (
        <div
          className="rounded-2xl p-4 sm:p-5 relative overflow-hidden border shadow-lg space-y-4"
          style={{
            background: isLive
              ? 'radial-gradient(ellipse at 50% 0%, #3b0707 0%, #0d1117 80%)'
              : 'radial-gradient(ellipse at 50% 0%, #1e1b4b 0%, #0d1117 80%)',
            borderColor: isLive ? '#ef4444' : '#3730a3',
          }}
        >
          {/* Top Bar: Badges & Suitability Pill */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-1 border-b border-slate-800/80">
            <div className="flex items-center gap-2 flex-wrap">
              {isLive ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                  <span>LIVE NOW</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  <Lightning size={12} weight="fill" className="text-indigo-400" />
                  <span>FEATURED CONTEST</span>
                </span>
              )}

              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-900/90 text-slate-300 border border-slate-700/80">
                #{nextContest.id}
              </span>

              {suitability && (
                <span
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                  style={{
                    background: `${suitability.badgeColor}15`,
                    color: suitability.badgeColor,
                    border: `1px solid ${suitability.badgeColor}35`,
                  }}
                >
                  {suitability.division}
                </span>
              )}
            </div>

            {/* Suitability Badge Pill */}
            {suitability && (
              <div className="flex items-center gap-2">
                <span
                  className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1.5"
                  style={{
                    background: `${suitability.badgeColor}15`,
                    color: suitability.badgeColor,
                    border: `1px solid ${suitability.badgeColor}30`,
                  }}
                >
                  <ShieldCheck size={13} weight="fill" />
                  <span>{suitability.badgeText}</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                  {suitability.matchScore}% Match
                </span>
              </div>
            )}
          </div>

          {/* Main Area: Two Columns (Left: Title, Specs & Actions | Right: Countdown) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            {/* Left Column: Contest Info & Actions */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-3 min-w-0">
              <a
                href={`https://codeforces.com/contest/${nextContest.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-base sm:text-lg font-bold text-slate-100 hover:text-indigo-300 transition-colors line-clamp-2 block leading-snug"
                title={nextContest.name}
              >
                {nextContest.name}
              </a>

              {/* Inline Specs Row */}
              <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-xs text-slate-300">
                <span className="flex items-center gap-1.5 font-mono">
                  <Calendar size={15} className="text-amber-400 flex-shrink-0" />
                  <span>{nextContestIST?.date}</span>
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1.5 font-mono">
                  <Clock size={15} className="text-indigo-400 flex-shrink-0" />
                  <span className="text-amber-300 font-semibold">{nextContestIST?.time}</span>
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1.5 font-mono">
                  <Timer size={15} className="text-emerald-400 flex-shrink-0" />
                  <span>{formatDuration(nextContest.durationSeconds)}</span>
                </span>
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center gap-2.5 pt-0.5 flex-wrap">
                <a
                  href={`https://codeforces.com/contest/${nextContest.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl font-bold text-xs text-white shadow-md cursor-pointer flex items-center gap-1.5 transition-all text-center"
                  style={{
                    background: isLive
                      ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)'
                      : 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                  }}
                >
                  <span>{isLive ? 'Compete Live Now 🚀' : 'Enter Contest'}</span>
                  <ArrowSquareOut size={14} weight="bold" />
                </a>

                <a
                  href={buildGoogleCalendarUrl(nextContest)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl font-semibold text-xs text-slate-200 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="Add to Google Calendar in IST"
                >
                  <CalendarPlus size={14} className="text-amber-400" />
                  <span>Calendar (IST)</span>
                </a>
              </div>
            </div>

            {/* Right Column: Digital Countdown */}
            <div className="lg:col-span-5 xl:col-span-4 flex flex-col items-center lg:items-end justify-center">
              {isLive ? (
                <div className="w-full py-3 px-4 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-center justify-center gap-2 text-rose-200 text-xs font-bold font-mono">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span>ROUND IS ACTIVE — ENTER NOW</span>
                </div>
              ) : (
                <div className="flex flex-col items-center lg:items-end">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 mb-1.5">
                    Starts In
                  </span>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {[
                      { value: countdownBlocks.days, label: 'Days' },
                      { value: countdownBlocks.hours, label: 'Hrs' },
                      { value: countdownBlocks.minutes, label: 'Min' },
                      { value: countdownBlocks.seconds, label: 'Sec' },
                    ].map(b => (
                      <div
                        key={b.label}
                        className="w-13 sm:w-14 py-2 px-1 text-center rounded-xl border relative shadow-sm"
                        style={{
                          background: 'rgba(15, 23, 42, 0.85)',
                          borderColor: 'rgba(99, 102, 241, 0.25)',
                        }}
                      >
                        <div className="text-lg sm:text-xl font-black font-mono tracking-tight text-slate-100">
                          {String(b.value).padStart(2, '0')}
                        </div>
                        <div className="text-[9px] font-bold uppercase tracking-wider text-indigo-300/80 mt-0.5">
                          {b.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Bar: Concise Suitability Strategy Insight */}
          {suitability && (
            <div
              className="px-3.5 py-2 rounded-xl border flex items-center gap-2 text-xs"
              style={{
                background: 'rgba(15, 23, 42, 0.7)',
                borderColor: `${suitability.badgeColor}25`,
              }}
            >
              <Sparkle size={14} weight="fill" className="text-amber-400 flex-shrink-0" />
              <p className="text-slate-300 text-[11px] sm:text-xs leading-tight line-clamp-2">
                <span className="font-semibold text-slate-200">Suitability Note: </span>
                {suitability.explanation}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 2.4 INTERACTIVE RATING PROGRESSION CHART */}
      {ratingHistory.length > 0 && (
        <div
          className="rounded-3xl p-6 sm:p-7 shadow-xl border space-y-4"
          style={{ background: '#161b22', borderColor: '#2d3748' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                <ChartLineUp size={20} className="text-indigo-400" />
                <span>Rating Progression Curve</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Historical rating evolution across {ratingHistory.length} official contests
              </p>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-slate-400">Peak:</span>
              <span className="font-bold text-amber-400">{cfUser?.maxRating ?? 0}</span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-400">Current:</span>
              <span className="font-bold" style={{ color: userRankTheme.color }}>
                {cfUser?.rating ?? 0}
              </span>
            </div>
          </div>

          {/* SVG Line Chart */}
          {(() => {
            const ratings = ratingHistory.map(r => r.newRating);
            const minR = Math.min(...ratings, 1000);
            const maxR = Math.max(...ratings, 1600);
            const range = Math.max(1, maxR - minR);

            const width = 800;
            const height = 220;
            const padding = { top: 20, bottom: 30, left: 45, right: 30 };
            const chartW = width - padding.left - padding.right;
            const chartH = height - padding.top - padding.bottom;

            const points = ratingHistory.map((item, idx) => {
              const x = padding.left + (idx / Math.max(1, ratingHistory.length - 1)) * chartW;
              const y = padding.top + chartH - ((item.newRating - minR) / range) * chartH;
              return { x, y, item };
            });

            const pathD = points.reduce((acc, p, idx) => {
              return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
            }, '');

            const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

            return (
              <div className="relative pt-2">
                <div className="w-full overflow-x-auto no-scrollbar">
                  <svg
                    viewBox={`0 0 ${width} ${height}`}
                    className="w-full min-w-[600px] h-52 select-none"
                  >
                    <defs>
                      <linearGradient id="cfRatingGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal benchmark division guides */}
                    {[1200, 1400, 1600, 1900].map(val => {
                      if (val >= minR && val <= maxR) {
                        const y = padding.top + chartH - ((val - minR) / range) * chartH;
                        const rankStyle = getCodeforcesRankColor(val);
                        return (
                          <g key={val}>
                            <line
                              x1={padding.left}
                              y1={y}
                              x2={width - padding.right}
                              y2={y}
                              stroke={rankStyle.color}
                              strokeDasharray="4 4"
                              strokeOpacity="0.25"
                            />
                            <text
                              x={padding.left - 8}
                              y={y + 3}
                              fill={rankStyle.color}
                              fontSize="9"
                              fontFamily="JetBrains Mono, monospace"
                              textAnchor="end"
                              opacity="0.75"
                            >
                              {val}
                            </text>
                          </g>
                        );
                      }
                      return null;
                    })}

                    {/* Area fill under curve */}
                    <path d={areaD} fill="url(#cfRatingGradient)" />

                    {/* Spline Line */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#818cf8"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />

                    {/* Data Points */}
                    {points.map((p, idx) => {
                      const isHovered = hoveredRating?.contestId === p.item.contestId;
                      const isMax = p.item.newRating === cfUser?.maxRating;
                      const pTheme = getCodeforcesRankColor(p.item.newRating);

                      return (
                        <g key={p.item.contestId}>
                          {isMax && (
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r={8}
                              fill="none"
                              stroke="#f59e0b"
                              strokeWidth="1.5"
                              strokeDasharray="2 2"
                              className="animate-spin"
                            />
                          )}
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={isHovered ? 6 : isMax ? 4.5 : 3.5}
                            fill={pTheme.color}
                            stroke="#0d1117"
                            strokeWidth="2"
                            className="cursor-pointer transition-all"
                            onMouseEnter={() => setHoveredRating(p.item)}
                            onMouseLeave={() => setHoveredRating(null)}
                          />
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Tooltip Card */}
                {hoveredRating && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl bg-slate-900 border border-slate-700 shadow-xl max-w-xs text-xs space-y-1"
                  >
                    <div className="font-bold text-slate-100 truncate">{hoveredRating.contestName}</div>
                    <div className="flex items-center justify-between text-slate-400 font-mono text-[11px]">
                      <span>Rank: #{hoveredRating.rank}</span>
                      <span
                        className="font-bold"
                        style={{
                          color: hoveredRating.newRating >= hoveredRating.oldRating ? '#10b981' : '#ef4444',
                        }}
                      >
                        {hoveredRating.newRating >= hoveredRating.oldRating ? '+' : ''}
                        {hoveredRating.newRating - hoveredRating.oldRating} pts
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      Result: <strong className="text-indigo-300">{hoveredRating.newRating}</strong>
                    </div>
                  </motion.div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* 2.5 UPCOMING CONTESTS SCHEDULE & TOURNAMENTS */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Calendar size={22} className="text-amber-400" />
              <span>Upcoming Official Contests</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Future scheduled rounds from Codeforces calendar with Indian Standard Time schedules
            </p>
          </div>

          {/* Division Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: 'all', label: 'All' },
              { id: 'div1', label: 'Div 1' },
              { id: 'div2', label: 'Div 2' },
              { id: 'div3', label: 'Div 3' },
              { id: 'div4', label: 'Div 4' },
              { id: 'edu', label: 'Educational' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedDivisionFilter(tab.id)}
                className={`text-[11px] font-semibold px-3 py-1.5 rounded-xl transition-all cursor-pointer flex-shrink-0 ${
                  selectedDivisionFilter === tab.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={contestSearchQuery}
            onChange={e => setContestSearchQuery(e.target.value)}
            placeholder="Search upcoming rounds by name or contest ID..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs outline-none bg-slate-900 border border-slate-800 focus:border-indigo-500 text-slate-200 transition-colors"
          />
        </div>

        {/* List of Contests */}
        {filteredContests.length === 0 ? (
          <div
            className="rounded-2xl p-8 text-center text-xs text-slate-400 border border-dashed border-slate-700"
            style={{ background: '#161b22' }}
          >
            No upcoming contests matched your search or division filter.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredContests.slice(0, 10).map(c => {
              const ist = formatIST(c.startTimeSeconds);
              const suit = analyzeContestSuitability(c.name, cfUser?.rating || 0);

              return (
                <div
                  key={c.id}
                  className="rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-slate-500 shadow-sm group"
                  style={{ background: '#161b22', border: '1px solid #2d3748' }}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-slate-900 text-slate-300 font-mono border border-slate-700">
                        #{c.id}
                      </span>
                      <span
                        className="text-[11px] font-bold px-2 py-0.5 rounded-md"
                        style={{
                          background: `${suit.badgeColor}15`,
                          color: suit.badgeColor,
                          border: `1px solid ${suit.badgeColor}30`,
                        }}
                      >
                        {suit.badgeText}
                      </span>
                      <span className="text-xs text-slate-400 font-mono font-medium">
                        {suit.division}
                      </span>
                    </div>

                    <h4 className="text-sm sm:text-base font-bold text-slate-100 group-hover:text-indigo-300 transition-colors truncate">
                      {c.name}
                    </h4>

                    <div className="text-xs text-slate-400 font-mono flex items-center gap-2 flex-wrap">
                      <span className="text-amber-300 font-medium">{ist.full}</span>
                      <span>·</span>
                      <span>Duration: {formatDuration(c.durationSeconds)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 self-start md:self-center">
                    <a
                      href={buildGoogleCalendarUrl(c)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Add to Google Calendar in IST"
                    >
                      <CalendarPlus size={16} />
                    </a>

                    <a
                      href={`https://codeforces.com/contest/${c.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer shadow-xs"
                    >
                      <span>Open Page</span>
                      <ArrowSquareOut size={13} weight="bold" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2.6 CONTEST HISTORY LOG */}
      {ratingHistory.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <ListBullets size={20} className="text-indigo-400" />
              <span>Contest Performance History</span>
            </h3>
            <span className="text-xs font-mono text-slate-400">
              {ratingHistory.length} participated
            </span>
          </div>

          <div
            className="rounded-2xl overflow-hidden border border-slate-800 shadow-md"
            style={{ background: '#161b22' }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5">Contest Name</th>
                    <th className="px-4 py-3.5">Date</th>
                    <th className="px-4 py-3.5">Rank</th>
                    <th className="px-4 py-3.5">Old Rating</th>
                    <th className="px-4 py-3.5">New Rating</th>
                    <th className="px-5 py-3.5 text-right">Rating Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {[...ratingHistory].reverse().map(h => {
                    const diff = h.newRating - h.oldRating;
                    const istDate = formatIST(h.ratingUpdateTimeSeconds).date;
                    const changeTheme = getCodeforcesRankColor(h.newRating);

                    return (
                      <tr key={h.contestId} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-3 font-sans font-semibold text-slate-100">
                          <a
                            href={`https://codeforces.com/contest/${h.contestId}/standings`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-indigo-400 flex items-center gap-1.5 truncate max-w-sm block"
                          >
                            <span>{h.contestName}</span>
                            <ArrowSquareOut size={12} className="text-slate-500 flex-shrink-0" />
                          </a>
                        </td>
                        <td className="px-4 py-3 text-slate-400">{istDate}</td>
                        <td className="px-4 py-3 font-bold text-amber-300">#{h.rank}</td>
                        <td className="px-4 py-3 text-slate-400">{h.oldRating}</td>
                        <td className="px-4 py-3 font-bold" style={{ color: changeTheme.color }}>
                          {h.newRating}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span
                            className={`px-2.5 py-0.5 rounded-md font-bold text-[11px] ${
                              diff >= 0
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {diff >= 0 ? `+${diff}` : diff}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
