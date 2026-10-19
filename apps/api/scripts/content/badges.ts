import type { CreateBadgeBody } from "@sdh/contracts";

export const badges: CreateBadgeBody[] = [
  {
    title: "Good Neighbour",
    description: "Earned your first 100 points.",
    icon: "star",
    kind: "points",
    threshold: 100,
    audience: "all",
  },
  {
    title: "Community Star",
    description: "Earned 500 points.",
    icon: "medal",
    kind: "points",
    threshold: 500,
    audience: "all",
  },
  {
    title: "Elmina Champion",
    description: "Earned 1,000 points.",
    icon: "trophy",
    kind: "points",
    threshold: 1000,
    audience: "volunteer",
  },
  {
    title: "First Steps",
    description: "Completed your first challenge.",
    icon: "walk",
    kind: "challenges",
    threshold: 1,
    audience: "all",
  },
  {
    title: "Active Neighbour",
    description: "Completed 3 challenges.",
    icon: "heart",
    kind: "challenges",
    threshold: 3,
    audience: "elder",
  },
  {
    title: "Changemaker",
    description: "Completed 5 challenges.",
    icon: "leaf",
    kind: "challenges",
    threshold: 5,
    audience: "volunteer",
  },
];
