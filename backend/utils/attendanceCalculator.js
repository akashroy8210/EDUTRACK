/**
 * Authoritative 75% Attendance Calculator for Indian University System.
 * Computes safety buffers, classes needed, attendance percentages, and risk status.
 */

/**
 * Calculates the number of upcoming classes a student can safely skip across the semester
 * without dropping below the 75% attendance threshold.
 *
 * Formula:
 * totalClasses - (totalClasses * 75) / 100 - absentClasses
 *
 * @param {number} totalClasses - Total scheduled classes in the semester (after subtracting holidays)
 * @param {number} [absentClasses=0] - Number of classes already missed/absent
 * @returns {number} Non-negative integer count of classes safe to skip
 */
function calculateClassesCanSkip(totalClasses, absentClasses = 0) {
  const safeTotal = Math.max(0, Number(totalClasses) || 0);
  const safeAbsent = Math.max(0, Number(absentClasses) || 0);
  const maxAllowed = Math.floor(safeTotal - (safeTotal * 75) / 100);
  const canSkip = maxAllowed - safeAbsent;
  return Math.max(0, canSkip);
}

/**
 * Calculates academic attendance metrics against the 75% mandatory threshold.
 *
 * Formulas:
 * - percentage: (attended / conducted) * 100
 * - status:
 *     - percentage < 75 => 'At Risk' (shortage of attendance)
 *     - percentage < 85 => 'Moderate' (approaching shortage)
 *     - percentage >= 85 => 'Safe'
 * - classesCanSkip:
 *     totalClasses - (totalClasses * 75) / 100 - absentClasses
 * - classesNeededFor75:
 *     Consecutive upcoming classes the student must attend to reach >= 75%:
 *     max(0, 3 * conducted - 4 * attended)
 *
 * @param {number} attended - Total attended classes count ('present')
 * @param {number} conducted - Total conducted classes count till now
 * @param {number} [totalClasses] - Total scheduled classes across semester (excluding holidays)
 * @param {number} [missedCount] - Total missed classes count ('absent')
 * @returns {{
 *   attended: number,
 *   total: number,
 *   missed: number,
 *   percentage: number,
 *   status: 'Safe' | 'Moderate' | 'At Risk',
 *   classesCanSkip: number,
 *   classesNeededFor75: number
 * }} Calculated attendance metrics
 */
function calculateAttendanceMetrics(attended, conducted, totalClasses, missedCount) {
  const safeAttended = Math.max(0, Number(attended) || 0);
  const safeConducted = Math.max(safeAttended, Number(conducted) || 0);
  const safeTotalClasses = Math.max(safeConducted, Number(totalClasses) || safeConducted);
  const safeMissed = missedCount !== undefined ? Math.max(0, Number(missedCount) || 0) : (safeConducted - safeAttended);

  // If 0 classes have been conducted so far, default to 100% and Safe status
  if (safeConducted === 0) {
    return {
      attended: 0,
      total: 0,
      missed: 0,
      percentage: 100,
      status: 'Safe',
      classesCanSkip: calculateClassesCanSkip(safeTotalClasses, 0),
      classesNeededFor75: 0,
    };
  }

  const percentage = Math.round((safeAttended / safeConducted) * 100);

  let status = 'Safe';
  if (percentage < 75) {
    status = 'At Risk';
  } else if (percentage < 85) {
    status = 'Moderate';
  }

  // Margin of classes safe to skip: totalClasses - (totalClasses * 75) / 100 - absentClasses
  const classesCanSkip = calculateClassesCanSkip(safeTotalClasses, safeMissed);

  // Consecutive classes needed to recover to 75%: 3 * conducted - 4 * attended
  let classesNeededFor75 = 0;
  if (percentage < 75) {
    classesNeededFor75 = Math.max(0, 3 * safeConducted - 4 * safeAttended);
  }

  return {
    attended: safeAttended,
    total: safeConducted,
    missed: safeMissed,
    percentage,
    status,
    classesCanSkip,
    classesNeededFor75,
  };
}

module.exports = {
  calculateClassesCanSkip,
  calculateAttendanceMetrics,
};
