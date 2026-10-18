import { createContext, useContext, useMemo, useRef, type ReactNode } from "react";

// Holds a password only in memory (a ref), never in storage, state snapshots or the URL.
// It lives from "create account" or a sign-in that needs a code until the sign-in right after confirming.
type Flow = {
  rememberPassword: (password: string) => void;
  takePassword: () => string | null;
};

const FlowContext = createContext<Flow | null>(null);

export function FlowProvider({ children }: { children: ReactNode }) {
  const passwordRef = useRef<string | null>(null);
  const value = useMemo<Flow>(
    () => ({
      rememberPassword: (password) => {
        passwordRef.current = password;
      },
      takePassword: () => {
        const password = passwordRef.current;
        passwordRef.current = null;
        return password;
      },
    }),
    [],
  );
  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}

export function useFlow(): Flow {
  const ctx = useContext(FlowContext);
  if (!ctx) throw new Error("useFlow must be used within a FlowProvider");
  return ctx;
}
