import { useEffect, useRef, useState } from "react";

import { errorMessage } from "@sdh/api-client";
import { Category } from "@sdh/contracts";

import { useProfile } from "../../data/ProfileContext";
import {
  LANGUAGES,
  LANGUAGE_LABEL,
  PREFERRED_DAYS,
  PREFERRED_DAY_LABEL,
  TIMES_OF_DAY,
  TIME_OF_DAY_LABEL,
} from "../../types/profile";
import { TASK_CATEGORY_LABEL } from "../../types/volunteer";
import { AppButton, Modal } from "../ui";

export type EditPreferencesModalProps = {
  open: boolean;
  onClose: () => void;
  // Called after the preferences are saved.
  onSaved?: () => void;
};

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
  options: readonly T[];
  labels: Record<T, string>;
  selected: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <fieldset className="chip-fieldset">
      <legend className="pref-row-label">{legend}</legend>
      <div className="ui-chip-row ui-gap-2">
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

// Edit volunteer preferences: skills, interests, availability (simplified
// day-group + time-of-day), languages. Chip multi-selects keep it compact on
// mobile.
export function EditPreferencesModal({ open, onClose, onSaved }: EditPreferencesModalProps) {
  const { prefs, updatePrefs } = useProfile();
  const [skills, setSkills] = useState(prefs.skills);
  const [interests, setInterests] = useState(prefs.interests);
  const [days, setDays] = useState(prefs.availability.days);
  const [times, setTimes] = useState(prefs.availability.times);
  const [languages, setLanguages] = useState(prefs.languages);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  // The footer is pinned and the form scrolls, so bring a new error into view and announce it.
  useEffect(() => {
    if (saveError) errorRef.current?.focus();
  }, [saveError]);

  // Any change to the form clears the last error, so it never outlives the mistake.
  function edit(change: () => void) {
    setSaveError(null);
    change();
  }

  function sameSet(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((value) => b.includes(value));
  }

  async function save() {
    const availabilityChanged =
      !sameSet(days, prefs.availability.days) || !sameSet(times, prefs.availability.times);
    if (availabilityChanged && days.length > 0 !== times.length > 0) {
      setSaveError("Pick at least one day and one time of day, or clear both.");
      return;
    }
    setBusy(true);
    setSaveError(null);
    try {
      // Only the fields that changed are sent, so saving one never rewrites the others.
      await updatePrefs({
        ...(!sameSet(skills, prefs.skills) && { skills }),
        ...(!sameSet(interests, prefs.interests) && { interests }),
        ...(!sameSet(languages, prefs.languages) && { languages }),
        ...(availabilityChanged && { availability: { days, times } }),
      });
      onSaved?.();
      onClose();
    } catch (err) {
      setSaveError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Edit volunteer preferences"
      onClose={onClose}
      footer={
        <>
          <AppButton variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </AppButton>
          <AppButton variant="primary" onClick={() => void save()} loading={busy}>
            Save
          </AppButton>
        </>
      }
    >
      <ChipGroup
        legend="Skills"
        options={Category.options}
        labels={TASK_CATEGORY_LABEL}
        selected={skills}
        onToggle={(v) => edit(() => setSkills((prev) => toggle(prev, v)))}
      />
      <ChipGroup
        legend="Assistance interests"
        options={Category.options}
        labels={TASK_CATEGORY_LABEL}
        selected={interests}
        onToggle={(v) => edit(() => setInterests((prev) => toggle(prev, v)))}
      />
      <ChipGroup
        legend="Preferred days"
        options={PREFERRED_DAYS}
        labels={PREFERRED_DAY_LABEL}
        selected={days}
        onToggle={(v) => edit(() => setDays((prev) => toggle(prev, v)))}
      />
      <ChipGroup
        legend="Preferred time of day"
        options={TIMES_OF_DAY}
        labels={TIME_OF_DAY_LABEL}
        selected={times}
        onToggle={(v) => edit(() => setTimes((prev) => toggle(prev, v)))}
      />
      <ChipGroup
        legend="Communication languages"
        options={LANGUAGES}
        labels={LANGUAGE_LABEL}
        selected={languages}
        onToggle={(v) => edit(() => setLanguages((prev) => toggle(prev, v)))}
      />
      <p className="ui-helper ui-flush">
        Your skills and availability are saved to your account and used for volunteer matching.
      </p>
      {saveError && (
        <p ref={errorRef} tabIndex={-1} className="ui-error ui-flush" role="alert">
          {saveError}
        </p>
      )}
    </Modal>
  );
}
