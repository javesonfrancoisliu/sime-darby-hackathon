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
  const { fontSize, highContrast, reducedMotion, voiceAssist, applyRemoteSettings } =
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
        const four = {
          fontSize: source.fontSize,
          highContrast: source.highContrast,
          reducedMotion: source.reducedMotion,
          voiceAssist: source.voiceAssist,
        };
        lastSaved.current = JSON.stringify(four);
        applyRemoteSettings(four);
        setReadyFor(userId);
      })
      .catch(logApiError);
    return () => {
      cancelled = true;
    };
  }, [userId, createdAt, applyRemoteSettings]);

  useEffect(() => {
    if (!ready) return;
    const four = { fontSize, highContrast, reducedMotion, voiceAssist };
    const key = JSON.stringify(four);
    if (key === lastSaved.current) return;
    const timer = setTimeout(() => {
      const body: PutSettingsBody = {
        notifyEvents: remote.current.notifyEvents,
        notifyVolunteering: remote.current.notifyVolunteering,
        shareApproxLocation: remote.current.shareApproxLocation,
        ...four,
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
  }, [ready, fontSize, highContrast, reducedMotion, voiceAssist]);

  return null;
}
