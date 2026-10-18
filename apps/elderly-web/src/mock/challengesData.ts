// Mock Gamification Data - Community Challenges, Badges,
// Streaks & Rewards (FOR FUN, elderly-friendly, demo only).
// Goals are team/neighbourhood-based, never individual rankings.

import type { Neighbourhood, CommunityChallenge, Badge, StreakState, Reward } from "../types/challenges";

export const MY_NEIGHBOURHOOD: Neighbourhood = {
  id: "elmina-west",
  name: "Elmina West Neighbours",
  members: 128,
};

export const COMMUNITY_CHALLENGES: CommunityChallenge[] = [
  {
    id: "C001",
    title: "Morning Walk Together",
    description:
      "Our neighbourhood is walking to a shared goal. Every check-in at the park adds to the team total.",
    icon: "walk",
    goal: 500,
    progress: 342,
    unit: "walks",
    endsOn: "31 Oct 2026",
    teamReward: "Free kopi morning at the Community Centre",
  },
  {
    id: "C002",
    title: "Garden the Void Deck",
    description:
      "Help green our shared spaces. Each potted plant logged by a neighbour counts toward the goal.",
    icon: "plant",
    goal: 100,
    progress: 71,
    unit: "plants",
    endsOn: "15 Nov 2026",
    teamReward: "New benches for Block C garden",
  },
  {
    id: "C003",
    title: "Learn One Digital Skill",
    description:
      "Neighbours learning WhatsApp, e-wallets and video calls together with youth volunteers.",
    icon: "device",
    goal: 80,
    progress: 54,
    unit: "skills learned",
    endsOn: "30 Nov 2026",
    teamReward: "Township tablet-lending corner",
  },
];

export const BADGES: Badge[] = [
  { id: "B001", name: "First Check-In", description: "Checked in for the first time", icon: "check", earned: true },
  { id: "B002", name: "Week Streak", description: "Checked in 7 days in a row", icon: "streak", earned: true },
  { id: "B003", name: "Good Neighbour", description: "Joined a community challenge", icon: "neighbour", earned: true },
  { id: "B004", name: "Green Thumb", description: "Logged 5 plants for the garden", icon: "sun", earned: false },
  { id: "B005", name: "Tech Explorer", description: "Learned 3 digital skills", icon: "device", earned: false },
  { id: "B006", name: "Month Streak", description: "Checked in 30 days in a row", icon: "trophy", earned: false },
];

export const INITIAL_STREAK: StreakState = {
  current: 6,
  best: 9,
  week: [true, true, true, true, true, true, false],
};

export const REWARDS: Reward[] = [
  { id: "R001", title: "RM5 off fresh groceries", partner: "Elmina Market Mart", cost: 120, icon: "groceries", category: "shop" },
  { id: "R002", title: "Free health screening", partner: "Klinik Komuniti Elmina", cost: 200, icon: "health", category: "clinic" },
  { id: "R003", title: "Free kopi & kaya toast", partner: "Kedai Kopi Pak Din", cost: 80, icon: "gift", category: "food" },
  { id: "R004", title: "RM10 pharmacy voucher", partner: "Elmina Pharmacy", cost: 150, icon: "pharmacy", category: "clinic" },
  { id: "R005", title: "Free haircut", partner: "Gunting Rakyat Barber", cost: 100, icon: "person", category: "shop" },
];

// Points the resident has earned so far (demo).
export const INITIAL_POINTS = 260;
