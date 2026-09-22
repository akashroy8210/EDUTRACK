const express = require('express');
const examsController = require('./exams.controller');
const { validateCreateExam } = require('./exams.validation');
const { validateMiddleware } = require('../../middleware/validate.middleware');
const { authMiddleware } = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', examsController.getExams);
router.post('/', validateMiddleware(validateCreateExam), examsController.createExam);
router.put('/:id', examsController.updateExam);
router.delete('/:id', examsController.deleteExam);

module.exports = router;
