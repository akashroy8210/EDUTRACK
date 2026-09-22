import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { socialMediaApi } from '@/api/client';
import {
  Globe,
  Plus,
  Lock,
  Clock,
  ChartBar,
  ShieldCheck,
  CalendarCheck,
  Warning,
  Sparkle,
} from '@phosphor-icons/react';

interface Platform {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface SocialRecord {
  id: string;
  platformId: string;
  platformName: string;
  date: string;
  minutesSpent: number;
}

const DEFAULT_PLATFORMS: Platform[] = [
  { id: 'p1', name: 'Instagram', color: '#e1306c', icon: 'Camera' },
  { id: 'p2', name: 'YouTube', color: '#ff0000', icon: 'Play' },
  { id: 'p3', name: 'Reddit', color: '#ff4500', icon: 'Chat' },
  { id: 'p4', name: 'Twitter / X', color: '#38bdf8', icon: 'Twitter' },
];

export default function SocialMedia() {
  const [platforms, setPlatforms] = useState<Platform[]>(() => {
    try {
      const saved = localStorage.getItem('student_social_platforms');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Filter out legacy dummy non-ObjectId items like 'p1', 'p2'
        const valid = parsed.filter((p: any) => p.id && !p.id.startsWith('p'));
        if (valid.length > 0) return valid;
      }
    } catch {}
    return [];
  });

  const [records, setRecords] = useState<SocialRecord[]>(() => {
    try {
      const saved = localStorage.getItem('student_social_records');
      return saved ? JSON.parse(saved) : [];
    } catch {}
    return [];
  });

  const [selectedPlatform, setSelectedPlatform] = useState<string>(platforms[0]?.id || '');
  const [minutes, setMinutes] = useState<string>('30');
  const [newPlatformName, setNewPlatformName] = useState('');
  const [newPlatformColor, setNewPlatformColor] = useState('#6366f1');
  const [showAddPlatform, setShowAddPlatform] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const fetchRecords = async () => {
    try {
      const res = await socialMediaApi.getRecords();
      if (res?.records) {
        setRecords(res.records.map((r: any) => ({
          id: r._id || r.id,
          platformId: typeof r.platformId === 'object' ? r.platformId?._id : r.platformId,
          platformName: typeof r.platformId === 'object' ? r.platformId?.name : (r.platformName || 'App'),
          date: r.date,
          minutesSpent: r.minutesSpent,
        })));
      }
    } catch (err) {
      console.warn('Could not fetch social records from backend:', err);
    }
  };

  const fetchPlatforms = async () => {
    try {
      const res = await socialMediaApi.getPlatforms();
      if (res?.platforms && res.platforms.length > 0) {
        const mapped = res.platforms.map((p: any) => ({
          id: p._id || p.id,
          name: p.name,
          color: p.color || '#6366f1',
          icon: p.icon || 'Globe',
        }));
        setPlatforms(mapped);
        setSelectedPlatform(prev => (prev && mapped.some((m: any) => m.id === prev) ? prev : mapped[0].id));
      }
    } catch (err) {
      console.warn('Could not fetch platforms from backend:', err);
    }
  };

  useEffect(() => {
    fetchPlatforms();
    fetchRecords();
  }, []);

  useEffect(() => {
    localStorage.setItem('student_social_platforms', JSON.stringify(platforms));
  }, [platforms]);

  useEffect(() => {
    localStorage.setItem('student_social_records', JSON.stringify(records));
  }, [records]);

