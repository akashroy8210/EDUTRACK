import { useState, useRef } from 'react';
import { AppState, BlogPost } from '@/data/types';
import { getTodayDate } from '@/data/store';
import { blogApi } from '@/api/client';
import { toast } from 'sonner';
import {
  Article,
  Plus,
  Image as ImageIcon,
  UploadSimple,
  LinkSimple,
  MagnifyingGlass,
  Calendar,
  Clock,
  PencilSimple,
  Trash,
  Tag,
  Sparkle,
  BookOpen,
  X,
  ArrowRight,
  ShareNetwork,
  CheckCircle,
  Eye,
  Smiley,
  FolderSimple,
  CircleNotch,
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  state: AppState;
  onUpdate: (blogs: BlogPost[]) => void;
}

const CATEGORIES = [
  'All',
  'Campus Life',
  'Tech & Coding',
  'Academics',
  'Productivity',
  'Career & Projects',
  'Personal Reflections',
] as const;

type CategoryType = typeof CATEGORIES[number];

const CATEGORY_THEMES: Record<string, { bg: string; text: string; border: string; gradient: string; icon: string }> = {
  'Campus Life': {
    bg: '#065f4622',
    text: '#34d399',
    border: '#05966944',
    gradient: 'linear-gradient(135deg, #064e3b 0%, #0d9488 50%, #1e1b4b 100%)',
    icon: '🏫',
  },
  'Tech & Coding': {
    bg: '#3730a322',
    text: '#818cf8',
    border: '#4f46e544',
    gradient: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 50%, #6366f1 100%)',
    icon: '💻',
  },
  'Academics': {
    bg: '#854d0e22',
    text: '#facc15',
    border: '#ca8a0444',
    gradient: 'linear-gradient(135deg, #451a03 0%, #b45309 50%, #431407 100%)',
    icon: '📚',
  },
  'Productivity': {
    bg: '#0e749022',
    text: '#38bdf8',
    border: '#0284c744',
    gradient: 'linear-gradient(135deg, #082f49 0%, #0284c7 50%, #312e81 100%)',
    icon: '⚡',
  },
  'Career & Projects': {
    bg: '#83184322',
    text: '#f472b6',
    border: '#db277744',
    gradient: 'linear-gradient(135deg, #500724 0%, #be185d 50%, #3b0764 100%)',
    icon: '🚀',
  },
  'Personal Reflections': {
    bg: '#581c8722',
    text: '#c084fc',
    border: '#7e22ce44',
    gradient: 'linear-gradient(135deg, #3b0764 0%, #7e22ce 50%, #1e1b4b 100%)',
    icon: '✨',
  },
};

const DEFAULT_THEME = {
  bg: '#1e293b22',
  text: '#94a3b8',
  border: '#33415544',
  gradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
  icon: '📝',
};

