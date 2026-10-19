import { ShieldAlert } from "lucide-react";

import { EmptyState, InfoCard, PageHeader } from "../../components/ui";

// PLACEHOLDER ONLY - Module 1 (Health & Safety Hazards) is owned by the teammate.
// This stub exists so shared navigation and the Home integration resolve.
// Do not implement real safety functionality here; the teammate builds
// src/components/safety/* and the real content of this page.
export function SafetyPage() {
  return (
    <>
      <PageHeader
        title="Health & Safety"
        subtitle="Local hazard conditions and facility reports for your township."
      />
      <InfoCard>
        <EmptyState
          icon={ShieldAlert}
          title="Health and safety updates are coming soon"
          description="Haze, water level and temperature alerts, and reports on local facilities, will appear here."
        />
      </InfoCard>
    </>
  );
}
