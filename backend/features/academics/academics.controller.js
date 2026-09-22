const academicsService = require('./academics.service');
const { success, created, noContent } = require('../../utils/responseFormatter');

/**
 * Controller handlers for student academic and attendance operations.
 */

/**
 * Handles GET /api/academics/subjects
 * Retrieves all registered academic subjects and dynamic real-time attendance statistics.
 */
async function getSubjects(req, res, next) {
  try {
    const subjects = await academicsService.getSubjects(req.user.id);
    return success(res, { subjects });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles GET /api/academics/subjects/:id
 * Retrieves full subject profile, class sessions, and historical attendance records.
 */
async function getSubjectDetail(req, res, next) {
  try {
    const detail = await academicsService.getSubjectDetail(req.user.id, req.params.id);
    return success(res, detail);
  } catch (err) {
    next(err);
  }
}

/**
 * Handles POST /api/academics/subjects
 * Registers or updates an academic subject.
 */
async function createSubject(req, res, next) {
  try {
    const subject = await academicsService.createSubject(req.user.id, req.body);
    return created(res, { subject });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles GET /api/academics/schedule
 * Retrieves the full weekly timetable schedule for the authenticated student.
 */
async function getSchedule(req, res, next) {
  try {
    const schedule = await academicsService.getSchedule(req.user.id);
    return success(res, { schedule });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles POST /api/academics/schedule
 * Creates a new weekly recurring class session slot.
 */
async function addClassSession(req, res, next) {
  try {
    const session = await academicsService.addClassSession(req.user.id, req.body);
    return created(res, { session });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles PUT /api/academics/schedule/:id
 * Modifies an existing class session slot (time, room, type, interval).
 */
async function updateClassSession(req, res, next) {
  try {
    const session = await academicsService.updateClassSession(req.user.id, req.params.id, req.body);
    return success(res, { session });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles DELETE /api/academics/schedule/:id
 * Removes a class session slot from the timetable.
 */
async function deleteClassSession(req, res, next) {
  try {
    await academicsService.deleteClassSession(req.user.id, req.params.id);
    return noContent(res);
  } catch (err) {
    next(err);
  }
}

/**
 * Handles GET /api/academics/holidays
 * Retrieves list of scheduled holidays.
 */
async function getHolidays(req, res, next) {
  try {
    const holidays = await academicsService.getHolidays(req.user.id);
    return success(res, { holidays });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles POST /api/academics/holidays
 * Schedules a new holiday (full-day or class-specific).
 */
async function addHoliday(req, res, next) {
  try {
    const holiday = await academicsService.addHoliday(req.user.id, req.body);
    return created(res, { holiday });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles DELETE /api/academics/holidays/:id
 * Deletes a scheduled holiday.
 */
async function deleteHoliday(req, res, next) {
  try {
    await academicsService.deleteHoliday(req.user.id, req.params.id);
    return noContent(res);
  } catch (err) {
    next(err);
  }
}

/**
 * Handles POST /api/academics/attendance
 * Records attendance ('present' or 'absent') for today's session.
 */
async function markAttendance(req, res, next) {
  try {
    const record = await academicsService.markAttendance(req.user.id, req.body);
    return success(res, { record });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles GET /api/academics/attendance/summary
 * Retrieves overall attendance percentage and summary statistics across all subjects.
 */
async function getAttendanceSummary(req, res, next) {
  try {
    const summary = await academicsService.getAttendanceSummary(req.user.id);
    return success(res, summary);
  } catch (err) {
    next(err);
  }
}

/**
 * Handles DELETE /api/academics/subjects/:id
 * Deletes a subject and its associated class sessions and attendance history.
 */
async function deleteSubject(req, res, next) {
  try {
    await academicsService.deleteSubject(req.user.id, req.params.id);
    return noContent(res);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSubjects,
  getSubjectDetail,
  createSubject,
  deleteSubject,
  getSchedule,
  addClassSession,
  updateClassSession,
  deleteClassSession,
  getHolidays,
  addHoliday,
  deleteHoliday,
  markAttendance,
  getAttendanceSummary,
};
