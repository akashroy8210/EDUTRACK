import { useState } from 'react';
import { AppState, BlogPost } from '@/data/types';
import { getTodayDate } from '@/data/store';
import { blogApi } from '@/api/client';
import { toast } from 'sonner';
import {
  Notebook,
  Camera,
  Calendar,
  Clock,
  PencilSimple,
  Trash,
  Tag,
  PaperPlaneTilt,
  Sparkle,
  Image as ImageIcon,
  CheckCircle,
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  state: AppState;
  onUpdate: (blogs: BlogPost[]) => void;
}

const PRESET_IMAGES = [
  { label: 'Campus Autumn', url: 'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?w=600&auto=format&fit=crop&q=80' },
  { label: 'Library & Coffee', url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80' },
  { label: 'Coding Setup', url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80' },
  { label: 'Lecture Hall', url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&auto=format&fit=crop&q=80' },
  { label: 'Notebook & Pen', url: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=600&auto=format&fit=crop&q=80' },
];

function formatDisplayDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return {
      month: d.toLocaleDateString('en', { month: 'short' }),
      day: d.getDate(),
      fullDate: d.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }),
    };
  } catch {
    return { month: 'Today', day: '', fullDate: dateStr };
  }
}

export default function Blog({ state, onUpdate }: Props) {
  const today = getTodayDate();
  const now = new Date();
  const defaultTime = now.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });

  // Quick Composer State (Matches User's Reference Screenshot)
  const [entryContent, setEntryContent] = useState('');
  const [entryTitle, setEntryTitle] = useState('');
  const [entryDate, setEntryDate] = useState(today);
  const [entryTime, setEntryTime] = useState(defaultTime);
  const [entryImage, setEntryImage] = useState<string>('');
  const [entryTags, setEntryTags] = useState('StudySession, Productivity');
  const [showImagePicker, setShowImagePicker] = useState(false);

  // Edit Mode
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);

  const handlePostEntry = async () => {
    if (!entryContent.trim()) {
      toast.error('Please write some thoughts for your journal entry');
      return;
    }

    const title = entryTitle.trim() || entryContent.trim().slice(0, 48) + '...';
    const tags = entryTags
      .split(',')
      .map(t => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    if (editingPost) {
      try {
        await blogApi.update(editingPost.id, {
          title,
          content: entryContent.trim(),
          date: entryDate,
          time: entryTime,
          image: entryImage || '',
          tags,
        });
      } catch (err) {
        console.warn('Could not update blog post on backend:', err);
      }

      onUpdate(
        state.blogs.map(b =>
          b.id === editingPost.id
            ? {
                ...b,
                title,
                content: entryContent.trim(),
                createdAt: entryDate,
                time: entryTime,
                image: entryImage || undefined,
                tags,
                updatedAt: today,
              }
            : b
        )
      );
      toast.success('Journal entry updated successfully');
      setEditingPost(null);
    } else {
      let createdId = `b${Date.now()}`;
      try {
        const res = await blogApi.create({
          title,
          content: entryContent.trim(),
          date: entryDate,
          time: entryTime,
          image: entryImage || '',
          tags: tags.length > 0 ? tags : ['DailyLog'],
        });
        const created = res.blog || res;
        if (created?._id || created?.id) createdId = created._id || created.id;
      } catch (err) {
        console.warn('Could not create blog on backend:', err);
      }

      const newPost: BlogPost = {
        id: createdId,
        title,
        content: entryContent.trim(),
        mood: 'great',
        category: 'Campus Life',
        image: entryImage || undefined,
        time: entryTime,
        tags: tags.length > 0 ? tags : ['DailyLog'],
        createdAt: entryDate,
        updatedAt: entryDate,
      };
      onUpdate([newPost, ...state.blogs]);
      toast.success('Journal entry posted to your timeline! 🎉');
    }

    // Reset Form
    setEntryContent('');
    setEntryTitle('');
    setEntryImage('');
    setEntryTags('StudySession, Productivity');
    setShowImagePicker(false);
  };

  const startEdit = (post: BlogPost) => {
    setEditingPost(post);
    setEntryTitle(post.title);
    setEntryContent(post.content);
    setEntryDate(post.createdAt);
    setEntryTime(post.time || defaultTime);
    setEntryImage(post.image || '');
    setEntryTags(post.tags.join(', '));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deletePost = async (id: string) => {
    try {
      await blogApi.delete(id);
    } catch (err) {
      console.warn('Could not delete blog post from backend:', err);
    }
    onUpdate(state.blogs.filter(b => b.id !== id));
    toast.info('Journal entry deleted');
  };

  // Sort timeline newest to oldest
  const sortedPosts = [...state.blogs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2.5 text-slate-100">
          <Notebook size={26} weight="duotone" className="text-indigo-400" />
          <span>My Daily Journal - Timeline</span>
        </h1>
        <p className="text-sm mt-0.5 text-slate-400">
          Capture thoughts, campus memories, study sessions, and daily highlights
        </p>
      </div>

      {/* TOP COMPOSER: New Blog Entry (Exact structure from user reference image) */}
      <div
        className="rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl relative"
        style={{
          background: '#161b22',
          border: '1px solid #334155',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-200">
              {editingPost ? '✏️ Edit Journal Entry' : 'New Blog Entry'}
            </span>
            {editingPost && (
              <button
                onClick={() => {
                  setEditingPost(null);
                  setEntryContent('');
                  setEntryTitle('');
                  setEntryImage('');
                }}
                className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
              >
                Cancel Edit
              </button>
            )}
          </div>
          <span className="text-xs font-mono text-slate-400">{today}</span>
        </div>

        {/* Optional Title input for rich organization */}
        <input
          value={entryTitle}
          onChange={e => setEntryTitle(e.target.value)}
          placeholder="Entry Title (e.g. Busy Morning & Chemistry Lab!)..."
          className="w-full rounded-xl px-4 py-2 text-sm font-semibold outline-none"
          style={{ background: '#0d1117', border: '1px solid #2d3748', color: '#f1f5f9' }}
        />

        {/* Main Entry Box + Attach Image Side Button */}
        <div className="flex flex-col sm:flex-row gap-3">
          <textarea
            value={entryContent}
            onChange={e => setEntryContent(e.target.value)}
            rows={4}
            placeholder="Write about your day..."
            className="flex-1 rounded-xl p-4 text-sm outline-none resize-none"
            style={{
              background: '#0d1117',
              border: '1px solid #2d3748',
              color: '#e2e8f0',
              lineHeight: 1.7,
            }}
          />

          {/* Attach Image Tile (as shown in reference screenshot) */}
          <div className="sm:w-36 flex flex-col items-center justify-center p-3 rounded-xl border border-dashed border-slate-700 bg-slate-900/40 gap-1.5 flex-shrink-0">
            {entryImage ? (
              <div className="relative w-full h-20 rounded-lg overflow-hidden group">
                <img src={entryImage} alt="Attached" className="w-full h-full object-cover" />
                <button
                  onClick={() => setEntryImage('')}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center text-xs hover:bg-rose-600 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowImagePicker(!showImagePicker)}
                className="flex flex-col items-center justify-center gap-1.5 w-full h-full text-slate-400 hover:text-indigo-300 transition-colors cursor-pointer py-3"
              >
                <Camera size={24} weight="duotone" className="text-indigo-400" />
                <span className="text-[11px] font-medium">Attach Image</span>
              </button>
            )}
          </div>
        </div>

        {/* Image Picker Dropdown / Presets */}
        {showImagePicker && !entryImage && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3.5 rounded-xl space-y-2.5"
            style={{ background: '#0d1117', border: '1px solid #334155' }}
          >
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-semibold">Select Photo or Paste Image URL</span>
              <button onClick={() => setShowImagePicker(false)} className="text-slate-500 hover:text-white">✕</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {PRESET_IMAGES.map(img => (
                <button
                  key={img.label}
                  onClick={() => {
                    setEntryImage(img.url);
                    setShowImagePicker(false);
                    toast.success(`Attached photo: ${img.label}`);
                  }}
                  className="rounded-lg overflow-hidden relative group cursor-pointer border border-slate-700 text-left h-16"
                >
                  <img src={img.url} alt={img.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <span className="absolute inset-x-0 bottom-0 text-[9px] font-bold p-1 bg-black/70 text-white truncate block">
                    {img.label}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Bottom Bar: Date Pill, Time Pill, Tags, Post Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-800">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Date Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300 font-mono">
              <Calendar size={14} className="text-indigo-400" />
              <input
                type="date"
                value={entryDate}
                onChange={e => setEntryDate(e.target.value)}
                className="bg-transparent outline-none cursor-pointer"
              />
            </div>

            {/* Time Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300 font-mono">
              <Clock size={14} className="text-indigo-400" />
              <input
                type="text"
                value={entryTime}
                onChange={e => setEntryTime(e.target.value)}
                placeholder="10:30 AM"
                className="bg-transparent outline-none w-20 cursor-text"
              />
            </div>

            {/* Tags input */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-400">
              <Tag size={13} className="text-slate-500" />
              <input
                value={entryTags}
                onChange={e => setEntryTags(e.target.value)}
                placeholder="Tags: Study, ChemLab..."
                className="bg-transparent outline-none text-slate-300 w-36"
              />
            </div>
          </div>

          {/* Post Entry Button */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handlePostEntry}
            disabled={!entryContent.trim()}
            className="px-6 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            }}
          >
            <PaperPlaneTilt size={14} weight="bold" />
            <span>{editingPost ? 'Save Entry' : 'Post Entry'}</span>
          </motion.button>
        </div>
      </div>

      {/* JOURNAL TIMELINE (Exact vertical timeline as in user reference image) */}
      <div className="space-y-6">
        <div className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <span>Journal Timeline</span>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-normal">
            {sortedPosts.length} entries
          </span>
        </div>

        <div className="relative pl-0 sm:pl-8 space-y-6 sm:space-y-8">
          {/* Continuous vertical timeline connector line */}
          <div
            className="absolute left-[20px] sm:left-[37px] top-6 bottom-6 w-0.5"
            style={{ background: 'linear-gradient(to bottom, #6366f1 0%, #334155 100%)' }}
          />

          {sortedPosts.map((post, index) => {
            const dateInfo = formatDisplayDate(post.createdAt);

            return (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.05 }}
                className="relative flex items-start gap-3 sm:gap-6 group"
              >
                {/* Left Date Node on Timeline (e.g. Oct / 26) */}
                <div
                  className="z-10 flex flex-col items-center justify-center w-10 sm:w-12 h-12 sm:h-14 rounded-xl sm:rounded-2xl flex-shrink-0 shadow-md select-none"
                  style={{
                    background: '#161b22',
                    border: '1.5px solid #4f46e5',
                  }}
                >
                  <span className="text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400 leading-none">
                    {dateInfo.month}
                  </span>
                  <span className="text-sm sm:text-base font-bold font-mono text-slate-100 mt-1 leading-none">
                    {dateInfo.day}
                  </span>
                </div>

                {/* Right Content Card (Matches user reference card design) */}
                <div
                  className="flex-1 rounded-2xl p-4 sm:p-6 transition-all hover:border-slate-500 shadow-md relative min-w-0"
                  style={{
                    background: '#161b22',
                    border: '1px solid #2d3748',
                  }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    {/* Main Story & Metadata */}
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Author Avatar, Name & Timestamp */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
                          >
                            {state.user.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-200">{state.user.name}</span>
                          </div>
                        </div>

                        <span className="font-mono text-[11px] text-slate-400">
                          {post.createdAt}, {post.time || '11:15 AM'}
                        </span>
                      </div>

                      {/* Post Title */}
                      <h3 className="text-base sm:text-lg font-bold text-slate-100 leading-snug">
                        {post.title}
                      </h3>

                      {/* Story Content */}
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {post.content}
                      </p>

                      {/* Hashtag Badges (e.g. #StudySession #Productivity) */}
                      {post.tags.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap pt-2">
                          {post.tags.map(t => (
                            <span
                              key={t}
                              className="text-[11px] font-medium px-2.5 py-0.5 rounded-full"
                              style={{
                                background: '#6366f115',
                                color: '#818cf8',
                                border: '1px solid #6366f130',
                              }}
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Attached Image Thumbnail (if attached) */}
                    {post.image && (
                      <div className="sm:w-36 h-28 rounded-xl overflow-hidden flex-shrink-0 border border-slate-700 shadow-sm self-center sm:self-start">
                        <img
                          src={post.image}
                          alt="Journal memory"
                          className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                        />
                      </div>
                    )}
                  </div>

                  {/* Card Actions (Edit, Delete) */}
                  <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-slate-800 text-xs">
                    <button
                      onClick={() => startEdit(post)}
                      className="text-slate-400 hover:text-indigo-300 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <PencilSimple size={13} />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => deletePost(post.id)}
                      className="text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Trash size={13} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
