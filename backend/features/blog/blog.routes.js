const express = require('express');
const blogController = require('./blog.controller');
const { validateCreateBlog } = require('./blog.validation');
const { validateMiddleware } = require('../../middleware/validate.middleware');
const { authMiddleware } = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', blogController.getBlogs);
router.post('/', validateMiddleware(validateCreateBlog), blogController.createBlog);
router.put('/:id', blogController.updateBlog);
router.delete('/:id', blogController.deleteBlog);

module.exports = router;
