const mongoose = require('mongoose');
const LeetCodeDaily = require('./leetcodeDaily.model');
const User = require('../auth/auth.model');
const { getTodayDate, addDays } = require('../../utils/dateUtils');
const { ApiError } = require('../../middleware/error.middleware');

// Cache structures to prevent hitting LeetCode rate limits
const cache = {
  daily: { timestamp: 0, data: null },
  users: new Map(), // username -> { timestamp, data }
};

const DAILY_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const USER_CACHE_TTL = 3 * 60 * 1000;   // 3 minutes

const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql';

/**
 * Fetch today's official LeetCode Daily Challenge.
 */
async function getDailyProblem(userId) {
  const today = getTodayDate();
  let dailyData = null;

  if (cache.daily.data && Date.now() - cache.daily.timestamp < DAILY_CACHE_TTL) {
    dailyData = { ...cache.daily.data };
  } else {
    try {
      const res = await fetch(LEETCODE_GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'EduTrack-Student-Portal/1.0 (Student Dashboard)',
        },
        body: JSON.stringify({
          query: `
            query questionOfToday {
              activeDailyCodingChallengeQuestion {
                date
                link
                question {
                  questionFrontendId
                  title
                  titleSlug
                  difficulty
                  topicTags {
                    name
                    slug
                  }
                }
              }
            }
          `,
        }),
        signal: AbortSignal.timeout(8000),
      });

      const json = await res.json();
      const challenge = json?.data?.activeDailyCodingChallengeQuestion;
      if (challenge?.question) {
        const q = challenge.question;
        dailyData = {
          date: challenge.date || today,
          problemNumber: q.questionFrontendId || '',
          title: q.title || 'Daily Challenge',
          titleSlug: q.titleSlug || '',
          difficulty: q.difficulty || 'Medium',
          topicTags: Array.isArray(q.topicTags) ? q.topicTags.map(t => t.name) : [],
          link: `https://leetcode.com${challenge.link || `/problems/${q.titleSlug}/`}`,
        };
        cache.daily = { timestamp: Date.now(), data: dailyData };
      }
    } catch (err) {
      console.warn('[LeetCode] Could not fetch live daily challenge:', err.message);
      if (cache.daily.data) dailyData = { ...cache.daily.data };
    }
  }

  // Graceful fallback if LeetCode GraphQL is temporarily unreachable
  if (!dailyData) {
    dailyData = {
      date: today,
      problemNumber: '1614',
      title: 'Maximum Nesting Depth of the Parentheses',
      titleSlug: 'maximum-nesting-depth-of-the-parentheses',
      difficulty: 'Easy',
      topicTags: ['String', 'Stack'],
      link: 'https://leetcode.com/problems/maximum-nesting-depth-of-the-parentheses/',
    };
  }

  // Check user's saved status for this daily question if userId is provided
  let userStatus = 'not-started';
  if (userId) {
    let record = await LeetCodeDaily.findOne({ userId, date: dailyData.date });
    if (record) {
      userStatus = record.status;
    }

    // Auto-fetch: If not already solved, check if user has solved it on LeetCode!
    if (userStatus !== 'solved') {
      try {
        const user = await User.findById(userId);
        if (user?.leetcodeUsername) {
          const profile = await getUserProfile(user.leetcodeUsername);
          if (profile?.recentSolvedSlugs?.includes(dailyData.titleSlug)) {
            userStatus = 'solved';
            if (!record) {
              record = new LeetCodeDaily({
                userId,
                date: dailyData.date,
                problemNumber: dailyData.problemNumber,
                title: dailyData.title,
                titleSlug: dailyData.titleSlug,
                difficulty: dailyData.difficulty,
                status: 'solved',
                solvedAt: new Date(),
              });
            } else {
              record.status = 'solved';
              record.solvedAt = new Date();
            }
            await record.save();
          } else if (profile?.recentAttemptedSlugs?.includes(dailyData.titleSlug) && userStatus === 'not-started') {
            userStatus = 'attempted';
          }
        }
      } catch (e) {
        // Silently continue if network/user lookup fails
      }
    }
  }

  return {
    ...dailyData,
    status: userStatus,
  };
}

/**
 * Fetch LeetCode public profile, ranking, and solved breakdown.
 */
