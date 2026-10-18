import type { RequestStatus } from "@sdh/contracts";
import { STATUS_TEXT, STATUS_TONE } from "./status";

// Shared badge with a semantic tone; always shows words, never colour alone.
export function StatusBadge({ status }: { status: RequestStatus }) {
  const tone = STATUS_TONE[status];
  return <span className={`ui-badge ui-badge--${tone}`}>{STATUS_TEXT[status]}</span>;
}
