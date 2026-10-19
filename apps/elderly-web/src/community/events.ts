import type { CommunityEvent, EventCategory } from "@sdh/contracts";

export const EVENT_CATEGORY_TEXT: Record<EventCategory, string> = {
  community_activity: "Community",
  health_literacy: "Health",
  digital_literacy: "Learning",
};

export function spotsLeft(event: CommunityEvent): number {
  return Math.max(0, event.capacity - event.signupCount);
}
