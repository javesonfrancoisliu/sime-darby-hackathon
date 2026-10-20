import type {
  BadgesResponse,
  ChallengeActionResult,
  ChallengesResponse,
  ContributeResult,
  LeaderboardResponse,
  PointsSummary,
  QuizPublic,
  QuizResult,
  QuizSubmitBody,
  RedeemResult,
  Redemption,
  RewardsResponse,
} from "@sdh/contracts";

import { ApiError, apiFetch, errorMessage, FRIENDLY_ERROR_COPY, useSession } from "@sdh/api-client";
import { useApiResource, type ApiResource } from "./useApiResource";

// Everything here is read from the API; nothing is kept on the device. The hooks stay idle until
// someone is signed in.
function useSignedIn(path: string): string | null {
  const { userId } = useSession();
  return userId === null ? null : path;
}

// Enough recent entries to match confirmed tasks to the points they earned.
export const LEDGER_PAGE_SIZE = 50;

export function useChallenges(): ApiResource<ChallengesResponse> {
  return useApiResource<ChallengesResponse>(useSignedIn("/api/challenges"));
}

export function usePoints(): ApiResource<PointsSummary> {
  return useApiResource<PointsSummary>(useSignedIn(`/api/me/points?limit=${LEDGER_PAGE_SIZE}`));
}

export function useRewards(): ApiResource<RewardsResponse> {
  return useApiResource<RewardsResponse>(useSignedIn("/api/rewards"));
}

export function useBadges(): ApiResource<BadgesResponse> {
  return useApiResource<BadgesResponse>(useSignedIn("/api/badges"));
}

export function useLeaderboard(): ApiResource<LeaderboardResponse> {
  return useApiResource<LeaderboardResponse>(useSignedIn("/api/leaderboard"));
}

const challengePath = (id: string, action: string) =>
  `/api/challenges/${encodeURIComponent(id)}/${action}`;

export function joinChallenge(id: string) {
  return apiFetch<ChallengeActionResult>(challengePath(id, "join"), { method: "POST" });
}

export function logChallengeProgress(id: string, current: number) {
  return apiFetch<ChallengeActionResult>(challengePath(id, "progress"), {
    method: "PUT",
    body: { current },
  });
}

export function completeChallenge(id: string) {
  return apiFetch<ChallengeActionResult>(challengePath(id, "complete"), { method: "POST" });
}

export function contributeToChallenge(id: string) {
  return apiFetch<ContributeResult>(challengePath(id, "contribute"), { method: "POST" });
}

export function redeemReward(id: string) {
  return apiFetch<RedeemResult>(`/api/rewards/${encodeURIComponent(id)}/redeem`, {
    method: "POST",
  });
}

export function fetchQuiz(id: string) {
  return apiFetch<QuizPublic>(`/api/quizzes/${encodeURIComponent(id)}`);
}

export function submitQuiz(id: string, body: QuizSubmitBody) {
  return apiFetch<QuizResult>(`/api/quizzes/${encodeURIComponent(id)}/submit`, {
    method: "POST",
    body,
  });
}

// Codes whose plain wording beats the server text, and which usually mean the lists are stale.
const FRIENDLY_CODES = new Set([
  "INSUFFICIENT_POINTS",
  "ALREADY_DONE",
  "CONFLICT_RETRY",
  "NOT_FOUND",
]);

export function actionErrorMessage(err: unknown): string {
  if (err instanceof ApiError && FRIENDLY_CODES.has(err.code)) return FRIENDLY_ERROR_COPY[err.code];
  return errorMessage(err);
}

export function consumeRewardVoucher(id: string) {
  return apiFetch<Redemption>(`/api/rewards/${encodeURIComponent(id)}/use`, { method: "POST" });
}
