import type { CodingProblem, Difficulty } from "@/types/interview";

/**
 * Local coding-problem bank, ported and reconciled to the canonical
 * `CodingProblem` shape (`expected`, union `difficulty`, `starterCode` keyed by
 * the `ProgrammingLanguage` union). Used when the candidate selects focus topics
 * (and as a fallback when AI generation fails). `functionName` is camelCase in
 * every language so one runner call works across JS/TS/Python.
 */
export const TECHNICAL_PROBLEMS: CodingProblem[] = [
  // ── Easy ──────────────────────────────────────────────────────────────────
  {
    id: "reverse-string",
    title: "Reverse a String",
    difficulty: "easy",
    topics: ["arrays"],
    description: "Write a function that takes a string and returns it reversed.",
    functionName: "reverseString",
    examples: [{ input: '"hello"', output: '"olleh"' }],
    constraints: ["1 ≤ s.length ≤ 10^5"],
    starterCode: {
      javascript: "function reverseString(s) {\n  // Your solution here\n}",
      typescript: "function reverseString(s: string): string {\n  // Your solution here\n}",
      python: "def reverseString(s):\n    # Your solution here\n    pass",
    },
    testCases: [
      { input: ["hello"], expected: "olleh" },
      { input: ["world"], expected: "dlrow" },
      { input: ["a"], expected: "a" },
    ],
  },
  {
    id: "two-sum",
    title: "Two Sum",
    difficulty: "easy",
    topics: ["arrays", "hash-maps"],
    description:
      "Given an array of numbers and a target, return the two numbers that add up to the target, as an array in the order they appear.",
    functionName: "twoSum",
    examples: [{ input: "nums = [2,7,11,15], target = 9", output: "[2,7]" }],
    constraints: ["Exactly one valid answer exists."],
    starterCode: {
      javascript: "function twoSum(nums, target) {\n  // Your solution here\n}",
      typescript: "function twoSum(nums: number[], target: number): number[] {\n  // Your solution here\n}",
      python: "def twoSum(nums, target):\n    # Your solution here\n    pass",
    },
    testCases: [
      { input: [[2, 7, 11, 15], 9], expected: [2, 7] },
      { input: [[3, 2, 4], 6], expected: [2, 4] },
      { input: [[1, 5, 3, 7], 8], expected: [1, 7] },
    ],
  },
  {
    id: "valid-parentheses",
    title: "Valid Parentheses",
    difficulty: "easy",
    topics: ["stacks-queues"],
    description:
      "Given a string of brackets ()[]{} , return true if every bracket is closed by the correct type in the correct order.",
    functionName: "isValid",
    examples: [{ input: '"()[]{}"', output: "true" }],
    constraints: ["1 ≤ s.length ≤ 10^4"],
    starterCode: {
      javascript: "function isValid(s) {\n  // Your solution here\n}",
      typescript: "function isValid(s: string): boolean {\n  // Your solution here\n}",
      python: "def isValid(s):\n    # Your solution here\n    pass",
    },
    testCases: [
      { input: ["()[]{}"], expected: true },
      { input: ["(]"], expected: false },
      { input: ["([)]"], expected: false },
    ],
  },

  // ── Medium ────────────────────────────────────────────────────────────────
  {
    id: "max-subarray",
    title: "Maximum Subarray",
    difficulty: "medium",
    topics: ["dynamic-programming", "arrays"],
    description:
      "Given an integer array, return the largest sum of any contiguous subarray (at least one element).",
    functionName: "maxSubArray",
    examples: [{ input: "[-2,1,-3,4,-1,2,1,-5,4]", output: "6", explanation: "[4,-1,2,1] sums to 6." }],
    constraints: ["1 ≤ nums.length ≤ 10^5"],
    starterCode: {
      javascript: "function maxSubArray(nums) {\n  // Your solution here\n}",
      typescript: "function maxSubArray(nums: number[]): number {\n  // Your solution here\n}",
      python: "def maxSubArray(nums):\n    # Your solution here\n    pass",
    },
    testCases: [
      { input: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], expected: 6 },
      { input: [[1]], expected: 1 },
      { input: [[5, 4, -1, 7, 8]], expected: 23 },
    ],
  },
  {
    id: "fizzbuzz",
    title: "FizzBuzz",
    difficulty: "medium",
    topics: ["math"],
    description:
      'Given an integer n, return an array of length n where element i (1-indexed) is "FizzBuzz" if divisible by 3 and 5, "Fizz" if by 3, "Buzz" if by 5, else the number as a string.',
    functionName: "fizzBuzz",
    examples: [{ input: "n = 5", output: '["1","2","Fizz","4","Buzz"]' }],
    constraints: ["1 ≤ n ≤ 10^4"],
    starterCode: {
      javascript: "function fizzBuzz(n) {\n  // Your solution here\n}",
      typescript: "function fizzBuzz(n: number): string[] {\n  // Your solution here\n}",
      python: "def fizzBuzz(n):\n    # Your solution here\n    pass",
    },
    testCases: [
      { input: [3], expected: ["1", "2", "Fizz"] },
      { input: [5], expected: ["1", "2", "Fizz", "4", "Buzz"] },
    ],
  },
  {
    id: "longest-substring",
    title: "Longest Substring Without Repeating Characters",
    difficulty: "medium",
    topics: ["hash-maps", "arrays"],
    description:
      "Given a string, return the length of the longest substring without repeating characters.",
    functionName: "lengthOfLongestSubstring",
    examples: [{ input: '"abcabcbb"', output: "3", explanation: '"abc" has length 3.' }],
    constraints: ["0 ≤ s.length ≤ 5 * 10^4"],
    starterCode: {
      javascript: "function lengthOfLongestSubstring(s) {\n  // Your solution here\n}",
      typescript: "function lengthOfLongestSubstring(s: string): number {\n  // Your solution here\n}",
      python: "def lengthOfLongestSubstring(s):\n    # Your solution here\n    pass",
    },
    testCases: [
      { input: ["abcabcbb"], expected: 3 },
      { input: ["bbbbb"], expected: 1 },
      { input: ["pwwkew"], expected: 3 },
    ],
  },

  // ── Hard ──────────────────────────────────────────────────────────────────
  {
    id: "trapping-rain-water",
    title: "Trapping Rain Water",
    difficulty: "hard",
    topics: ["arrays", "dynamic-programming"],
    description:
      "Given an array of non-negative heights representing an elevation map (each bar width 1), return how much water it can trap after raining.",
    functionName: "trap",
    examples: [{ input: "[0,1,0,2,1,0,1,3,2,1,2,1]", output: "6" }],
    constraints: ["1 ≤ height.length ≤ 2 * 10^4"],
    starterCode: {
      javascript: "function trap(height) {\n  // Your solution here\n}",
      typescript: "function trap(height: number[]): number {\n  // Your solution here\n}",
      python: "def trap(height):\n    # Your solution here\n    pass",
    },
    testCases: [
      { input: [[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]], expected: 6 },
      { input: [[4, 2, 0, 3, 2, 5]], expected: 9 },
    ],
  },
  {
    id: "merge-intervals",
    title: "Merge Intervals",
    difficulty: "hard",
    topics: ["sorting", "arrays"],
    description:
      "Given an array of intervals [start, end], merge all overlapping intervals and return the result sorted by start.",
    functionName: "mergeIntervals",
    examples: [{ input: "[[1,3],[2,6],[8,10],[15,18]]", output: "[[1,6],[8,10],[15,18]]" }],
    constraints: ["1 ≤ intervals.length ≤ 10^4"],
    starterCode: {
      javascript: "function mergeIntervals(intervals) {\n  // Your solution here\n}",
      typescript: "function mergeIntervals(intervals: number[][]): number[][] {\n  // Your solution here\n}",
      python: "def mergeIntervals(intervals):\n    # Your solution here\n    pass",
    },
    testCases: [
      {
        input: [
          [
            [1, 3],
            [2, 6],
            [8, 10],
            [15, 18],
          ],
        ],
        expected: [
          [1, 6],
          [8, 10],
          [15, 18],
        ],
      },
      {
        input: [
          [
            [1, 4],
            [4, 5],
          ],
        ],
        expected: [[1, 5]],
      },
    ],
  },
  {
    id: "coin-change",
    title: "Coin Change",
    difficulty: "hard",
    topics: ["dynamic-programming"],
    description:
      "Given coin denominations and a total amount, return the fewest coins needed to make the amount, or -1 if it cannot be made.",
    functionName: "coinChange",
    examples: [{ input: "coins = [1,2,5], amount = 11", output: "3", explanation: "11 = 5 + 5 + 1." }],
    constraints: ["0 ≤ amount ≤ 10^4"],
    starterCode: {
      javascript: "function coinChange(coins, amount) {\n  // Your solution here\n}",
      typescript: "function coinChange(coins: number[], amount: number): number {\n  // Your solution here\n}",
      python: "def coinChange(coins, amount):\n    # Your solution here\n    pass",
    },
    testCases: [
      { input: [[1, 2, 5], 11], expected: 3 },
      { input: [[2], 3], expected: -1 },
      { input: [[1], 0], expected: 0 },
    ],
  },
];

/** Difficulty-only, then topic-filtered (system-design is a prompt hint, not a code topic). */
export function filterProblems(difficulty: Difficulty, topics: string[] = []): CodingProblem[] {
  const byDifficulty = TECHNICAL_PROBLEMS.filter((p) => p.difficulty === difficulty);
  if (topics.length === 0) return byDifficulty;
  const codeTopics = topics.filter((t) => t !== "system-design");
  if (codeTopics.length === 0) return byDifficulty;
  const byTopics = byDifficulty.filter((p) => codeTopics.some((t) => p.topics.includes(t)));
  return byTopics.length > 0 ? byTopics : byDifficulty;
}

/** Pick up to `count` distinct random problems for a difficulty + topics. */
export function pickRandomProblems(
  difficulty: Difficulty,
  topics: string[] = [],
  count = 3,
): CodingProblem[] {
  const pool = filterProblems(difficulty, topics);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/** Safe fallback when AI generation fails and no topics were chosen. */
export const FALLBACK_PROBLEMS: CodingProblem[] = TECHNICAL_PROBLEMS.filter(
  (p) => p.difficulty === "medium",
).slice(0, 3);
