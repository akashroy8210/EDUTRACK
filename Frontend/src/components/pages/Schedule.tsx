import { useState } from 'react';
import { AppState, ClassSession, Holiday, ScheduleValidity } from '@/data/types';
import { getTodayDate } from '@/data/store';
import { academicsApi } from '@/api/client';
import { toast } from 'sonner';
import {
  Calendar,
  CalendarDots,
  Clock,
  MapPin,
  FileArrowDown,
  PencilSimple,
  Trash,
  CheckCircle,
  Plus,
  SlidersHorizontal,
  WarningCircle,
  Sun,
  ArrowsClockwise,
  X,
  ShieldCheck,
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Props passed to the Schedule page component.
 */
interface Props {
  /** Root application state containing class schedule and holidays */
  state: AppState;
  /** Callback to update scheduled class sessions in parent state */
  onUpdateSchedule: (schedule: ClassSession[]) => void;
  /** Callback to update academic holidays list in parent state */
  onUpdateHolidays: (holidays: Holiday[]) => void;
  /** Optional callback to update semester validity bounds */
  onUpdateValidity?: (validity: ScheduleValidity) => void;
}

/** Standard instructional weekdays */
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

/** Theme styling for session categories */
const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  lecture: { bg: '#6366f118', text: '#818cf8', border: '#6366f135' },
  lab: { bg: '#06b6d418', text: '#22d3ee', border: '#06b6d435' },
  tutorial: { bg: '#8b5cf618', text: '#a78bfa', border: '#8b5cf635' },
};

/**
 * Formats a recurring session end date into human-readable text (e.g. "Till 13 Nov").
 *
 * @param {string} [dateStr] - End date string in YYYY-MM-DD format
 * @returns {string} Formatted display string
 */
const formatIntervalDate = (dateStr?: string) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return `Till ${d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`;
  } catch {
    return `Till ${dateStr}`;
  }
};

/**
 * Class Schedule Page Component.
 *
 * Provides:
 * 1. Timetable View: Visual day-by-day weekly timetable with time slots and room assignments.
 * 2. Schedule Editor: Google Calendar-style recurring session creator, bulk editor, and deletion.
 * 3. CSV Timetable Importer: Parses CSV rows and creates subject/session entities directly in MongoDB.
 * 4. Holiday Management: Schedules full-day or class-specific campus holidays.
 */