  const addPlatform = async () => {
    if (!newPlatformName.trim()) return;
    try {
      const res = await socialMediaApi.createPlatform({
        name: newPlatformName.trim(),
        color: newPlatformColor,
        icon: 'Globe',
      });
      await fetchPlatforms();
      toast.success(`Added platform: ${newPlatformName.trim()}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create platform on backend');
    }
    setNewPlatformName('');
    setShowAddPlatform(false);
  };

  const handleLogUsage = async () => {
    const mins = parseInt(minutes, 10);
    if (isNaN(mins) || mins < 0) {
      toast.error('Please enter a valid number of minutes');
      return;
    }

    const plat = platforms.find(p => p.id === selectedPlatform);
    if (!plat) {
      toast.error('Please select a platform');
      return;
    }

    try {
      await socialMediaApi.logUsage({
        platformId: plat.id,
        date: today,
        minutesSpent: mins,
      });
      await fetchRecords();
      toast.success(`Logged ${mins} minutes for ${plat.name} to database`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to log usage to database');
    }
  };

  // Today's total screen time
  const todayRecords = records.filter(r => r.date === today);
  const todayTotalMins = todayRecords.reduce((s, r) => s + r.minutesSpent, 0);

  // Grouped 7-day usage
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const ds = d.toISOString().split('T')[0];
    const dayRecords = records.filter(r => r.date === ds);
    const total = dayRecords.reduce((s, r) => s + r.minutesSpent, 0);
    return {
      date: ds,
      day: d.toLocaleDateString('en', { weekday: 'short' }),
      totalMinutes: total,
    };
  });

  const maxDaily = Math.max(...last7Days.map(d => d.totalMinutes), 60);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5 text-slate-100">
            <Globe size={26} weight="duotone" className="text-pink-400" />
            <span>Social Media Tracking</span>
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Track and monitor your daily digital wellbeing and screen time
          </p>
        </div>

        <button
          onClick={() => setShowAddPlatform(true)}
          className="flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-xl font-semibold bg-pink-500/15 text-pink-300 hover:bg-pink-500/25 border border-pink-500/30 transition-all cursor-pointer"
        >
          <Plus size={14} weight="bold" />
          <span>Add Platform</span>
        </button>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
        <div className="rounded-2xl p-3 sm:p-4" style={{ background: '#161b22', border: '1px solid #2d3748' }}>
          <div className="text-[11px] sm:text-xs text-slate-400">Today's Screen Time</div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-pink-400 mt-1">
            {Math.floor(todayTotalMins / 60)}h {todayTotalMins % 60}m
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">{todayTotalMins} mins total</div>
        </div>

        <div className="rounded-2xl p-3 sm:p-4" style={{ background: '#161b22', border: '1px solid #2d3748' }}>
          <div className="text-[11px] sm:text-xs text-slate-400">Tracked Platforms</div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-indigo-400 mt-1">
            {platforms.length}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">Active monitoring</div>
        </div>

        <div className="rounded-2xl p-3 sm:p-4" style={{ background: '#161b22', border: '1px solid #2d3748' }}>
          <div className="text-[11px] sm:text-xs text-slate-400">History Lock Status</div>
          <div className="text-xs sm:text-sm font-bold font-mono text-emerald-400 mt-2 flex items-center gap-1 sm:gap-1.5">
            <Lock size={15} weight="fill" />
            <span>Immutable</span>
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1">Past days locked</div>
        </div>

        <div className="rounded-2xl p-3 sm:p-4" style={{ background: '#161b22', border: '1px solid #2d3748' }}>
          <div className="text-[11px] sm:text-xs text-slate-400">Today's Date</div>
          <div className="text-xs sm:text-sm font-bold font-mono text-amber-300 mt-2 flex items-center gap-1 sm:gap-1.5">
            <CalendarCheck size={15} weight="duotone" />
            <span className="truncate">{today}</span>
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1">Active window</div>
        </div>
      </div>

      {/* Daily Usage Log Form & Weekly Chart */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Form */}
        <div className="rounded-2xl p-4 sm:p-5 space-y-4" style={{ background: '#161b22', border: '1px solid #2d3748' }}>
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: '#2d3748' }}>
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Clock size={18} weight="duotone" className="text-pink-400" />
              <span>Log Usage for Today</span>
            </h2>
            <span className="text-xs text-slate-400 font-mono">{today}</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Select Platform
            </label>
            <div className="grid grid-cols-2 gap-2">
              {platforms.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlatform(p.id)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer text-left"
                  style={{
                    background: selectedPlatform === p.id ? `${p.color}25` : '#0d1117',
                    border: `1px solid ${selectedPlatform === p.id ? p.color : '#2d3748'}`,
                    color: selectedPlatform === p.id ? '#fff' : '#94a3b8',
                  }}
                >
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
                  <span className="truncate">{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Minutes Spent
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                value={minutes}
                onChange={e => setMinutes(e.target.value)}
                placeholder="e.g. 45"
                className="flex-1 rounded-xl px-3.5 py-2.5 text-xs outline-none text-slate-200 font-mono min-w-0"
                style={{ background: '#0d1117', border: '1px solid #2d3748' }}
              />
              <button
                onClick={handleLogUsage}
                className="px-4 sm:px-5 py-2.5 rounded-xl text-xs font-semibold bg-pink-600 hover:bg-pink-500 text-white transition-all cursor-pointer flex items-center gap-1.5 flex-shrink-0"
              >
                <span>Save Usage</span>
              </button>
            </div>
          </div>

          {/* Today's breakdown */}
          <div className="pt-2">
            <div className="text-xs font-semibold text-slate-400 mb-2">Today's Recorded Breakdown</div>
            {todayRecords.length === 0 ? (
              <div className="text-xs text-slate-500 italic py-2">No usage logged for today yet.</div>
            ) : (
              <div className="space-y-2">
                {todayRecords.map(r => (
                  <div key={r.id} className="flex items-center justify-between text-xs px-3.5 py-2 rounded-xl" style={{ background: '#0d1117', border: '1px solid #2d3748' }}>
                    <span className="text-slate-200 font-medium truncate mr-2">{r.platformName}</span>
                    <span className="font-mono text-pink-400 font-bold flex-shrink-0">{r.minutesSpent} mins</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Weekly Chart */}
        <div className="rounded-2xl p-4 sm:p-5" style={{ background: '#161b22', border: '1px solid #2d3748' }}>
          <div className="flex items-center justify-between mb-4 border-b pb-3" style={{ borderColor: '#2d3748' }}>
            <div>
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <ChartBar size={18} weight="duotone" className="text-pink-400" />
                <span>Last 7 Days Screen Time</span>
              </h2>
              <p className="text-xs text-slate-400">Total minutes across all platforms</p>
            </div>
          </div>

          <div className="h-44 flex items-end justify-between gap-1.5 sm:gap-3 pt-4 px-1 sm:px-2">
            {last7Days.map(d => {
              const barHeight = Math.max(12, Math.round((d.totalMinutes / maxDaily) * 120));
              const isToday = d.date === today;

              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5 sm:gap-2 h-full justify-end min-w-0">
                  <div className="text-[9px] sm:text-[10px] font-mono font-bold text-slate-400 truncate">
                    {d.totalMinutes > 0 ? `${d.totalMinutes}m` : '0'}
                  </div>
                  <div
                    className="w-full rounded-t-lg transition-all"
                    style={{
                      height: `${barHeight}px`,
                      background: isToday
                        ? 'linear-gradient(180deg, #f43f5e 0%, #be123c 100%)'
                        : 'linear-gradient(180deg, #ec4899 0%, #be185d 100%)',
                      opacity: d.totalMinutes > 0 ? 1 : 0.2,
                    }}
                  />
                  <div className={`text-[10px] sm:text-[11px] font-mono ${isToday ? 'text-pink-400 font-bold' : 'text-slate-500'}`}>
                    {d.day}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add Platform Modal */}
      {showAddPlatform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="rounded-2xl p-5 sm:p-6 max-w-sm w-full shadow-2xl border" style={{ background: '#161b22', borderColor: '#2d3748' }}>
            <h3 className="text-base font-semibold text-slate-100 mb-4">Add Tracked Platform</h3>
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-semibold">Platform Name</label>
                <input
                  value={newPlatformName}
                  onChange={e => setNewPlatformName(e.target.value)}
                  placeholder="e.g. TikTok, Discord, Netflix"
                  className="w-full rounded-xl px-3.5 py-2 text-xs outline-none text-slate-200"
                  style={{ background: '#0d1117', border: '1px solid #2d3748' }}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-semibold">Theme Color</label>
                <div className="flex gap-2">
                  {['#ec4899', '#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#6366f1', '#8b5cf6'].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewPlatformColor(c)}
                      className="w-7 h-7 rounded-full border-2 cursor-pointer transition-transform hover:scale-110"
                      style={{ background: c, borderColor: newPlatformColor === c ? '#fff' : 'transparent' }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button
                onClick={() => setShowAddPlatform(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={addPlatform}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-pink-600 hover:bg-pink-500 text-white cursor-pointer"
              >
                Add Platform
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
