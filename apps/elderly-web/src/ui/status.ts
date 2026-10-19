import type { RequestStatus } from "@sdh/contracts";

// Plain-language text for each status a resident can see.
export const STATUS_TEXT: Record<RequestStatus, string> = {
  pending_review: "Being checked",
  open: "Finding a volunteer",
  matched: "Volunteer coming",
  completed: "Completed",
  rejected: "Not accepted",
  cancelled: "Cancelled",
};

// Badge colour family per status. Green is kept for good news only.
export type BadgeTone = "info" | "warning" | "success" | "danger";

export const STATUS_TONE: Record<RequestStatus, BadgeTone> = {
  pending_review: "info",
  open: "warning",
  matched: "success",
  completed: "success",
  rejected: "danger",
  cancelled: "danger",
};

// A volunteer name is shown once one has taken the request.
export function showsVolunteer(status: RequestStatus): boolean {
  return status === "matched" || status === "completed";
}

// The server accepts a cancel while the request is being checked or still open.
export function canCancel(status: RequestStatus): boolean {
  return status === "pending_review" || status === "open";
}
