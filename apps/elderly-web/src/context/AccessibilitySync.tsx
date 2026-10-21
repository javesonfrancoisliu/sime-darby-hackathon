import { useEffect, useRef, useState } from "react";
import { useSession } from "@sdh/api-client";
import { DEFAULT_SETTINGS, type PutSettingsBody } from "@sdh/contracts";
import { settingsApi } from "../api/settings";
import { logApiError } from "../api/errors";
import { useAccessibility } from "./AccessibilityContext";

// Wait for the person to stop tapping before saving, so one burst is one save.
export const SETTINGS_SAVE_DELAY_MS = 800;

// Settings follow the person: loaded once after sign-in, then saved after each change.
// The phone's own copy stays the instant cache, so a failed call never changes the screen.
export function AccessibilitySync() {
  const { user, status } = useSession();
  const { fontSize, highContrast, reducedMotion, voiceAssist, reminders, applyRemoteSettings } =
    useAccessibility();
  const [readyFor, setReadyFor] = useState<string | null>(null);
  const remote = useRef<PutSettingsBody>(DEFAULT_SETTINGS);
  const lastSaved = useRef("");

  const userId = status === "signed_in" ? (user?.id ?? null) : null;
  const createdAt = user?.createdAt;
  const ready = userId !== null && readyFor === userId;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    settingsApi
      .get()
      .then((loaded) => {
        if (cancelled) return;
        remote.current = loaded;
        // A person who never saved starts from the defaults; the phone's old values are not theirs.
        const source = loaded.updatedAt === createdAt ? DEFAULT_SETTINGS : loaded;
        const synced = {
          fontSize: source.fontSize,
          highContrast: source.highContrast,
          reducedMotion: source.reducedMotion,
          voiceAssist: source.voiceAssist,
          reminders: source.notifyEvents || source.notifyVolunteering,
        };
        lastSaved.current = JSON.stringify(synced);
        applyRemoteSettings(synced);
        setReadyFor(userId);
      })
      .catch(logApiError);
    return () => {
      cancelled = true;
    };
  }, [userId, createdAt, applyRemoteSettings]);

  useEffect(() => {
    if (!ready) return;
    const synced = { fontSize, highContrast, reducedMotion, voiceAssist, reminders };
    const key = JSON.stringify(synced);
    if (key === lastSaved.current) return;
    const timer = setTimeout(() => {
      const { reminders: notify, ...appearance } = synced;
      const body: PutSettingsBody = {
        notifyEvents: notify,
        notifyVolunteering: notify,
        shareApproxLocation: remote.current.shareApproxLocation,
        ...appearance,
      };
      settingsApi
        .save(body)
        .then((saved) => {
          remote.current = saved;
          lastSaved.current = key;
        })
        .catch(logApiError);
    }, SETTINGS_SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [ready, fontSize, highContrast, reducedMotion, voiceAssist, reminders]);

  return null;
}
