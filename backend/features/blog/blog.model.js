const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
    },
    imageUrl: {
      type: String,
      default: '',
    },
    date: {
      type: String, // 'YYYY-MM-DD'
      required: true,
    },
    time: {
      type: String, // 'HH:MM'
      required: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    mood: {
      type: String,
      default: 'focused',
    },
    readTime: {
      type: String,
      default: '2 min read',
    },
  },
  { timestamps: true }
);

blogSchema.index({ userId: 1, date: -1 });

const Blog = mongoose.model('Blog', blogSchema);

module.exports = Blog;
