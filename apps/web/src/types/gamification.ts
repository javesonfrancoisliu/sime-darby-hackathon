import type { ChallengeCategory, RewardCategory } from "@sdh/contracts";

export const CHALLENGE_CATEGORY_LABEL: Record<ChallengeCategory, string> = {
  fitness: "Fitness",
  cleanup: "Clean-up",
  environment: "Environment",
  community: "Community",
};

export const REWARD_CATEGORY_LABEL: Record<RewardCategory, string> = {
  shop: "Shop",
  clinic: "Clinic",
  food: "Food",
  recognition: "Recognition",
};
