import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

export type FontSizeLevel = "normal" | "large" | "xlarge";

interface AccessibilityContextValue {
  fontSize: FontSizeLevel;
  setFontSize: (size: FontSizeLevel) => void;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
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
  toggleSheet: () => void;
  triggerHaptic: (ms?: number) => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSizeLevel>("large"); // Default "large" for elderly
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    return false;
  });
  const [voiceAssist, setVoiceAssist] = useState<boolean>(false);
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

  const increaseFontSize = useCallback(() => {
    triggerHaptic(15);
    setFontSizeState((prev) => (prev === "normal" ? "large" : "xlarge"));
  }, [triggerHaptic]);

  const decreaseFontSize = useCallback(() => {
    triggerHaptic(15);
    setFontSizeState((prev) => (prev === "xlarge" ? "large" : "normal"));
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

  // Stop speaking when navigating or unmounting
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Drive the root <html> font-size so every rem-based size scales together
  // with the Dynamic Type setting (apple-design §15: scale layout with text).
  useEffect(() => {
    if (typeof document === "undefined") return;
    const px = fontSize === "normal" ? 16 : fontSize === "large" ? 19 : 23;
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

  const toggleSheet = useCallback(() => {
    triggerHaptic(15);
    setIsSheetOpen((v) => !v);
  }, [triggerHaptic]);

  const value: AccessibilityContextValue = {
    fontSize,
    setFontSize,
    increaseFontSize,
    decreaseFontSize,
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
    toggleSheet,
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
      increaseFontSize: () => {},
      decreaseFontSize: () => {},
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
      toggleSheet: () => {},
      triggerHaptic: () => {},
    };
  }
  return ctx;
}
