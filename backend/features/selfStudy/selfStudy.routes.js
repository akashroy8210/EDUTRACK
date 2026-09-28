const express = require('express');
const router = express.Router();
const selfStudyController = require('./selfStudy.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/sessions', selfStudyController.getSessions);
router.post('/sessions', selfStudyController.createSession);
router.put('/sessions/:id', selfStudyController.updateSession);
router.delete('/sessions/:id', selfStudyController.deleteSession);
router.post('/sessions/:id/timer', selfStudyController.logTimer);
router.get('/summary', selfStudyController.getStudySummary);

module.exports = router;
