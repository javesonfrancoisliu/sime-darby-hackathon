import type { RequestStatus } from "../api/client";
import { STATUS_TEXT, STATUS_TONE } from "./status";

/**
 * StatusBadge — shared ui-badge with a semantic tone; always renders
 * human-readable text, never colour alone. (Req 1.3, 6.3)
 */
export function StatusBadge({ status }: { status: RequestStatus }) {
  const tone = STATUS_TONE[status];
  return <span className={`ui-badge ui-badge--${tone}`}>{STATUS_TEXT[status]}</span>;
}
