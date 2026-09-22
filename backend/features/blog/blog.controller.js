const blogService = require('./blog.service');
const { success, created, noContent } = require('../../utils/responseFormatter');

async function getBlogs(req, res, next) {
  try {
    const blogs = await blogService.getBlogs(req.user.id, req.query.tag);
    return success(res, { blogs });
  } catch (err) {
    next(err);
  }
}

async function createBlog(req, res, next) {
  try {
    const blog = await blogService.createBlog(req.user.id, req.body);
    return created(res, { blog });
  } catch (err) {
    next(err);
  }
}

async function updateBlog(req, res, next) {
  try {
    const blog = await blogService.updateBlog(req.user.id, req.params.id, req.body);
    return success(res, { blog });
  } catch (err) {
    next(err);
  }
}

async function deleteBlog(req, res, next) {
  try {
    await blogService.deleteBlog(req.user.id, req.params.id);
    return noContent(res);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getBlogs,
  createBlog,
  updateBlog,
  deleteBlog,
};
