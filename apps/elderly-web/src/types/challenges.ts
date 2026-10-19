// Icon key for challenge, badge and reward cards; ui/PlayIcon maps it to an SVG.
export type PlayIconName =
  | "walk"
  | "plant"
  | "device"
  | "check"
  | "streak"
  | "neighbour"
  | "sun"
  | "trophy"
  | "groceries"
  | "health"
  | "gift"
  | "pharmacy"
  | "person";

// ── Neighbourhood team the resident belongs to ───────
export interface Neighbourhood {
  id: string;
  name: string;
  members: number;
}

// ── Team / neighbourhood challenges ──────────────────
export interface CommunityChallenge {
  id: string;
  title: string;
  description: string;
  icon: PlayIconName;
  // Shared team goal, e.g. 500 steps logged by the whole neighbourhood.
  goal: number;
  progress: number;
  unit: string;
  endsOn: string;
  // Reward granted to the team when the goal is reached.
  teamReward: string;
}

// ── Participation badges ─────────────────────────────
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: PlayIconName;
  earned: boolean;
}

// ── Daily check-in streak ────────────────────────────
export interface StreakState {
  current: number;
  best: number;
  // Last 7 days: true = checked in. Index 6 is today.
  week: boolean[];
}

// ── Rewards & vouchers (township shops / clinics) ────
export interface Reward {
  id: string;
  title: string;
  partner: string;
  cost: number; // points
  icon: PlayIconName;
  category: "shop" | "clinic" | "food";
}
