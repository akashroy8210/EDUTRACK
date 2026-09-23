const Blog = require('./blog.model');
const { getTodayDate } = require('../../utils/dateUtils');
const { ApiError } = require('../../middleware/error.middleware');

function estimateReadTime(text) {
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

async function getBlogs(userId, tag) {
  const query = { userId };
  if (tag) query.tags = tag;
  return await Blog.find(query).sort({ date: -1, createdAt: -1 });
}

async function createBlog(userId, data) {
  const today = getTodayDate();
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return await Blog.create({
    userId,
    title: (data.title || '').trim(),
    content: (data.content || '').trim(),
    imageUrl: data.imageUrl || data.image || '',
    date: data.date || data.createdAt || today,
    time: data.time || currentTime,
    tags: Array.isArray(data.tags) ? data.tags : [],
    category: data.category || 'Campus Life',
    mood: data.mood || 'focused',
    readTime: estimateReadTime(data.content || ''),
  });
}

async function updateBlog(userId, id, data) {
  const blog = await Blog.findOne({ _id: id, userId });
  if (!blog) {
    throw new ApiError(404, 'Blog post not found.', 'NOT_FOUND');
  }

  const fields = ['title', 'content', 'imageUrl', 'date', 'time', 'tags', 'mood', 'category'];
  fields.forEach(f => {
    if (data[f] !== undefined) blog[f] = data[f];
  });
  if (data.image && data.imageUrl === undefined) {
    blog.imageUrl = data.image;
  }
  if (data.createdAt && data.date === undefined) {
    blog.date = data.createdAt;
  }

  if (data.content) {
    blog.readTime = estimateReadTime(data.content);
  }

  await blog.save();
  return blog;
}

async function deleteBlog(userId, id) {
  const deleted = await Blog.findOneAndDelete({ _id: id, userId });
  if (!deleted) {
    throw new ApiError(404, 'Blog post not found.', 'NOT_FOUND');
  }
  return deleted;
}

module.exports = {
  getBlogs,
  createBlog,
  updateBlog,
  deleteBlog,
};
