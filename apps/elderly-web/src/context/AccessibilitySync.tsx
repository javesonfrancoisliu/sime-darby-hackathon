import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useSession } from "@sdh/api-client";
import { DEFAULT_SETTINGS, type PutSettingsBody } from "@sdh/contracts";
import { settingsApi } from "../api/settings";
import { logApiError, toFriendlyError } from "../api/errors";
import { Banner } from "../ui/Banner";
import { useAccessibility } from "./AccessibilityContext";

// Where the Settings sheet shows the failure, so the notice never covers its title or Done button.
let noticeSlot: HTMLElement | null = null;
const slotListeners = new Set<() => void>();

// Ref callback for the element inside the Settings sheet that hosts the notice.
export function noticeSlotRef(element: HTMLElement | null) {
  noticeSlot = element;
  slotListeners.forEach((listener) => listener());
}

function subscribeToSlot(listener: () => void) {
  slotListeners.add(listener);
  return () => {
    slotListeners.delete(listener);
  };
}

// Wait for the person to stop tapping before saving, so one burst is one save.
export const SETTINGS_SAVE_DELAY_MS = 800;

// Settings follow the person: loaded once after sign-in, then saved after each change.
// The phone's own copy stays the instant cache, so a failed call never changes the screen.
export function AccessibilitySync() {
  const { user, status } = useSession();
  const {
    fontSize,
    highContrast,
    reducedMotion,
    voiceAssist,
    reminders,
    applyRemoteSettings,
    isSheetOpen,
  } = useAccessibility();
  const slot = useSyncExternalStore(subscribeToSlot, () => noticeSlot);
  const [readyFor, setReadyFor] = useState<string | null>(null);
  const remote = useRef<PutSettingsBody>(DEFAULT_SETTINGS);
  const lastSaved = useRef("");
  const lastReminders = useRef(false);
  const retryNow = useRef(false);
  const [failure, setFailure] = useState("");
  const [attempt, setAttempt] = useState(0);

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
        lastReminders.current = synced.reminders;
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
    const delay = retryNow.current ? 0 : SETTINGS_SAVE_DELAY_MS;
    retryNow.current = false;
    const timer = setTimeout(() => {
      const { reminders: notify, ...appearance } = synced;
      // Only a changed Reminders switch writes the two flags; otherwise the server's own stay.
      const remindersChanged = notify !== lastReminders.current;
      const body: PutSettingsBody = {
        notifyEvents: remindersChanged ? notify : remote.current.notifyEvents,
        notifyVolunteering: remindersChanged ? notify : remote.current.notifyVolunteering,
        shareApproxLocation: remote.current.shareApproxLocation,
        ...appearance,
      };
      settingsApi
        .save(body)
        .then((saved) => {
          remote.current = saved;
          lastSaved.current = key;
          lastReminders.current = notify;
          setFailure("");
        })
        .catch((error: unknown) => setFailure(toFriendlyError(error).message));
    }, delay);
    return () => clearTimeout(timer);
    // attempt re-arms the save after a failed one.
  }, [ready, fontSize, highContrast, reducedMotion, voiceAssist, reminders, attempt]);

  if (!failure) return null;
  const banner = (
    <Banner
      message={`Your settings were not saved to your account. ${failure}`}
      retryLabel="Save again"
      onRetry={() => {
        retryNow.current = true;
        setAttempt((n) => n + 1);
      }}
    />
  );
  if (isSheetOpen && slot) return createPortal(banner, slot);
  if (isSheetOpen) return null;
  return <div className="app-sync-notice">{banner}</div>;
}
