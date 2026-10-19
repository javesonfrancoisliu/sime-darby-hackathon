import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { Opportunity } from "../types/volunteer";

// Tracks the volunteer's accepted Help-a-Neighbour tasks for the demo. Held once
// at the app root (context) so Volunteer Nearby and Community Challenges share
// one live instance; persisted to localStorage so it survives reloads.
//
// Simulated, client-only — no backend calls. Status model here is FRONTEND-ONLY
// and deliberately separate from the backend request status machine:
//   accepted  -> volunteer took the task
//   completed -> volunteer SELF-REPORTED completion (NOT verified)
//   verified  -> a simulated confirmation stands in for the elderly resident
//                confirming; only then does it count toward volunteering rewards.
// See docs/FRONTEND_HANDOVER notes for the mapping to the backend API.

export type AcceptedTaskStatus = "accepted" | "completed" | "verified";

export type AcceptedTask = {
  id: string;
  title: string;
  area: string;
  category: Opportunity["category"];
  scheduledAt: string;
  durationMinutes: number;
  status: AcceptedTaskStatus;
  acceptedAt: string;
  completedAt?: string;
  verifiedAt?: string;
  /**
   * Shared de-dupe key for the underlying activity, carried from the opportunity
   * when present, so a task that is also a challenge is rewarded once.
   */
  dedupeKey?: string;
};

const STORAGE_KEY = "tc.acceptedTasks";

function read(): AcceptedTask[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AcceptedTask[]) : [];
  } catch {
    return [];
  }
}

export type AcceptedTasksContextValue = {
  tasks: AcceptedTask[];
  isAccepted: (id: string) => boolean;
  accept: (opportunity: Opportunity) => void;
  /** Self-reported completion. Does NOT award points or count as verified. */
  complete: (id: string) => void;
  /** Simulated resident confirmation. Marks the task verified. */
  verify: (id: string) => void;
  /** Clears all accepted-task demo state. */
  reset: () => void;
};

const AcceptedTasksContext = createContext<AcceptedTasksContextValue | null>(null);

export function AcceptedTasksProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<AcceptedTask[]>(read);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    }
  }, [tasks]);

  const isAccepted = useCallback((id: string) => tasks.some((t) => t.id === id), [tasks]);

  const accept = useCallback((opportunity: Opportunity) => {
    setTasks((prev) => {
      if (prev.some((t) => t.id === opportunity.id)) return prev; // no duplicate accepts
      const task: AcceptedTask = {
        id: opportunity.id,
        title: opportunity.title,
        area: opportunity.area,
        category: opportunity.category,
        scheduledAt: opportunity.scheduledAt,
        durationMinutes: opportunity.durationMinutes,
        status: "accepted",
        acceptedAt: new Date().toISOString(),
        dedupeKey: opportunity.dedupeKey,
      };
      return [task, ...prev];
    });
  }, []);

  const complete = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id && t.status === "accepted"
          ? { ...t, status: "completed", completedAt: new Date().toISOString() }
          : t,
      ),
    );
  }, []);

  const verify = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id && t.status === "completed"
          ? { ...t, status: "verified", verifiedAt: new Date().toISOString() }
          : t,
      ),
    );
  }, []);

  const reset = useCallback(() => setTasks([]), []);

  const value = useMemo<AcceptedTasksContextValue>(
    () => ({ tasks, isAccepted, accept, complete, verify, reset }),
    [tasks, isAccepted, accept, complete, verify, reset],
  );

  return (
    <AcceptedTasksContext.Provider value={value}>{children}</AcceptedTasksContext.Provider>
  );
}

export function useAcceptedTasks(): AcceptedTasksContextValue {
  const ctx = useContext(AcceptedTasksContext);
  if (!ctx) throw new Error("useAcceptedTasks must be used within an AcceptedTasksProvider");
  return ctx;
}
