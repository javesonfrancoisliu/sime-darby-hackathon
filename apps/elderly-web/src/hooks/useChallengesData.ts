import { playApi } from "../api/play";
import { useLiveQuery } from "./useLiveQuery";
import { useMutation } from "./useMutation";

export const useChallenges = () => useLiveQuery("challenges", playApi.challenges);
export const usePoints = () => useLiveQuery("points", playApi.points);
export const useStreak = () => useLiveQuery("streak", playApi.streak);
export const useRewards = () => useLiveQuery("rewards", playApi.rewards);
export const useBadges = () => useLiveQuery("badges", playApi.badges);

export const useContribute = () => useMutation(playApi.contribute);
export const useCheckIn = () => useMutation(playApi.checkIn);
export const useRedeem = () => useMutation(playApi.redeem);