const PRESET_IMAGES = [
  { label: 'Campus Autumn', url: 'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?w=900&auto=format&fit=crop&q=80' },
  { label: 'Coding Workspace', url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=900&auto=format&fit=crop&q=80' },
  { label: 'Library & Coffee', url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=900&auto=format&fit=crop&q=80' },
  { label: 'Lecture Hall', url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=900&auto=format&fit=crop&q=80' },
  { label: 'Creative Notebook', url: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=900&auto=format&fit=crop&q=80' },
];

function formatDisplayDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function calculateReadTime(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 180));
  return `${minutes} min read`;
}

export default function Blog({ state, onUpdate }: Props) {
  const today = getTodayDate();
  const now = new Date();
  const defaultTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  // Filtering & Search
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [readingPost, setReadingPost] = useState<BlogPost | null>(null);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  // Form State
  const [entryTitle, setEntryTitle] = useState('');
  const [entryCategory, setEntryCategory] = useState<string>('Campus Life');
  const [entryContent, setEntryContent] = useState('');
  const [entryDate, setEntryDate] = useState(today);
  const [entryTime, setEntryTime] = useState(defaultTime);
  const [entryMood, setEntryMood] = useState<'great' | 'good' | 'okay' | 'tough'>('great');
  const [entryTags, setEntryTags] = useState('Campus, Study');
  const [entryImage, setEntryImage] = useState<string>('');
  const [imageTab, setImageTab] = useState<'upload' | 'url' | 'presets'>('upload');
  const [customImageUrl, setCustomImageUrl] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetComposer = () => {
    setEditingPost(null);
    setEntryTitle('');
    setEntryCategory('Campus Life');
    setEntryContent('');
    setEntryDate(today);
    setEntryTime(defaultTime);
    setEntryMood('great');
    setEntryTags('Campus, Study');
    setEntryImage('');
    setCustomImageUrl('');
    setImageTab('upload');
  };

  const openNewBlogComposer = () => {
    resetComposer();
    setIsComposerOpen(true);
  };

  const startEdit = (post: BlogPost) => {
    setEditingPost(post);
    setEntryTitle(post.title);
    setEntryCategory(post.category || 'Campus Life');
    setEntryContent(post.content);
    setEntryDate(post.createdAt || today);
    setEntryTime(post.time || defaultTime);
    setEntryMood(post.mood || 'great');
    setEntryTags(post.tags ? post.tags.join(', ') : '');
    setEntryImage(post.image || '');
    setCustomImageUrl(post.image || '');
    setIsComposerOpen(true);
    if (readingPost) setReadingPost(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size exceeds 5MB limit. Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setEntryImage(reader.result);
        toast.success('Image loaded successfully!');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSavePost = async () => {
    if (!entryTitle.trim()) {
      toast.error('Please enter a title for your blog post');
      return;
    }
    if (!entryContent.trim()) {
      toast.error('Please write some content for your blog post');
      return;
    }
    if (isPublishing) return;
    setIsPublishing(true);

    try {
      const tags = entryTags
      .split(',')
      .map(t => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    const readTime = calculateReadTime(entryContent);

    if (editingPost) {
      try {
        await blogApi.update(editingPost.id, {
          title: entryTitle.trim(),
          content: entryContent.trim(),
          category: entryCategory,
          date: entryDate,
          time: entryTime,
          image: entryImage || '',
          tags,
          mood: entryMood,
        });
      } catch (err) {
        console.warn('Could not update blog post on backend:', err);
      }

      const updated = state.blogs.map(b =>
        b.id === editingPost.id
          ? {
              ...b,
              title: entryTitle.trim(),
              category: entryCategory,
              content: entryContent.trim(),
              createdAt: entryDate,
              time: entryTime,
              image: entryImage || undefined,
              tags,
              mood: entryMood,
              readTime,
              updatedAt: today,
            }
          : b
      );

      onUpdate(updated);
      toast.success('Blog article updated successfully! ✨');
      setIsComposerOpen(false);
      resetComposer();
    } else {
      let createdId = `blog_${Date.now()}`;
      try {
        const res = await blogApi.create({
          title: entryTitle.trim(),
          content: entryContent.trim(),
          category: entryCategory,
          date: entryDate,
          time: entryTime,
          image: entryImage || '',
          tags: tags.length > 0 ? tags : ['DailyBlog'],
          mood: entryMood,
        });
        const created = res.blog || res;
        if (created?._id || created?.id) createdId = created._id || created.id;
      } catch (err) {
        console.warn('Could not create blog post on backend:', err);
      }

      const newPost: BlogPost = {
        id: createdId,
        title: entryTitle.trim(),
        content: entryContent.trim(),
        category: entryCategory,
        mood: entryMood,
        readTime,
        image: entryImage || undefined,
        time: entryTime,
        tags: tags.length > 0 ? tags : ['DailyBlog'],
        createdAt: entryDate,
        updatedAt: entryDate,
      };

      onUpdate([newPost, ...state.blogs]);
      toast.success('Blog published to your website! 🎉');
      setIsComposerOpen(false);
      resetComposer();
    }
  } finally {
    setIsPublishing(false);
  }
};

  const deletePost = async (id: string, title: string) => {
    try {
      await blogApi.delete(id);
    } catch (err) {
      console.warn('Could not delete blog post from backend:', err);
    }
    onUpdate(state.blogs.filter(b => b.id !== id));
    toast.info(`Deleted "${title}"`);
    if (readingPost?.id === id) setReadingPost(null);
  };

  // Filtered & Sorted Posts
  const sortedPosts = [...state.blogs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const filteredPosts = sortedPosts.filter(post => {
    const matchesCategory =
      selectedCategory === 'All' ||
      (post.category && post.category.toLowerCase() === selectedCategory.toLowerCase());

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      post.title.toLowerCase().includes(q) ||
      post.content.toLowerCase().includes(q) ||
      post.tags.some(t => t.toLowerCase().includes(q)) ||
      (post.category && post.category.toLowerCase().includes(q));

    return matchesCategory && matchesSearch;
  });

  const heroPost = selectedCategory === 'All' && !searchQuery.trim() ? filteredPosts[0] : null;
  const gridPosts = heroPost ? filteredPosts.slice(1) : filteredPosts;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* 1. TOP HEADER & POST BUTTON */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-md">
              <Article size={22} weight="duotone" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-100 flex items-center gap-2">
                <span>Campus Chronicle & Blog</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  {state.blogs.length} Stories
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Share reflections, tech projects, campus stories, and study milestones
              </p>
            </div>
          </div>
        </div>

        {/* Top-Right "+ Post a Blog" Button */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={openNewBlogComposer}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-bold text-white shadow-lg cursor-pointer transition-all self-start sm:self-auto"
          style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)',
            boxShadow: '0 4px 20px -2px rgba(99, 102, 241, 0.4)',
          }}
        >
          <Plus size={16} weight="bold" />
          <span>Post a Blog</span>
        </motion.button>
      </div>

      {/* 2. SEARCH & CATEGORY PILLS BAR */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
            {CATEGORIES.map(cat => {
              const count =
                cat === 'All'
                  ? state.blogs.length
                  : state.blogs.filter(b => b.category?.toLowerCase() === cat.toLowerCase()).length;
              const isSelected = selectedCategory === cat;

              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer select-none"
                  style={{
                    background: isSelected ? '#6366f1' : '#161b22',
                    color: isSelected ? '#ffffff' : '#94a3b8',
                    border: `1px solid ${isSelected ? '#6366f1' : '#2d3748'}`,
                    boxShadow: isSelected ? '0 2px 10px rgba(99, 102, 241, 0.3)' : 'none',
                  }}
                >
                  <span>{cat}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px] md:w-72">
            <MagnifyingGlass size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search stories, tags..."
              className="w-full rounded-xl pl-9 pr-8 py-2 text-xs outline-none transition-all placeholder:text-slate-500"
              style={{
                background: '#161b22',
                border: '1px solid #2d3748',
                color: '#e2e8f0',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. FEATURED HERO POST (when on 'All' and no search query) */}
      {heroPost && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl overflow-hidden shadow-2xl transition-all group"
          style={{
            background: '#161b22',
            border: '1px solid #334155',
          }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[340px]">
            {/* Left Image / Gradient Cover */}
            <div className="lg:col-span-6 relative overflow-hidden flex items-center justify-center min-h-[220px] lg:min-h-full">
              {heroPost.image ? (
                <>
                  <img
                    src={heroPost.image}
                    alt={heroPost.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#161b22] via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-[#161b22]" />
                </>
              ) : (
                <div
                  className="w-full h-full flex flex-col items-center justify-center p-8 relative overflow-hidden"
                  style={{
                    background:
                      (CATEGORY_THEMES[heroPost.category || ''] || DEFAULT_THEME).gradient,
                  }}
                >
                  <div className="text-7xl opacity-20 select-none">
                    {(CATEGORY_THEMES[heroPost.category || ''] || DEFAULT_THEME).icon}
                  </div>
                  <div className="text-white/80 font-bold uppercase tracking-widest text-xs mt-2">
                    {heroPost.category || 'Campus Story'}
                  </div>
                </div>
              )}

              {/* Featured Badge */}
              <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-600/90 text-white backdrop-blur-md shadow-md border border-indigo-400/30">
                <Sparkle size={13} weight="fill" />
                <span>Featured Story</span>
              </div>
            </div>

            {/* Right Story Content */}
            <div className="lg:col-span-6 p-6 sm:p-8 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                {/* Category & Read Time */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span
                    className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                    style={{
                      background: (CATEGORY_THEMES[heroPost.category || ''] || DEFAULT_THEME).bg,
                      color: (CATEGORY_THEMES[heroPost.category || ''] || DEFAULT_THEME).text,
                      border: `1px solid ${(CATEGORY_THEMES[heroPost.category || ''] || DEFAULT_THEME).border}`,
                    }}
                  >
                    {heroPost.category || 'Campus Life'}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock size={12} />
                    <span>{heroPost.readTime || calculateReadTime(heroPost.content)}</span>
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                    <Calendar size={12} />
                    <span>{formatDisplayDate(heroPost.createdAt)}</span>
                  </span>
                </div>

                {/* Headline */}
                <h2
                  onClick={() => setReadingPost(heroPost)}
                  className="text-2xl sm:text-3xl font-extrabold text-slate-100 group-hover:text-indigo-300 transition-colors cursor-pointer leading-tight"
                >
                  {heroPost.title}
                </h2>

                {/* Excerpt */}
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed line-clamp-3">
                  {heroPost.content}
                </p>

                {/* Tags */}
                {heroPost.tags && heroPost.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {heroPost.tags.map(t => (
                      <span
                        key={t}
                        className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700/60"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Author & Actions Bar */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' }}
                  >
                    {state.user.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-200">{state.user.name}</div>
                    <div className="text-[10px] text-slate-400">Author</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEdit(heroPost)}
                    className="p-2 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Edit article"
                  >
                    <PencilSimple size={15} />
                  </button>
                  <button
                    onClick={() => deletePost(heroPost.id, heroPost.title)}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Delete article"
                  >
                    <Trash size={15} />
                  </button>
                  <button
                    onClick={() => setReadingPost(heroPost)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer ml-1 shadow-md"
                  >
                    <span>Read Article</span>
                    <ArrowRight size={13} weight="bold" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 4. STORIES GRID (All cards or remaining after Hero) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-slate-200 flex items-center gap-2">
            <span>{selectedCategory === 'All' ? 'Latest Stories' : `${selectedCategory} Articles`}</span>
            <span className="text-xs font-mono text-slate-400 font-normal">
              ({filteredPosts.length} available)
            </span>
          </h2>
        </div>

        {gridPosts.length === 0 ? (
          <div
            className="rounded-2xl p-12 text-center space-y-4"
            style={{ background: '#161b22', border: '1px dashed #334155' }}
          >
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto text-2xl">
              📝
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-200">No blog posts found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? `No articles matched "${searchQuery}". Try different keywords or select All stories.`
                  : 'Be the first to publish a daily journal entry or campus blog!'}
              </p>
            </div>
            <button
              onClick={openNewBlogComposer}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-md transition-all inline-flex items-center gap-2"
            >
              <Plus size={14} weight="bold" />
              <span>Write an Article</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gridPosts.map((post, index) => {
              const theme = CATEGORY_THEMES[post.category || ''] || DEFAULT_THEME;

              return (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.04 }}
                  className="rounded-2xl overflow-hidden flex flex-col justify-between shadow-lg transition-all group hover:border-indigo-500/60"
                  style={{
                    background: '#161b22',
                    border: '1px solid #2d3748',
                  }}
                >
                  {/* Card Cover */}
                  <div
                    onClick={() => setReadingPost(post)}
                    className="h-48 relative overflow-hidden cursor-pointer select-none"
                  >
                    {post.image ? (
                      <>
                        <img
                          src={post.image}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#161b22] via-transparent to-transparent opacity-80" />
                      </>
                    ) : (
                      <div
                        className="w-full h-full flex flex-col items-center justify-center p-6 relative"
                        style={{ background: theme.gradient }}
                      >
                        <div className="text-5xl opacity-25 select-none">{theme.icon}</div>
                        <div className="text-[11px] font-bold text-white/80 uppercase tracking-widest mt-2">
                          {post.category || 'Journal'}
                        </div>
                      </div>
                    )}

                    {/* Category Chip floating on cover */}
                    <div className="absolute top-3 left-3">
                      <span
                        className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full shadow-md backdrop-blur-md"
                        style={{
                          background: `${theme.bg}`,
                          color: theme.text,
                          border: `1px solid ${theme.border}`,
                        }}
                      >
                        {post.category || 'Campus Life'}
                      </span>
                    </div>

                    {/* Read Time on top right */}
                    <div className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[10px] font-mono text-slate-300">
                      {post.readTime || calculateReadTime(post.content)}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                        <Calendar size={12} className="text-indigo-400" />
                        <span>{formatDisplayDate(post.createdAt)}</span>
                        {post.time && (
                          <>
                            <span>·</span>
                            <span>{post.time}</span>
                          </>
                        )}
                      </div>

                      <h3
                        onClick={() => setReadingPost(post)}
                        className="text-base font-bold text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-2 cursor-pointer leading-snug"
                      >
                        {post.title}
                      </h3>

                      <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                        {post.content}
                      </p>

                      {post.tags && post.tags.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          {post.tags.slice(0, 3).map(t => (
                            <span
                              key={t}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-slate-900 text-slate-400 border border-slate-800"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Card Footer */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                          style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
                        >
                          {state.user.name.charAt(0)}
                        </div>
                        <span className="text-slate-300 font-medium text-[11px] truncate max-w-[100px]">
                          {state.user.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => startEdit(post)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Edit article"
                        >
                          <PencilSimple size={13} />
                        </button>
                        <button
                          onClick={() => deletePost(post.id, post.title)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Delete article"
                        >
                          <Trash size={13} />
                        </button>
                        <button
                          onClick={() => setReadingPost(post)}
                          className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer pl-1"
                        >
                          <span>Read</span>
                          <ArrowRight size={11} weight="bold" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. POST / EDIT COMPOSER MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isComposerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-3xl rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative my-8"
              style={{
                background: '#161b22',
                border: '1px solid #334155',
              }}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                    ✏️
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-100">
                      {editingPost ? 'Edit Blog Article' : 'Create New Blog Post'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Share thoughts, academic milestones, or code insights with the community
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsComposerOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs cursor-pointer transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Form Fields */}
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 scrollbar-thin">
                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Article Title *
                  </label>
                  <input
                    value={entryTitle}
                    onChange={e => setEntryTitle(e.target.value)}
                    placeholder="e.g., Mastering React State Management & My Semester Reflections..."
                    className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold outline-none"
                    style={{ background: '#0d1117', border: '1px solid #2d3748', color: '#f1f5f9' }}
                  />
                </div>

                {/* Category & Mood */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <FolderSimple size={13} className="text-indigo-400" />
                      <span>Category</span>
                    </label>
                    <select
                      value={entryCategory}
                      onChange={e => setEntryCategory(e.target.value)}
                      className="w-full rounded-xl px-3.5 py-2 text-xs outline-none"
                      style={{ background: '#0d1117', border: '1px solid #2d3748', color: '#e2e8f0' }}
                    >
                      {CATEGORIES.filter(c => c !== 'All').map(cat => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Smiley size={13} className="text-indigo-400" />
                      <span>Mood / Tone</span>
                    </label>
                    <select
                      value={entryMood}
                      onChange={e => setEntryMood(e.target.value as any)}
                      className="w-full rounded-xl px-3.5 py-2 text-xs outline-none"
                      style={{ background: '#0d1117', border: '1px solid #2d3748', color: '#e2e8f0' }}
                    >
                      <option value="great">😄 Great & Inspiring</option>
                      <option value="good">🎯 Focused & Productive</option>
                      <option value="okay">⚡ Energetic & Busy</option>
                      <option value="tough">☕ Reflective & Challenging</option>
                    </select>
                  </div>
                </div>

                {/* Cover Image Upload (EXPLICITLY OPTIONAL) */}
                <div
                  className="rounded-2xl p-4 space-y-3"
                  style={{ background: '#0d1117', border: '1px solid #2d3748' }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                      <ImageIcon size={14} className="text-indigo-400" />
                      <span>Cover Image (Optional)</span>
                    </label>
                    <span className="text-[11px] text-indigo-300 font-mono">
                      {entryImage ? 'Image Selected' : 'Optional — Gradient used if empty'}
                    </span>
                  </div>

                  {/* Tabs: Upload / URL / Presets */}
                  <div className="flex items-center gap-1 border-b border-slate-800 pb-2">
                    <button
                      type="button"
                      onClick={() => setImageTab('upload')}
                      className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                        imageTab === 'upload' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageTab('url')}
                      className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                        imageTab === 'url' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Image URL
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageTab('presets')}
                      className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                        imageTab === 'presets' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Preset Photos
                    </button>
                  </div>

                  {/* Tab 1: Local File Upload */}
                  {imageTab === 'upload' && (
                    <div className="space-y-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border border-dashed border-slate-700 hover:border-indigo-500 rounded-xl p-4 text-center cursor-pointer transition-all bg-slate-900/40 hover:bg-slate-900/80"
                      >
                        <UploadSimple size={24} className="text-indigo-400 mx-auto mb-1" />
                        <span className="text-xs font-semibold text-slate-300 block">
                          Click to browse and upload photo from your device
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          PNG, JPG, WebP supported (Max 5MB)
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Image URL */}
                  {imageTab === 'url' && (
                    <div className="flex gap-2">
                      <input
                        value={customImageUrl}
                        onChange={e => setCustomImageUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="flex-1 rounded-xl px-3.5 py-2 text-xs outline-none font-mono"
                        style={{ background: '#161b22', border: '1px solid #334155', color: '#e2e8f0' }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!customImageUrl.trim()) return;
                          setEntryImage(customImageUrl.trim());
                          toast.success('Attached image URL!');
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 cursor-pointer"
                      >
                        Set
                      </button>
                    </div>
                  )}

                  {/* Tab 3: Presets */}
                  {imageTab === 'presets' && (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {PRESET_IMAGES.map(img => (
                        <button
                          key={img.label}
                          type="button"
                          onClick={() => {
                            setEntryImage(img.url);
                            toast.success(`Attached preset: ${img.label}`);
                          }}
                          className="h-16 rounded-xl overflow-hidden relative border border-slate-700 hover:border-indigo-400 group cursor-pointer text-left"
                        >
                          <img
                            src={img.url}
                            alt={img.label}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <span className="absolute inset-x-0 bottom-0 bg-black/75 text-[9px] font-bold p-1 text-white truncate block">
                            {img.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Preview Banner */}
                  {entryImage ? (
                    <div className="relative rounded-xl overflow-hidden h-28 border border-slate-700">
                      <img src={entryImage} alt="Cover preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-between p-3">
                        <span className="text-xs font-bold text-white">Cover Preview</span>
                        <button
                          type="button"
                          onClick={() => {
                            setEntryImage('');
                            setCustomImageUrl('');
                          }}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
                        >
                          Remove Image
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="rounded-xl p-3 text-center text-xs font-medium text-slate-400"
                      style={{
                        background:
                          (CATEGORY_THEMES[entryCategory] || DEFAULT_THEME).bg,
                        border: `1px dashed ${(CATEGORY_THEMES[entryCategory] || DEFAULT_THEME).border}`,
                      }}
                    >
                      ✨ No image uploaded — A modern {entryCategory} themed gradient cover will be used automatically.
                    </div>
                  )}
                </div>

                {/* Article Content */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-300">
                      Article Content *
                    </label>
                    <span className="text-[11px] font-mono text-slate-400">
                      {calculateReadTime(entryContent)}
                    </span>
                  </div>
                  <textarea
                    value={entryContent}
                    onChange={e => setEntryContent(e.target.value)}
                    rows={8}
                    placeholder="Write your story, lessons learned, or project milestones..."
                    className="w-full rounded-2xl p-4 text-xs sm:text-sm outline-none resize-none"
                    style={{
                      background: '#0d1117',
                      border: '1px solid #2d3748',
                      color: '#e2e8f0',
                      lineHeight: 1.7,
                    }}
                  />
                </div>

                {/* Tags & Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Tag size={13} className="text-indigo-400" />
                      <span>Tags (Comma-separated)</span>
                    </label>
                    <input
                      value={entryTags}
                      onChange={e => setEntryTags(e.target.value)}
                      placeholder="React, Exams, CampusLife, Hackathon"
                      className="w-full rounded-xl px-3.5 py-2 text-xs outline-none"
                      style={{ background: '#0d1117', border: '1px solid #2d3748', color: '#e2e8f0' }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <Calendar size={13} className="text-indigo-400" />
                        <span>Date</span>
                      </label>
                      <input
                        type="date"
                        value={entryDate}
                        onChange={e => setEntryDate(e.target.value)}
                        className="w-full rounded-xl px-2.5 py-2 text-xs outline-none font-mono"
                        style={{ background: '#0d1117', border: '1px solid #2d3748', color: '#e2e8f0' }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <Clock size={13} className="text-indigo-400" />
                        <span>Time</span>
                      </label>
                      <input
                        type="text"
                        value={entryTime}
                        onChange={e => setEntryTime(e.target.value)}
                        placeholder="10:30 AM"
                        className="w-full rounded-xl px-2.5 py-2 text-xs outline-none font-mono"
                        style={{ background: '#0d1117', border: '1px solid #2d3748', color: '#e2e8f0' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsComposerOpen(false)}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePost}
                  disabled={!entryTitle.trim() || !entryContent.trim() || isPublishing}
                  className="px-6 py-2 rounded-xl text-xs font-bold text-white shadow-lg cursor-pointer transition-all disabled:opacity-40 flex items-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  }}
                >
                  {isPublishing ? (
                    <>
                      <CircleNotch size={14} className="animate-spin" />
                      <span>{editingPost ? 'Updating...' : 'Publishing...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkle size={14} weight="fill" />
                      <span>{editingPost ? 'Update Article' : 'Publish Article'}</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 6. FULL ARTICLE READING MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {readingPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl relative my-8"
              style={{
                background: '#161b22',
                border: '1px solid #334155',
              }}
            >
              {/* Cover Hero */}
              <div className="h-56 sm:h-72 relative overflow-hidden">
                {readingPost.image ? (
                  <>
                    <img
                      src={readingPost.image}
                      alt={readingPost.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#161b22] via-[#161b22]/40 to-transparent" />
                  </>
                ) : (
                  <div
                    className="w-full h-full flex flex-col items-center justify-center p-8 relative"
                    style={{
                      background:
                        (CATEGORY_THEMES[readingPost.category || ''] || DEFAULT_THEME).gradient,
                    }}
                  >
                    <div className="text-7xl opacity-20">
                      {(CATEGORY_THEMES[readingPost.category || ''] || DEFAULT_THEME).icon}
                    </div>
                  </div>
                )}

                {/* Close Button */}
                <button
                  onClick={() => setReadingPost(null)}
                  className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center backdrop-blur-sm cursor-pointer transition-colors shadow-lg"
                >
                  <X size={18} />
                </button>

                {/* Category chip on hero */}
                <div className="absolute bottom-4 left-6 sm:left-8 flex items-center gap-2">
                  <span
                    className="text-xs font-bold px-3 py-1 rounded-full shadow-md backdrop-blur-md"
                    style={{
                      background: (CATEGORY_THEMES[readingPost.category || ''] || DEFAULT_THEME).bg,
                      color: (CATEGORY_THEMES[readingPost.category || ''] || DEFAULT_THEME).text,
                      border: `1px solid ${(CATEGORY_THEMES[readingPost.category || ''] || DEFAULT_THEME).border}`,
                    }}
                  >
                    {readingPost.category || 'Campus Life'}
                  </span>
                  <span className="text-xs font-mono text-slate-300 bg-black/60 px-2.5 py-1 rounded-full backdrop-blur-sm">
                    {readingPost.readTime || calculateReadTime(readingPost.content)}
                  </span>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 sm:p-8 space-y-6 max-h-[60vh] overflow-y-auto scrollbar-thin">
                {/* Meta details: Author, Date */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md"
                      style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
                    >
                      {state.user.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-200">{state.user.name}</div>
                      <div className="text-xs text-slate-400 font-mono">
                        Published on {formatDisplayDate(readingPost.createdAt)}
                        {readingPost.time && ` · ${readingPost.time}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEdit(readingPost)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20 cursor-pointer transition-colors"
                    >
                      <PencilSimple size={14} />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => deletePost(readingPost.id, readingPost.title)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 cursor-pointer transition-colors"
                    >
                      <Trash size={14} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>

                {/* Article Title */}
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight leading-tight">
                  {readingPost.title}
                </h1>

                {/* Article Content */}
                <div className="text-sm sm:text-base text-slate-300 leading-relaxed whitespace-pre-wrap font-sans space-y-4">
                  {readingPost.content}
                </div>

                {/* Tags Footer */}
                {readingPost.tags && readingPost.tags.length > 0 && (
                  <div className="pt-6 border-t border-slate-800 space-y-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                      Tags & Topics
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {readingPost.tags.map(t => (
                        <span
                          key={t}
                          className="text-xs font-medium px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-900/60 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => setReadingPost(null)}
                  className="px-6 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-200 hover:bg-slate-700 cursor-pointer transition-colors"
                >
                  Close Article
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
