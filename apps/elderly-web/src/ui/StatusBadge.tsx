import type { RequestStatus } from "@sdh/contracts";
import { requestStatusText, requestStatusTone } from "./status";

// Shared badge with a semantic tone; always shows words, never colour alone.
// Pass confirmedAt so a self-reported completion reads as waiting for the resident.
export function StatusBadge({
  status,
  confirmedAt,
}: {
  status: RequestStatus;
  confirmedAt?: string | undefined;
}) {
  const req = { status, confirmedAt };
  return (
    <span className={`ui-badge ui-badge--${requestStatusTone(req)}`}>{requestStatusText(req)}</span>
  );
}
