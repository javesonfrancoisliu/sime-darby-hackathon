import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

// How long a confirmation stays on screen.
export const TOAST_DISMISS_MS = 3000;

// A short status message. The region stays mounted so screen readers announce each new message.
export function Toast({ message }: { message: string | null }) {
  return (
    <div className="ui-toast-region" role="status" aria-live="polite">
      {message && <p className="ui-toast">{message}</p>}
    </div>
  );
}

// Holds one message that clears itself. Render `toast` once in the screen that calls `notify`.
export function useToast(): { notify: (message: string) => void; toast: ReactNode } {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const notify = useCallback((text: string) => {
    clearTimeout(timer.current);
    setMessage(text);
    timer.current = setTimeout(() => setMessage(null), TOAST_DISMISS_MS);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return { notify, toast: <Toast message={message} /> };
}
