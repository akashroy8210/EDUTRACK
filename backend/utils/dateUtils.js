/**
 * Date and Time Helper Functions tailored for MyDashboard.
 * Provides timezone-aware date formatting, weekday resolution, and minute conversions.
 */

/**
 * Returns today's calendar date string in YYYY-MM-DD format for a specified timezone.
 *
 * @param {string} [timezone='Asia/Kolkata'] - Target IANA timezone string
 * @returns {string} Date formatted as 'YYYY-MM-DD'
 */
function getTodayString(timezone = 'Asia/Kolkata') {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date()); // Outputs YYYY-MM-DD
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Returns the full weekday name for an ISO date string (YYYY-MM-DD).
 *
 * @param {string} dateStr - Date string in 'YYYY-MM-DD' format
 * @returns {'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday'} Day of week
 */
function getDayOfWeek(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getUTCDay()];
}

/**
 * Adds n calendar days to an ISO date string (YYYY-MM-DD) and returns the resulting date.
 *
 * @param {string} dateStr - Starting date in 'YYYY-MM-DD' format
 * @param {number} n - Number of days to add (or subtract if negative)
 * @returns {string} Resulting date in 'YYYY-MM-DD' format
 */
function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().split('T')[0];
}

/**
 * Computes the difference in calendar days between two ISO date strings (dateA - dateB).
 *
 * @param {string} dateA - First date in 'YYYY-MM-DD' format
 * @param {string} dateB - Second date in 'YYYY-MM-DD' format
 * @returns {number} Signed number of days difference
 */
function diffInDays(dateA, dateB) {
  const [y1, m1, d1] = dateA.split('-').map(Number);
  const [y2, m2, d2] = dateB.split('-').map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((utc1 - utc2) / (1000 * 60 * 60 * 24));
}

/**
 * Parses a class time interval string (e.g. "09:00 - 10:00") into starting and ending minutes from midnight.
 *
 * @param {string} timeStr - Time string formatted as "HH:MM - HH:MM"
 * @returns {{ startMinutes: number; endMinutes: number }} Minutes from midnight (0 - 1439)
 */
function parseTimeMinutes(timeStr) {
  if (!timeStr || !timeStr.includes('-')) {
    return { startMinutes: 540, endMinutes: 600 };
  }
  const [startPart, endPart] = timeStr.split('-').map(s => s.trim());
  const toMin = (t) => {
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  return {
    startMinutes: toMin(startPart),
    endMinutes: toMin(endPart),
  };
}

/**
 * Computes the current time in minutes from midnight for a given timezone.
 * Used for evaluating whether a class session scheduled for today has already occurred or started.
 *
 * @param {string} [timezone='Asia/Kolkata'] - Target IANA timezone
 * @returns {number} Current minutes from midnight (0 - 1439)
 */
function getCurrentMinutes(timezone = 'Asia/Kolkata') {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    }).formatToParts(new Date());
    const hour = Number(parts.find(p => p.type === 'hour')?.value || 0);
    const minute = Number(parts.find(p => p.type === 'minute')?.value || 0);
    return hour * 60 + minute;
  } catch {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }
}

module.exports = {
  getTodayString,
  getTodayDate: getTodayString,
  getDayOfWeek,
  getWeekday: getDayOfWeek,
  addDays,
  diffInDays,
  parseTimeMinutes,
  parseTimeInterval: parseTimeMinutes,
  getCurrentMinutes,
};
