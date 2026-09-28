import { useState, useEffect, useMemo } from 'react';
import { AppState, UserProfile, LeetCodeDailyProblem, LeetCodeProfile, LeetCodeDailyRecord, LeetCodeHistory } from '@/data/types';
import { leetcodeApi, profileApi } from '@/api/client';
import { toast } from 'sonner';
import {
  Code,
  ArrowSquareOut,
  Fire,
  Trophy,
  CheckCircle,
  Clock,
  ArrowsClockwise,
  User,
  ListBullets,
  Sparkle,
  CircleNotch,
  Timer,
  WarningCircle,
  PencilSimple,
  CalendarCheck,
  Check,
  Shuffle,
  BookmarksSimple,
  SlidersHorizontal,
  CheckSquareOffset,
  Compass,
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  state: AppState;
  onUpdateUser: (user: UserProfile) => void;
  onNavigateToProfile?: () => void;
}

const DIFFICULTY_COLORS = {
  Easy: {
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.3)',
  },
  Medium: {
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.3)',
  },
  Hard: {
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.3)',
  },
};

export interface SyllabusStage {
  id: string;
  name: string;
  level: number;
  description: string;
}

export interface CuratedPracticeProblem {
  id: number;
  title: string;
  titleSlug: string;
  difficulty: 'Easy' | 'Medium';
  stageLevel: number;
  stageName: string;
  tags: string[];
  acceptance: string;
}

export const SYLLABUS_STAGES: SyllabusStage[] = [
  { id: 'arrays', name: 'Stage 1: Arrays & Hashing', level: 1, description: 'Hash maps, frequency counters, prefix sums' },
  { id: 'two-pointers', name: 'Stage 2: Two Pointers & Sliding Window', level: 2, description: 'Subarrays, palindromes, window expansion' },
  { id: 'stack-queue', name: 'Stage 3: Stacks & Queues', level: 3, description: 'LIFO evaluation, monotonic stacks, bracket validation' },
  { id: 'linked-list', name: 'Stage 4: Linked Lists', level: 4, description: 'Pointers, slow-fast runners, list reversals' },
  { id: 'binary-search', name: 'Stage 5: Binary Search', level: 5, description: 'Logarithmic search, rotated arrays, condition search' },
  { id: 'trees', name: 'Stage 6: Binary Trees & BST', level: 6, description: 'DFS, BFS traversals, BST properties, LCA' },
  { id: 'heaps', name: 'Stage 7: Heaps & Priority Queues', level: 7, description: 'Top-K elements, min-heaps, max-heaps' },
  { id: 'graphs', name: 'Stage 8: Graphs (BFS & DFS)', level: 8, description: 'Matrix exploration, connected components, topo sort' },
  { id: 'dp', name: 'Stage 9: Dynamic Programming', level: 9, description: '1D & 2D memoization, tabulation, subproblems' },
  { id: 'all', name: 'Stage 10: Complete Syllabus (All DSA)', level: 10, description: 'All topics including backtracking, greedy, and bit math' },
];

