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

// A volunteer can mark a request done before the resident has confirmed it.
export const AWAITING_CONFIRMATION_TEXT = "Waiting for your confirmation";

export function isAwaitingConfirmation(req: {
  status: RequestStatus;
  confirmedAt?: string | undefined;
}): boolean {
  return req.status === "completed" && !req.confirmedAt;
}

// Status words for one request; "Completed" only once the resident has confirmed.
export function requestStatusText(req: {
  status: RequestStatus;
  confirmedAt?: string | undefined;
}): string {
  return isAwaitingConfirmation(req) ? AWAITING_CONFIRMATION_TEXT : STATUS_TEXT[req.status];
}

export function requestStatusTone(req: {
  status: RequestStatus;
  confirmedAt?: string | undefined;
}): BadgeTone {
  return isAwaitingConfirmation(req) ? "warning" : STATUS_TONE[req.status];
}

// A volunteer name is shown once one has taken the request.
export function showsVolunteer(status: RequestStatus): boolean {
  return status === "matched" || status === "completed";
}

// The server accepts a cancel while the request is being checked or still open.
export function canCancel(status: RequestStatus): boolean {
  return status === "pending_review" || status === "open";
}
