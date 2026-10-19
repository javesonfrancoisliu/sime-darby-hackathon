import { apiFetch } from "@sdh/api-client";
import type {
  BadgesResponse,
  BadgeWithEarned,
  ChallengesResponse,
  ChallengeWithProgress,
  CheckInResult,
  ContributeResult,
  PointsSummary,
  RedeemResult,
  RewardsResponse,
  RewardWithStatus,
  Streak,
} from "@sdh/contracts";

const id = encodeURIComponent;

export const playApi = {
  async challenges(): Promise<ChallengeWithProgress[]> {
    return (await apiFetch<ChallengesResponse>("/api/challenges")).challenges;
  },
  contribute(challengeId: string): Promise<ContributeResult> {
    return apiFetch<ContributeResult>(`/api/challenges/${id(challengeId)}/contribute`, {
      method: "POST",
    });
  },
  points: () => apiFetch<PointsSummary>("/api/me/points"),
  streak: () => apiFetch<Streak>("/api/me/streak"),
  checkIn: () => apiFetch<CheckInResult>("/api/me/check-in", { method: "POST" }),
  async rewards(): Promise<RewardWithStatus[]> {
    return (await apiFetch<RewardsResponse>("/api/rewards")).rewards;
  },
  redeem(rewardId: string): Promise<RedeemResult> {
    return apiFetch<RedeemResult>(`/api/rewards/${id(rewardId)}/redeem`, { method: "POST" });
  },
  async badges(): Promise<BadgeWithEarned[]> {
    return (await apiFetch<BadgesResponse>("/api/badges")).badges;
  },
};