export const CURATED_PROBLEMS: CuratedPracticeProblem[] = [
  // Stage 1: Arrays & Hashing
  { id: 1, title: 'Two Sum', titleSlug: 'two-sum', difficulty: 'Easy', stageLevel: 1, stageName: 'Arrays & Hashing', tags: ['Array', 'Hash Table'], acceptance: '54.2%' },
  { id: 217, title: 'Contains Duplicate', titleSlug: 'contains-duplicate', difficulty: 'Easy', stageLevel: 1, stageName: 'Arrays & Hashing', tags: ['Array', 'Hash Table'], acceptance: '62.1%' },
  { id: 242, title: 'Valid Anagram', titleSlug: 'valid-anagram', difficulty: 'Easy', stageLevel: 1, stageName: 'Arrays & Hashing', tags: ['Hash Table', 'String'], acceptance: '65.4%' },
  { id: 49, title: 'Group Anagrams', titleSlug: 'group-anagrams', difficulty: 'Medium', stageLevel: 1, stageName: 'Arrays & Hashing', tags: ['Array', 'Hash Table', 'Sorting'], acceptance: '69.1%' },
  { id: 238, title: 'Product of Array Except Self', titleSlug: 'product-of-array-except-self', difficulty: 'Medium', stageLevel: 1, stageName: 'Arrays & Hashing', tags: ['Array', 'Prefix Sum'], acceptance: '66.8%' },
  { id: 128, title: 'Longest Consecutive Sequence', titleSlug: 'longest-consecutive-sequence', difficulty: 'Medium', stageLevel: 1, stageName: 'Arrays & Hashing', tags: ['Array', 'Hash Table', 'Union Find'], acceptance: '47.9%' },

  // Stage 2: Two Pointers & Sliding Window
  { id: 125, title: 'Valid Palindrome', titleSlug: 'valid-palindrome', difficulty: 'Easy', stageLevel: 2, stageName: 'Two Pointers & Sliding Window', tags: ['Two Pointers', 'String'], acceptance: '48.3%' },
  { id: 167, title: 'Two Sum II - Input Array Is Sorted', titleSlug: 'two-sum-ii-input-array-is-sorted', difficulty: 'Medium', stageLevel: 2, stageName: 'Two Pointers & Sliding Window', tags: ['Array', 'Two Pointers', 'Binary Search'], acceptance: '61.2%' },
  { id: 15, title: '3Sum', titleSlug: '3sum', difficulty: 'Medium', stageLevel: 2, stageName: 'Two Pointers & Sliding Window', tags: ['Array', 'Two Pointers', 'Sorting'], acceptance: '35.8%' },
  { id: 11, title: 'Container With Most Water', titleSlug: 'container-with-most-water', difficulty: 'Medium', stageLevel: 2, stageName: 'Two Pointers & Sliding Window', tags: ['Array', 'Two Pointers', 'Greedy'], acceptance: '56.4%' },
  { id: 121, title: 'Best Time to Buy and Sell Stock', titleSlug: 'best-time-to-buy-and-sell-stock', difficulty: 'Easy', stageLevel: 2, stageName: 'Two Pointers & Sliding Window', tags: ['Array', 'Sliding Window'], acceptance: '54.7%' },
  { id: 3, title: 'Longest Substring Without Repeating Characters', titleSlug: 'longest-substring-without-repeating-characters', difficulty: 'Medium', stageLevel: 2, stageName: 'Two Pointers & Sliding Window', tags: ['Hash Table', 'Sliding Window'], acceptance: '35.6%' },
  { id: 424, title: 'Longest Repeating Character Replacement', titleSlug: 'longest-repeating-character-replacement', difficulty: 'Medium', stageLevel: 2, stageName: 'Two Pointers & Sliding Window', tags: ['Hash Table', 'Sliding Window'], acceptance: '55.3%' },

  // Stage 3: Stacks & Queues
  { id: 20, title: 'Valid Parentheses', titleSlug: 'valid-parentheses', difficulty: 'Easy', stageLevel: 3, stageName: 'Stacks & Queues', tags: ['String', 'Stack'], acceptance: '41.5%' },
  { id: 155, title: 'Min Stack', titleSlug: 'min-stack', difficulty: 'Medium', stageLevel: 3, stageName: 'Stacks & Queues', tags: ['Stack', 'Design'], acceptance: '54.8%' },
  { id: 150, title: 'Evaluate Reverse Polish Notation', titleSlug: 'evaluate-reverse-polish-notation', difficulty: 'Medium', stageLevel: 3, stageName: 'Stacks & Queues', tags: ['Array', 'Math', 'Stack'], acceptance: '52.4%' },
  { id: 739, title: 'Daily Temperatures', titleSlug: 'daily-temperatures', difficulty: 'Medium', stageLevel: 3, stageName: 'Stacks & Queues', tags: ['Array', 'Stack', 'Monotonic Stack'], acceptance: '67.2%' },
  { id: 853, title: 'Car Fleet', titleSlug: 'car-fleet', difficulty: 'Medium', stageLevel: 3, stageName: 'Stacks & Queues', tags: ['Array', 'Stack', 'Sorting'], acceptance: '51.6%' },

  // Stage 4: Linked Lists
  { id: 206, title: 'Reverse Linked List', titleSlug: 'reverse-linked-list', difficulty: 'Easy', stageLevel: 4, stageName: 'Linked Lists', tags: ['Linked List', 'Recursion'], acceptance: '78.4%' },
  { id: 21, title: 'Merge Two Sorted Lists', titleSlug: 'merge-two-sorted-lists', difficulty: 'Easy', stageLevel: 4, stageName: 'Linked Lists', tags: ['Linked List', 'Recursion'], acceptance: '65.2%' },
  { id: 141, title: 'Linked List Cycle', titleSlug: 'linked-list-cycle', difficulty: 'Easy', stageLevel: 4, stageName: 'Linked Lists', tags: ['Hash Table', 'Linked List', 'Two Pointers'], acceptance: '51.3%' },
  { id: 143, title: 'Reorder List', titleSlug: 'reorder-list', difficulty: 'Medium', stageLevel: 4, stageName: 'Linked Lists', tags: ['Linked List', 'Two Pointers', 'Stack'], acceptance: '58.7%' },
  { id: 19, title: 'Remove Nth Node From End of List', titleSlug: 'remove-nth-node-from-end-of-list', difficulty: 'Medium', stageLevel: 4, stageName: 'Linked Lists', tags: ['Linked List', 'Two Pointers'], acceptance: '47.2%' },
  { id: 138, title: 'Copy List with Random Pointer', titleSlug: 'copy-list-with-random-pointer', difficulty: 'Medium', stageLevel: 4, stageName: 'Linked Lists', tags: ['Hash Table', 'Linked List'], acceptance: '58.6%' },

  // Stage 5: Binary Search
  { id: 704, title: 'Binary Search', titleSlug: 'binary-search', difficulty: 'Easy', stageLevel: 5, stageName: 'Binary Search', tags: ['Array', 'Binary Search'], acceptance: '58.9%' },
  { id: 74, title: 'Search a 2D Matrix', titleSlug: 'search-a-2d-matrix', difficulty: 'Medium', stageLevel: 5, stageName: 'Binary Search', tags: ['Array', 'Binary Search', 'Matrix'], acceptance: '51.3%' },
  { id: 875, title: 'Koko Eating Bananas', titleSlug: 'koko-eating-bananas', difficulty: 'Medium', stageLevel: 5, stageName: 'Binary Search', tags: ['Array', 'Binary Search'], acceptance: '50.8%' },
  { id: 153, title: 'Find Minimum in Rotated Sorted Array', titleSlug: 'find-minimum-in-rotated-sorted-array', difficulty: 'Medium', stageLevel: 5, stageName: 'Binary Search', tags: ['Array', 'Binary Search'], acceptance: '51.9%' },
  { id: 33, title: 'Search in Rotated Sorted Array', titleSlug: 'search-in-rotated-sorted-array', difficulty: 'Medium', stageLevel: 5, stageName: 'Binary Search', tags: ['Array', 'Binary Search'], acceptance: '41.7%' },

  // Stage 6: Binary Trees & BST
  { id: 226, title: 'Invert Binary Tree', titleSlug: 'invert-binary-tree', difficulty: 'Easy', stageLevel: 6, stageName: 'Binary Trees & BST', tags: ['Tree', 'DFS', 'BFS'], acceptance: '78.9%' },
  { id: 104, title: 'Maximum Depth of Binary Tree', titleSlug: 'maximum-depth-of-binary-tree', difficulty: 'Easy', stageLevel: 6, stageName: 'Binary Trees & BST', tags: ['Tree', 'DFS'], acceptance: '76.5%' },
  { id: 100, title: 'Same Tree', titleSlug: 'same-tree', difficulty: 'Easy', stageLevel: 6, stageName: 'Binary Trees & BST', tags: ['Tree', 'DFS'], acceptance: '62.8%' },
  { id: 572, title: 'Subtree of Another Tree', titleSlug: 'subtree-of-another-tree', difficulty: 'Easy', stageLevel: 6, stageName: 'Binary Trees & BST', tags: ['Tree', 'DFS'], acceptance: '48.6%' },
  { id: 235, title: 'Lowest Common Ancestor of a BST', titleSlug: 'lowest-common-ancestor-of-a-binary-search-tree', difficulty: 'Medium', stageLevel: 6, stageName: 'Binary Trees & BST', tags: ['Tree', 'DFS', 'BST'], acceptance: '65.3%' },
  { id: 102, title: 'Binary Tree Level Order Traversal', titleSlug: 'binary-tree-level-order-traversal', difficulty: 'Medium', stageLevel: 6, stageName: 'Binary Trees & BST', tags: ['Tree', 'BFS'], acceptance: '68.4%' },
  { id: 98, title: 'Validate Binary Search Tree', titleSlug: 'validate-binary-search-tree', difficulty: 'Medium', stageLevel: 6, stageName: 'Binary Trees & BST', tags: ['Tree', 'DFS', 'BST'], acceptance: '33.7%' },
  { id: 230, title: 'Kth Smallest Element in a BST', titleSlug: 'kth-smallest-element-in-a-bst', difficulty: 'Medium', stageLevel: 6, stageName: 'Binary Trees & BST', tags: ['Tree', 'DFS', 'BST'], acceptance: '73.6%' },

  // Stage 7: Heaps & Priority Queues
  { id: 1046, title: 'Last Stone Weight', titleSlug: 'last-stone-weight', difficulty: 'Easy', stageLevel: 7, stageName: 'Heaps & Priority Queues', tags: ['Array', 'Heap'], acceptance: '66.2%' },
  { id: 703, title: 'Kth Largest Element in a Stream', titleSlug: 'kth-largest-element-in-a-stream', difficulty: 'Easy', stageLevel: 7, stageName: 'Heaps & Priority Queues', tags: ['Tree', 'Design', 'Heap'], acceptance: '58.4%' },
  { id: 215, title: 'Kth Largest Element in an Array', titleSlug: 'kth-largest-element-in-an-array', difficulty: 'Medium', stageLevel: 7, stageName: 'Heaps & Priority Queues', tags: ['Array', 'Heap'], acceptance: '67.8%' },
  { id: 973, title: 'K Closest Points to Origin', titleSlug: 'k-closest-points-to-origin', difficulty: 'Medium', stageLevel: 7, stageName: 'Heaps & Priority Queues', tags: ['Array', 'Math', 'Heap'], acceptance: '67.1%' },
  { id: 208, title: 'Implement Trie (Prefix Tree)', titleSlug: 'implement-trie-prefix-tree', difficulty: 'Medium', stageLevel: 7, stageName: 'Heaps & Priority Queues', tags: ['Hash Table', 'Trie'], acceptance: '66.2%' },

  // Stage 8: Graphs (BFS & DFS)
  { id: 200, title: 'Number of Islands', titleSlug: 'number-of-islands', difficulty: 'Medium', stageLevel: 8, stageName: 'Graphs (BFS & DFS)', tags: ['Array', 'DFS', 'BFS', 'Matrix'], acceptance: '60.3%' },
  { id: 695, title: 'Max Area of Island', titleSlug: 'max-area-of-island', difficulty: 'Medium', stageLevel: 8, stageName: 'Graphs (BFS & DFS)', tags: ['Array', 'DFS', 'BFS', 'Matrix'], acceptance: '73.1%' },
  { id: 133, title: 'Clone Graph', titleSlug: 'clone-graph', difficulty: 'Medium', stageLevel: 8, stageName: 'Graphs (BFS & DFS)', tags: ['Hash Table', 'DFS', 'BFS', 'Graph'], acceptance: '58.2%' },
  { id: 417, title: 'Pacific Atlantic Water Flow', titleSlug: 'pacific-atlantic-water-flow', difficulty: 'Medium', stageLevel: 8, stageName: 'Graphs (BFS & DFS)', tags: ['Array', 'DFS', 'BFS', 'Matrix'], acceptance: '56.4%' },
  { id: 207, title: 'Course Schedule', titleSlug: 'course-schedule', difficulty: 'Medium', stageLevel: 8, stageName: 'Graphs (BFS & DFS)', tags: ['DFS', 'BFS', 'Graph', 'Topological Sort'], acceptance: '48.7%' },

  // Stage 9: Dynamic Programming
  { id: 70, title: 'Climbing Stairs', titleSlug: 'climbing-stairs', difficulty: 'Easy', stageLevel: 9, stageName: 'Dynamic Programming', tags: ['Math', 'DP', 'Memoization'], acceptance: '53.6%' },
  { id: 746, title: 'Min Cost Climbing Stairs', titleSlug: 'min-cost-climbing-stairs', difficulty: 'Easy', stageLevel: 9, stageName: 'Dynamic Programming', tags: ['Array', 'DP'], acceptance: '67.2%' },
  { id: 198, title: 'House Robber', titleSlug: 'house-robber', difficulty: 'Medium', stageLevel: 9, stageName: 'Dynamic Programming', tags: ['Array', 'DP'], acceptance: '51.4%' },
  { id: 213, title: 'House Robber II', titleSlug: 'house-robber-ii', difficulty: 'Medium', stageLevel: 9, stageName: 'Dynamic Programming', tags: ['Array', 'DP'], acceptance: '42.8%' },
  { id: 322, title: 'Coin Change', titleSlug: 'coin-change', difficulty: 'Medium', stageLevel: 9, stageName: 'Dynamic Programming', tags: ['Array', 'DP', 'BFS'], acceptance: '45.3%' },
  { id: 300, title: 'Longest Increasing Subsequence', titleSlug: 'longest-increasing-subsequence', difficulty: 'Medium', stageLevel: 9, stageName: 'Dynamic Programming', tags: ['Array', 'Binary Search', 'DP'], acceptance: '56.4%' },

  // Stage 10: Complete Syllabus (Backtracking, Greedy, Bits & Advanced)
  { id: 78, title: 'Subsets', titleSlug: 'subsets', difficulty: 'Medium', stageLevel: 10, stageName: 'Backtracking & Greedy', tags: ['Array', 'Backtracking'], acceptance: '79.4%' },
  { id: 39, title: 'Combination Sum', titleSlug: 'combination-sum', difficulty: 'Medium', stageLevel: 10, stageName: 'Backtracking & Greedy', tags: ['Array', 'Backtracking'], acceptance: '73.2%' },
  { id: 53, title: 'Maximum Subarray', titleSlug: 'maximum-subarray', difficulty: 'Medium', stageLevel: 10, stageName: 'Backtracking & Greedy', tags: ['Array', 'DP'], acceptance: '51.8%' },
  { id: 55, title: 'Jump Game', titleSlug: 'jump-game', difficulty: 'Medium', stageLevel: 10, stageName: 'Backtracking & Greedy', tags: ['Array', 'DP', 'Greedy'], acceptance: '39.5%' },
  { id: 136, title: 'Single Number', titleSlug: 'single-number', difficulty: 'Easy', stageLevel: 10, stageName: 'Bit Manipulation & Math', tags: ['Array', 'Bit Manipulation'], acceptance: '74.2%' },
  { id: 191, title: 'Number of 1 Bits', titleSlug: 'number-of-1-bits', difficulty: 'Easy', stageLevel: 10, stageName: 'Bit Manipulation & Math', tags: ['Divide & Conquer', 'Bit Manipulation'], acceptance: '73.5%' },
];

