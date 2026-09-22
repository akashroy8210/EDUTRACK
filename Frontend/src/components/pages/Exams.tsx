import { useState } from 'react';
import { AppState, Exam } from '@/data/types';
import { examsApi } from '@/api/client';
import { toast } from 'sonner';
import {
  GraduationCap,
  Calendar,
  Clock,
  MapPin,
  PencilSimple,
  Trash,
  CheckCircle,
  Plus,
  BookOpen,
} from '@phosphor-icons/react';
import { motion } from 'framer-motion';

interface Props {
  state: AppState;
  onUpdate: (exams: Exam[]) => void;
}

const TYPE_LABELS: Record<string, string> = {
  'end-sem': 'End Semester',
  'mid-sem': 'Mid Semester',
  'quiz': 'Quiz',
  'assignment': 'Assignment',
};

const TYPE_COLORS: Record<string, string> = {
  'end-sem': '#ef4444',
  'mid-sem': '#f59e0b',
  'quiz': '#6366f1',
  'assignment': '#10b981',
};

export default function Exams({ state, onUpdate }: Props) {
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);

  const [form, setForm] = useState({
    subjectName: '',
    type: 'quiz' as Exam['type'],
    date: '',
    time: '',
    room: '',
    syllabus: '',
    status: 'upcoming' as Exam['status'],
  });

  const filtered = state.exams.filter(e => filter === 'all' || e.status === filter);

  const openAdd = () => {
    setForm({
      subjectName: '',
      type: 'quiz',
      date: '',
      time: '',
      room: '',
      syllabus: '',
      status: 'upcoming',
    });
    setEditingExam(null);
    setShowAddModal(true);
  };

  const openEdit = (exam: Exam) => {
    setForm({
      subjectName: exam.subjectName,
      type: exam.type,
      date: exam.date,
      time: exam.time,
      room: exam.room,
      syllabus: exam.syllabus,
      status: exam.status,
    });
    setEditingExam(exam);
    setShowAddModal(true);
  };

  const saveExam = async () => {
    if (!form.subjectName.trim() || !form.date) return;

    if (editingExam) {
      try {
        await examsApi.update(editingExam.id, form);
      } catch {}
      onUpdate(state.exams.map(e => (e.id === editingExam.id ? { ...e, ...form } : e)));
      toast.success(`Updated assessment "${form.subjectName}"`);
    } else {
      try {
        const res = await examsApi.create({
          subjectName: form.subjectName.trim(),
          type: form.type,
          date: form.date,
          time: form.time.trim(),
          room: form.room.trim(),
          syllabus: form.syllabus.trim(),
          status: form.status,
        });
        const created = res.exam || res;
        const newExam: Exam = {
          id: created._id || created.id || `e${Date.now()}`,
          subjectName: created.subjectName || form.subjectName.trim(),
          type: created.type || form.type,
          date: created.date || form.date,
          time: created.time || form.time.trim(),
          room: created.room || form.room.trim(),
          syllabus: created.syllabus || form.syllabus.trim(),
          status: created.status || form.status,
        };
        onUpdate([...state.exams, newExam]);
      } catch {
        const newExam: Exam = {
          id: `e${Date.now()}`,
          subjectName: form.subjectName.trim(),
          type: form.type,
          date: form.date,
          time: form.time.trim(),
          room: form.room.trim(),
          syllabus: form.syllabus.trim(),
          status: form.status,
        };
        onUpdate([...state.exams, newExam]);
      }
      toast.success(`Added new ${form.type}: "${form.subjectName}"`);
    }
    setShowAddModal(false);
    setEditingExam(null);
  };

  const deleteExam = async (id: string) => {
    const exam = state.exams.find(e => e.id === id);
    try {
      await examsApi.delete(id);
    } catch {}
    onUpdate(state.exams.filter(e => e.id !== id));
    toast.info(`Deleted assessment "${exam?.subjectName || ''}"`);
  };

  const toggleStatus = async (exam: Exam) => {
    const nextStatus = exam.status === 'completed' ? 'upcoming' : 'completed';
    try {
      await examsApi.update(exam.id, { status: nextStatus });
    } catch {}
    onUpdate(state.exams.map(e => (e.id === exam.id ? { ...e, status: nextStatus } : e)));
    if (nextStatus === 'completed') {
      toast.success(`Marked "${exam.subjectName}" as Completed! 🎓`);
    } else {
      toast.info(`Marked "${exam.subjectName}" as Upcoming`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5" style={{ color: '#e2e8f0' }}>
            <GraduationCap size={26} weight="duotone" className="text-indigo-400" />
            <span>Exams & Quizzes</span>
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
            Mid-semester, end-semester, quizzes, lab evaluations, and assignments
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={openAdd}
          className="text-xs px-4 py-2 rounded-xl font-semibold transition-all bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm flex items-center gap-1.5 cursor-pointer"
        >
          <Plus size={14} weight="bold" />
          <span>Add Assessment</span>
        </motion.button>
      </div>

      {/* Add / Edit Assessment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="rounded-2xl p-6 w-full max-w-xl space-y-4 shadow-xl" style={{ background: '#161b22', border: '1px solid #3b4252' }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: '#2d3748' }}>
              <div className="flex items-center gap-2.5">
                <div>
                  {editingExam ? (
                    <PencilSimple size={22} weight="duotone" className="text-indigo-400" />
                  ) : (
                    <GraduationCap size={22} weight="duotone" className="text-indigo-400" />
                  )}
                </div>
                <h3 className="text-base font-semibold text-slate-100">
                  {editingExam ? 'Edit Assessment Details' : 'Add New Exam / Assessment'}
                </h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white text-lg cursor-pointer">✕</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-xs mb-1 text-slate-400">Subject Name</label>
                <input
                  value={form.subjectName}
                  onChange={e => setForm(p => ({ ...p, subjectName: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                  placeholder="e.g. Data Structures & Algorithms"
                  style={{ background: '#0d1117', border: '1px solid #2d3748', color: '#e2e8f0' }}
                />
              </div>

              <div>
                <label className="block text-xs mb-1 text-slate-400">Assessment Type</label>
                <select
                  value={form.type}
                  onChange={e => setForm(p => ({ ...p, type: e.target.value as Exam['type'] }))}
                  className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                  style={{ background: '#0d1117', border: '1px solid #2d3748', color: '#e2e8f0' }}
                >
                  {Object.entries(TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs mb-1 text-slate-400">Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(p => ({ ...p, status: e.target.value as Exam['status'] }))}
                  className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                  style={{ background: '#0d1117', border: '1px solid #2d3748', color: '#e2e8f0' }}
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="completed">Completed</option>
                  <option value="missed">Missed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs mb-1 text-slate-400">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-xs outline-none font-mono"
                  style={{ background: '#0d1117', border: '1px solid #2d3748', color: '#e2e8f0' }}
                />
              </div>

              <div>
                <label className="block text-xs mb-1 text-slate-400">Time</label>
                <input
                  value={form.time}
                  onChange={e => setForm(p => ({ ...p, time: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-xs outline-none font-mono"
                  placeholder="e.g. 10:00 AM - 12:00 PM"
                  style={{ background: '#0d1117', border: '1px solid #2d3748', color: '#e2e8f0' }}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs mb-1 text-slate-400">Room / Exam Venue</label>
                <input
                  value={form.room}
                  onChange={e => setForm(p => ({ ...p, room: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                  placeholder="e.g. Auditorium Hall 2 / Lab 3"
                  style={{ background: '#0d1117', border: '1px solid #2d3748', color: '#e2e8f0' }}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs mb-1 text-slate-400">Syllabus & Topics</label>
                <textarea
                  value={form.syllabus}
                  onChange={e => setForm(p => ({ ...p, syllabus: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-xs outline-none resize-none"
                  rows={3}
                  placeholder="Topics, units covered, special formulas or tools..."
                  style={{ background: '#0d1117', border: '1px solid #2d3748', color: '#e2e8f0' }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: '#2d3748' }}>
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={saveExam}
                disabled={!form.subjectName.trim() || !form.date}
                className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40"
              >
                {editingExam ? 'Save Changes' : 'Create Assessment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'upcoming', 'completed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize"
            style={{
              background: filter === f ? '#6366f1' : '#161b22',
              color: filter === f ? '#fff' : '#94a3b8',
              border: `1px solid ${filter === f ? '#6366f1' : '#2d3748'}`
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Exam list */}
      <div className="space-y-4">
        {filtered.sort((a, b) => a.date.localeCompare(b.date)).map(exam => {
          const daysLeft = Math.ceil((new Date(exam.date).getTime() - Date.now()) / 86400000);
          const color = TYPE_COLORS[exam.type] || '#6366f1';
          const isCompleted = exam.status === 'completed';

          return (
            <div
              key={exam.id}
              className="rounded-2xl p-5 transition-all hover:border-slate-600"
              style={{
                background: '#161b22',
                border: `1px solid ${isCompleted ? '#2d3748' : '#334155'}`,
                opacity: isCompleted ? 0.75 : 1
              }}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {/* Date Badge */}
                <div className="flex-shrink-0 text-center w-14">
                  <div
                    className="rounded-xl py-2 px-1.5"
                    style={{ background: `${color}15`, border: `1px solid ${color}35` }}
                  >
                    <div className="text-[11px] font-mono font-semibold uppercase tracking-wider" style={{ color }}>
                      {new Date(exam.date).toLocaleDateString('en', { month: 'short' })}
                    </div>
                    <div className="text-xl font-bold mt-0.5" style={{ color }}>
                      {new Date(exam.date).getDate()}
                    </div>
                  </div>
                </div>

                {/* Assessment Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span
                      className="text-xs px-2.5 py-0.5 rounded-md font-semibold"
                      style={{ background: `${color}18`, color }}
                    >
                      {TYPE_LABELS[exam.type]}
                    </span>

                    {!isCompleted && daysLeft >= 0 && daysLeft <= 7 && (
                      <span className="text-xs px-2.5 py-0.5 rounded-md font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20">
                        {daysLeft === 0 ? 'Today!' : `In ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`}
                      </span>
                    )}

                    {isCompleted && (
                      <span className="text-xs px-2 py-0.5 rounded-md text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 font-medium">
                        ✓ Completed
                      </span>
                    )}
                  </div>

                  <div className="text-base font-semibold text-slate-100 truncate">
                    {exam.subjectName}
                  </div>

                  {exam.syllabus && (
                    <div className="text-xs mt-1 text-slate-400 line-clamp-1">
                      <span className="text-slate-500 font-medium">Syllabus:</span> {exam.syllabus}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 sm:gap-5 mt-2 text-xs font-mono text-slate-400">
                    <span>📅 {exam.date}</span>
                    {exam.time && <span>🕐 {exam.time}</span>}
                    {exam.room && <span>📍 {exam.room}</span>}
                  </div>
                </div>

                {/* Actions: Edit, Done, Delete */}
                <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end sm:justify-center pt-2 sm:pt-0 border-t sm:border-0 border-slate-800/60">
                  <button
                    onClick={() => openEdit(exam)}
                    className="text-xs px-3 py-1.5 rounded-lg text-indigo-400 bg-indigo-500/10 border border-indigo-500/25 hover:bg-indigo-500/20 font-medium transition-colors cursor-pointer"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => toggleStatus(exam)}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                    style={{
                      background: isCompleted ? '#334155' : '#10b98118',
                      color: isCompleted ? '#94a3b8' : '#10b981',
                      border: `1px solid ${isCompleted ? '#475569' : '#10b98130'}`
                    }}
                  >
                    {isCompleted ? 'Mark Pending' : '✓ Done'}
                  </button>

                  <button
                    onClick={() => deleteExam(exam.id)}
                    className="text-xs px-3 py-1.5 rounded-lg text-rose-400 bg-rose-500/10 border border-rose-500/25 hover:bg-rose-500/20 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16 rounded-2xl border border-dashed border-slate-700" style={{ background: '#161b22' }}>
            <div className="text-3xl mb-2">📋</div>
            <div className="text-sm text-slate-400">No assessments found in this filter</div>
          </div>
        )}
      </div>
    </div>
  );
}
