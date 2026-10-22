import { malaysiaToday } from "../requests/schedule";
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
export const useUseReward = () => useMutation(playApi.use);

// The daily "I am okay" check-in, shared by Home and Play so both call the API and update state alike.
export function useDailyCheckIn(
  streak: ReturnType<typeof useStreak>,
  points: ReturnType<typeof usePoints>,
) {
  const checkIn = useCheckIn();
  const checkedInToday = streak.data?.recent?.includes(malaysiaToday()) ?? false;

  async function run() {
    const result = await checkIn.run();
    if (!result) return null;
    streak.update(() => result.streak);
    points.update((p) => ({ ...p, points: result.points }));
    return result;
  }

  return { checkIn, checkedInToday, run };
}
