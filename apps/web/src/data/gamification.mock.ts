import type {
  Achievement,
  Badge,
  Challenge,
  LeaderboardEntry,
  QuizQuestion,
  Reward,
} from "../types/gamification";

// All gamification demo data. Everything is simulated for the hackathon and must
// be labelled "Demo data" in the UI. No backend involved.

export const MOCK_CHALLENGES: Challenge[] = [
  // ---- Fitness & walking ----
  {
    id: "chl-steps-week",
    title: "Walk 20,000 steps this week",
    summary: "Log your steps to hit a healthy weekly walking goal.",
    category: "fitness",
    points: 50,
    goal: { type: "steps", target: 20000, unit: "steps" },
    requiresVerification: false,
    isDemoData: true,
  },
  {
    id: "chl-morning-walks",
    title: "3 morning walks",
    summary: "Join three neighbourhood morning walks this week.",
    category: "fitness",
    points: 40,
    goal: { type: "sessions", target: 3, unit: "walks" },
    requiresVerification: false,
    isDemoData: true,
  },
  // ---- Community clean-up (verified participation) ----
  {
    id: "chl-cleanup-park",
    title: "Central Park clean-up",
    summary: "Take part in the Saturday neighbourhood clean-up at Central Park.",
    category: "cleanup",
    points: 80,
    goal: { type: "sessions", target: 1, unit: "session" },
    requiresVerification: true,
    relatedEventId: "evt-cleanup-central-green",
    // Shares identity with the same activity if it also appears as a volunteering
    // contribution, so points are only awarded once.
    dedupeKey: "activity:cleanup-central-green-2026-10-24",
    isDemoData: true,
  },
  {
    id: "chl-cleanup-river",
    title: "Riverside litter pick",
    summary: "Help clear litter along the City of Elmina riverside path.",
    category: "cleanup",
    points: 70,
    goal: { type: "sessions", target: 1, unit: "session" },
    requiresVerification: true,
    isDemoData: true,
  },
  // ---- Environmental awareness ----
  {
    id: "chl-recycle-sort",
    title: "Sort recycling for a week",
    summary: "Separate recyclables from general waste every day for a week.",
    category: "environment",
    points: 45,
    goal: { type: "sessions", target: 7, unit: "days" },
    requiresVerification: false,
    isDemoData: true,
  },
  {
    id: "chl-eco-quiz",
    title: "Environmental awareness quiz",
    summary: "Answer a short quiz on recycling and sustainability.",
    category: "environment",
    points: 30,
    goal: { type: "quiz", target: 3, unit: "correct answers" },
    requiresVerification: false,
    isDemoData: true,
  },
];

export const MOCK_BADGES: Badge[] = [
  {
    id: "badge-starter",
    label: "Getting started",
    description: "Earn your first 30 points.",
    icon: "Sparkles",
    threshold: 30,
    isDemoData: true,
  },
  {
    id: "badge-mover",
    label: "Neighbourhood mover",
    description: "Reach 100 points.",
    icon: "Footprints",
    threshold: 100,
    isDemoData: true,
  },
  {
    id: "badge-champion",
    label: "Community champion",
    description: "Reach 250 points.",
    icon: "Trophy",
    threshold: 250,
    isDemoData: true,
  },
];

export const MOCK_ACHIEVEMENTS: Achievement[] = [
  {
    id: "ach-first-challenge",
    label: "First challenge done",
    description: "Complete your first challenge.",
    completedChallengesRequired: 1,
    isDemoData: true,
  },
  {
    id: "ach-three-challenges",
    label: "On a roll",
    description: "Complete three challenges.",
    completedChallengesRequired: 3,
    isDemoData: true,
  },
];

export const MOCK_REWARDS: Reward[] = [
  {
    id: "rwd-badge-frame",
    label: "Profile badge frame",
    description: "A decorative frame for your profile (simulated).",
    pointsCost: 50,
    isDemoData: true,
  },
  {
    id: "rwd-community-shoutout",
    label: "Community shout-out",
    description: "A thank-you mention in the neighbourhood newsletter (simulated).",
    pointsCost: 120,
    minVolunteerTasks: 1,
    isDemoData: true,
  },
  {
    id: "rwd-volunteer-star",
    label: "Volunteer star status",
    description: "Recognition for consistent volunteering (simulated).",
    pointsCost: 200,
    minVolunteerTasks: 3,
    isDemoData: true,
  },
];

// Leaderboard uses display names only (no PII). The current user's row is
// injected by the hook so their live points are reflected; these are the others.
export const MOCK_LEADERBOARD_OTHERS: Omit<LeaderboardEntry, "rank" | "isCurrentUser">[] = [
  { displayName: "Aisyah R.", points: 240, isDemoData: true },
  { displayName: "Wei Jie", points: 180, isDemoData: true },
  { displayName: "Kavya M.", points: 150, isDemoData: true },
  { displayName: "Daniel T.", points: 90, isDemoData: true },
  { displayName: "Nurul H.", points: 60, isDemoData: true },
];

// ---- Environmental quiz ----

export const MOCK_ECO_QUIZ: QuizQuestion[] = [
  {
    id: "q1",
    question: "Which of these belongs in the recycling bin?",
    options: ["Used tissue", "Clean plastic bottle", "Food scraps", "Broken ceramic"],
    correctIndex: 1,
  },
  {
    id: "q2",
    question: "What is the best way to reduce household waste?",
    options: [
      "Throw everything in one bin",
      "Buy more single-use items",
      "Reuse and separate recyclables",
      "Burn rubbish at home",
    ],
    correctIndex: 2,
  },
  {
    id: "q3",
    question: "Why is saving water important in the community?",
    options: [
      "It has no real benefit",
      "It conserves a shared resource and lowers bills",
      "It makes bins heavier",
      "It increases litter",
    ],
    correctIndex: 1,
  },
];
