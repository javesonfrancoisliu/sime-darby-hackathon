/* ─────────────────────────────────────────────────────────
   Mock Gamification Data — Community Challenges, Badges,
   Streaks & Rewards (FOR FUN, elderly-friendly, demo only).
   Goals are team/neighbourhood-based, never individual rankings.
───────────────────────────────────────────────────────── */

/* ── Neighbourhood team the resident belongs to ─────── */
export interface Neighbourhood {
  id: string;
  name: string;
  members: number;
}

export const MY_NEIGHBOURHOOD: Neighbourhood = {
  id: "elmina-west",
  name: "Elmina West Neighbours",
  members: 128,
};

/* ── Team / neighbourhood challenges ────────────────── */
export interface CommunityChallenge {
  id: string;
  title: string;
  description: string;
  emoji: string;
  /* Shared team goal, e.g. 500 steps logged by the whole neighbourhood. */
  goal: number;
  progress: number;
  unit: string;
  endsOn: string;
  /* Reward granted to the team when the goal is reached. */
  teamReward: string;
}

export const COMMUNITY_CHALLENGES: CommunityChallenge[] = [
  {
    id: "C001",
    title: "Morning Walk Together",
    description:
      "Our neighbourhood is walking to a shared goal. Every check-in at the park adds to the team total.",
    emoji: "🚶",
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
    emoji: "🪴",
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
    emoji: "📱",
    goal: 80,
    progress: 54,
    unit: "skills learned",
    endsOn: "30 Nov 2026",
    teamReward: "Township tablet-lending corner",
  },
];

/* ── Participation badges ───────────────────────────── */
export interface Badge {
  id: string;
  name: string;
  description: string;
  emoji: string;
  earned: boolean;
}

export const BADGES: Badge[] = [
  { id: "B001", name: "First Check-In", description: "Checked in for the first time", emoji: "🌱", earned: true },
  { id: "B002", name: "Week Streak", description: "Checked in 7 days in a row", emoji: "🔥", earned: true },
  { id: "B003", name: "Good Neighbour", description: "Joined a community challenge", emoji: "🤝", earned: true },
  { id: "B004", name: "Green Thumb", description: "Logged 5 plants for the garden", emoji: "🌻", earned: false },
  { id: "B005", name: "Tech Explorer", description: "Learned 3 digital skills", emoji: "💡", earned: false },
  { id: "B006", name: "Month Streak", description: "Checked in 30 days in a row", emoji: "🏅", earned: false },
];

/* ── Daily check-in streak ──────────────────────────── */
export interface StreakState {
  current: number;
  best: number;
  /* Last 7 days: true = checked in. Index 6 is today. */
  week: boolean[];
}

export const INITIAL_STREAK: StreakState = {
  current: 6,
  best: 9,
  week: [true, true, true, true, true, true, false],
};

/* ── Rewards & vouchers (township shops / clinics) ──── */
export interface Reward {
  id: string;
  title: string;
  partner: string;
  cost: number; // points
  emoji: string;
  category: "shop" | "clinic" | "food";
}

export const REWARDS: Reward[] = [
  { id: "R001", title: "RM5 off fresh groceries", partner: "Elmina Market Mart", cost: 120, emoji: "🥬", category: "shop" },
  { id: "R002", title: "Free health screening", partner: "Klinik Komuniti Elmina", cost: 200, emoji: "🩺", category: "clinic" },
  { id: "R003", title: "Free kopi & kaya toast", partner: "Kedai Kopi Pak Din", cost: 80, emoji: "☕", category: "food" },
  { id: "R004", title: "RM10 pharmacy voucher", partner: "Elmina Pharmacy", cost: 150, emoji: "💊", category: "clinic" },
  { id: "R005", title: "Free haircut", partner: "Gunting Rakyat Barber", cost: 100, emoji: "💈", category: "shop" },
];

/* Points the resident has earned so far (demo). */
export const INITIAL_POINTS = 260;
