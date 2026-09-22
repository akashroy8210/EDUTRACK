import { useState } from 'react';
import { AppState, Ambition, AmbitionAchievement } from '@/data/types';
import { getTodayDate } from '@/data/store';
import { goalsApi } from '@/api/client';
import { toast } from 'sonner';
import {
  Target,
  Trophy,
  Plus,
  Trash,
  PencilSimple,
  Calendar,
  CheckCircle,
  Lightning,
  Rocket,
} from '@phosphor-icons/react';
import { motion } from 'framer-motion';

interface Props {
  state: AppState;
  onUpdate: (ambitions: Ambition[]) => void;
}

const TYPE_META: Record<
  'one-month' | 'short-term' | 'long-term',
  { label: string; color: string; icon: any; desc: string }
> = {
  'one-month': {
    label: '1-Month Goal',
    color: '#06b6d4',
    icon: Target,
    desc: 'Current month focus — achievable within 30 days'
  },
  'short-term': {
    label: 'Short-term Goal',
    color: '#6366f1',
    icon: Lightning,
    desc: 'Semester milestones, projects, interview prep sprints'
  },
  'long-term': {
    label: 'Long-term Ambition',
    color: '#8b5cf6',
    icon: Rocket,
    desc: 'Career goals, FAANG offers, graduation vision'
  },
};