async function getUserProfile(username) {
  if (!username || typeof username !== 'string') {
    throw new ApiError(400, 'Valid LeetCode username is required.', 'BAD_REQUEST');
  }

  const clean = username.trim().toLowerCase();
  const cached = cache.users.get(clean);
  if (cached && Date.now() - cached.timestamp < USER_CACHE_TTL) {
    return cached.data;
  }

  try {
    const res = await fetch(LEETCODE_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'EduTrack-Student-Portal/1.0',
      },
      body: JSON.stringify({
        query: `
          query userProfile($username: String!) {
            matchedUser(username: $username) {
              username
              profile {
                ranking
                userAvatar
                realName
              }
              submitStatsGlobal {
                acSubmissionNum {
                  difficulty
                  count
                }
              }
              userCalendar {
                streak
                totalActiveDays
              }
            }
            recentAcSubmissionList(username: $username, limit: 20) {
              titleSlug
            }
            recentSubmissionList(username: $username) {
              titleSlug
              statusDisplay
            }
          }
        `,
        variables: { username: clean },
      }),
      signal: AbortSignal.timeout(9000),
    });

    const json = await res.json();
    const matched = json?.data?.matchedUser;
    if (!matched) {
      throw new ApiError(404, `LeetCode profile for "${clean}" not found.`, 'NOT_FOUND');
    }

    const acStats = matched.submitStatsGlobal?.acSubmissionNum || [];
    const allStat = acStats.find(s => s.difficulty === 'All') || { count: 0 };
    const easyStat = acStats.find(s => s.difficulty === 'Easy') || { count: 0 };
    const mediumStat = acStats.find(s => s.difficulty === 'Medium') || { count: 0 };
    const hardStat = acStats.find(s => s.difficulty === 'Hard') || { count: 0 };

    const recentAcList = json?.data?.recentAcSubmissionList || [];
    const recentSubList = json?.data?.recentSubmissionList || [];

    const recentSolvedSlugs = Array.from(new Set([
      ...recentAcList.map(s => s.titleSlug).filter(Boolean),
      ...recentSubList.filter(s => s.statusDisplay === 'Accepted').map(s => s.titleSlug).filter(Boolean)
    ]));

    const recentAttemptedSlugs = Array.from(new Set(
      recentSubList.filter(s => s.statusDisplay !== 'Accepted').map(s => s.titleSlug).filter(Boolean)
    ));

    const profileData = {
      username: matched.username,
      realName: matched.profile?.realName || matched.username,
      avatar: matched.profile?.userAvatar || '',
      ranking: matched.profile?.ranking || 0,
      currentStreak: matched.userCalendar?.streak || 0,
      totalActiveDays: matched.userCalendar?.totalActiveDays || 0,
      totalSolved: allStat.count || 0,
      easySolved: easyStat.count || 0,
      mediumSolved: mediumStat.count || 0,
      hardSolved: hardStat.count || 0,
      recentSolvedSlugs,
      recentAttemptedSlugs,
    };

    cache.users.set(clean, { timestamp: Date.now(), data: profileData });
    return profileData;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(502, `Failed to query LeetCode API: ${err.message}`, 'BAD_GATEWAY');
  }
}

/**
 * Connect LeetCode username to authenticated user's profile.
 */
async function connectAccount(userId, username) {
  const profile = await getUserProfile(username);
  await User.findByIdAndUpdate(userId, { leetcodeUsername: profile.username });
  return profile;
}

/**
 * Update daily problem status for user (Not Started / Attempted / Solved).
 */
async function updateDailyStatus(userId, { date, problemNumber, title, titleSlug, difficulty, status }) {
  const targetDate = date || getTodayDate();
  const validStatus = ['not-started', 'attempted', 'solved'].includes(status) ? status : 'not-started';

  const record = await LeetCodeDaily.findOneAndUpdate(
    { userId, date: targetDate },
    {
      problemNumber: problemNumber || '',
      title: (title || 'Daily Challenge').trim(),
      titleSlug: (titleSlug || '').trim(),
      difficulty: difficulty || 'Medium',
      status: validStatus,
      solvedAt: validStatus === 'solved' ? new Date() : null,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return record;
}

/**
 * Calculate streak and return complete daily challenge history for student.
 */
async function getDailyHistory(userId) {
  const records = await LeetCodeDaily.find({ userId }).sort({ date: -1 });

  // Calculate current streak and longest streak based on solved dates
  const solvedDates = new Set(
    records.filter(r => r.status === 'solved').map(r => r.date)
  );

  const today = getTodayDate();
  let currentStreak = 0;
  let curr = today;

  if (!solvedDates.has(curr)) {
    curr = addDays(curr, -1);
  }

  while (solvedDates.has(curr)) {
    currentStreak++;
    curr = addDays(curr, -1);
  }

  // Calculate longest streak
  const sortedDates = Array.from(solvedDates).sort();
  let longestStreak = 0;
  let tempStreak = 0;
  let lastDate = null;

  for (const d of sortedDates) {
    if (!lastDate) {
      tempStreak = 1;
    } else {
      const expected = addDays(lastDate, 1);
      if (d === expected) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);
    lastDate = d;
  }

  const solvedCount = records.filter(r => r.status === 'solved').length;
  const attemptedCount = records.filter(r => r.status === 'attempted').length;

  return {
    records,
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    solvedCount,
    attemptedCount,
    totalTracked: records.length,
  };
}

module.exports = {
  getDailyProblem,
  getUserProfile,
  connectAccount,
  updateDailyStatus,
  getDailyHistory,
};
