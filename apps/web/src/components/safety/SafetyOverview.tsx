import { ArrowRight, ShieldAlert } from "lucide-react";

import { AppLinkButton, InfoCard } from "../ui";

// PLACEHOLDER - the Health & Safety team (Module 1) owns the real SafetyOverview.
// The Home page composes this compact summary beside CommunityOverview per the
// integration contract. Replace this stub with the real safety summary; keep the
// same component name and the `townshipId` prop so Home does not need changes.
// townshipId is accepted (and will scope the summary in the real implementation)
// so Home does not need changes when the Health & Safety team replaces this stub.
export type SafetyOverviewProps = { townshipId?: string };

export function SafetyOverview({ townshipId }: SafetyOverviewProps) {
  return (
    <InfoCard ariaLabel={`Safety summary${townshipId ? ` for ${townshipId}` : ""}`}>
      <div className="feature-card">
        <div className="feature-card-head">
          <h2 className="feature-card-title">
            <span className="inline-icon">
              <ShieldAlert size={18} aria-hidden="true" />
              Health & Safety
            </span>
          </h2>
        </div>
        <p className="feature-card-desc">
          Hazard conditions and facility reports appear here once the Health & Safety module is
          connected.
        </p>
        <div className="feature-card-foot">
          <AppLinkButton to="/safety" variant="secondary">
            View safety details
            <ArrowRight size={16} aria-hidden="true" />
          </AppLinkButton>
        </div>
      </div>
    </InfoCard>
  );
}