export default function Ambitions({ state, onUpdate }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'one-month' | 'short-term' | 'long-term'>('all');

  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'one-month' as Ambition['type'],
    deadline: '',
  });

  const [newAchievementText, setNewAchievementText] = useState<Record<string, string>>({});

  const today = getTodayDate();

  const openAdd = () => {
    setForm({
      title: '',
      description: '',
      type: 'one-month',
      deadline: '',
    });
    setEditingId(null);
    setShowForm(true);
  };

  const startEdit = (a: Ambition) => {
    setForm({
      title: a.title,
      description: a.description,
      type: a.type || 'short-term',
      deadline: a.deadline || '',
    });
    setEditingId(a.id);
    setShowForm(true);
  };

  const save = async () => {
    if (!form.title.trim()) return;

    if (editingId) {
      try {
        await goalsApi.update(editingId, form);
      } catch (err) {
        console.warn('Could not update goal on backend:', err);
      }
      onUpdate(state.ambitions.map(a => (a.id === editingId ? { ...a, ...form } : a)));
      toast.success(`Updated ambition "${form.title}"`);
    } else {
      let createdId = `a${Date.now()}`;
      try {
        const res = await goalsApi.create({
          title: form.title.trim(),
          description: form.description.trim(),
          type: form.type,
          deadline: form.deadline || undefined,
        });
        const created = res.goal || res;
        if (created?._id || created?.id) createdId = created._id || created.id;
      } catch (err) {
        console.warn('Could not create goal on backend:', err);
      }

      const a: Ambition = {
        id: createdId,
        title: form.title.trim(),
        description: form.description.trim(),
        type: form.type,
        deadline: form.deadline || undefined,
        achievements: [],
        status: 'active',
        createdAt: today,
      };
      onUpdate([...state.ambitions, a]);
      toast.success(`Created new ${form.type}: "${a.title}"`);
    }

    setForm({ title: '', description: '', type: 'one-month', deadline: '' });
    setShowForm(false);
    setEditingId(null);
  };

  const updateStatus = async (id: string, status: Ambition['status']) => {
    try {
      await goalsApi.update(id, { status });
    } catch (err) {
      console.warn('Could not update goal status on backend:', err);
    }
    onUpdate(state.ambitions.map(a => (a.id === id ? { ...a, status } : a)));
    if (status === 'achieved') {
      toast.success('Congratulations! Goal achieved! 🏆');
    } else if (status === 'dropped') {
      toast.info('Goal moved to dropped');
    } else {
      toast.info('Goal reactivated to active');
    }
  };

  const remove = async (id: string) => {
    const amb = state.ambitions.find(a => a.id === id);
    try {
      await goalsApi.delete(id);
    } catch (err) {
      console.warn('Could not delete goal on backend:', err);
    }
    onUpdate(state.ambitions.filter(a => a.id !== id));
    toast.info(`Deleted ambition "${amb?.title || ''}"`);
  };

  const addAchievement = async (ambitionId: string) => {
    const text = (newAchievementText[ambitionId] || '').trim();
    if (!text) return;

    let milestoneId = `ach_${Date.now()}`;
    try {
      const res = await goalsApi.addAchievement(ambitionId, { text, date: today });
      const goal = res.goal || res;
      if (goal?.achievements && goal.achievements.length > 0) {
        const last = goal.achievements[goal.achievements.length - 1];
        if (last?._id || last?.id) milestoneId = last._id || last.id;
      }
    } catch (err) {
      console.warn('Could not save achievement to backend:', err);
    }

    const newMilestone: AmbitionAchievement = {
      id: milestoneId,
      text,
      date: today,
    };

    onUpdate(
      state.ambitions.map(a => {
        if (a.id !== ambitionId) return a;
        const currentList = Array.isArray(a.achievements) ? a.achievements : [];
        return {
          ...a,
          achievements: [...currentList, newMilestone],
        };
      })
    );

    toast.success(`Logged milestone: "${text}"`);
    setNewAchievementText(prev => ({ ...prev, [ambitionId]: '' }));
  };

  const removeAchievement = async (ambitionId: string, achievementId: string) => {
    try {
      await goalsApi.deleteAchievement(ambitionId, achievementId);
    } catch (err: any) {
      console.warn('Could not delete milestone on backend:', err?.message);
    }

    onUpdate(
      state.ambitions.map(a => {
        if (a.id !== ambitionId) return a;
        const currentList = Array.isArray(a.achievements) ? a.achievements : [];
        return {
          ...a,
          achievements: currentList.filter(ach => ach.id !== achievementId),
        };
      })
    );
    toast.info('Milestone removed from database');
  };

  const filtered = state.ambitions.filter(a => filter === 'all' || a.type === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5" style={{ color: '#e2e8f0' }}>
            <Target size={26} weight="duotone" className="text-cyan-400" />
            <span>My Ambitions & Goals</span>
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
            1-month sprint targets, semester goals, and career ambitions — log what you achieve
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={openAdd}
          className="text-xs px-4 py-2 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
        >
          <Plus size={14} weight="bold" />
          <span>New Ambition</span>
        </motion.button>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div className="rounded-2xl p-6 space-y-4" style={{ background: '#161b22', border: '1px solid #6366f1' }}>
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: '#2d3748' }}>
            <h3 className="text-base font-semibold text-slate-100">
              {editingId ? 'Edit Goal Details' : 'Create New Ambition / Target'}
            </h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white text-lg">✕</button>
          </div>

          <div>
            <label className="block text-xs mb-1 text-slate-400">Goal Category</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {(['one-month', 'short-term', 'long-term'] as const).map(t => {
                const meta = TYPE_META[t];
                const IconComp = meta.icon;
                const isSelected = form.type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, type: t }))}
                    className="p-3 rounded-xl text-left transition-all cursor-pointer"
                    style={{
                      background: isSelected ? `${meta.color}18` : '#0d1117',
                      border: `1px solid ${isSelected ? meta.color : '#2d3748'}`,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <IconComp size={16} weight="duotone" style={{ color: meta.color }} />
                      <span className="text-xs font-semibold" style={{ color: isSelected ? meta.color : '#e2e8f0' }}>
                        {meta.label}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 leading-tight">{meta.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1 text-slate-400">Goal Title</label>
            <input
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Master Binary Trees & Graphs, Google SWE Internship"
              className="w-full rounded-lg px-3.5 py-2 text-xs outline-none"
              style={{ background: '#0d1117', border: '1px solid #2d3748', color: '#e2e8f0' }}
            />
          </div>

          <div>
            <label className="block text-xs mb-1 text-slate-400">Strategy / Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="What are the specific deliverables or focus areas?"
              rows={3}
              className="w-full rounded-lg px-3.5 py-2.5 text-xs outline-none resize-none"
              style={{ background: '#0d1117', border: '1px solid #2d3748', color: '#e2e8f0', lineHeight: 1.6 }}
            />
          </div>

          <div>
            <label className="block text-xs mb-1 text-slate-400">Target Deadline (Optional)</label>
            <input
              type="date"
              value={form.deadline}
              onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))}
              className="w-full sm:w-64 rounded-lg px-3.5 py-2 text-xs outline-none font-mono"
              style={{ background: '#0d1117', border: '1px solid #2d3748', color: '#e2e8f0' }}
            />
          </div>

          <div className="flex gap-2 pt-2 border-t" style={{ borderColor: '#2d3748' }}>
            <button
              onClick={save}
              disabled={!form.title.trim()}
              className="px-5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 cursor-pointer"
            >
              {editingId ? 'Save Changes' : 'Create Goal'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filter tabs with icons */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'all', label: 'All Ambitions' },
          { id: 'one-month', label: '1-Month Goals', icon: Target },
          { id: 'short-term', label: 'Short-Term', icon: Lightning },
          { id: 'long-term', label: 'Long-Term', icon: Rocket },
        ].map(item => {
          const TabIcon = item.icon;
          const isActive = filter === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setFilter(item.id as any)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              style={{
                background: isActive ? '#6366f1' : '#161b22',
                color: isActive ? '#fff' : '#94a3b8',
                border: `1px solid ${isActive ? '#6366f1' : '#2d3748'}`,
              }}
            >
              {TabIcon && <TabIcon size={14} weight="bold" />}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Ambition Cards List */}
      <div className="space-y-5">
        {filtered.map(a => {
          const typeKey = (a.type || 'short-term') as 'one-month' | 'short-term' | 'long-term';
          const meta = TYPE_META[typeKey] || TYPE_META['short-term'];
          const IconComp = meta.icon;
          const daysLeft = a.deadline ? Math.ceil((new Date(a.deadline).getTime() - Date.now()) / 86400000) : null;
          const achievements = Array.isArray(a.achievements) ? a.achievements : [];
          const isAchieved = a.status === 'achieved';
          const isDropped = a.status === 'dropped';

          return (
            <div
              key={a.id}
              className="rounded-2xl p-6 transition-all shadow-sm"
              style={{
                background: '#161b22',
                border: `1px solid ${isAchieved ? '#10b981' : isDropped ? '#2d3748' : '#334155'}`,
                opacity: isDropped ? 0.65 : 1,
              }}
            >
              {/* Header Info */}
              <div className="flex items-start gap-3.5 mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${meta.color}18`, border: `1px solid ${meta.color}35`, color: meta.color }}
                >
                  <IconComp size={22} weight="duotone" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span
                      className="text-xs px-2.5 py-0.5 rounded-md font-semibold"
                      style={{ background: `${meta.color}18`, color: meta.color }}
                    >
                      {meta.label}
                    </span>

                    {isAchieved && (
                      <span className="text-xs px-2.5 py-0.5 rounded-md font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-1">
                        <Trophy size={13} weight="fill" />
                        <span>Goal Achieved!</span>
                      </span>
                    )}

                    {daysLeft !== null && a.status === 'active' && (
                      <span
                        className="text-xs px-2 py-0.5 rounded font-mono"
                        style={{
                          background: daysLeft < 15 ? '#ef444415' : '#2d3748',
                          color: daysLeft < 15 ? '#f87171' : '#94a3b8',
                          border: `1px solid ${daysLeft < 15 ? '#ef444430' : 'transparent'}`
                        }}
                      >
                        {daysLeft > 0 ? `⏰ ${daysLeft} days remaining` : '⏰ Deadline passed'}
                      </span>
                    )}
                  </div>

                  <div className="text-lg font-bold text-slate-100">{a.title}</div>
                  {a.description && (
                    <div className="text-xs mt-1 text-slate-400 leading-relaxed">{a.description}</div>
                  )}
                </div>
              </div>

              {/* Achievements & Milestones Log (Text-based progress) */}
              <div className="mt-4 pt-4 border-t space-y-3" style={{ borderColor: '#2d3748' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Milestones & What I've Achieved
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-indigo-500/20 text-indigo-400">
                      {achievements.length}
                    </span>
                  </div>
                </div>

                {/* List of achievements */}
                {achievements.length > 0 ? (
                  <div className="space-y-2">
                    {achievements.map(ach => (
                      <div
                        key={ach.id}
                        className="flex items-start justify-between gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-colors hover:bg-slate-800/40"
                        style={{ background: '#0d1117', border: '1px solid #2d374840' }}
                      >
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          <span className="text-emerald-400 font-bold mt-0.5">✓</span>
                          <div className="flex-1 min-w-0">
                            <span className="text-slate-200 leading-relaxed">{ach.text}</span>
                            <div className="text-[10px] font-mono text-slate-500 mt-0.5">{ach.date}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => removeAchievement(a.id, ach.id)}
                          className="text-slate-500 hover:text-rose-400 text-xs px-1"
                          title="Delete achievement"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic py-2">
                    No achievements logged yet. Write your progress below!
                  </div>
                )}

                {/* Add Achievement Text Input */}
                {a.status === 'active' && (
                  <div className="flex gap-2 pt-1">
                    <input
                      value={newAchievementText[a.id] || ''}
                      onChange={e =>
                        setNewAchievementText(prev => ({ ...prev, [a.id]: e.target.value }))
                      }
                      onKeyDown={e => e.key === 'Enter' && addAchievement(a.id)}
                      placeholder="Add milestone... (e.g. Read chapter 4, built auth module, solved 10 problems)"
                      className="flex-1 rounded-xl px-3.5 py-2 text-xs outline-none"
                      style={{ background: '#0d1117', border: '1px solid #2d3748', color: '#e2e8f0' }}
                    />
                    <button
                      onClick={() => addAchievement(a.id)}
                      disabled={!(newAchievementText[a.id] || '').trim()}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 transition-colors flex items-center gap-1"
                    >
                      <span>+</span>
                      <span>Log Milestone</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t flex-wrap" style={{ borderColor: '#2d3748' }}>
                {a.status === 'active' && (
                  <>
                    <button
                      onClick={() => updateStatus(a.id, 'achieved')}
                      className="text-xs px-3 py-1.5 rounded-lg font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors"
                    >
                      🏆 Mark Achieved
                    </button>
                    <button
                      onClick={() => updateStatus(a.id, 'dropped')}
                      className="text-xs px-3 py-1.5 rounded-lg text-slate-400 hover:bg-slate-800 transition-colors"
                    >
                      Drop
                    </button>
                  </>
                )}
                {a.status !== 'active' && (
                  <button
                    onClick={() => updateStatus(a.id, 'active')}
                    className="text-xs px-3 py-1.5 rounded-lg text-indigo-400 bg-indigo-500/15 border border-indigo-500/30 hover:bg-indigo-500/25 transition-colors"
                  >
                    Reactivate
                  </button>
                )}
                <button
                  onClick={() => startEdit(a)}
                  className="text-xs px-3 py-1.5 rounded-lg text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => remove(a.id)}
                  className="text-xs px-3 py-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16 rounded-2xl border border-dashed border-slate-700" style={{ background: '#161b22' }}>
            <div className="text-3xl mb-2">🎯</div>
            <div className="text-sm text-slate-400">No ambitions found in this category</div>
          </div>
        )}
      </div>
    </div>
  );
}
