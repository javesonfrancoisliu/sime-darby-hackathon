import { useState } from "react";

import { useProfile } from "../../data/ProfileContext";
import {
  LANGUAGE_LABEL,
  PREFERRED_DAY_LABEL,
  TIME_OF_DAY_LABEL,
  type Language,
  type PreferredDay,
  type TimeOfDay,
} from "../../types/profile";
import { TASK_CATEGORY_LABEL, type TaskCategory } from "../../types/volunteer";
import { AppButton, Modal } from "../ui";

export type EditPreferencesModalProps = {
  open: boolean;
  onClose: () => void;
};

const ALL_CATEGORIES = Object.keys(TASK_CATEGORY_LABEL) as TaskCategory[];
const ALL_DAYS = Object.keys(PREFERRED_DAY_LABEL) as PreferredDay[];
const ALL_TIMES = Object.keys(TIME_OF_DAY_LABEL) as TimeOfDay[];
const ALL_LANGS = Object.keys(LANGUAGE_LABEL) as Language[];

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function ChipGroup<T extends string>({
  legend,
  options,
  labels,
  selected,
  onToggle,
}: {
  legend: string;
  options: T[];
  labels: Record<T, string>;
  selected: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <fieldset className="chip-fieldset">
      <legend className="pref-row-label">{legend}</legend>
      <div className="ui-chip-row" style={{ gap: "var(--space-2)" }}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className="ui-chip"
            aria-pressed={selected.includes(option)}
            onClick={() => onToggle(option)}
          >
            {labels[option]}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Edit volunteer preferences: skills, interests, availability (simplified
 * day-group + time-of-day), languages. Chip multi-selects keep it compact on
 * mobile. Saved to the frontend profile store (demo) — does not update backend
 * matching.
 */
export function EditPreferencesModal({ open, onClose }: EditPreferencesModalProps) {
  const { prefs, updatePrefs } = useProfile();
  const [skills, setSkills] = useState(prefs.skills);
  const [interests, setInterests] = useState(prefs.interests);
  const [days, setDays] = useState(prefs.availability.days);
  const [times, setTimes] = useState(prefs.availability.times);
  const [languages, setLanguages] = useState(prefs.languages);

  function save() {
    updatePrefs({ skills, interests, availability: { days, times }, languages });
    onClose();
  }

  return (
    <Modal
      open={open}
      title="Edit volunteer preferences"
      onClose={onClose}
      footer={
        <>
          <AppButton variant="ghost" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton variant="primary" onClick={save}>
            Save
          </AppButton>
        </>
      }
    >
      <ChipGroup
        legend="Skills"
        options={ALL_CATEGORIES}
        labels={TASK_CATEGORY_LABEL}
        selected={skills}
        onToggle={(v) => setSkills((prev) => toggle(prev, v))}
      />
      <ChipGroup
        legend="Assistance interests"
        options={ALL_CATEGORIES}
        labels={TASK_CATEGORY_LABEL}
        selected={interests}
        onToggle={(v) => setInterests((prev) => toggle(prev, v))}
      />
      <ChipGroup
        legend="Preferred days"
        options={ALL_DAYS}
        labels={PREFERRED_DAY_LABEL}
        selected={days}
        onToggle={(v) => setDays((prev) => toggle(prev, v))}
      />
      <ChipGroup
        legend="Preferred time of day"
        options={ALL_TIMES}
        labels={TIME_OF_DAY_LABEL}
        selected={times}
        onToggle={(v) => setTimes((prev) => toggle(prev, v))}
      />
      <ChipGroup
        legend="Communication languages"
        options={ALL_LANGS}
        labels={LANGUAGE_LABEL}
        selected={languages}
        onToggle={(v) => setLanguages((prev) => toggle(prev, v))}
      />
      <p className="ui-helper" style={{ margin: 0 }}>
        Saved on this device for the demo. Language preference is a prototype
        setting and is not yet part of the shared backend profile.
      </p>
    </Modal>
  );
}
