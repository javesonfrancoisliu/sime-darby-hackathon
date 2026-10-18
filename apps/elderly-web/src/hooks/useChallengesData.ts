import {
  BADGES,
  COMMUNITY_CHALLENGES,
  INITIAL_POINTS,
  INITIAL_STREAK,
  MY_NEIGHBOURHOOD,
  REWARDS,
} from "../mock/challengesData";

// Play data is demo data until the API has it; pages read it only here.
export function useChallengesData() {
  return {
    neighbourhood: MY_NEIGHBOURHOOD,
    communityChallenges: COMMUNITY_CHALLENGES,
    badgeList: BADGES,
    rewardList: REWARDS,
    initialStreak: INITIAL_STREAK,
    initialPoints: INITIAL_POINTS,
  };
}
