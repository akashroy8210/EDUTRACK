import { useState } from 'react';
import { AppState, TodoItem } from '@/data/types';
import TodoBarChart from '@/components/charts/TodoBarChart';
import { dailyWorksApi } from '@/api/client';
import { toast } from 'sonner';
import {
  CheckSquareOffset,
  Plus,
  Trash,
  PencilSimple,
  ArrowsClockwise,
  Fire,
  Lightning,
  CheckCircle,
  Circle,
  Flag,
  Clock,
  WarningCircle,
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  state: AppState;
  onUpdate: (todos: TodoItem[]) => void;
}

const PRIORITY_META = {
  high: { label: 'High', color: '#ef4444', bg: '#ef444418', border: '#ef444440', icon: Fire },
  medium: { label: 'Medium', color: '#f59e0b', bg: '#f59e0b18', border: '#f59e0b40', icon: Lightning },
  low: { label: 'Low', color: '#10b981', bg: '#10b98118', border: '#10b98140', icon: Flag },
};

export default function Todo({ state, onUpdate }: Props) {
  const [newText, setNewText] = useState('');
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('high');
  const [filter, setFilter] = useState<'all' | 'high' | 'daily' | 'permanent'>('all');
  const [confirmTask, setConfirmTask] = useState<TodoItem | null>(null);

  // Edit Task State
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [editType, setEditType] = useState<'daily' | 'permanent'>('daily');

  const today = new Date().toISOString().split('T')[0];

  const priorityOrder = { high: 0, medium: 1, low: 2 };

  // Filter and sort by priority (high first)
  const filtered = state.todos.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'high') return (t.priority || 'medium') === 'high';
    return t.type === filter;
  });

  const pending = filtered
    .filter(t => !t.completed)
    .sort((a, b) => {
      const pa = priorityOrder[a.priority || 'medium'];
      const pb = priorityOrder[b.priority || 'medium'];
      return pa - pb;
    });

  const completed = filtered.filter(t => t.completed);

  const add = async () => {
    if (!newText.trim()) return;
    try {
      const res = await dailyWorksApi.create({
        title: newText.trim(),
        priority: newPriority,
        type: 'daily',
      });
      const created = res.task || res;
      const item: TodoItem = {
        id: created._id || created.id || `t${Date.now()}`,
        text: created.title || newText.trim(),
        completed: false,
        type: created.type || 'daily',
        priority: created.priority || newPriority,
        createdAt: created.date || today,
      };
      onUpdate([item, ...state.todos]);
      setNewText('');
      toast.success(`Added ${newPriority.toUpperCase()} priority task: "${item.text}"`);
    } catch {
      const item: TodoItem = {
        id: `t${Date.now()}`,
        text: newText.trim(),
        completed: false,
        type: 'daily',
        priority: newPriority,
        createdAt: today,
      };
      onUpdate([item, ...state.todos]);
      setNewText('');
      toast.success(`Added task: "${item.text}"`);
    }
  };

  const executeToggle = async (id: string) => {
    const todo = state.todos.find(t => t.id === id);
    if (!todo) return;
    const willBeDone = !todo.completed;
    try {
      await dailyWorksApi.toggle(id, true);
    } catch {}
    onUpdate(
      state.todos.map(t =>
        t.id === id
          ? {
              ...t,
              completed: willBeDone,
              completedAt: willBeDone ? today : undefined,
            }
          : t
      )
    );
    if (willBeDone) {
      toast.success(`Completed: "${todo.text}"`);
    } else {
      toast.info(`Reopened: "${todo.text}"`);
    }
  };

  const toggle = (id: string) => {
    const todo = state.todos.find(t => t.id === id);
    if (!todo) return;

    // Check if there are higher priority pending tasks
    if (!todo.completed) {
      const currentLevel = priorityOrder[todo.priority || 'medium'];
      const hasHigherPending = state.todos.some(
        t => !t.completed && priorityOrder[t.priority || 'medium'] < currentLevel
      );

      if (hasHigherPending) {
        setConfirmTask(todo);
        return;
      }
    }

    executeToggle(id);
  };

  const cyclePriority = async (id: string, current: 'high' | 'medium' | 'low' = 'medium') => {
    const nextPriority: Record<'high' | 'medium' | 'low', 'high' | 'medium' | 'low'> = {
      high: 'medium',
      medium: 'low',
      low: 'high',
    };
    const next = nextPriority[current];
    try {
      await dailyWorksApi.updatePriority(id, next);
    } catch {}
    onUpdate(state.todos.map(t => (t.id === id ? { ...t, priority: next } : t)));
    toast.info(`Priority updated to ${next.toUpperCase()}`);
  };

  const startEditTodo = (t: TodoItem) => {
    setEditingTodo(t);
    setEditTitle(t.text);
    setEditPriority(t.priority || 'medium');
    setEditType(t.type || 'daily');
  };

  const saveEditTodo = async () => {
    if (!editingTodo || !editTitle.trim()) return;
    const newTitle = editTitle.trim();
    try {
      await dailyWorksApi.update(editingTodo.id, {
        title: newTitle,
        priority: editPriority,
        type: editType,
      });
    } catch (err: any) {
      console.error('Failed to update task on backend:', err);
    }
    onUpdate(
      state.todos.map(t =>
        t.id === editingTodo.id
          ? {
              ...t,
              text: newTitle,
              priority: editPriority,
              type: editType,
            }
          : t
      )
    );
    toast.success(`Updated task: "${newTitle}"`);
    setEditingTodo(null);
  };

  const remove = async (id: string) => {
    const todo = state.todos.find(t => t.id === id);
    try {
      await dailyWorksApi.delete(id);
    } catch {}
    onUpdate(state.todos.filter(t => t.id !== id));
    toast.info(`Deleted task "${todo?.text || ''}"`);
  };

  const resetDaily = async () => {
    try {
      await dailyWorksApi.resetDaily();
    } catch {}
    onUpdate(state.todos.map(t => (t.type === 'daily' ? { ...t, completed: false, completedAt: undefined } : t)));
    toast.success('Reset all daily tasks for today');
  };

  // Completion graph - last 7 days
  const weekData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const ds = d.toISOString().split('T')[0];
    const done = state.todos.filter(t => t.completedAt === ds).length;
    const total = state.todos.filter(t => t.type === 'daily').length || 1;
    return {
      day: d.toLocaleDateString('en', { weekday: 'short' }),
      done,
      pct: Math.round((done / total) * 100),
    };
  });

  const permanentDone = state.todos.filter(t => t.type === 'permanent' && t.completed).length;
  const permanentTotal = state.todos.filter(t => t.type === 'permanent').length;
  const highPriorityCount = state.todos.filter(t => !t.completed && (t.priority || 'medium') === 'high').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5" style={{ color: '#e2e8f0' }}>
            <CheckSquareOffset size={26} weight="duotone" className="text-indigo-400" />
            <span>Daily Tasks & Priorities</span>
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
            Prioritized daily work checklist and recurring habits
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={resetDaily}
          className="flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-xl font-semibold transition-all cursor-pointer"
          style={{ background: '#f59e0b15', color: '#fbbf24', border: '1px solid #f59e0b35' }}
        >
          <motion.span whileHover={{ rotate: 180 }} transition={{ duration: 0.4 }}>
            <ArrowsClockwise size={14} weight="bold" />
          </motion.span>
          <span>Reset Daily</span>
        </motion.button>
      </div>

      {/* Stats + graph */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl p-4 sm:p-6" style={{ background: '#161b22', border: '1px solid #2d3748' }}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-base font-semibold" style={{ color: '#e2e8f0' }}>
                Daily Completion — Last 7 Days
              </div>
              <div className="text-xs text-slate-400">Total work tasks completed per day</div>
            </div>
            {highPriorityCount > 0 && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1.5">
                <Fire size={14} weight="fill" className="text-rose-400" />
                <span>{highPriorityCount} High Priority Pending</span>
              </span>
            )}
          </div>
          <TodoBarChart data={weekData} />
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl p-5" style={{ background: '#161b22', border: '1px solid #2d3748' }}>
            <div className="text-xs font-semibold text-slate-400 mb-1">Today's Progress</div>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {state.todos.filter(t => t.completed && t.completedAt === today).length}/
              {state.todos.filter(t => t.type === 'daily').length}
            </div>
            <div className="text-xs text-slate-400 mt-1">daily tasks completed</div>
          </div>

          <div className="rounded-2xl p-5" style={{ background: '#161b22', border: '1px solid #2d3748' }}>
            <div className="text-xs font-semibold text-slate-400 mb-1">Habits (Permanent)</div>
            <div className="text-2xl font-bold font-mono text-indigo-400">
              {permanentDone}/{permanentTotal}
            </div>
            <div className="text-xs text-slate-400 mt-1">regular habits checked</div>
          </div>
        </div>
      </div>

      {/* Add new task with priority selection */}
      <div className="rounded-2xl p-4 sm:p-5" style={{ background: '#161b22', border: '1px solid #2d3748' }}>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            placeholder="Add new task or study assignment..."
            className="flex-1 rounded-xl px-4 py-2.5 text-xs outline-none"
            style={{ background: '#0d1117', border: '1px solid #2d3748', color: '#e2e8f0' }}
          />

          {/* Priority selector */}
          <select
            value={newPriority}
            onChange={e => setNewPriority(e.target.value as any)}
            className="rounded-xl px-3 py-2.5 text-xs outline-none font-semibold cursor-pointer"
            style={{
              background: '#0d1117',
              border: `1px solid ${PRIORITY_META[newPriority].border}`,
              color: PRIORITY_META[newPriority].color,
            }}
          >
            <option value="high">🔥 High Priority</option>
            <option value="medium">⚡ Medium Priority</option>
            <option value="low">🟢 Low Priority</option>
          </select>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={add}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Plus size={14} weight="bold" />
            <span>Add Task</span>
          </motion.button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(
          [
            ['all', 'All'],
            ['high', 'High Priority'],
            ['daily', 'Daily'],
            ['permanent', 'Permanent'],
          ] as const
        ).map(([f, l]) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
            style={{
              background: filter === f ? '#6366f1' : '#161b22',
              color: filter === f ? '#fff' : '#94a3b8',
              border: `1px solid ${filter === f ? '#6366f1' : '#2d3748'}`,
            }}
          >
            {f === 'high' && <Fire size={13} weight="fill" className={filter === f ? 'text-rose-200' : 'text-rose-400'} />}
            <span>{l}</span>
          </button>
        ))}
      </div>

      {/* Pending tasks (Sorted with High Priority First) */}
      {pending.length > 0 && (
        <div className="space-y-2.5">
          <div className="text-xs font-semibold uppercase tracking-wider px-1 text-slate-400">
            Pending Tasks ({pending.length}) — Sorted by Priority
          </div>
          {pending.map(t => {
            const priority = t.priority || 'medium';
            const meta = PRIORITY_META[priority];
            const PriorityIcon = meta.icon;

            return (
              <motion.div
                key={t.id}
                layout
                className="flex items-center gap-2.5 sm:gap-3.5 rounded-2xl px-3.5 sm:px-5 py-3 sm:py-3.5 group transition-all hover:border-slate-600 shadow-sm"
                style={{
                  background: '#161b22',
                  border: `1px solid ${priority === 'high' ? 'rgba(239, 68, 68, 0.35)' : '#2d3748'}`,
                }}
              >
                {/* Completion Checkbox */}
                <button
                  onClick={() => toggle(t.id)}
                  className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all cursor-pointer text-slate-500 hover:text-indigo-400"
                >
                  <Circle size={18} weight="bold" />
                </button>

                {/* Priority Chip (Clickable to cycle priority) */}
                <button
                  onClick={() => cyclePriority(t.id, priority)}
                  title="Click to cycle priority: High → Medium → Low"
                  className="text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 cursor-pointer transition-all hover:opacity-80 flex-shrink-0"
                  style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
                >
                  <PriorityIcon size={12} weight="fill" />
                  <span>{meta.label}</span>
                </button>

                <span className="flex-1 text-sm font-medium text-slate-200 truncate">{t.text}</span>

                <span
                  className="text-[11px] px-2 py-0.5 rounded-md font-mono flex-shrink-0"
                  style={{
                    background: t.type === 'permanent' ? '#06b6d418' : '#6366f118',
                    color: t.type === 'permanent' ? '#22d3ee' : '#a5b4fc',
                  }}
                >
                  {t.type}
                </span>

                <div className="flex items-center gap-1 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={() => startEditTodo(t)}
                    title="Edit task"
                    className="text-xs text-slate-400 hover:text-indigo-400 p-1 cursor-pointer transition-colors"
                  >
                    <PencilSimple size={15} />
                  </button>
                  <button
                    onClick={() => remove(t.id)}
                    title="Delete task"
                    className="text-xs text-rose-400 hover:text-rose-300 p-1 cursor-pointer transition-colors"
                  >
                    <Trash size={15} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Completed tasks */}
      {completed.length > 0 && (
        <div className="space-y-2.5 pt-2">
          <div className="text-xs font-semibold uppercase tracking-wider px-1 text-slate-500">
            Completed ({completed.length})
          </div>
          {completed.map(t => (
            <div
              key={t.id}
              className="flex items-center gap-2.5 sm:gap-3.5 rounded-2xl px-3.5 sm:px-5 py-3 transition-opacity opacity-75 hover:opacity-100 group"
              style={{ background: '#161b22', border: '1px solid #2d3748' }}
            >
              <button
                onClick={() => toggle(t.id)}
                className="w-5 h-5 flex items-center justify-center flex-shrink-0 text-emerald-400 cursor-pointer"
              >
                <CheckCircle size={18} weight="fill" />
              </button>
              <span className="flex-1 text-sm text-slate-400 line-through truncate">{t.text}</span>

              {/* Display completedAt date/time */}
              {t.completedAt && (
                <span className="text-[11px] px-2.5 py-0.5 rounded-md font-mono text-slate-400 bg-slate-900/90 border border-slate-700/60 flex items-center gap-1.5 flex-shrink-0">
                  <Clock size={12} weight="regular" className="text-slate-400" />
                  <span>{t.completedAt}</span>
                </span>
              )}

              <div className="flex items-center gap-1 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button
                  onClick={() => startEditTodo(t)}
                  title="Edit task"
                  className="text-xs text-slate-400 hover:text-indigo-400 p-1 cursor-pointer transition-colors"
                >
                  <PencilSimple size={15} />
                </button>
                <button
                  onClick={() => remove(t.id)}
                  title="Delete task"
                  className="text-xs text-rose-400 hover:text-rose-300 p-1 cursor-pointer transition-colors"
                >
                  <Trash size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Priority Override Confirmation Modal */}
      <AnimatePresence>
        {confirmTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="rounded-2xl p-6 max-w-md w-full shadow-2xl border"
              style={{ background: '#161b22', borderColor: '#f59e0b40' }}
            >
              <div className="flex items-center gap-3 mb-3 text-amber-400">
                <WarningCircle size={24} weight="fill" />
                <h3 className="text-base font-semibold text-slate-100">Pending Higher Priority Task</h3>
              </div>
              <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                You have one or more <strong className="text-rose-400">High Priority</strong> tasks still pending. Are you sure you want to mark this <span className="font-semibold text-amber-300">"{confirmTask.text}"</span> task as complete first?
              </p>
              <div className="flex gap-2.5 justify-end">
                <button
                  onClick={() => setConfirmTask(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const id = confirmTask.id;
                    setConfirmTask(null);
                    executeToggle(id);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-colors cursor-pointer"
                >
                  Complete Anyway
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Edit Task Modal */}
        {editingTodo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="rounded-2xl p-4 sm:p-6 max-w-md w-full shadow-2xl border space-y-4"
              style={{ background: '#161b22', borderColor: '#2d3748' }}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                  <PencilSimple size={18} className="text-indigo-400" />
                  <span>Edit Task</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingTodo(null)}
                  className="text-slate-400 hover:text-slate-200 text-sm cursor-pointer p-1"
                >
                  ✕
                </button>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-medium">Task Title</label>
                <input
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveEditTodo()}
                  placeholder="Task title or description..."
                  className="w-full rounded-xl px-4 py-2.5 text-xs outline-none"
                  style={{ background: '#0d1117', border: '1px solid #2d3748', color: '#e2e8f0' }}
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-medium">Priority Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['high', 'medium', 'low'] as const).map(p => {
                    const meta = PRIORITY_META[p];
                    const Icon = meta.icon;
                    const isSelected = editPriority === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setEditPriority(p)}
                        className="py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        style={{
                          background: isSelected ? meta.bg : '#0d1117',
                          border: `1px solid ${isSelected ? meta.color : '#2d3748'}`,
                          color: isSelected ? meta.color : '#94a3b8',
                        }}
                      >
                        <Icon size={14} weight="fill" />
                        <span>{meta.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-medium">Task Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditType('daily')}
                    className="py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    style={{
                      background: editType === 'daily' ? '#6366f118' : '#0d1117',
                      border: `1px solid ${editType === 'daily' ? '#6366f1' : '#2d3748'}`,
                      color: editType === 'daily' ? '#a5b4fc' : '#94a3b8',
                    }}
                  >
                    Daily Task
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditType('permanent')}
                    className="py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    style={{
                      background: editType === 'permanent' ? '#06b6d418' : '#0d1117',
                      border: `1px solid ${editType === 'permanent' ? '#22d3ee' : '#2d3748'}`,
                      color: editType === 'permanent' ? '#22d3ee' : '#94a3b8',
                    }}
                  >
                    Permanent Habit
                  </button>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={saveEditTodo}
                  disabled={!editTitle.trim()}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white cursor-pointer transition-colors shadow"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingTodo(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
