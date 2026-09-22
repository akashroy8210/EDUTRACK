function validateCreateBlog(body) {
  const { title, content } = body;
  const errors = [];
  if (!title || typeof title !== 'string' || !title.trim()) {
    errors.push('Journal entry title is required.');
  }
  if (!content || typeof content !== 'string' || !content.trim()) {
    errors.push('Journal content is required.');
  }
  return {
    isValid: errors.length === 0,
    message: errors.join(' '),
    details: errors,
  };
}

module.exports = {
  validateCreateBlog,
};
