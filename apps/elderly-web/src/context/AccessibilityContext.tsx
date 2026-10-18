import { readStorage, writeStorage } from "@sdh/api-client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

export type FontSizeLevel = "normal" | "large" | "xlarge";

export const ACCESSIBILITY_STORAGE_KEY = "hn.accessibility";

interface StoredSettings {
  fontSize: FontSizeLevel;
  highContrast: boolean;
  reducedMotion: boolean;
  voiceAssist: boolean;
}

const FONT_LEVELS: FontSizeLevel[] = ["normal", "large", "xlarge"];

export const FONT_LABEL: Record<FontSizeLevel, string> = {
  normal: "Normal",
  large: "Large",
  xlarge: "X-Large",
};

// Root font size in px for each text size, so every rem value scales together.
export const ROOT_FONT_PX: Record<FontSizeLevel, number> = { normal: 16, large: 19, xlarge: 23 };

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

// Reads saved settings. Anything missing or malformed falls back to the default for that setting.
function loadSettings(): StoredSettings {
  const defaults: StoredSettings = {
    fontSize: "large",
    highContrast: false,
    reducedMotion: prefersReducedMotion(),
    voiceAssist: false,
  };
  const raw = readStorage(ACCESSIBILITY_STORAGE_KEY);
  if (!raw) return defaults;
  try {
    const saved = JSON.parse(raw) as Partial<StoredSettings>;
    return {
      fontSize: FONT_LEVELS.includes(saved.fontSize as FontSizeLevel)
        ? (saved.fontSize as FontSizeLevel)
        : defaults.fontSize,
      highContrast: typeof saved.highContrast === "boolean" ? saved.highContrast : defaults.highContrast,
      reducedMotion: typeof saved.reducedMotion === "boolean" ? saved.reducedMotion : defaults.reducedMotion,
      voiceAssist: typeof saved.voiceAssist === "boolean" ? saved.voiceAssist : defaults.voiceAssist,
    };
  } catch {
    return defaults;
  }
}

interface AccessibilityContextValue {
  fontSize: FontSizeLevel;
  setFontSize: (size: FontSizeLevel) => void;
  highContrast: boolean;
  setHighContrast: (val: boolean | ((prev: boolean) => boolean)) => void;
  reducedMotion: boolean;
  setReducedMotion: (val: boolean | ((prev: boolean) => boolean)) => void;
  voiceAssist: boolean;
  setVoiceAssist: (val: boolean | ((prev: boolean) => boolean)) => void;
  isSpeaking: boolean;
  speak: (text: string) => void;
  stopSpeaking: () => void;
  isSheetOpen: boolean;
  openSheet: () => void;
  closeSheet: () => void;
  triggerHaptic: (ms?: number) => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(loadSettings);
  const [fontSize, setFontSizeState] = useState<FontSizeLevel>(initial.fontSize);
  const [highContrast, setHighContrast] = useState<boolean>(initial.highContrast);
  const [reducedMotion, setReducedMotion] = useState<boolean>(initial.reducedMotion);
  const [voiceAssist, setVoiceAssist] = useState<boolean>(initial.voiceAssist);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isSheetOpen, setIsSheetOpen] = useState<boolean>(false);

  const triggerHaptic = useCallback((ms = 15) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {
        // Ignore if not supported
      }
    }
  }, []);

  const setFontSize = useCallback((size: FontSizeLevel) => {
    triggerHaptic(12);
    setFontSizeState(size);
  }, [triggerHaptic]);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      stopSpeaking();
      triggerHaptic(20);

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.88; // Slightly measured rate, optimal for elderly comprehension
      utterance.pitch = 1.0;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [stopSpeaking, triggerHaptic],
  );

  // Save every change so the settings survive a reload.
  useEffect(() => {
    const settings: StoredSettings = { fontSize, highContrast, reducedMotion, voiceAssist };
    writeStorage(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(settings));
  }, [fontSize, highContrast, reducedMotion, voiceAssist]);

  // Stop speaking when navigating or unmounting
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Drive the root <html> font-size so every rem-based size scales together
  // with the Text size setting.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const px = ROOT_FONT_PX[fontSize];
    const prev = document.documentElement.style.fontSize;
    document.documentElement.style.fontSize = `${px}px`;
    return () => {
      document.documentElement.style.fontSize = prev;
    };
  }, [fontSize]);

  const openSheet = useCallback(() => {
    triggerHaptic(15);
    setIsSheetOpen(true);
  }, [triggerHaptic]);

  const closeSheet = useCallback(() => {
    triggerHaptic(10);
    setIsSheetOpen(false);
  }, [triggerHaptic]);

  const value: AccessibilityContextValue = {
    fontSize,
    setFontSize,
    highContrast,
    setHighContrast,
    reducedMotion,
    setReducedMotion,
    voiceAssist,
    setVoiceAssist,
    isSpeaking,
    speak,
    stopSpeaking,
    isSheetOpen,
    openSheet,
    closeSheet,
    triggerHaptic,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    // Graceful fallback for isolated test environments
    return {
      fontSize: "large" as FontSizeLevel,
      setFontSize: () => {},
      highContrast: false,
      setHighContrast: () => {},
      reducedMotion: false,
      setReducedMotion: () => {},
      voiceAssist: false,
      setVoiceAssist: () => {},
      isSpeaking: false,
      speak: () => {},
      stopSpeaking: () => {},
      isSheetOpen: false,
      openSheet: () => {},
      closeSheet: () => {},
      triggerHaptic: () => {},
    };
  }
  return ctx;
}
