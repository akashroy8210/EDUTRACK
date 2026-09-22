const express = require('express');
const academicsController = require('./academics.controller');
const { validateSubject, validateClassSession, validateAttendanceMark } = require('./academics.validation');
const { validateMiddleware } = require('../../middleware/validate.middleware');
const { authMiddleware } = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

// Subjects & Dedicated Subject Detail View
router.get('/subjects', academicsController.getSubjects);
router.get('/subjects/:id', academicsController.getSubjectDetail);
router.post('/subjects', validateMiddleware(validateSubject), academicsController.createSubject);
router.delete('/subjects/:id', academicsController.deleteSubject);

// Timetable Schedule
router.get('/schedule', academicsController.getSchedule);
router.post('/schedule', validateMiddleware(validateClassSession), academicsController.addClassSession);
router.put('/schedule/:id', academicsController.updateClassSession);
router.delete('/schedule/:id', academicsController.deleteClassSession);

// Holidays
router.get('/holidays', academicsController.getHolidays);
router.post('/holidays', academicsController.addHoliday);
router.delete('/holidays/:id', academicsController.deleteHoliday);

// Attendance Tracking
router.post('/attendance/mark', validateMiddleware(validateAttendanceMark), academicsController.markAttendance);
router.post('/attendance', validateMiddleware(validateAttendanceMark), academicsController.markAttendance);
router.get('/attendance/summary', academicsController.getAttendanceSummary);
router.get('/attendance', academicsController.getAttendanceSummary);
router.get('/summary', academicsController.getAttendanceSummary);

module.exports = router;
