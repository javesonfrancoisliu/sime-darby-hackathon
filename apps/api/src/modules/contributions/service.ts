import { randomUUID } from "node:crypto";
import type { Contribution, ContributionsResponse } from "@sdh/contracts";
import { listContributions } from "./repository";

export function newContribution(input: Omit<Contribution, "id" | "completedAt">): Contribution {
  return { ...input, id: randomUUID(), completedAt: new Date().toISOString() };
}

export async function summarise(volunteerId: string): Promise<ContributionsResponse> {
  const items = await listContributions(volunteerId);
  return {
    totalMinutes: items.reduce((sum, item) => sum + item.minutes, 0),
    completedCount: items.length,
    items,
  };
}
