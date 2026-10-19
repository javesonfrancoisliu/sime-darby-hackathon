import type { CommunityEvent, EventCategory, MaintenanceStatus } from "@sdh/contracts";

export const EVENT_CATEGORY_TEXT: Record<EventCategory, string> = {
  community_activity: "Community",
  health_literacy: "Health",
  digital_literacy: "Learning",
};

export function spotsLeft(event: CommunityEvent): number {
  return Math.max(0, event.capacity - event.signupCount);
}

export const MAINTENANCE_TEXT: Record<MaintenanceStatus, string> = {
  scheduled: "Planned",
  in_progress: "Happening now",
  completed: "Finished",
};

// A stored "in progress" notice whose window has already ended reads as finished.
export function maintenanceLabel(
  status: MaintenanceStatus,
  windowEnd: string | undefined,
  now: Date = new Date(),
): string {
  if (status === "in_progress" && windowEnd && Date.parse(windowEnd) <= now.getTime()) {
    return MAINTENANCE_TEXT.completed;
  }
  return MAINTENANCE_TEXT[status];
}
