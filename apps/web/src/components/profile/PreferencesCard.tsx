import { Pencil } from "lucide-react";

import { useProfile } from "../../data/ProfileContext";
import { LANGUAGE_LABEL, PREFERRED_DAY_LABEL, TIME_OF_DAY_LABEL } from "../../types/profile";
import { TASK_CATEGORY_LABEL } from "../../types/volunteer";
import { AppButton, InfoCard, Pill } from "../ui";

export type PreferencesCardProps = {
  onEdit: () => void;
};

function PillRow({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="pref-row">
      <span className="pref-row-label">{label}</span>
      <div className="ui-chip-row" style={{ gap: "var(--space-2)" }}>
        {values.length > 0 ? (
          values.map((v) => <Pill key={v}>{v}</Pill>)
        ) : (
          <span className="ui-meta-row">Not set</span>
        )}
      </div>
    </div>
  );
}

// Read view of volunteering preferences (skills, interests, availability,
// languages). Edited via a separate modal. Notes these feed future matching.
export function PreferencesCard({ onEdit }: PreferencesCardProps) {
  const { prefs, isDemo } = useProfile();
  const availability = [
    ...prefs.availability.days.map((d) => PREFERRED_DAY_LABEL[d]),
    ...prefs.availability.times.map((t) => TIME_OF_DAY_LABEL[t]),
  ];

  return (
    <InfoCard ariaLabel="Volunteering preferences">
      <div className="feature-card">
        <div className="feature-card-head">
          <h2 className="feature-card-title">Volunteering preferences</h2>
          <AppButton variant="ghost" onClick={onEdit} aria-label="Edit volunteer preferences">
            <Pencil size={16} aria-hidden="true" />
            Edit
          </AppButton>
        </div>

        <PillRow label="Skills" values={prefs.skills.map((s) => TASK_CATEGORY_LABEL[s])} />
        <PillRow label="Interests" values={prefs.interests.map((s) => TASK_CATEGORY_LABEL[s])} />
        <PillRow label="Availability" values={availability} />
        <PillRow label="Languages" values={prefs.languages.map((l) => LANGUAGE_LABEL[l])} />

        <p className="ui-helper" style={{ margin: 0 }}>
          {isDemo
            ? "Saved on this device for the demo."
            : "Skills and availability feed volunteer matching."}
        </p>
      </div>
    </InfoCard>
  );
}