export default function Schedule({
  state,
  onUpdateSchedule,
  onUpdateHolidays,
}: Props) {
  // Active navigation tab: 'view' (Timetable grid) or 'edit' (Editor & Holidays)
  const [activeTab, setActiveTab] = useState<'view' | 'edit'>('view');
  // Controls visibility of CSV import modal dialog
  const [showCsvModal, setShowCsvModal] = useState(false);

  // Real-time current date (YYYY-MM-DD)
  const today = getTodayDate();
  // Default recurring end date: 12 weeks from today
  const defaultEndDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 84); // 12 weeks from today
    return d.toISOString().split('T')[0];
  })();

  // New Class Form State (Google Calendar style: recurring until chosen date)
  const [newClassForm, setNewClassForm] = useState<Partial<ClassSession>>({
    subjectName: '',
    day: 'Monday',
    time: '09:00 - 10:00',
    room: 'Room 101',
    type: 'lecture',
    startDate: today,
    endDate: defaultEndDate,
  });

  // Multi-selection set of class session IDs for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Active session ID currently being edited inline
  const [editingId, setEditingId] = useState<string | null>(null);
  // Form state for inline session editing
  const [editForm, setEditForm] = useState<Partial<ClassSession>>({});

  // CSV Import State
  const [csvText, setCsvText] = useState('');
  const [csvValidityStart, setCsvValidityStart] = useState(today);
  const [csvValidityEnd, setCsvValidityEnd] = useState(defaultEndDate);
  const [csvError, setCsvError] = useState('');
  const [isImportingCsv, setIsImportingCsv] = useState(false);

  // Current day name in English (e.g. "Monday")
  const todayDay = new Date().toLocaleDateString('en', { weekday: 'long' });

  // Holiday Form State (integrated right into edit section)
  const [holidayForm, setHolidayForm] = useState({
    date: today,
    label: '',
    type: 'full-day' as 'full-day' | 'class-specific',
    classId: '',
  });

  const [bulkField, setBulkField] = useState<'time' | 'room' | 'type' | 'endDate'>('time');
  const [bulkValue, setBulkValue] = useState('');

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const handleAddClass = async () => {
    if (!newClassForm.subjectName?.trim()) {
      toast.error('Please enter or select a subject name');
      return;
    }
    const subjName = newClassForm.subjectName.trim();
    let subj = state.subjects.find(
      s => s.name.toLowerCase() === subjName.toLowerCase()
    );
    let subjectId = subj?.id;

    try {
      if (!subj || !subjectId) {
        const code = (subjName.split(' ').map(w => w[0]).join('') || 'SUBJ').toUpperCase().slice(0, 6);
        const subRes = await academicsApi.createSubject({
          name: subjName,
          code,
          credits: 4,
          color: '#6366f1',
        });
        const createdSubj = subRes.subject || subRes;
        subjectId = createdSubj.id || createdSubj._id;
      }

      const res = await academicsApi.addScheduleSlot({
        subjectId,
        subjectName: subjName,
        day: newClassForm.day || 'Monday',
        time: newClassForm.time?.trim() || '09:00 - 10:00',
        room: newClassForm.room?.trim() || 'Room 101',
        type: newClassForm.type || 'lecture',
        startDate: newClassForm.startDate || today,
        endDate: newClassForm.endDate || defaultEndDate,
      });

      const session = res.session || res;
      const newClass: ClassSession = {
        id: session._id || session.id || `cls_${Date.now()}`,
        subjectId: subjectId || `subj_${Date.now()}`,
        subjectName: subjName,
        day: session.day || newClassForm.day || 'Monday',
        time: session.time || newClassForm.time?.trim() || '09:00 - 10:00',
        room: session.room || newClassForm.room?.trim() || 'Room 101',
        type: session.type || newClassForm.type || 'lecture',
        startDate: session.startDate || newClassForm.startDate || today,
        endDate: session.endDate || newClassForm.endDate || defaultEndDate,
      };

      onUpdateSchedule([...state.schedule, newClass]);
      toast.success(`Scheduled ${newClass.subjectName} (repeats weekly ${formatIntervalDate(newClass.endDate)})`);
      setNewClassForm(prev => ({
        ...prev,
        subjectName: '',
        time: '09:00 - 10:00',
        room: 'Room 101',
      }));
    } catch (err: any) {
      toast.error(err?.message || 'Failed to schedule class session');
    }
  };

  const startEdit = (cls: ClassSession) => {
    setEditingId(cls.id);
    setEditForm({ ...cls });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      await academicsApi.updateScheduleSlot(editingId, editForm);
    } catch (err) {
      console.warn('Could not update session on backend:', err);
    }
    onUpdateSchedule(state.schedule.map(c => (c.id === editingId ? { ...c, ...editForm } : c)));
    toast.success(`Updated session "${editForm.subjectName || 'Class'}" successfully`);
    setEditingId(null);
  };

  const deleteClass = async (id: string, name: string) => {
    try {
      await academicsApi.deleteScheduleSlot(id);
    } catch (err) {
      console.warn('Could not delete from backend:', err);
    }
    onUpdateSchedule(state.schedule.filter(c => c.id !== id));
    toast.info(`Deleted ${name}`);
  };

  const deleteSelected = async () => {
    const count = selectedIds.size;
    const ids = Array.from(selectedIds);
    await Promise.allSettled(ids.map(id => academicsApi.deleteScheduleSlot(id)));
    onUpdateSchedule(state.schedule.filter(c => !selectedIds.has(c.id)));
    setSelectedIds(new Set());
    toast.success(`Deleted ${count} class session${count > 1 ? 's' : ''}`);
  };

  const applyBulk = async () => {
    if (!bulkValue.trim() || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    try {
      await Promise.allSettled(
        ids.map(id => academicsApi.updateScheduleSlot(id, { [bulkField]: bulkValue }))
      );
      onUpdateSchedule(
        state.schedule.map(c => (selectedIds.has(c.id) ? { ...c, [bulkField]: bulkValue } : c))
      );
      toast.success(`Updated ${bulkField} for ${selectedIds.size} selected classes in database`);
      setSelectedIds(new Set());
      setBulkValue('');
    } catch {
      toast.error('Failed to update selected classes in database');
    }
  };

  const parseCSV = async () => {
    setCsvError('');
    const lines = csvText.trim().split('\n').filter(l => l.trim());
    if (lines.length === 0) return;

    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim());
      if (parts.length < 4) {
        setCsvError(`Line ${i + 1}: Expected at least 4 columns (Subject, Day, Time, Room[, Type])`);
        return;
      }
      const day = parts[1];
      if (!DAYS.includes(day)) {
        setCsvError(`Line ${i + 1}: Invalid day "${day}". Expected: Monday to Friday.`);
        return;
      }
    }

    setIsImportingCsv(true);
    try {
      const existingSubjects = [...state.subjects];

      for (let i = 0; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim());
        const [subjectName, day, time, room, type = 'lecture'] = parts;

        let subj = existingSubjects.find(
          s => s.name.toLowerCase() === subjectName.toLowerCase() || s.code.toLowerCase() === subjectName.toLowerCase()
        );
        let subjectId = subj?.id;

        if (!subj || !subjectId) {
          const code = (subjectName.split(' ').map(w => w[0]).join('') || 'SUBJ').toUpperCase().slice(0, 6);
          try {
            const subRes = await academicsApi.createSubject({
              name: subjectName,
              code,
              credits: 4,
              color: '#6366f1',
            });
            const createdSubj = subRes.subject || subRes;
            subjectId = createdSubj.id || createdSubj._id;
            existingSubjects.push({
              id: subjectId || `subj_${Date.now()}_${i}`,
              name: subjectName,
              code,
              color: '#6366f1',
              attendedClasses: 0,
              totalClasses: 0,
              missedClasses: 0,
              credits: 4,
              instructor: '',
            });
          } catch (err: any) {
            console.warn('Could not create subject in database:', err?.message);
          }
        }

        await academicsApi.addScheduleSlot({
          subjectId: subjectId || undefined,
          subjectName,
          day,
          time,
          room,
          type: (['lecture', 'lab', 'tutorial'].includes(type) ? type : 'lecture') as ClassSession['type'],
          startDate: csvValidityStart || today,
          endDate: csvValidityEnd || defaultEndDate,
        });
      }

      // Re-fetch all classes and subjects directly from MongoDB
      const [scheduleRes] = await Promise.allSettled([
        academicsApi.getSchedule(),
        academicsApi.getSubjects(),
      ]);

      if (scheduleRes.status === 'fulfilled' && scheduleRes.value?.schedule) {
        const mappedSchedule = scheduleRes.value.schedule.map((c: any) => ({
          id: c._id || c.id,
          subjectId: typeof c.subjectId === 'object' ? c.subjectId?._id : c.subjectId,
          subjectName: typeof c.subjectId === 'object' ? c.subjectId?.name : (c.subjectName || 'Class'),
          day: c.day,
          time: c.time,
          room: c.room || 'Room 101',
          type: c.type || 'lecture',
          startDate: c.startDate || today,
          endDate: c.endDate || defaultEndDate,
        }));
        onUpdateSchedule(mappedSchedule);
      }

      toast.success(`Imported ${lines.length} classes into database!`);
      setCsvText('');
      setShowCsvModal(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to import classes into database');
    } finally {
      setIsImportingCsv(false);
    }
  };

  const addHoliday = async () => {
    if (!holidayForm.date || !holidayForm.label.trim()) {
      toast.error('Please enter a holiday date and label');
      return;
    }
    try {
      const res = await academicsApi.addHoliday({
        date: holidayForm.date,
        label: holidayForm.label.trim(),
        type: holidayForm.type,
        classId: holidayForm.type === 'class-specific' ? holidayForm.classId : undefined,
      });
      const created = res.holiday || res;
      const h: Holiday = {
        id: created._id || created.id || `hol_${Date.now()}`,
        date: created.date || holidayForm.date,
        label: created.label || holidayForm.label.trim(),
        type: holidayForm.type,
        classId: holidayForm.type === 'class-specific' ? holidayForm.classId : undefined,
      };
      onUpdateHolidays([...state.holidays, h]);
      toast.success(`Holiday "${h.label}" added for ${h.date}`);
      setHolidayForm({ date: today, label: '', type: 'full-day', classId: '' });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to add holiday.');
    }
  };

  const removeHoliday = async (id: string) => {
    try {
      await academicsApi.deleteHoliday(id);
    } catch (err) {
      console.warn('Could not remove holiday from backend:', err);
    }
    onUpdateHolidays(state.holidays.filter(h => h.id !== id));
    toast.info('Holiday removed');
  };

  return (
    <div className="space-y-6">
      {/* Header with View Mode Switcher and Top-Right CSV Import */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5" style={{ color: '#e2e8f0' }}>
            <CalendarDots size={26} weight="duotone" className="text-indigo-400" />
            <span>Class Schedule</span>
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
            Weekly timetable, recurring class intervals, and scheduled holidays
          </p>
        </div>

        {/* Action Bar */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowCsvModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer"
            style={{ background: '#1c2230', color: '#e2e8f0', border: '1px solid #334155' }}
          >
            <FileArrowDown size={16} weight="bold" className="text-indigo-400" />
            <span>Import CSV</span>
          </motion.button>

          {/* Primary View Switcher: Timetable vs Edit Schedule */}
          <div className="flex rounded-xl p-1" style={{ background: '#161b22', border: '1px solid #2d3748' }}>
            <button
              onClick={() => setActiveTab('view')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              style={{
                background: activeTab === 'view' ? '#6366f1' : 'transparent',
                color: activeTab === 'view' ? '#fff' : '#94a3b8',
              }}
            >
              <Calendar size={14} weight="bold" />
              <span>Timetable</span>
            </button>
            <button
              onClick={() => setActiveTab('edit')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              style={{
                background: activeTab === 'edit' ? '#6366f1' : 'transparent',
                color: activeTab === 'edit' ? '#fff' : '#94a3b8',
              }}
            >
              <SlidersHorizontal size={14} weight="bold" />
              <span>Edit Schedule</span>
            </button>
          </div>
        </div>
      </div>

      {/* CSV IMPORT MODAL */}
      <AnimatePresence>
        {showCsvModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="rounded-2xl p-6 w-full max-w-xl space-y-4 shadow-2xl"
              style={{ background: '#161b22', border: '1px solid #3b4252' }}
            >
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: '#2d3748' }}>
                <div className="flex items-center gap-2">
                  <FileArrowDown size={22} weight="duotone" className="text-indigo-400" />
                  <span className="font-semibold text-sm text-slate-100">Import Timetable CSV</span>
                </div>
                <button
                  onClick={() => setShowCsvModal(false)}
                  className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Paste CSV rows with headers or values: <code className="text-indigo-300 font-mono">Subject, Day, Time, Room, Type</code>.
                Each session will repeat weekly until the chosen interval date.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1 text-slate-400 font-medium">
                    Classes Start From (First Day)
                  </label>
                  <input
                    type="date"
                    value={csvValidityStart}
                    onChange={e => setCsvValidityStart(e.target.value)}
                    className="w-full rounded-xl px-3.5 py-2 text-xs font-mono outline-none"
                    style={{ background: '#0d1117', border: '1px solid #2d3748', color: '#e2e8f0' }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1 text-slate-400 font-medium">
                    Repeat Until Date (Semester End)
                  </label>
                  <input
                    type="date"
                    value={csvValidityEnd}
                    onChange={e => setCsvValidityEnd(e.target.value)}
                    className="w-full rounded-xl px-3.5 py-2 text-xs font-mono outline-none"
                    style={{ background: '#0d1117', border: '1px solid #2d3748', color: '#e2e8f0' }}
                  />
                </div>
              </div>

              <textarea
                value={csvText}
                onChange={e => setCsvText(e.target.value)}
                placeholder={"Data Structures, Monday, 09:00 - 10:00, Room 204, lecture\nDatabase Systems, Tuesday, 10:00 - 11:00, Room 101, lecture"}
                rows={6}
                className="w-full rounded-xl p-3 text-xs font-mono outline-none resize-none"
                style={{ background: '#0d1117', border: '1px solid #2d3748', color: '#e2e8f0' }}
              />

              {csvError && (
                <div className="text-xs text-rose-400 flex items-center gap-1.5">
                  <WarningCircle size={14} />
                  <span>{csvError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: '#2d3748' }}>
                <button
                  onClick={() => setShowCsvModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={parseCSV}
                  disabled={!csvText.trim() || isImportingCsv}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white cursor-pointer transition-colors"
                >
                  {isImportingCsv ? 'Importing to database...' : 'Import Classes'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TAB 1: WEEKLY TIMETABLE VIEW */}
      {activeTab === 'view' && (
        <div className="space-y-6">
          {DAYS.map(day => {
            const isToday = day === todayDay;
            const classes = state.schedule.filter(c => c.day === day).sort((a, b) => a.time.localeCompare(b.time));

            // Check if there's a full-day holiday for today or this day
            const fullDayHoliday = state.holidays.find(h => h.date === today && isToday && h.type === 'full-day');

            return (
              <div
                key={day}
                className="rounded-2xl overflow-hidden transition-all shadow-sm"
                style={{
                  background: '#161b22',
                  border: isToday ? '1px solid #6366f160' : '1px solid #2d3748',
                }}
              >
                {/* Day Header */}
                <div
                  className="flex items-center justify-between px-6 py-3.5 border-b"
                  style={{
                    background: isToday ? '#6366f112' : '#1c223050',
                    borderColor: '#2d3748',
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-sm tracking-wide" style={{ color: isToday ? '#a5b4fc' : '#e2e8f0' }}>
                      {day}
                    </span>
                    {isToday && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                        Today
                      </span>
                    )}
                    {fullDayHoliday && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        Holiday: {fullDayHoliday.label}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    {classes.length} session{classes.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Day Classes */}
                {classes.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">No scheduled classes</div>
                ) : (
                  <div className="divide-y divide-slate-800/40">
                    {classes.map(c => {
                      const subject = state.subjects.find(s => s.id === c.subjectId);
                      const typeBadge = TYPE_COLORS[c.type] || TYPE_COLORS.lecture;
                      const classHoliday = isToday && state.holidays.find(
                        h => h.date === today && (h.type === 'full-day' || h.classId === c.id)
                      );

                      const clsRecords = state.attendanceHistory.filter(r => r.classId === c.id);
                      const clsAttended = clsRecords.filter(r => r.status === 'present').length;
                      const clsTotal = clsRecords.length;
                      const clsPct = clsTotal > 0 ? Math.round((clsAttended / clsTotal) * 100) : null;

                      return (
                        <div
                          key={c.id}
                          className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 px-6 py-4 transition-colors hover:bg-slate-800/30"
                          style={{
                            opacity: classHoliday ? 0.5 : 1,
                          }}
                        >
                          {/* Time Chip */}
                          <div className="w-40 sm:w-44 flex-shrink-0 min-w-fit">
                            <span
                              className="text-xs font-semibold px-3 py-1.5 rounded-lg font-mono inline-flex items-center gap-2 whitespace-nowrap shadow-xs"
                              style={{ background: '#1c2230', color: '#94a3b8', border: '1px solid #334155' }}
                            >
                              <Clock size={13} className="text-slate-400 flex-shrink-0" />
                              <span className="whitespace-nowrap tracking-tight">{c.time}</span>
                            </span>
                          </div>

                          <div
                            className="hidden sm:block w-1.5 h-10 rounded-full flex-shrink-0"
                            style={{ background: subject?.color || '#6366f1' }}
                          />

                          <div className="flex-1 min-w-0">
                            <div className="text-sm sm:text-base font-semibold truncate text-slate-100">
                              {c.subjectName}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 flex-wrap">
                              <span className="flex items-center gap-1 font-mono">
                                <MapPin size={13} className="text-slate-500" />
                                <span>{c.room}</span>
                              </span>

                              {/* Google Calendar style repeat interval badge */}
                              {c.endDate && (
                                <span className="inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded-md bg-slate-800/90 text-slate-300 border border-slate-700/60">
                                  <ArrowsClockwise size={11} className="text-indigo-400" />
                                  <span>{formatIntervalDate(c.endDate)}</span>
                                </span>
                              )}

                              {/* Session-specific Attendance Pill */}
                              {clsTotal > 0 ? (
                                <span
                                  className={`inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded-md border ${
                                    clsPct! >= 75
                                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                  }`}
                                >
                                  <ShieldCheck size={12} className={clsPct! >= 75 ? 'text-emerald-400' : 'text-amber-400'} />
                                  <span>Attendance: {clsAttended}/{clsTotal} ({clsPct}%)</span>
                                </span>
                              ) : subject && subject.totalClasses > 0 ? (
                                <span
                                  className={`inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded-md border ${
                                    (subject.attendedClasses / subject.totalClasses) >= 0.75
                                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                  }`}
                                >
                                  <ShieldCheck size={12} className={(subject.attendedClasses / subject.totalClasses) >= 0.75 ? 'text-emerald-400' : 'text-amber-400'} />
                                  <span>Course Att: {Math.round((subject.attendedClasses / subject.totalClasses) * 100)}%</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded-md bg-slate-800/70 text-slate-400 border border-slate-700/60">
                                  <ShieldCheck size={12} className="text-slate-500" />
                                  <span>Attendance: No logs</span>
                                </span>
                              )}

                              {classHoliday && (
                                <span className="text-amber-400 font-medium">· Class Suspended (Holiday)</span>
                              )}
                            </div>
                          </div>

                          <div className="self-start sm:self-auto flex-shrink-0">
                            <span
                              className="text-xs px-2.5 py-1 rounded-md font-medium capitalize"
                              style={{ background: typeBadge.bg, color: typeBadge.text, border: `1px solid ${typeBadge.border}` }}
                            >
                              {c.type}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: EDIT SCHEDULE & INTEGRATED HOLIDAYS */}
      {activeTab === 'edit' && (
        <div className="space-y-8">
          {/* 1. ADD NEW RECURRING CLASS SESSION (Google Calendar Style) */}
          <div className="rounded-2xl p-6 space-y-5 shadow-sm" style={{ background: '#161b22', border: '1px solid #2d3748' }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: '#2d3748' }}>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <Plus size={18} weight="bold" className="text-indigo-400" />
                <span>Schedule New Recurring Class Session</span>
              </div>
              <span className="text-xs text-indigo-400 font-mono">Google Calendar Interval Style</span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Define the session details and the active date interval. The class will repeat weekly on the chosen day until the specified end date.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs mb-1 text-slate-400 font-semibold">Subject</label>
                <input
                  list="subjects-datalist"
                  value={newClassForm.subjectName || ''}
                  onChange={e => setNewClassForm(p => ({ ...p, subjectName: e.target.value }))}
                  placeholder="e.g. Data Structures & Algorithms"
                  className="w-full rounded-xl px-3.5 py-2 text-xs outline-none"
                  style={{ background: '#0d1117', border: '1px solid #2d3748', color: '#e2e8f0' }}
                />
                <datalist id="subjects-datalist">
                  {state.subjects.map(s => (
                    <option key={s.id} value={s.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs mb-1 text-slate-400 font-semibold">Day of Week</label>
                <select
                  value={newClassForm.day || 'Monday'}
                  onChange={e => setNewClassForm(p => ({ ...p, day: e.target.value }))}
                  className="w-full rounded-xl px-3.5 py-2 text-xs outline-none"
                  style={{ background: '#0d1117', border: '1px solid #2d3748', color: '#e2e8f0' }}
                >
                  {DAYS.map(d => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs mb-1 text-slate-400 font-semibold">Time Slot</label>
                <input
                  value={newClassForm.time || ''}
                  onChange={e => setNewClassForm(p => ({ ...p, time: e.target.value }))}
                  placeholder="09:00 - 10:00"
                  className="w-full rounded-xl px-3.5 py-2 text-xs font-mono outline-none"
                  style={{ background: '#0d1117', border: '1px solid #2d3748', color: '#e2e8f0' }}
                />
              </div>

              <div>
                <label className="block text-xs mb-1 text-slate-400 font-semibold">Room / Location</label>
                <input
                  value={newClassForm.room || ''}
                  onChange={e => setNewClassForm(p => ({ ...p, room: e.target.value }))}
                  placeholder="Room 204 or Lab 3"
                  className="w-full rounded-xl px-3.5 py-2 text-xs outline-none"
                  style={{ background: '#0d1117', border: '1px solid #2d3748', color: '#e2e8f0' }}
                />
              </div>

              <div>
                <label className="block text-xs mb-1 text-slate-400 font-semibold">Session Type</label>
                <select
                  value={newClassForm.type || 'lecture'}
                  onChange={e => setNewClassForm(p => ({ ...p, type: e.target.value as any }))}
                  className="w-full rounded-xl px-3.5 py-2 text-xs outline-none capitalize"
                  style={{ background: '#0d1117', border: '1px solid #2d3748', color: '#e2e8f0' }}
                >
                  <option value="lecture">Lecture</option>
                  <option value="lab">Lab</option>
                  <option value="tutorial">Tutorial</option>
                </select>
              </div>

              {/* Starts From Date */}
              <div>
                <label className="block text-xs mb-1 text-slate-400 font-semibold">
                  Starts From (First Day)
                </label>
                <input
                  type="date"
                  value={newClassForm.startDate || today}
                  onChange={e => setNewClassForm(p => ({ ...p, startDate: e.target.value }))}
                  className="w-full rounded-xl px-3.5 py-2 text-xs font-mono outline-none"
                  style={{ background: '#0d1117', border: '1px solid #2d3748', color: '#e2e8f0' }}
                />
              </div>

              {/* Recurring Interval End Date */}
              <div>
                <label className="block text-xs mb-1 text-slate-400 font-semibold">
                  Recurs Weekly Until (Interval)
                </label>
                <input
                  type="date"
                  value={newClassForm.endDate || defaultEndDate}
                  onChange={e => setNewClassForm(p => ({ ...p, endDate: e.target.value }))}
                  className="w-full rounded-xl px-3.5 py-2 text-xs font-mono outline-none"
                  style={{ background: '#0d1117', border: '1px solid #2d3748', color: '#e2e8f0' }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500 font-mono">
                {newClassForm.endDate ? `Repeats every ${newClassForm.day || 'Monday'} until ${newClassForm.endDate}` : ''}
              </span>
              <button
                onClick={handleAddClass}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
              >
                <Plus size={14} weight="bold" />
                <span>Add Class Session</span>
              </button>
            </div>
          </div>

          {/* 2. MANAGE EXISTING CLASSES & IN-PLACE EDITOR */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Scheduled Classes ({state.schedule.length})
              </h2>
              {selectedIds.size > 0 && (
                <span className="text-xs text-indigo-400 font-semibold">
                  {selectedIds.size} session{selectedIds.size > 1 ? 's' : ''} selected
                </span>
              )}
            </div>

            {/* Bulk Actions Bar */}
            {selectedIds.size > 0 && (
              <div
                className="rounded-xl p-3.5 flex items-center gap-3 flex-wrap shadow-md"
                style={{ background: '#1c2230', border: '1px solid #6366f1' }}
              >
                <span className="text-xs font-semibold text-indigo-300">Bulk Edit:</span>
                <select
                  value={bulkField}
                  onChange={e => setBulkField(e.target.value as any)}
                  className="rounded-lg px-2.5 py-1.5 text-xs outline-none"
                  style={{ background: '#0d1117', border: '1px solid #2d3748', color: '#e2e8f0' }}
                >
                  <option value="time">Time</option>
                  <option value="room">Room</option>
                  <option value="type">Type</option>
                  <option value="endDate">Repeat Until Date</option>
                </select>
                <input
                  value={bulkValue}
                  onChange={e => setBulkValue(e.target.value)}
                  placeholder={
                    bulkField === 'time'
                      ? '09:00 - 10:00'
                      : bulkField === 'endDate'
                      ? defaultEndDate
                      : bulkField === 'type'
                      ? 'lecture/lab/tutorial'
                      : 'Room 204'
                  }
                  className="rounded-lg px-3 py-1.5 text-xs outline-none flex-1 min-w-36 font-mono"
                  style={{ background: '#0d1117', border: '1px solid #2d3748', color: '#e2e8f0' }}
                />
                <button
                  onClick={applyBulk}
                  className="text-xs px-3.5 py-1.5 rounded-lg font-semibold bg-indigo-600 text-white cursor-pointer hover:bg-indigo-500"
                >
                  Apply
                </button>
                <button
                  onClick={deleteSelected}
                  className="text-xs px-3.5 py-1.5 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30 cursor-pointer hover:bg-rose-500/25"
                >
                  Delete Selected
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 cursor-pointer hover:bg-slate-600"
                >
                  Clear
                </button>
              </div>
            )}

            {/* List by Day */}
            <div className="space-y-4">
              {DAYS.map(day => {
                const classes = state.schedule.filter(c => c.day === day).sort((a, b) => a.time.localeCompare(b.time));
                if (classes.length === 0) return null;

                return (
                  <div key={day} className="space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider px-1 text-slate-400">{day}</div>
                    <div className="space-y-2">
                      {classes.map(c => (
                        <div key={c.id}>
                          {editingId === c.id ? (
                            <div
                              className="rounded-xl p-5 space-y-4 shadow-lg"
                              style={{ background: '#161b22', border: '1px solid #6366f1' }}
                            >
                              <div className="flex items-center justify-between text-xs font-semibold text-indigo-400">
                                <span>Editing: {c.subjectName}</span>
                                <span className="text-slate-400">{c.day}</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-xs mb-1 text-slate-400">Subject</label>
                                  <input
                                    value={editForm.subjectName || ''}
                                    onChange={e => setEditForm(p => ({ ...p, subjectName: e.target.value }))}
                                    className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                                    style={{ background: '#0d1117', border: '1px solid #2d3748', color: '#e2e8f0' }}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs mb-1 text-slate-400">Time</label>
                                  <input
                                    value={editForm.time || ''}
                                    onChange={e => setEditForm(p => ({ ...p, time: e.target.value }))}
                                    className="w-full rounded-lg px-3 py-2 text-xs outline-none font-mono"
                                    style={{ background: '#0d1117', border: '1px solid #2d3748', color: '#e2e8f0' }}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs mb-1 text-slate-400">Room</label>
                                  <input
                                    value={editForm.room || ''}
                                    onChange={e => setEditForm(p => ({ ...p, room: e.target.value }))}
                                    className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                                    style={{ background: '#0d1117', border: '1px solid #2d3748', color: '#e2e8f0' }}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs mb-1 text-slate-400">Type</label>
                                  <select
                                    value={editForm.type || 'lecture'}
                                    onChange={e => setEditForm(p => ({ ...p, type: e.target.value as any }))}
                                    className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                                    style={{ background: '#0d1117', border: '1px solid #2d3748', color: '#e2e8f0' }}
                                  >
                                    <option value="lecture">Lecture</option>
                                    <option value="lab">Lab</option>
                                    <option value="tutorial">Tutorial</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs mb-1 text-slate-400">Repeat Until Date</label>
                                  <input
                                    type="date"
                                    value={editForm.endDate || defaultEndDate}
                                    onChange={e => setEditForm(p => ({ ...p, endDate: e.target.value }))}
                                    className="w-full rounded-lg px-3 py-2 text-xs outline-none font-mono"
                                    style={{ background: '#0d1117', border: '1px solid #2d3748', color: '#e2e8f0' }}
                                  />
                                </div>
                              </div>
                              <div className="flex gap-2 pt-1">
                                <button
                                  onClick={saveEdit}
                                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white cursor-pointer hover:bg-indigo-500"
                                >
                                  Save Changes
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="px-4 py-1.5 rounded-lg text-xs bg-slate-700 text-slate-300 cursor-pointer hover:bg-slate-600"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              className="flex items-center gap-3 rounded-xl px-5 py-3.5 transition-all hover:border-slate-600"
                              style={{
                                background: '#161b22',
                                border: `1px solid ${selectedIds.has(c.id) ? '#6366f1' : '#2d3748'}`,
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={selectedIds.has(c.id)}
                                onChange={() => toggleSelect(c.id)}
                                className="w-4 h-4 rounded accent-indigo-600 flex-shrink-0 cursor-pointer"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold truncate text-slate-100">{c.subjectName}</div>
                                <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                                  <span>{c.time}</span>
                                  <span>·</span>
                                  <span>{c.room}</span>
                                  <span>·</span>
                                  <span className="capitalize">{c.type}</span>
                                  {c.endDate && (
                                    <>
                                      <span>·</span>
                                      <span className="text-indigo-400">{formatIntervalDate(c.endDate)}</span>
                                    </>
                                  )}
                                  <span>·</span>
                                  {(() => {
                                    const clsRecords = state.attendanceHistory.filter(r => r.classId === c.id);
                                    const clsAttended = clsRecords.filter(r => r.status === 'present').length;
                                    const clsTotal = clsRecords.length;
                                    const clsPct = clsTotal > 0 ? Math.round((clsAttended / clsTotal) * 100) : null;
                                    return clsTotal > 0 ? (
                                      <span className={clsPct! >= 75 ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                                        Att: {clsAttended}/{clsTotal} ({clsPct}%)
                                      </span>
                                    ) : (
                                      <span className="text-slate-500">Att: No logs</span>
                                    );
                                  })()}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => startEdit(c)}
                                  className="text-xs px-3 py-1 rounded-md text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 cursor-pointer"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => deleteClass(c.id, c.subjectName)}
                                  className="text-xs p-1.5 rounded-md text-rose-400 hover:bg-rose-500/15 cursor-pointer transition-colors"
                                  title="Delete session"
                                >
                                  <Trash size={14} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. SCHEDULED HOLIDAYS & OFF-DAYS (Directly Inside Edit Section) */}
          <div
            className="rounded-2xl p-6 space-y-6 shadow-sm"
            style={{ background: '#161b22', border: '1px solid #2d3748' }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: '#2d3748' }}>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <Sun size={18} weight="duotone" className="text-amber-400" />
                <span>Scheduled Holidays & Days Off ({state.holidays.length})</span>
              </div>
              <span className="text-xs text-slate-400 font-mono">Integrated with Timetable</span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Add holidays, festival breaks, or specific class off-days. Classes occurring on these dates are automatically marked as suspended on the weekly timetable.
            </p>

            {/* Add Holiday Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs mb-1 text-slate-400 font-semibold">Holiday Date</label>
                <input
                  type="date"
                  value={holidayForm.date}
                  onChange={e => setHolidayForm(p => ({ ...p, date: e.target.value }))}
                  className="w-full rounded-xl px-3.5 py-2 text-xs font-mono outline-none"
                  style={{ background: '#0d1117', border: '1px solid #2d3748', color: '#e2e8f0' }}
                />
              </div>

              <div>
                <label className="block text-xs mb-1 text-slate-400 font-semibold">Occasion / Label</label>
                <input
                  value={holidayForm.label}
                  onChange={e => setHolidayForm(p => ({ ...p, label: e.target.value }))}
                  placeholder="e.g. Gandhi Jayanti, Diwali Break..."
                  className="w-full rounded-xl px-3.5 py-2 text-xs outline-none"
                  style={{ background: '#0d1117', border: '1px solid #2d3748', color: '#e2e8f0' }}
                />
              </div>

              <div>
                <label className="block text-xs mb-1.5 text-slate-400 font-semibold">Scope</label>
                <div className="flex gap-2">
                  {(['full-day', 'class-specific'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setHolidayForm(p => ({ ...p, type: t }))}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex-1"
                      style={{
                        background: holidayForm.type === t ? '#6366f1' : '#0d1117',
                        color: holidayForm.type === t ? '#fff' : '#94a3b8',
                        border: `1px solid ${holidayForm.type === t ? '#6366f1' : '#2d3748'}`,
                      }}
                    >
                      {t === 'full-day' ? '🏖️ Full Day' : '📚 Specific Class'}
                    </button>
                  ))}
                </div>
              </div>

              {holidayForm.type === 'class-specific' && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-xs mb-1 text-slate-400 font-semibold">Select Target Class Session</label>
                  <select
                    value={holidayForm.classId}
                    onChange={e => setHolidayForm(p => ({ ...p, classId: e.target.value }))}
                    className="w-full rounded-xl px-3.5 py-2 text-xs outline-none"
                    style={{ background: '#0d1117', border: '1px solid #2d3748', color: '#e2e8f0' }}
                  >
                    <option value="">Select a class session...</option>
                    {state.schedule.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.day} — {c.subjectName} ({c.time}, {c.room})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={addHoliday}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer font-bold"
              >
                Add Holiday
              </button>
            </div>

            {/* Configured Holidays List */}
            <div className="space-y-3 pt-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Scheduled Holidays List
              </div>
              {state.holidays.length === 0 ? (
                <div
                  className="text-center py-6 rounded-xl border border-dashed border-slate-700/80"
                  style={{ background: '#0d1117' }}
                >
                  <div className="text-xl mb-1">🏖️</div>
                  <div className="text-xs text-slate-400">No holidays scheduled yet. Classes run normally.</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {state.holidays.sort((a, b) => a.date.localeCompare(b.date)).map(h => {
                    const targetClass = h.classId ? state.schedule.find(c => c.id === h.classId) : null;
                    return (
                      <div
                        key={h.id}
                        className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
                        style={{ background: '#0d1117', border: '1px solid #2d3748' }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-base">{h.type === 'full-day' ? '🏖️' : '📚'}</span>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-200 truncate">{h.label}</div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {h.date} · {h.type === 'full-day' ? 'Full Day Off' : `Class Off: ${targetClass?.subjectName || 'Session'}`}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => removeHoliday(h.id)}
                          className="text-xs px-2.5 py-1 rounded text-rose-400 hover:bg-rose-500/15 cursor-pointer transition-colors flex-shrink-0"
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
