import { useState, useEffect } from 'react';
import { AppState, UserProfile } from '@/data/types';
import { calcAttendancePercent } from '@/data/store';
import { profileApi } from '@/api/client';
import { toast } from 'sonner';
import {
  UserCircle,
  PencilSimple,
  Check,
  X,
  ChartPieSlice,
  GraduationCap,
  CheckSquareOffset,
  Notebook,
  EnvelopeSimple,
  IdentificationCard,
  Sparkle,
} from '@phosphor-icons/react';
import { motion } from 'framer-motion';

interface Props {
  state: AppState;
  onUpdate: (user: UserProfile) => void;
}

export default function Profile({ state, onUpdate }: Props) {
  const isProfileIncomplete = !state.user.rollNo || !state.user.branch || !state.user.semester;
  const [editing, setEditing] = useState(isProfileIncomplete);
  const [form, setForm] = useState<UserProfile>(state.user);

  useEffect(() => {
    setForm(state.user);
  }, [state.user]);

  useEffect(() => {
    profileApi.get().then(res => {
      if (res?.profile) {
        onUpdate(res.profile);
        setForm(res.profile);
      }
    }).catch(err => {
      console.warn('Could not fetch latest profile from backend:', err);
    });
  }, []);

  const save = async () => {
    try {
      const res = await profileApi.update({
        name: form.name,
        email: form.email,
        rollNo: form.rollNo,
        branch: form.branch,
        semester: form.semester,
        section: form.section,
        photo: form.photo,
      });
      const updated = res.profile || res;
      onUpdate({ ...state.user, ...form, ...updated });
      setForm({ ...state.user, ...form, ...updated });
      toast.success('Profile updated and saved to database!');
      setEditing(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save profile to database.');
    }
  };

  const cancel = () => {
    setForm(state.user);
    setEditing(false);
  };

  const overallAtt = Math.round(
    state.subjects.reduce((s, sub) => s + calcAttendancePercent(sub), 0) / Math.max(state.subjects.length, 1)
  );
  const pendingExams = state.exams.filter(e => e.status === 'upcoming').length;
  const pendingTodos = state.todos.filter(t => !t.completed).length;
  const totalNotes = state.blogs.length;

  const fields: { key: keyof UserProfile; label: string }[] = [
    { key: 'name', label: 'Full Name' },
    { key: 'rollNo', label: 'Roll Number' },
    { key: 'email', label: 'Email Address' },
    { key: 'branch', label: 'Branch / Department' },
    { key: 'semester', label: 'Current Semester' },
    { key: 'section', label: 'Section' },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Alert Banner for incomplete profile */}
      {isProfileIncomplete && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4 flex items-start gap-3.5 border"
          style={{ background: '#6366f115', borderColor: '#6366f140' }}
        >
          <Sparkle size={22} weight="fill" className="text-indigo-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-slate-100">Complete Your Student Profile</h4>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              You registered with your name and email. Please fill in your <strong>Roll Number</strong>, <strong>Branch</strong>, <strong>Semester</strong>, and <strong>Section</strong> below and click <strong>Save</strong> to unlock full academic tracking.
            </p>
          </div>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white cursor-pointer hover:bg-indigo-500"
            >
              Edit Now
            </button>
          )}
        </motion.div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5" style={{ color: '#e2e8f0' }}>
            <UserCircle size={26} weight="duotone" className="text-indigo-400" />
            <span>Student Profile</span>
          </h1>
          <p className="text-sm mt-0.5 text-slate-400">
            Personal credentials, department records, and overall performance summary
          </p>
        </div>

        {!editing ? (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setEditing(true)}
            className="self-start sm:self-auto flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl font-semibold cursor-pointer"
            style={{ background: '#6366f118', color: '#818cf8', border: '1px solid #6366f130' }}
          >
            <PencilSimple size={14} weight="bold" />
            <span>Edit Profile</span>
          </motion.button>
        ) : (
          <div className="flex gap-2 self-start sm:self-auto">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={save}
              className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl font-semibold bg-indigo-600 text-white cursor-pointer"
            >
              <Check size={14} weight="bold" />
              <span>Save</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={cancel}
              className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl bg-slate-800 text-slate-300 cursor-pointer"
            >
              <X size={14} weight="bold" />
              <span>Cancel</span>
            </motion.button>
          </div>
        )}
      </div>

      {/* Avatar + name card */}
      <div className="rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 shadow-sm" style={{ background: '#161b22', border: '1px solid #2d3748' }}>
        <div
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-bold flex-shrink-0 shadow-lg"
          style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: '#fff' }}
        >
          {(state.user.name || 'S').charAt(0).toUpperCase()}
        </div>
        <div className="text-center sm:text-left flex-1 min-w-0">
          <div className="text-lg sm:text-xl font-bold text-slate-100 flex items-center justify-center sm:justify-start gap-2">
            <span>{state.user.name || 'Student User'}</span>
            <Sparkle size={16} weight="fill" className="text-amber-400" />
          </div>
          <div className="text-sm text-indigo-300 font-medium mt-0.5">{state.user.branch || 'Branch / Department Not Set'}</div>
          <div className="text-xs text-slate-400 font-mono mt-2 flex items-center justify-center sm:justify-start gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/80">{state.user.rollNo || 'Roll No: Not set'}</span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/80">{state.user.semester || 'Semester: Not set'}</span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/80">{state.user.section || 'Section: Not set'}</span>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-3.5 sm:grid-cols-4">
        {[
          {
            label: 'Attendance',
            value: `${overallAtt}%`,
            color: overallAtt >= 75 ? '#10b981' : '#ef4444',
            icon: ChartPieSlice,
          },
          {
            label: 'Upcoming Exams',
            value: pendingExams,
            color: '#f59e0b',
            icon: GraduationCap,
          },
          {
            label: 'Pending Tasks',
            value: pendingTodos,
            color: '#6366f1',
            icon: CheckSquareOffset,
          },
          {
            label: 'Journal Entries',
            value: totalNotes,
            color: '#06b6d4',
            icon: Notebook,
          },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl p-3 sm:p-4 text-center shadow-sm" style={{ background: '#161b22', border: '1px solid #2d3748' }}>
              <div className="flex justify-center mb-1">
                <div style={{ color: s.color }}>
                  <Icon size={20} weight="duotone" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[11px] sm:text-xs mt-0.5 text-slate-400">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Profile fields */}
      <div className="rounded-2xl p-4 sm:p-6 space-y-4 shadow-sm" style={{ background: '#161b22', border: '1px solid #2d3748' }}>
        <div className="text-sm font-semibold text-slate-100 flex items-center gap-2 border-b pb-3" style={{ borderColor: '#2d3748' }}>
          <IdentificationCard size={18} weight="duotone" className="text-indigo-400" />
          <span>Academic & Personal Credentials</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {fields.map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs mb-1 text-slate-400 font-semibold tracking-wider uppercase">{label}</label>
              {editing ? (
                <input
                  value={(form as any)[key] || ''}
                  onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  className="w-full rounded-xl px-3.5 py-2 text-xs outline-none"
                  style={{
                    background: '#0d1117',
                    border: '1px solid #2d3748',
                    color: '#e2e8f0',
                    fontFamily: key === 'rollNo' || key === 'email' ? 'JetBrains Mono, monospace' : 'inherit'
                  }}
                />
              ) : (
                <div
                  className="text-xs py-2.5 px-3.5 rounded-xl text-slate-200"
                  style={{
                    background: '#0d1117',
                    border: '1px solid #2d3748',
                    fontFamily: key === 'rollNo' || key === 'email' ? 'JetBrains Mono, monospace' : 'inherit'
                  }}
                >
                  {(state.user as any)[key] ? (
                    (state.user as any)[key]
                  ) : (
                    <span className="text-slate-500 italic">Not set</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Subject summary */}
      <div className="rounded-2xl p-4 sm:p-6 shadow-sm" style={{ background: '#161b22', border: '1px solid #2d3748' }}>
        <div className="text-sm font-semibold mb-4 text-slate-100 flex items-center gap-2">
          <span>Enrolled Subjects & Attendance</span>
        </div>
        <div className="space-y-3">
          {state.subjects.map(s => {
            const pct = calcAttendancePercent(s);
            return (
              <div key={s.id} className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate text-slate-200">{s.name}</div>
                  <div className="text-[10px] sm:text-[11px] text-slate-500 font-mono">{s.code}</div>
                </div>
                <div
                  className="text-xs font-semibold w-10 sm:w-12 text-right font-mono flex-shrink-0"
                  style={{ color: pct >= 75 ? '#10b981' : '#ef4444' }}
                >
                  {pct}%
                </div>
                <div className="w-16 sm:w-24 h-2 rounded-full overflow-hidden flex-shrink-0 bg-slate-800">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ background: pct >= 75 ? s.color : '#ef4444' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
