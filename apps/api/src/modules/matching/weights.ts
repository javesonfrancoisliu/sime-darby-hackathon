import type { Category } from "@sdh/contracts";

export const WEIGHTS = { skill: 0.5, proximity: 0.3, availability: 0.2 } as const;

export const DEFAULT_RADIUS_KM = 5;
export const SHORTLIST_SIZE = 10;
export const RESULT_SIZE = 5;

export const CATEGORY_LABELS: Record<Category, string> = {
  groceries: "groceries",
  transport: "transport",
  digital_literacy: "digital help",
  health_literacy: "health advice",
  home_help: "home repairs",
  community_activity: "community activities",
};

// Lowercase; matched as substrings of the volunteer's experience text.
export const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  groceries: ["grocery", "groceries", "shopping", "market", "pasar"],
  transport: ["drive", "driving", "car", "kereta"],
  digital_literacy: ["phone", "smartphone", "e-wallet", "whatsapp", "video call", "komputer"],
  health_literacy: ["health", "nurse", "clinic", "first aid", "kesihatan"],
  home_help: ["repair", "fix", "plumbing", "electrical", "baiki"],
  community_activity: ["event", "community", "games", "gotong-royong"],
};
