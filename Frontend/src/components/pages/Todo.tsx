import { useState, useRef } from 'react';
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
  ChartBar,
  CircleNotch,
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

const priorityOrder: Record<string, number> = { high: 1, medium: 2, low: 3 };

export default function Todo({ state, onUpdate }: Props) {
  const [newText, setNewText] = useState('');
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('high');
  const [filter, setFilter] = useState<'all' | 'high' | 'daily' | 'permanent'>('all');
  const [confirmTask, setConfirmTask] = useState<TodoItem | null>(null);

  const [showStats, setShowStats] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  // Edit Task State
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [editType, setEditType] = useState<'daily' | 'permanent'>('daily');

  // Loading states to stop multiple parallel requests
  const [isAddingTodo, setIsAddingTodo] = useState(false);
  const [isSavingEditTodo, setIsSavingEditTodo] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  // Filter and show newest added tasks at the top
  const filtered = state.todos.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'high') return (t.priority || 'medium') === 'high';
    return t.type === filter;
  });

  // Pending tasks - keep newly added task at the top
  const pending = filtered.filter(t => !t.completed);

  const completed = filtered.filter(t => t.completed);

  const add = async () => {
    if (!newText.trim() || isAddingTodo) return;
    setIsAddingTodo(true);
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
    } finally {
      setIsAddingTodo(false);
    }
  };

  const executeToggle = async (id: string) => {
    const todo = state.todos.find(t => t.id === id);
    if (!todo) return;
    const willBeDone = !todo.completed;
    try {
      await dailyWorksApi.toggle(id, true);
    } catch { }
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
    } catch { }
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
    if (!editingTodo || !editTitle.trim() || isSavingEditTodo) return;
    const newTitle = editTitle.trim();
    setIsSavingEditTodo(true);
    try {
      await dailyWorksApi.update(editingTodo.id, {
        title: newTitle,
        priority: editPriority,
        type: editType,
      });
    } catch (err: any) {
      console.error('Failed to update task on backend:', err);
    } finally {
      setIsSavingEditTodo(false);
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
    } catch { }
    onUpdate(state.todos.filter(t => t.id !== id));
    toast.info(`Deleted task "${todo?.text || ''}"`);
  };

  const resetDaily = async () => {
    try {
      await dailyWorksApi.resetDaily();
    } catch { }
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
    <div className="space-y-6 pb-36 md:pb-28">
      {/* Header with Top-Right Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5" style={{ color: '#e2e8f0' }}>
            <CheckSquareOffset size={26} weight="duotone" className="text-indigo-400" />
            <span>Daily Tasks & Priorities</span>
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
            Prioritized daily work checklist and recurring habits
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Top-Right Button to open Progress Details & Graph at Bottom */}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              const next = !showStats;
              setShowStats(next);
              if (next) {
                setTimeout(() => statsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
              }
            }}
            className="flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-xl font-semibold transition-all cursor-pointer shadow-xs"
            style={{
              background: showStats ? '#6366f1' : '#6366f115',
              color: showStats ? '#ffffff' : '#a5b4fc',
              border: `1px solid ${showStats ? '#6366f1' : '#6366f140'}`,
            }}
          >
            <ChartBar size={15} weight="bold" />
            <span>{showStats ? 'Hide Progress & Graph' : 'Progress & Graph'}</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={resetDaily}
            className="flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-xl font-semibold transition-all cursor-pointer shadow-xs"
            style={{ background: '#f59e0b15', color: '#fbbf24', border: '1px solid #f59e0b35' }}
          >
            <motion.span whileHover={{ rotate: 180 }} transition={{ duration: 0.4 }}>
              <ArrowsClockwise size={14} weight="bold" />
            </motion.span>
            <span>Reset Daily</span>
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

      {/* Pending tasks (Newest Added Show From Top) */}
      {pending.length > 0 && (
        <div className="space-y-2.5">
          <div className="text-xs font-semibold uppercase tracking-wider px-1 text-slate-400 flex items-center justify-between">
            <span>Pending Tasks ({pending.length}) — Newest on Top</span>
            {highPriorityCount > 0 && (
              <span className="text-[11px] font-semibold text-rose-400 flex items-center gap-1">
                <Fire size={13} weight="fill" />
                <span>{highPriorityCount} High Priority</span>
              </span>
            )}
          </div>
          {pending.map(t => {
            const priority = t.priority || 'medium';
            const meta = PRIORITY_META[priority];
            const PriorityIcon = meta.icon;

            return (
              <motion.div
                key={t.id}
                layout
                className="flex items-start sm:items-center gap-2.5 sm:gap-3.5 rounded-2xl px-3.5 sm:px-5 py-3 sm:py-3.5 group transition-all hover:border-slate-600 shadow-sm"
                style={{
                  background: '#161b22',
                  border: `1px solid ${priority === 'high' ? 'rgba(239, 68, 68, 0.35)' : '#2d3748'}`,
                }}
              >
                {/* Completion Checkbox */}
                <button
                  onClick={() => toggle(t.id)}
                  className="w-5 h-5 mt-0.5 sm:mt-0 rounded-md flex items-center justify-center flex-shrink-0 transition-all cursor-pointer text-slate-500 hover:text-indigo-400"
                >
                  <Circle size={18} weight="bold" />
                </button>



                {/* Task text with multiline wrapping (no truncate) for complete mobile visibility */}
                <span className="flex-1 text-sm font-medium text-slate-200 break-words whitespace-normal leading-relaxed">
                  {t.text}
                </span>

                <div className='flex sm:flex-row flex-col gap-2'>
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-md font-mono flex-shrink-0 self-start sm:self-center"
                    style={{
                      background: t.type === 'permanent' ? '#06b6d418' : '#6366f118',
                      color: t.type === 'permanent' ? '#22d3ee' : '#a5b4fc',
                    }}
                  >
                    {t.type}
                  </span>
                  {/* Priority Chip (Clickable to cycle priority) */}
                  <button
                    onClick={() => cyclePriority(t.id, priority)}
                    title="Click to cycle priority: High → Medium → Low"
                    className="text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 cursor-pointer transition-all hover:opacity-80 flex-shrink-0 mt-0.5 sm:mt-0"
                    style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
                  >
                    <PriorityIcon size={12} weight="fill" />
                    <span>{meta.label}</span>
                  </button>
                  <div className="flex items-center gap-1 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0 self-start sm:self-center">
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
              className="flex items-start sm:items-center gap-2.5 sm:gap-3.5 rounded-2xl px-3.5 sm:px-5 py-3 transition-opacity opacity-75 hover:opacity-100 group"
              style={{ background: '#161b22', border: '1px solid #2d3748' }}
            >
              <button
                onClick={() => toggle(t.id)}
                className="w-5 h-5 mt-0.5 sm:mt-0 flex items-center justify-center flex-shrink-0 text-emerald-400 cursor-pointer"
              >
                <CheckCircle size={18} weight="fill" />
              </button>
              {/* Completed text with multiline wrapping (no truncate) for complete mobile visibility */}
              <span className="flex-1 text-sm text-slate-400 line-through break-words whitespace-normal leading-relaxed">
                {t.text}
              </span>

              {/* Display completedAt date/time */}
              {t.completedAt && (
                <span className="text-[11px] px-2.5 py-0.5 rounded-md font-mono text-slate-400 bg-slate-900/90 border border-slate-700/60 flex items-center gap-1.5 flex-shrink-0 self-start sm:self-center">
                  <Clock size={12} weight="regular" className="text-slate-400" />
                  <span>{t.completedAt}</span>
                </span>
              )}

              <div className="flex items-center gap-1 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0 self-start sm:self-center">
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

      {/* Progress Details & 7-Day Completion Graph */}
      <AnimatePresence>
        {showStats && (
          <motion.div
            ref={statsRef}
            initial={{ opacity: 0, height: 0, y: 20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden pt-4"
          >
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Add Task Input Box at the Absolute / Fixed Bottom */}
      <div className="fixed bottom-14 md:bottom-4 left-0 md:left-56 right-0 z-30 px-3 sm:px-6 pointer-events-none">
        <div className="max-w-4xl mx-auto pointer-events-auto">
          <div
            className="rounded-2xl p-2.5 sm:p-3.5 backdrop-blur-xl shadow-2xl transition-all"
            style={{
              background: 'rgba(22, 27, 34, 0.96)',
              border: '1px solid rgba(99, 102, 241, 0.45)',
              boxShadow: '0 12px 35px -5px rgba(0, 0, 0, 0.85), 0 0 25px rgba(99, 102, 241, 0.2)',
            }}
          >
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
              <input
                value={newText}
                onChange={e => setNewText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && add()}
                placeholder="Add new task or study assignment..."
                className="flex-1 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500 shadow-inner"
                style={{ background: '#0d1117', border: '1px solid #2d3748', color: '#e2e8f0' }}
              />

              {/* Improved Priority Selector Box */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/90 border border-slate-700/60 self-start sm:self-auto flex-shrink-0">
                {(['high', 'medium', 'low'] as const).map(p => {
                  const meta = PRIORITY_META[p];
                  const Icon = meta.icon;
                  const isSelected = newPriority === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewPriority(p)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none"
                      style={{
                        background: isSelected ? meta.bg : 'transparent',
                        color: isSelected ? meta.color : '#94a3b8',
                        border: isSelected ? `1px solid ${meta.border}` : '1px solid transparent',
                        boxShadow: isSelected ? `0 0 10px ${meta.color}35` : 'none',
                      }}
                    >
                      <Icon size={13} weight="fill" />
                      <span>{meta.label}</span>
                    </button>
                  );
                })}
              </div>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={add}
                disabled={!newText.trim() || isAddingTodo}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md flex-shrink-0"
              >
                {isAddingTodo ? (
                  <>
                    <CircleNotch size={14} className="animate-spin" />
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <Plus size={14} weight="bold" />
                    <span>Add Task</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </div>

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
                  disabled={!editTitle.trim() || isSavingEditTodo}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white cursor-pointer transition-colors shadow flex items-center justify-center gap-2"
                >
                  {isSavingEditTodo && <CircleNotch size={14} className="animate-spin" />}
                  <span>{isSavingEditTodo ? 'Saving Changes...' : 'Save Changes'}</span>
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