export default function LeetCode({ state, onUpdateUser }: Props) {
  const currentUsername = state.user.leetcodeUsername || '';

  const [daily, setDaily] = useState<LeetCodeDailyProblem | null>(null);
  const [profile, setProfile] = useState<LeetCodeProfile | null>(null);
  const [history, setHistory] = useState<LeetCodeHistory | null>(null);

  const [isLoadingDaily, setIsLoadingDaily] = useState(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Connect Account Modal
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connectInput, setConnectInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  // View Complete History Modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'solved' | 'attempted' | 'not-started'>('all');

  // Curated 5 Practice Problems States
  const [selectedSyllabusLevel, setSelectedSyllabusLevel] = useState<number>(4);
  const [syllabusScopeMode, setSyllabusScopeMode] = useState<'upto' | 'exact'>('upto');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'Easy' | 'Medium'>('all');
  const [shuffleSeed, setShuffleSeed] = useState<number>(0);
  const [practiceStatus, setPracticeStatus] = useState<Record<number, 'todo' | 'attempted' | 'solved'>>(() => {
    try {
      const saved = localStorage.getItem('edutrack_leetcode_practice_status');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Automatically marks problem as attempted when student clicks Solve
  const handleMarkAttempted = (problemId: number) => {
    setPracticeStatus(prev => {
      if (prev[problemId] === 'solved') return prev;
      const next = { ...prev, [problemId]: 'attempted' as const };
      try {
        localStorage.setItem('edutrack_leetcode_practice_status', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Real-time Countdown to Next UTC Midnight Daily Problem
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    function calculateTimeUntilNextDaily() {
      const now = new Date();
      // Next midnight UTC
      const nextUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
      const diffMs = Math.max(0, nextUtc.getTime() - now.getTime());

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      setCountdown({ hours, minutes, seconds });
    }

    calculateTimeUntilNextDaily();
    const interval = setInterval(calculateTimeUntilNextDaily, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Daily Problem
  const fetchDaily = async () => {
    setIsLoadingDaily(true);
    try {
      const res = await leetcodeApi.getDaily();
      if (res?.daily) {
        setDaily(res.daily);
      }
    } catch (err: any) {
      console.warn('Could not fetch LeetCode daily:', err?.message);
    } finally {
      setIsLoadingDaily(false);
    }
  };

  // Fetch User Profile Stats
  const fetchProfile = async (username: string) => {
    if (!username.trim()) {
      setProfile(null);
      return;
    }
    setIsLoadingProfile(true);
    try {
      const res = await leetcodeApi.getUser(username.trim());
      if (res?.profile) {
        setProfile(res.profile);
      }
    } catch (err: any) {
      console.warn('Could not fetch LeetCode user profile:', err?.message);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // Fetch Daily History & Streaks
  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await leetcodeApi.getHistory();
      if (res) {
        setHistory(res);
      }
    } catch (err: any) {
      console.warn('Could not fetch LeetCode history:', err?.message);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchDaily();
    fetchHistory();
    if (currentUsername) {
      fetchProfile(currentUsername);
    }
  }, [currentUsername]);

  // Auto-sync solved problems when profile and submissions are fetched from LeetCode
  useEffect(() => {
    if (!profile) return;
    const solvedSlugs = new Set(profile.recentSolvedSlugs || []);
    const attemptedSlugs = new Set(profile.recentAttemptedSlugs || []);

    // 1. Auto-sync Today's Daily Problem if solved on LeetCode
    if (daily && daily.status !== 'solved' && solvedSlugs.has(daily.titleSlug)) {
      setDaily(prev => (prev ? { ...prev, status: 'solved' } : null));
      leetcodeApi.updateDailyStatus({
        date: daily.date,
        problemNumber: daily.problemNumber,
        title: daily.title,
        titleSlug: daily.titleSlug,
        difficulty: daily.difficulty,
        status: 'solved',
      }).then(() => fetchHistory()).catch(() => {});
      toast.success(`Automatically marked Today's Daily Problem as Solved from LeetCode! 🔥`);
    }

    // 2. Auto-sync Curated Practice Problems
    if (solvedSlugs.size > 0 || attemptedSlugs.size > 0) {
      setPracticeStatus(prev => {
        let changed = false;
        const next = { ...prev };

        CURATED_PROBLEMS.forEach(p => {
          if (solvedSlugs.has(p.titleSlug)) {
            if (next[p.id] !== 'solved') {
              next[p.id] = 'solved';
              changed = true;
            }
          } else if (attemptedSlugs.has(p.titleSlug)) {
            if (!next[p.id] || next[p.id] === 'todo') {
              next[p.id] = 'attempted';
              changed = true;
            }
          }
        });

        if (changed) {
          try {
            localStorage.setItem('edutrack_leetcode_practice_status', JSON.stringify(next));
          } catch {}
        }
        return changed ? next : prev;
      });
    }
  }, [profile, daily?.titleSlug, daily?.date]);

  // Handle Connecting LeetCode Username
  const handleConnect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const username = connectInput.trim();
    if (!username) return;

    setIsConnecting(true);
    try {
      const res = await leetcodeApi.connect(username);
      const cleanUsername = res.profile?.username || username;
      const updatedUser: UserProfile = {
        ...state.user,
        leetcodeUsername: cleanUsername,
      };
      
      // Explicitly persist to student profile in database
      await profileApi.update({
        leetcodeUsername: cleanUsername,
      });

      onUpdateUser(updatedUser);
      setProfile(res.profile);
      toast.success(`Saved and connected LeetCode profile: @${cleanUsername}!`);
      setShowConnectModal(false);
      setConnectInput('');
    } catch (err: any) {
      toast.error(err?.message || `Could not find LeetCode account "${username}".`);
    } finally {
      setIsConnecting(false);
    }
  };

  // Update Problem Status (Not Started / Attempted / Solved)
  const handleStatusChange = async (newStatus: 'not-started' | 'attempted' | 'solved') => {
    if (!daily || isUpdatingStatus) return;
    setIsUpdatingStatus(true);

    try {
      await leetcodeApi.updateDailyStatus({
        date: daily.date,
        problemNumber: daily.problemNumber,
        title: daily.title,
        titleSlug: daily.titleSlug,
        difficulty: daily.difficulty,
        status: newStatus,
      });

      setDaily(prev => (prev ? { ...prev, status: newStatus } : null));

      // Re-fetch history to update streaks and date status
      await fetchHistory();

      if (newStatus === 'solved') {
        toast.success(`Solved Today's Daily Problem: "${daily.title}"! 🔥`);
      } else if (newStatus === 'attempted') {
        toast.info(`Marked "${daily.title}" as Attempted.`);
      } else {
        toast.info(`Status reset to Not Started.`);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update daily problem status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const diffMeta = daily ? (DIFFICULTY_COLORS[daily.difficulty] || DIFFICULTY_COLORS.Medium) : DIFFICULTY_COLORS.Medium;

  // Filtered History
  const filteredHistory = useMemo(() => {
    if (!history?.records) return [];
    if (historyFilter === 'all') return history.records;
    return history.records.filter(r => r.status === historyFilter);
  }, [history?.records, historyFilter]);

  // Overall Solved Percentages
  const easyRatio = profile?.totalSolved ? Math.round((profile.easySolved / profile.totalSolved) * 100) : 0;
  const mediumRatio = profile?.totalSolved ? Math.round((profile.mediumSolved / profile.totalSolved) * 100) : 0;
  const hardRatio = profile?.totalSolved ? Math.round((profile.hardSolved / profile.totalSolved) * 100) : 0;

  // 5 Suggested Curated Practice Problems
  const suggestedProblems = useMemo(() => {
    let pool = CURATED_PROBLEMS.filter(p => {
      if (syllabusScopeMode === 'upto') {
        if (p.stageLevel > selectedSyllabusLevel) return false;
      } else {
        if (p.stageLevel !== selectedSyllabusLevel) return false;
      }

      if (difficultyFilter !== 'all' && p.difficulty !== difficultyFilter) {
        return false;
      }
      return true;
    });

    if (pool.length === 0) {
      pool = CURATED_PROBLEMS.slice(0, 10);
    }

    // Deterministic shuffle with shuffleSeed
    const shuffled = [...pool].sort((a, b) => {
      const hashA = (a.id * 9301 + 49297 + shuffleSeed * 233) % 233280;
      const hashB = (b.id * 9301 + 49297 + shuffleSeed * 233) % 233280;
      return hashA - hashB;
    });

    if (difficultyFilter === 'all') {
      const easies = shuffled.filter(p => p.difficulty === 'Easy');
      const mediums = shuffled.filter(p => p.difficulty === 'Medium');
      const picked: CuratedPracticeProblem[] = [];
      if (easies.length >= 2 && mediums.length >= 3) {
        picked.push(easies[0], easies[1], mediums[0], mediums[1], mediums[2]);
      } else {
        picked.push(...shuffled.slice(0, 5));
      }
      return picked.slice(0, 5);
    }

    return shuffled.slice(0, 5);
  }, [selectedSyllabusLevel, syllabusScopeMode, difficultyFilter, shuffleSeed]);

  const completedSuggestedCount = useMemo(() => {
    return suggestedProblems.filter(p => practiceStatus[p.id] === 'solved').length;
  }, [suggestedProblems, practiceStatus]);

  return (
    <div className="space-y-6 pb-24 md:pb-16 select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <Code size={22} weight="bold" />
            </div>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: '#e2e8f0' }}>
                <span>LeetCode Daily & Stats</span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Track today's official daily challenge, active streaks, and profile problem solving
              </p>
            </div>
          </div>
        </div>

        {/* Profile Connection Badge / Button */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {currentUsername ? (
            <div className="flex items-center gap-2 bg-[#161b22] border border-[#2d3748] px-3.5 py-1.5 rounded-xl shadow-xs">
              <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              <div className="text-xs">
                <span className="text-slate-400">Handle: </span>
                <span className="font-semibold text-slate-200 font-mono">@{currentUsername}</span>
              </div>
            </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setConnectInput('');
                setShowConnectModal(true);
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <User size={15} weight="bold" />
              <span>Connect LeetCode Account</span>
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              fetchDaily();
              fetchHistory();
              if (currentUsername) fetchProfile(currentUsername);
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 bg-[#161b22] border border-[#2d3748] hover:border-slate-600 transition-all cursor-pointer"
            title="Refresh LeetCode Data"
          >
            <ArrowsClockwise size={16} />
          </motion.button>
        </div>
      </div>

      {/* Main Grid: Today's Daily Problem (Left) & Streaks / Profile Stats (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Today's Daily Problem Card */}
        <div className="lg:col-span-7 space-y-4">
          <div
            className="rounded-2xl p-5 md:p-6 transition-all shadow-md relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #161b22 0%, #1a2230 100%)',
              border: '1px solid #2d3748',
            }}
          >
            {/* Subtle top accent gradient */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-emerald-500 to-indigo-500" />

            {/* Header / Countdown */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#2d3748]/70">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/25 font-mono">
                  Today's Daily Challenge
                </span>
                <span className="text-xs text-slate-400 font-mono">{daily?.date}</span>
              </div>

              {/* Countdown Ticker */}
              <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-[#0d1117] px-3 py-1.5 rounded-lg border border-[#2d3748] font-mono">
                <Timer size={14} className="text-amber-400" />
                <span className="text-slate-400">Next challenge in:</span>
                <span className="font-bold text-amber-400">
                  {String(countdown.hours).padStart(2, '0')}:
                  {String(countdown.minutes).padStart(2, '0')}:
                  {String(countdown.seconds).padStart(2, '0')}
                </span>
              </div>
            </div>

            {/* Problem Details */}
            {isLoadingDaily ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <CircleNotch size={28} className="animate-spin text-amber-400" />
                <span className="text-xs text-slate-400 font-mono">Loading today's challenge...</span>
              </div>
            ) : daily ? (
              <div className="pt-4 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-xs font-mono font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                        #{daily.problemNumber || '---'}
                      </span>
                      <span
                        className="text-xs font-semibold px-2.5 py-0.5 rounded-md"
                        style={{ background: diffMeta.bg, color: diffMeta.color, border: `1px solid ${diffMeta.border}` }}
                      >
                        {daily.difficulty}
                      </span>
                    </div>

                    <h2 className="text-lg md:text-xl font-bold text-slate-100 hover:text-amber-400 transition-colors">
                      <a href={daily.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 group">
                        <span>{daily.title}</span>
                        <ArrowSquareOut size={16} className="text-slate-500 group-hover:text-amber-400 transition-colors" />
                      </a>
                    </h2>
                  </div>

                  {/* Solve Button */}
                  <a
                    href={daily.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      if (daily.status === 'not-started') {
                        handleStatusChange('attempted');
                      }
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] self-start cursor-pointer font-bold"
                  >
                    <span>Solve on LeetCode</span>
                    <ArrowSquareOut size={14} weight="bold" />
                  </a>
                </div>

                {/* Topic Tags */}
                {daily.topicTags && daily.topicTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {daily.topicTags.map((tag: string) => (
                      <span
                        key={tag}
                        className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#1c2230] text-slate-300 border border-[#2d3748]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Problem Status Selector */}
                <div className="pt-2 border-t border-[#2d3748]/60">
                  <div className="text-xs text-slate-400 mb-2 font-medium">Your Challenge Status for Today:</div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'not-started', label: 'Not Started', color: '#94a3b8' },
                      { id: 'attempted', label: 'Attempted', color: '#f59e0b' },
                      { id: 'solved', label: 'Solved', color: '#10b981' },
                    ].map(st => {
                      const isActive = daily.status === st.id;
                      return (
                        <button
                          key={st.id}
                          disabled={isUpdatingStatus}
                          onClick={() => handleStatusChange(st.id as any)}
                          className="py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer text-center"
                          style={{
                            background: isActive ? `${st.color}22` : '#0d1117',
                            color: isActive ? st.color : '#94a3b8',
                            border: `1px solid ${isActive ? st.color : '#2d3748'}`,
                          }}
                        >
                          {isActive && <Check size={13} weight="bold" />}
                          <span>{st.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                Could not load today's daily question.
              </div>
            )}
          </div>

          {/* Quick Streaks Card (Mobile/Tablet Friendly View) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Current Streak */}
            <div className="rounded-xl p-4 bg-[#161b22] border border-[#2d3748] flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center flex-shrink-0 shadow-[0_0_12px_rgba(249,115,22,0.2)]">
                <Fire size={22} weight="fill" />
              </div>
              <div>
                <div className="text-xs text-slate-400">Current Streak</div>
                <div className="text-xl font-bold font-mono text-orange-400">
                  {history?.currentStreak || profile?.currentStreak || 0} <span className="text-xs text-slate-500">days</span>
                </div>
              </div>
            </div>

            {/* Longest Streak */}
            <div className="rounded-xl p-4 bg-[#161b22] border border-[#2d3748] flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center flex-shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
                <Trophy size={22} weight="fill" />
              </div>
              <div>
                <div className="text-xs text-slate-400">Longest Streak</div>
                <div className="text-xl font-bold font-mono text-amber-400">
                  {history?.longestStreak || 0} <span className="text-xs text-slate-500">days</span>
                </div>
              </div>
            </div>

            {/* Total Daily Challenges Solved */}
            <div className="rounded-xl p-4 bg-[#161b22] border border-[#2d3748] flex items-center gap-3 col-span-2 sm:col-span-1">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center flex-shrink-0 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                <CheckCircle size={22} weight="fill" />
              </div>
              <div>
                <div className="text-xs text-slate-400">Daily Solved</div>
                <div className="text-xl font-bold font-mono text-emerald-400">
                  {history?.solvedCount || 0} <span className="text-xs text-slate-500">problems</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Profile Solved Stats & Breakdown */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl p-5 md:p-6 bg-[#161b22] border border-[#2d3748] space-y-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#2d3748]">
              <div className="flex items-center gap-2">
                <Sparkle size={18} weight="fill" className="text-amber-400" />
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide font-mono">
                  LeetCode Profile Stats
                </h3>
              </div>
              {profile?.ranking ? (
                <span className="text-xs text-slate-400 font-mono">
                  Rank #{profile.ranking.toLocaleString()}
                </span>
              ) : null}
            </div>

            {isLoadingProfile ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2">
                <CircleNotch size={22} className="animate-spin text-amber-400" />
                <span className="text-xs text-slate-500 font-mono">Fetching profile stats...</span>
              </div>
            ) : profile ? (
              <div className="space-y-4">
                {/* Total Solved Header */}
                <div className="p-4 rounded-xl bg-[#0d1117] border border-[#2d3748] flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-400">Total Solved</div>
                    <div className="text-2xl font-bold font-mono text-slate-100 mt-0.5">
                      {profile.totalSolved}
                    </div>
                  </div>
                  {profile.avatar && (
                    <img
                      src={profile.avatar}
                      alt={profile.username}
                      className="w-12 h-12 rounded-xl object-cover border border-[#2d3748]"
                    />
                  )}
                </div>

                {/* Easy, Medium, Hard Breakdown */}
                <div className="space-y-3">
                  {/* Easy */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-emerald-400">Easy</span>
                      <span className="font-mono text-slate-300">
                        {profile.easySolved} <span className="text-slate-500">({easyRatio}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${easyRatio}%` }}
                      />
                    </div>
                  </div>

                  {/* Medium */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-amber-400">Medium</span>
                      <span className="font-mono text-slate-300">
                        {profile.mediumSolved} <span className="text-slate-500">({mediumRatio}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-500 transition-all duration-500"
                        style={{ width: `${mediumRatio}%` }}
                      />
                    </div>
                  </div>

                  {/* Hard */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-rose-400">Hard</span>
                      <span className="font-mono text-slate-300">
                        {profile.hardSolved} <span className="text-slate-500">({hardRatio}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-rose-500 transition-all duration-500"
                        style={{ width: `${hardRatio}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center space-y-3">
                <WarningCircle size={28} className="mx-auto text-amber-400" />
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  No LeetCode account linked yet. Connect your username to view global problem-solving stats and rankings.
                </p>
                <button
                  onClick={() => setShowConnectModal(true)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-all cursor-pointer"
                >
                  Link Account
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Suggested 5 Curated Easy & Medium Practice Problems Section */}
      <div
        className="rounded-2xl p-5 md:p-6 border space-y-5 shadow-sm"
        style={{
          background: 'linear-gradient(135deg, #161b22 0%, #111827 100%)',
          borderColor: '#2d3748',
        }}
      >
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#2d3748]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center flex-shrink-0 shadow-[0_0_12px_rgba(99,102,241,0.25)]">
              <Compass size={22} weight="bold" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-base font-bold text-slate-100">
                  Curated Practice Problems
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 font-mono">
                  5 Easy & Medium Set
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Choose your current syllabus coverage to get 5 high-yield LeetCode practice problems.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
            {/* Completed badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0d1117] border border-[#2d3748] text-xs font-mono">
              <span className="text-slate-400">Batch Progress:</span>
              <strong className={completedSuggestedCount === 5 ? 'text-emerald-400' : 'text-indigo-400'}>
                {completedSuggestedCount} / 5
              </strong>
            </div>

            {/* Shuffle 5 Problems Button */}
            <button
              onClick={() => {
                setShuffleSeed(prev => prev + 1);
                toast.info('Generated 5 new problem suggestions!');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30 transition-all cursor-pointer shadow-sm"
              title="Shuffle 5 Practice Problems"
            >
              <Shuffle size={15} weight="bold" />
              <span>Shuffle 5</span>
            </button>

            {/* Sync from LeetCode Button */}
            <button
              onClick={async () => {
                if (!currentUsername) {
                  toast.error('Please connect your LeetCode username first to auto-sync solved problems.');
                  setShowConnectModal(true);
                  return;
                }
                toast.info(`Checking LeetCode for @${currentUsername}'s solved problems...`);
                await Promise.allSettled([
                  fetchProfile(currentUsername),
                  fetchDaily(),
                ]);
                toast.success('Live LeetCode submission status refreshed!');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 transition-all cursor-pointer shadow-sm"
              title="Auto-fetch and sync solved problems from your connected LeetCode account"
            >
              <ArrowsClockwise size={15} weight="bold" />
              <span>Sync from LeetCode</span>
            </button>
          </div>
        </div>

        {/* Syllabus Scope & Filters Toolbar */}
        <div className="p-4 rounded-xl bg-[#0d1117] border border-[#2d3748] space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <SlidersHorizontal size={16} className="text-indigo-400" />
            <span>Syllabus Scope & Problem Filters:</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Syllabus Stage Selector */}
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Choose Syllabus Till:
              </label>
              <select
                value={selectedSyllabusLevel}
                onChange={e => setSelectedSyllabusLevel(Number(e.target.value))}
                className="w-full bg-[#161b22] border border-[#2d3748] rounded-xl px-3 py-2 text-xs text-slate-200 font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {SYLLABUS_STAGES.map(stage => (
                  <option key={stage.id} value={stage.level}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Scope Mode: Up to this stage vs Only this stage */}
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Practice Coverage:
              </label>
              <div className="flex rounded-xl p-1 bg-[#161b22] border border-[#2d3748]">
                <button
                  type="button"
                  onClick={() => setSyllabusScopeMode('upto')}
                  className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    syllabusScopeMode === 'upto'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Up to this Stage
                </button>
                <button
                  type="button"
                  onClick={() => setSyllabusScopeMode('exact')}
                  className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    syllabusScopeMode === 'exact'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Only this Stage
                </button>
              </div>
            </div>

            {/* Difficulty Mix: All vs Easy vs Medium */}
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Difficulty Target:
              </label>
              <div className="flex rounded-xl p-1 bg-[#161b22] border border-[#2d3748]">
                {[
                  { key: 'all', label: 'Mix (Easy + Med)' },
                  { key: 'Easy', label: 'Easy' },
                  { key: 'Medium', label: 'Medium' },
                ].map(item => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setDifficultyFilter(item.key as any)}
                    className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      difficultyFilter === item.key
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 5 Suggested Problem Cards */}
        <div className="space-y-3">
          {suggestedProblems.map((p, index) => {
            const dColor = DIFFICULTY_COLORS[p.difficulty] || DIFFICULTY_COLORS.Medium;
            const currentStatus = practiceStatus[p.id] || 'todo';
            const isSolved = currentStatus === 'solved';

            return (
              <div
                key={p.id}
                className="rounded-xl p-4 border transition-all hover:border-slate-600 flex flex-col md:flex-row md:items-center justify-between gap-4"
                style={{
                  background: isSolved ? 'rgba(16, 185, 129, 0.05)' : '#0d1117',
                  borderColor: isSolved ? 'rgba(16, 185, 129, 0.3)' : '#2d3748',
                }}
              >
                {/* Left: Problem info */}
                <div className="flex items-start gap-3.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700/60 flex items-center justify-center text-xs font-mono font-bold text-slate-300 flex-shrink-0 mt-0.5">
                    {index + 1}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-slate-500 font-bold">
                        #{p.id}
                      </span>
                      <h4 className="text-sm font-bold text-slate-100">
                        {p.title}
                      </h4>
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
                        style={{ color: dColor.color, background: dColor.bg }}
                      >
                        {p.difficulty}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono text-slate-400 bg-slate-800/80 border border-slate-700/60">
                        {p.stageName}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Acceptance: {p.acceptance}
                      </span>
                    </div>

                    {/* Topic Tags */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      {p.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800/60 text-slate-400 border border-slate-700/40"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Automated Status Badge & Solve Link */}
                <div className="flex items-center gap-3 self-start md:self-auto flex-wrap justify-end">
                  {/* Status Indicator Badge */}
                  {currentStatus === 'solved' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle size={14} weight="fill" />
                      <span>Solved</span>
                    </span>
                  ) : currentStatus === 'attempted' ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono">
                      <span>Attempted</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium text-slate-400 bg-slate-800/60 border border-slate-700/50">
                      <span>To Do</span>
                    </span>
                  )}

                  {/* Solve on LeetCode Link */}
                  <a
                    href={`https://leetcode.com/problems/${p.titleSlug}/`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => {
                      if (currentStatus !== 'solved') {
                        handleMarkAttempted(p.id);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-900 transition-all cursor-pointer shadow-sm flex-shrink-0"
                  >
                    <span>Solve</span>
                    <ArrowSquareOut size={13} weight="bold" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Batch Progress Bar */}
        <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>5 Problems Progress:</span>
            <div className="w-32 h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700/50">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${(completedSuggestedCount / 5) * 100}%` }}
              />
            </div>
            <span className="font-mono text-slate-300">
              {Math.round((completedSuggestedCount / 5) * 100)}%
            </span>
          </div>

          <div className="text-[11px] text-slate-500 italic">
            Pick your syllabus till where you've studied to refresh the problem list anytime!
          </div>
        </div>
      </div>

      {/* Daily Problem History Section */}
      <div className="rounded-2xl p-5 md:p-6 bg-[#161b22] border border-[#2d3748] space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2d3748]">
          <div className="flex items-center gap-2">
            <CalendarCheck size={20} className="text-indigo-400" />
            <h3 className="text-base font-bold text-slate-100">Daily Problem History</h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter buttons */}
            <div className="flex rounded-lg p-1 bg-[#0d1117] border border-[#2d3748]">
              {(['all', 'solved', 'attempted', 'not-started'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setHistoryFilter(f)}
                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer capitalize"
                  style={{
                    background: historyFilter === f ? '#6366f1' : 'transparent',
                    color: historyFilter === f ? '#fff' : '#94a3b8',
                  }}
                >
                  {f === 'not-started' ? 'Unsolved' : f}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowHistoryModal(true)}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold px-2 py-1 cursor-pointer"
            >
              View Full History →
            </button>
          </div>
        </div>

        {/* History Table / List */}
        {isLoadingHistory ? (
          <div className="py-8 text-center text-xs text-slate-500 font-mono">
            Loading daily records...
          </div>
        ) : filteredHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-[#2d3748] font-mono text-[11px]">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Problem</th>
                  <th className="py-2.5 px-3">Difficulty</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2d3748]/50 text-slate-300">
                {filteredHistory.slice(0, 10).map((r: LeetCodeDailyRecord) => {
                  const dColor = DIFFICULTY_COLORS[r.difficulty] || DIFFICULTY_COLORS.Medium;
                  return (
                    <tr key={r.id || r._id || r.date} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-400">{r.date}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-200">
                        {r.problemNumber && <span className="text-slate-500 mr-1.5 font-mono">#{r.problemNumber}</span>}
                        {r.title}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className="px-2 py-0.5 rounded text-[11px] font-semibold"
                          style={{ color: dColor.color, background: dColor.bg }}
                        >
                          {r.difficulty}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {r.status === 'solved' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                            <CheckCircle size={14} weight="fill" />
                            <span>Solved</span>
                          </span>
                        ) : r.status === 'attempted' ? (
                          <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
                            <Clock size={14} weight="bold" />
                            <span>Attempted</span>
                          </span>
                        ) : (
                          <span className="text-slate-500">Not Started</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <a
                          href={`https://leetcode.com/problems/${r.titleSlug || ''}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 font-mono text-[11px]"
                        >
                          <span>Solve</span>
                          <ArrowSquareOut size={12} />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-500">
            No history records found for this filter.
          </div>
        )}
      </div>

      {/* Connect Account Modal */}
      <AnimatePresence>
        {showConnectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl p-6 bg-[#161b22] border border-[#2d3748] space-y-4 shadow-xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#2d3748]">
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Code size={20} className="text-amber-400" />
                  <span>Connect LeetCode Account</span>
                </h3>
                <button
                  onClick={() => setShowConnectModal(false)}
                  className="text-slate-400 hover:text-white text-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleConnect} className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">LeetCode Username</label>
                  <input
                    type="text"
                    value={connectInput}
                    onChange={e => setConnectInput(e.target.value)}
                    placeholder="e.g. touristhk, neal_wu"
                    autoFocus
                    className="w-full rounded-xl px-3.5 py-2.5 text-xs bg-[#0d1117] border border-[#2d3748] focus:border-amber-400 text-slate-100 outline-none font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Your public problem counts, streaks, and global ranking will be synced automatically.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowConnectModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isConnecting || !connectInput.trim()}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 transition-all cursor-pointer font-bold disabled:opacity-50"
                  >
                    {isConnecting ? (
                      <>
                        <CircleNotch size={14} className="animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <span>Save & Connect</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Complete History Modal */}
      <AnimatePresence>
        {showHistoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl max-h-[85vh] rounded-2xl p-6 bg-[#161b22] border border-[#2d3748] flex flex-col space-y-4 shadow-xl overflow-hidden"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#2d3748]">
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <ListBullets size={20} className="text-indigo-400" />
                  <span>Complete LeetCode Daily Challenge History</span>
                </h3>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="text-slate-400 hover:text-white text-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1">
                {history?.records && history.records.length > 0 ? (
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-[#161b22] z-10 border-b border-[#2d3748]">
                      <tr className="text-slate-400 font-mono text-[11px]">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Problem</th>
                        <th className="py-2.5 px-3">Difficulty</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Link</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2d3748]/50 text-slate-300">
                      {history.records.map((r: LeetCodeDailyRecord) => {
                        const dColor = DIFFICULTY_COLORS[r.difficulty] || DIFFICULTY_COLORS.Medium;
                        return (
                          <tr key={r.id || r._id || r.date} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-2.5 px-3 font-mono text-slate-400">{r.date}</td>
                            <td className="py-2.5 px-3 font-medium text-slate-200">
                              {r.problemNumber && <span className="text-slate-500 mr-1.5 font-mono">#{r.problemNumber}</span>}
                              {r.title}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className="px-2 py-0.5 rounded text-[11px] font-semibold"
                                style={{ color: dColor.color, background: dColor.bg }}
                              >
                                {r.difficulty}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              {r.status === 'solved' ? (
                                <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                                  <CheckCircle size={14} weight="fill" />
                                  <span>Solved</span>
                                </span>
                              ) : r.status === 'attempted' ? (
                                <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
                                  <Clock size={14} weight="bold" />
                                  <span>Attempted</span>
                                </span>
                              ) : (
                                <span className="text-slate-500">Not Started</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <a
                                href={`https://leetcode.com/problems/${r.titleSlug || ''}/`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 font-mono text-[11px]"
                              >
                                <span>Open</span>
                                <ArrowSquareOut size={12} />
                              </a>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="py-12 text-center text-xs text-slate-500">
                    No problem history recorded yet. Mark today's daily challenge to start tracking!
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
