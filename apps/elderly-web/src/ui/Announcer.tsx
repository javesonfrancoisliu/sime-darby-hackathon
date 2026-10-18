import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Announce = (message: string) => void;

const AnnounceContext = createContext<Announce>(() => {});

// Polite live region for things that change without a page change, such as "Request sent".
export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");
  // A trailing space on alternate calls lets the same sentence be announced twice in a row.
  const announce = useCallback((next: string) => {
    setMessage((prev) => (prev === next ? `${next} ` : next));
  }, []);
  return (
    <AnnounceContext.Provider value={announce}>
      {children}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {message}
      </div>
    </AnnounceContext.Provider>
  );
}

export function useAnnounce(): Announce {
  return useContext(AnnounceContext);
}
