const { ApiError } = require('../../middleware/error.middleware');

// In-memory cache structures to avoid hitting Codeforces rate limits
const cache = {
  contests: { timestamp: 0, data: null },
  users: new Map(), // handle -> { timestamp, data }
  ratings: new Map(), // handle -> { timestamp, data }
  statuses: new Map(), // handle -> { timestamp, data }
};

const CONTESTS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const USER_CACHE_TTL = 2 * 60 * 1000;     // 2 minutes

/**
 * Fetch and return Codeforces user profile info.
 */
async function getUserInfo(handle) {
  if (!handle || typeof handle !== 'string') {
    throw new ApiError(400, 'Valid Codeforces handle is required.', 'BAD_REQUEST');
  }

  const cleanHandle = handle.trim();
  const cached = cache.users.get(cleanHandle.toLowerCase());
  if (cached && Date.now() - cached.timestamp < USER_CACHE_TTL) {
    return cached.data;
  }

  try {
    const res = await fetch(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(cleanHandle)}`, {
      headers: { 'User-Agent': 'EduTrack-Student-Dashboard/1.0' },
      signal: AbortSignal.timeout(8000),
    });

    const data = await res.json();
    if (data.status !== 'OK' || !data.result || data.result.length === 0) {
      throw new ApiError(404, data.comment || `Codeforces user "${cleanHandle}" not found.`, 'NOT_FOUND');
    }

    const userInfo = data.result[0];
    cache.users.set(cleanHandle.toLowerCase(), { timestamp: Date.now(), data: userInfo });
    return userInfo;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(502, `Failed to connect to Codeforces API: ${err.message}`, 'BAD_GATEWAY');
  }
}

/**
 * Fetch upcoming and live Codeforces contests.
 */
async function getUpcomingContests() {
  if (cache.contests.data && Date.now() - cache.contests.timestamp < CONTESTS_CACHE_TTL) {
    return cache.contests.data;
  }

  try {
    const res = await fetch('https://codeforces.com/api/contest.list?gym=false', {
      headers: { 'User-Agent': 'EduTrack-Student-Dashboard/1.0' },
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json();
    if (data.status !== 'OK' || !Array.isArray(data.result)) {
      throw new ApiError(502, 'Could not retrieve contest list from Codeforces.', 'BAD_GATEWAY');
    }

    // Filter upcoming (phase === 'BEFORE') and currently running (phase === 'CODING')
    const relevantContests = data.result
      .filter(c => c.phase === 'BEFORE' || c.phase === 'CODING')
      .sort((a, b) => (a.startTimeSeconds || 0) - (b.startTimeSeconds || 0));

    cache.contests = { timestamp: Date.now(), data: relevantContests };
    return relevantContests;
  } catch (err) {
    if (cache.contests.data) return cache.contests.data; // Serve stale cache if CF is slow/down
    if (err instanceof ApiError) throw err;
    throw new ApiError(502, `Failed to fetch Codeforces contests: ${err.message}`, 'BAD_GATEWAY');
  }
}

/**
 * Fetch rating history changes for a handle.
 */
async function getUserRatingHistory(handle) {
  if (!handle) throw new ApiError(400, 'Handle is required.', 'BAD_REQUEST');

  const cleanHandle = handle.trim();
  const cached = cache.ratings.get(cleanHandle.toLowerCase());
  if (cached && Date.now() - cached.timestamp < USER_CACHE_TTL) {
    return cached.data;
  }

  try {
    const res = await fetch(`https://codeforces.com/api/user.rating?handle=${encodeURIComponent(cleanHandle)}`, {
      headers: { 'User-Agent': 'EduTrack-Student-Dashboard/1.0' },
      signal: AbortSignal.timeout(8000),
    });

    const data = await res.json();
    if (data.status !== 'OK' || !Array.isArray(data.result)) {
      throw new ApiError(404, data.comment || `No rating history found for "${cleanHandle}".`, 'NOT_FOUND');
    }

    cache.ratings.set(cleanHandle.toLowerCase(), { timestamp: Date.now(), data: data.result });
    return data.result;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(502, `Failed to fetch Codeforces rating history: ${err.message}`, 'BAD_GATEWAY');
  }
}

/**
 * Fetch problem solving submissions and unique AC count for a handle.
 */
async function getUserStatus(handle) {
  if (!handle) throw new ApiError(400, 'Handle is required.', 'BAD_REQUEST');

  const cleanHandle = handle.trim();
  const cached = cache.statuses.get(cleanHandle.toLowerCase());
  if (cached && Date.now() - cached.timestamp < USER_CACHE_TTL) {
    return cached.data;
  }

  try {
    const res = await fetch(`https://codeforces.com/api/user.status?handle=${encodeURIComponent(cleanHandle)}&from=1&count=1000`, {
      headers: { 'User-Agent': 'EduTrack-Student-Dashboard/1.0' },
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json();
    if (data.status !== 'OK' || !Array.isArray(data.result)) {
      throw new ApiError(404, data.comment || `Could not fetch submission history.`, 'NOT_FOUND');
    }

    const solvedProblems = new Set();
    const tagsMap = {};

    data.result.forEach(sub => {
      if (sub.verdict === 'OK' && sub.problem) {
        const key = `${sub.problem.contestId || ''}-${sub.problem.index || ''}-${sub.problem.name || ''}`;
        solvedProblems.add(key);

        if (Array.isArray(sub.problem.tags)) {
          sub.problem.tags.forEach(t => {
            tagsMap[t] = (tagsMap[t] || 0) + 1;
          });
        }
      }
    });

    const result = {
      totalSubmissions: data.result.length,
      solvedCount: solvedProblems.size,
      topTags: Object.entries(tagsMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([tag, count]) => ({ tag, count })),
    };

    cache.statuses.set(cleanHandle.toLowerCase(), { timestamp: Date.now(), data: result });
    return result;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(502, `Failed to fetch Codeforces submission status: ${err.message}`, 'BAD_GATEWAY');
  }
}

module.exports = {
  getUserInfo,
  getUpcomingContests,
  getUserRatingHistory,
  getUserStatus,
};
