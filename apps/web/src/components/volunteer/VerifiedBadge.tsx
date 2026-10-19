import { BadgeCheck, ShieldQuestion } from "lucide-react";

import type { VerificationStatus } from "../../types/volunteer";

export type VerifiedBadgeProps = {
  status: VerificationStatus;
};

// Volunteer verification indicator. Text + icon (never color alone).
// "not_required" renders nothing.
export function VerifiedBadge({ status }: VerifiedBadgeProps) {
  if (status === "not_required") return null;
  if (status === "verified") {
    return (
      <span className="ui-badge ui-badge--success">
        <BadgeCheck size={14} aria-hidden="true" />
        Verified volunteer
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="ui-badge ui-badge--danger">
        <ShieldQuestion size={14} aria-hidden="true" />
        Not verified
      </span>
    );
  }
  return (
    <span className="ui-badge ui-badge--warning">
      <ShieldQuestion size={14} aria-hidden="true" />
      Verification pending
    </span>
  );
}
