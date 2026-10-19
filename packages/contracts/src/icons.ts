import { z } from "zod";

// One icon vocabulary for challenges, rewards and badges; both apps map each key to an SVG.
export const IconKey = z.enum([
  "walk",
  "run",
  "tree",
  "recycle",
  "leaf",
  "droplet",
  "sun",
  "heart",
  "users",
  "book",
  "trophy",
  "medal",
  "star",
  "shield",
  "gift",
  "ticket",
  "coffee",
  "cart",
]);
export type IconKey = z.infer<typeof IconKey>;

export const Audience = z.enum(["all", "elder", "volunteer"]);
export type Audience = z.infer<typeof Audience>;
