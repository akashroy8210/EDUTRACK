import { useState } from 'react';
import { AppState, HabitItem } from '@/data/types';
import { getTodayDate } from '@/data/store';
import HabitsBarChart from '@/components/charts/HabitsBarChart';
import { commonWorksApi } from '@/api/client';
import { toast } from 'sonner';
import { Fire, Plus, Trash, CheckCircle, Calendar, Sparkle, PencilSimple, Lock } from '@phosphor-icons/react';
import { motion } from 'framer-motion';

interface Props {
  state: AppState;
  onUpdate: (habits: HabitItem[]) => void;
}

const ICONS = ['🏃', '🚿', '⏰', '💻', '📚', '📵', '🧘', '🥗', '💧', '🎯', '✍️', '🎸', '🌿', '🏋️', '🧹'];
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#8b5cf6', '#ef4444', '#f97316', '#ec4899'];

export default function Habits({ state, onUpdate }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [newText, setNewText] = useState('');
  const [newIcon, setNewIcon] = useState('🎯');
  const [newColor, setNewColor] = useState('#6366f1');

  // Edit Habit state (respects 7-day cooldown rule)
  const [editingHabit, setEditingHabit] = useState<HabitItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editIcon, setEditIcon] = useState('🎯');
  const [editColor, setEditColor] = useState('#6366f1');

  const today = getTodayDate();

  const startEditHabit = (h: HabitItem) => {
    if (h.isEditable === false) {
      toast.error(`Common Work habit can only be edited once every 7 days. Next edit available in ${h.daysRemainingForEdit || 7} day(s).`);
      return;
    }
    setEditingHabit(h);
    setEditTitle(h.text);
    setEditIcon(h.icon);
    setEditColor(h.color);
  };

  const saveEditHabit = async () => {
    if (!editingHabit || !editTitle.trim()) return;
    try {
      await commonWorksApi.update(editingHabit.id, {
        title: editTitle.trim(),
        icon: editIcon,
        color: editColor,
      });
      onUpdate(
        state.habits.map(h =>
          h.id === editingHabit.id
            ? {
                ...h,
                text: editTitle.trim(),
                icon: editIcon,
                color: editColor,
                isEditable: false,
                daysRemainingForEdit: 7,
              }
            : h
        )
      );
      toast.success(`Updated habit: "${editTitle.trim()}"`);
      setEditingHabit(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update habit.');
    }
  };

  const toggle = async (id: string) => {
    const habit = state.habits.find(h => h.id === id);
    const willBeDone = !habit?.completionHistory[today];
    try {
      await commonWorksApi.toggle(id, today);
    } catch {}
    onUpdate(
      state.habits.map(h => {
        if (h.id !== id) return h;
        const history = { ...h.completionHistory };
        history[today] = !history[today];
        return { ...h, completionHistory: history };
      })
    );
    if (willBeDone) {
      toast.success(`Completed habit: "${habit?.text}" 🔥`);
    } else {
      toast.info(`Habit unchecked: "${habit?.text}"`);
    }
  };

  const addHabit = async () => {
    if (!newText.trim()) return;
    try {
      const res = await commonWorksApi.create({
        title: newText.trim(),
        icon: newIcon,
        color: newColor,
      });
      const created = res.habit || res;
      const h: HabitItem = {
        id: created._id || created.id || `h${Date.now()}`,
        text: created.title || newText.trim(),
        icon: created.icon || newIcon,
        color: created.color || newColor,
        completionHistory: { [today]: false }
      };
      onUpdate([...state.habits, h]);
    } catch {
      const h: HabitItem = {
        id: `h${Date.now()}`,
        text: newText.trim(),
        icon: newIcon,
        color: newColor,
        completionHistory: { [today]: false }
      };
      onUpdate([...state.habits, h]);
    }
    toast.success(`Added new daily habit: "${newText.trim()}"`);
    setNewText('');
    setNewIcon('🎯');
    setNewColor('#6366f1');
    setShowAdd(false);
  };

  const removeHabit = async (id: string) => {
    const habit = state.habits.find(h => h.id === id);
    try {
      await commonWorksApi.delete(id);
    } catch {}
    onUpdate(state.habits.filter(h => h.id !== id));
    toast.info(`Removed habit: "${habit?.text || ''}"`);
  };

  // 14 days metadata with clear dates & weekdays
  const days14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const ds = d.toISOString().split('T')[0];
    return {
      date: d,
      ds,
      dayNum: d.getDate(),
      weekday: d.toLocaleDateString('en', { weekday: 'narrow' }),
      shortWeekday: d.toLocaleDateString('en', { weekday: 'short' }),
      formatted: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      isToday: ds === today,
    };
  });

  // 14-day completion analytics for chart
  const last14 = days14.map(d => {
    const done = state.habits.filter(h => h.completionHistory[d.ds]).length;
    return {
      day: `${d.dayNum} ${d.shortWeekday}`,
      done,
      total: state.habits.length,
      pct: state.habits.length > 0 ? Math.round((done / state.habits.length) * 100) : 0
    };
  });

  const todayDone = state.habits.filter(h => h.completionHistory[today]).length;
  const totalHabits = state.habits.length;

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5" style={{ color: '#e2e8f0' }}>
            <Fire size={26} weight="duotone" className="text-amber-400" />
            <span>Daily Habits</span>
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
            Track daily discipline, study routines, and personal wellness
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowAdd(!showAdd)}
          className="text-xs px-4 py-2 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
        >
          <Plus size={14} weight="bold" />
          <span>Add Habit</span>
        </motion.button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl p-4 text-center shadow-sm" style={{ background: '#161b22', border: '1px solid #2d3748' }}>
          <div className="text-2xl font-bold flex items-center justify-center gap-1.5" style={{ color: '#10b981', fontFamily: 'JetBrains Mono, monospace' }}>
            <span>{todayDone}/{totalHabits}</span>
            <CheckCircle size={20} weight="duotone" className="text-emerald-400" />
          </div>
          <div className="text-xs mt-1" style={{ color: '#64748b' }}>done today</div>
        </div>

        <div className="rounded-2xl p-4 text-center shadow-sm" style={{ background: '#161b22', border: '1px solid #2d3748' }}>
          <div className="text-2xl font-bold flex items-center justify-center gap-1.5" style={{ color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace' }}>
            <span>{streak}</span>
            <Fire size={22} weight="fill" className="text-amber-400" />
          </div>
          <div className="text-xs mt-1" style={{ color: '#64748b' }}>day streak</div>
        </div>

        <div className="rounded-2xl p-4 text-center shadow-sm" style={{ background: '#161b22', border: '1px solid #2d3748' }}>
          <div className="text-2xl font-bold flex items-center justify-center gap-1.5" style={{ color: '#6366f1', fontFamily: 'JetBrains Mono, monospace' }}>
            <span>{totalHabits > 0 ? Math.round((todayDone / totalHabits) * 100) : 0}%</span>
            <Sparkle size={18} weight="fill" className="text-indigo-400" />
          </div>
          <div className="text-xs mt-1" style={{ color: '#64748b' }}>completion rate</div>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="rounded-xl p-5 space-y-4" style={{ background: '#161b22', border: '1px solid #6366f1' }}>
          <div className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>New Daily Habit</div>
          <div className="flex gap-3">
            <input
              value={newText}
              onChange={e => setNewText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addHabit()}
              placeholder="Habit description (e.g. Solve 3 LeetCode problems)..."
              className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: '#0d1117', border: '1px solid #2d3748', color: '#e2e8f0' }}
            />
          </div>
          <div>
            <div className="text-xs mb-2" style={{ color: '#64748b' }}>Choose icon</div>
            <div className="flex flex-wrap gap-2">
              {ICONS.map(icon => (
                <button
                  key={icon}
                  onClick={() => setNewIcon(icon)}
                  className="text-lg w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                  style={{
                    background: newIcon === icon ? '#6366f1' : '#0d1117',
                    border: `1px solid ${newIcon === icon ? '#6366f1' : '#2d3748'}`
                  }}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs mb-2" style={{ color: '#64748b' }}>Choose color</div>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className="w-7 h-7 rounded-full transition-all"
                  style={{
                    background: c,
                    border: `2px solid ${newColor === c ? '#fff' : 'transparent'}`,
                    transform: newColor === c ? 'scale(1.15)' : 'scale(1)'
                  }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addHabit} className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white">
              Add Habit
            </button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg text-xs bg-slate-700 text-slate-300">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Today's checklist */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#161b22', border: '1px solid #2d3748' }}>
        <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ background: '#1c2230', borderColor: '#2d3748' }}>
          <div className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Today's Habit Checklist</div>
          <span className="text-xs font-mono text-slate-400">{today}</span>
        </div>
        <div className="divide-y" style={{ borderColor: '#2d374840' }}>
          {state.habits.map(h => {
            const done = !!h.completionHistory[today];
            return (
              <div key={h.id} className="flex items-center gap-4 px-5 py-3.5 group hover:bg-slate-800/20 transition-colors">
                <button
                  onClick={() => toggle(h.id)}
                  className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-all cursor-pointer"
                  style={{
                    background: done ? h.color : 'transparent',
                    border: `2px solid ${done ? h.color : '#4b5563'}`
                  }}
                >
                  {done && <span className="text-white text-xs font-bold">✓</span>}
                </button>
                <span className="text-xl">{h.icon}</span>
                <span
                  className="flex-1 text-sm font-medium"
                  style={{
                    color: done ? '#64748b' : '#e2e8f0',
                    textDecoration: done ? 'line-through' : 'none'
                  }}
                >
                  {h.text}
                </span>
                {h.isEditable === false && (
                  <span
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 flex-shrink-0"
                    title={`7-day edit cooldown: next edit available in ${h.daysRemainingForEdit ?? 7} day(s)`}
                  >
                    <Lock size={10} weight="bold" />
                    <span>{h.daysRemainingForEdit ?? 7}d cooldown</span>
                  </span>
                )}
                {done && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: `${h.color}15`, color: h.color }}>
                    Done!
                  </span>
                )}
                <div className="flex items-center gap-1 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEditHabit(h)}
                    title={h.isEditable === false ? `Editable in ${h.daysRemainingForEdit ?? 7} day(s)` : 'Edit habit'}
                    className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      h.isEditable === false
                        ? 'text-slate-500 hover:text-amber-400 bg-slate-800/40'
                        : 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10'
                    }`}
                  >
                    <PencilSimple size={14} />
                  </button>
                  <button
                    onClick={() => removeHabit(h.id)}
                    title="Delete habit"
                    className="text-xs text-rose-400 hover:text-rose-300 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              </div>
            );
          })}
          {state.habits.length === 0 && (
            <div className="px-5 py-8 text-center" style={{ color: '#475569' }}>
              <div className="text-3xl mb-2">🌱</div>
              <div className="text-sm">Add your first daily habit above</div>
            </div>
          )}
        </div>
      </div>

      {/* 14-Day Analytics Graph with increased height */}
      <div className="rounded-xl p-4 sm:p-6" style={{ background: '#161b22', border: '1px solid #2d3748' }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-base font-semibold" style={{ color: '#e2e8f0' }}>14-Day Completion Analytics</div>
            <div className="text-xs text-slate-400">Total number of habits completed each day across the past two weeks</div>
          </div>
        </div>
        <HabitsBarChart data={last14} />
        <div className="flex gap-4 mt-4 justify-center border-t pt-3" style={{ borderColor: '#2d3748' }}>
          {[['#10b981', '≥80% Completed'], ['#f59e0b', '50–79% Completed'], ['#6366f1', '<50% Completed']].map(([c, l]) => (
            <div key={l} className="flex items-center gap-1.5 text-xs text-slate-400">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
              <span>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Per-habit history heatmap with clearly visible DATES */}
      <div className="rounded-xl p-4 sm:p-6" style={{ background: '#161b22', border: '1px solid #2d3748' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-base font-semibold" style={{ color: '#e2e8f0' }}>Per-Habit — Last 14 Days</div>
            <div className="text-xs text-slate-400">Day-by-day streak matrix with calendar dates</div>
          </div>
          <div className="text-xs font-mono text-indigo-400">14-Day Window</div>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="min-w-[640px] space-y-3">
            {/* Header row with visible dates and days */}
            <div className="flex items-end gap-3 pb-2 border-b" style={{ borderColor: '#2d3748' }}>
              <div className="w-48 flex-shrink-0 text-xs font-semibold text-slate-400">
                Habit Routine
              </div>
              <div className="flex-1 grid grid-cols-14 gap-1.5 text-center">
                {days14.map(d => (
                  <div
                    key={d.ds}
                    className="flex flex-col items-center py-1 rounded"
                    style={{
                      background: d.isToday ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                      border: d.isToday ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid transparent',
                    }}
                    title={d.formatted}
                  >
                    <span
                      className="text-[11px] font-bold font-mono"
                      style={{ color: d.isToday ? '#a5b4fc' : '#e2e8f0' }}
                    >
                      {d.dayNum}
                    </span>
                    <span
                      className="text-[9px] uppercase font-mono"
                      style={{ color: d.isToday ? '#818cf8' : '#64748b' }}
                    >
                      {d.shortWeekday}
                    </span>
                  </div>
                ))}
              </div>
              <div className="w-12 text-right text-xs font-semibold text-slate-400 flex-shrink-0">
                Score
              </div>
            </div>

            {/* Habit Rows */}
            {state.habits.map(h => {
              const doneCount = days14.filter(d => !!h.completionHistory[d.ds]).length;
              return (
                <div key={h.id} className="flex items-center gap-3 py-1.5 hover:bg-white/5 rounded-lg px-1 transition-colors">
                  <div className="w-48 flex items-center gap-2 flex-shrink-0 min-w-0">
                    <span className="text-base flex-shrink-0">{h.icon}</span>
                    <span className="text-xs font-medium truncate text-slate-200" title={h.text}>
                      {h.text}
                    </span>
                  </div>

                  {/* 14 Day Cells */}
                  <div className="flex-1 grid grid-cols-14 gap-1.5">
                    {days14.map(d => {
                      const done = !!h.completionHistory[d.ds];
                      return (
                        <div
                          key={d.ds}
                          className="h-6 rounded flex items-center justify-center transition-all cursor-pointer"
                          style={{
                            background: done ? h.color : '#1c2230',
                            border: `1px solid ${done ? h.color : '#2d3748'}`,
                            opacity: done ? 0.95 : 0.6,
                          }}
                          title={`${h.text}: ${d.formatted} (${done ? 'Completed' : 'Missed'})`}
                        >
                          {done ? (
                            <span className="text-[10px] text-white font-bold leading-none">✓</span>
                          ) : (
                            <span className="text-[8px] text-slate-600 leading-none">·</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* 14-Day Score */}
                  <div
                    className="w-12 text-right text-xs font-bold font-mono flex-shrink-0"
                    style={{ color: doneCount >= 10 ? '#10b981' : doneCount >= 6 ? '#f59e0b' : '#818cf8' }}
                  >
                    {doneCount}/14
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Edit Habit Modal (Enforces 7-day cooldown rule) */}
      {editingHabit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl p-4 sm:p-6 w-full max-w-md space-y-4"
            style={{ background: '#161b22', border: '1px solid #334155' }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: '#2d3748' }}>
              <div className="flex items-center gap-2">
                <PencilSimple size={18} className="text-indigo-400" />
                <h3 className="text-sm font-semibold text-slate-100">Edit Common Work Habit</h3>
              </div>
              <button
                onClick={() => setEditingHabit(null)}
                className="text-slate-400 hover:text-slate-200 text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1.5 font-medium">Habit Title</label>
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                placeholder="e.g. Morning Workout"
                className="w-full rounded-xl px-4 py-2.5 text-xs outline-none"
                style={{ background: '#0d1117', border: '1px solid #2d3748', color: '#e2e8f0' }}
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1.5 font-medium">Choose Icon</label>
              <div className="flex flex-wrap gap-2">
                {ICONS.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setEditIcon(icon)}
                    className="text-lg w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer"
                    style={{
                      background: editIcon === icon ? '#6366f1' : '#0d1117',
                      border: `1px solid ${editIcon === icon ? '#6366f1' : '#2d3748'}`
                    }}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1.5 font-medium">Choose Color</label>
              <div className="flex gap-2">
                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEditColor(c)}
                    className="w-7 h-7 rounded-full transition-all cursor-pointer"
                    style={{
                      background: c,
                      border: `2px solid ${editColor === c ? '#fff' : 'transparent'}`,
                      transform: editColor === c ? 'scale(1.15)' : 'scale(1)'
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 leading-relaxed">
              ⚠️ <strong>7-Day Rule:</strong> Once edited, this habit will enter a strict 7-day cooldown window before further changes are permitted.
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={saveEditHabit}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer transition-colors shadow"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => setEditingHabit(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
