import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { CommunityEvent, EventsResponse, HelpRequest, RequestsResponse } from "@sdh/contracts";

import { apiFetch, errorMessage, useSession } from "@sdh/api-client";
import { readJson, scopedKey, writeJson } from "../lib/storage";
import { useLoader } from "../lib/useLoader";
import type { Opportunity, OpportunityKind } from "../types/volunteer";

// Tracks the volunteer's accepted Help-a-Neighbour tasks. Held once at the app
// root (context) so Volunteer Nearby and Community Challenges share one instance.
//
// Mount with key={userId}: persisted state is per user and re-read on change.
// Two modes, picked by the demo sign-in (@sdh/api-client session):
//  - signed out: simulated and client-only, persisted to localStorage;
//  - signed in:  accepted requests come from GET /api/requests/mine and joined
//    events from GET /api/events; accept/join/complete call the API.
//
// Status model (frontend view):
//   accepted  -> volunteer took the task (API: request "matched", or event joined)
//   completed -> volunteer reported completion (API: request "completed")
//   verified  -> a simulated confirmation stands in for the elderly resident
//                confirming; only then does it count toward volunteering rewards.
//                The API has no resident-confirmation step yet, so this stays
//                on-device in both modes.

export type AcceptedTaskStatus = "accepted" | "completed" | "verified";

export type AcceptedTask = {
  id: string;
  /** Requests can be completed by the volunteer; events are closed by a coordinator. */
  kind: OpportunityKind;
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

const tasksKey = scopedKey("tc.acceptedTasks");
// Live-mode tasks the simulated resident has confirmed (no API for this yet).
const confirmedKey = scopedKey("tc.confirmedLiveTasks");

// Tasks saved before `kind` existed were all requests.
function readMockTasks(userId: string | null): AcceptedTask[] {
  return readJson<AcceptedTask[]>(tasksKey(userId), []).map((t) => ({
    ...t,
    kind: t.kind ?? "request",
  }));
}

type ConfirmedTasks = Record<string, string>; // task id -> confirmedAt

function requestToTask(request: HelpRequest, confirmed: ConfirmedTasks): AcceptedTask | null {
  if (request.status !== "matched" && request.status !== "completed") return null;
  const confirmedAt = confirmed[request.id];
  return {
    id: request.id,
    kind: "request",
    title: request.title,
    area: request.location.area,
    category: request.category,
    scheduledAt: request.scheduledAt,
    durationMinutes: request.durationMinutes,
    status: request.status === "matched" ? "accepted" : confirmedAt ? "verified" : "completed",
    // The API doesn't record when a request was accepted; updatedAt is the closest.
    acceptedAt: request.updatedAt,
    completedAt: request.status === "completed" ? request.updatedAt : undefined,
    verifiedAt: confirmedAt,
  };
}

function eventToTask(event: CommunityEvent): AcceptedTask {
  return {
    id: event.id,
    kind: "event",
    title: event.title,
    area: event.location.area,
    category: event.category,
    scheduledAt: event.startsAt,
    durationMinutes: event.durationMinutes,
    status: "accepted",
    acceptedAt: event.updatedAt,
  };
}

type LiveTasks = { requests: HelpRequest[]; events: CommunityEvent[]; error: string | null };

// Settled separately so a failing events call does not hide the volunteer's requests.
async function loadLiveTasks(userId: string | null): Promise<LiveTasks> {
  const [requests, events] = await Promise.allSettled([
    apiFetch<RequestsResponse>("/api/requests/mine", { userId }),
    apiFetch<EventsResponse>("/api/events", { userId }),
  ]);
  const failed = [requests, events].find((r) => r.status === "rejected");
  return {
    requests: requests.status === "fulfilled" ? requests.value.requests : [],
    events: events.status === "fulfilled" ? events.value.events.filter((e) => e.joined) : [],
    error: failed?.status === "rejected" ? errorMessage(failed.reason) : null,
  };
}

export type AcceptedTasksContextValue = {
  tasks: AcceptedTask[];
  /** True when tasks come from the API (a demo user is signed in). */
  live: boolean;
  loading: boolean;
  error: string | null;
  isAccepted: (id: string) => boolean;
  /** Accept a request or join an event. Rejects with an ApiError in live mode. */
  accept: (opportunity: Opportunity) => Promise<void>;
  /** Volunteer-reported completion. Does NOT award points or count as verified. */
  complete: (id: string, minutesSpent: number) => Promise<void>;
  /** Simulated resident confirmation. Marks the task verified. */
  verify: (id: string) => void;
  // Re-reads live tasks from the API. No-op when signed out.
  refresh: () => Promise<void>;
  /** Clears all accepted-task demo state. */
  reset: () => void;
};

const AcceptedTasksContext = createContext<AcceptedTasksContextValue | null>(null);

export function AcceptedTasksProvider({ children }: { children: ReactNode }) {
  const { userId } = useSession();
  const live = userId !== null;

  const [mockTasks, setMockTasks] = useState<AcceptedTask[]>(() => readMockTasks(userId));
  const [confirmed, setConfirmed] = useState<ConfirmedTasks>(() =>
    readJson(confirmedKey(userId), {}),
  );
  // `forUserId` marks whose tasks are loaded, so switching user shows loading
  // while a refresh after accept/complete keeps the current list on screen.
  const { loaded, reload } = useLoader(userId, loadLiveTasks, userId !== null);
  const liveData = loaded !== null && loaded.scope === userId ? loaded.value : null;

  useEffect(() => writeJson(tasksKey(userId), mockTasks), [userId, mockTasks]);
  useEffect(() => writeJson(confirmedKey(userId), confirmed), [userId, confirmed]);

  const refresh = reload;

  const tasks = useMemo<AcceptedTask[]>(() => {
    if (!live) return mockTasks;
    const fromRequests = (liveData?.requests ?? [])
      .map((r) => requestToTask(r, confirmed))
      .filter((t): t is AcceptedTask => t !== null);
    return [...fromRequests, ...(liveData?.events ?? []).map(eventToTask)].sort((a, b) =>
      a.scheduledAt.localeCompare(b.scheduledAt),
    );
  }, [live, mockTasks, liveData, confirmed]);

  const isAccepted = useCallback((id: string) => tasks.some((t) => t.id === id), [tasks]);

  const accept = useCallback(
    async (opportunity: Opportunity) => {
      if (userId) {
        const path =
          opportunity.kind === "event"
            ? `/api/events/${encodeURIComponent(opportunity.id)}/join`
            : `/api/requests/${encodeURIComponent(opportunity.id)}/accept`;
        await apiFetch(path, { method: "POST", userId });
        // Wait for the list so the card does not vanish before the task appears.
        await refresh();
        return;
      }
      setMockTasks((prev) => {
        if (prev.some((t) => t.id === opportunity.id)) return prev; // no duplicate accepts
        const task: AcceptedTask = {
          id: opportunity.id,
          kind: opportunity.kind,
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
    },
    [userId, refresh],
  );

  const complete = useCallback(
    async (id: string, minutesSpent: number) => {
      if (userId) {
        await apiFetch(`/api/requests/${encodeURIComponent(id)}/complete`, {
          method: "POST",
          body: { minutesSpent },
          userId,
        });
        await refresh();
        return;
      }
      setMockTasks((prev) =>
        prev.map((t) =>
          t.id === id && t.status === "accepted"
            ? { ...t, status: "completed", completedAt: new Date().toISOString() }
            : t,
        ),
      );
    },
    [userId, refresh],
  );

  const verify = useCallback(
    (id: string) => {
      if (live) {
        setConfirmed((prev) => (prev[id] ? prev : { ...prev, [id]: new Date().toISOString() }));
        return;
      }
      setMockTasks((prev) =>
        prev.map((t) =>
          t.id === id && t.status === "completed"
            ? { ...t, status: "verified", verifiedAt: new Date().toISOString() }
            : t,
        ),
      );
    },
    [live],
  );

  const reset = useCallback(() => {
    setMockTasks([]);
    setConfirmed({});
  }, []);

  const value = useMemo<AcceptedTasksContextValue>(
    () => ({
      tasks,
      live,
      loading: live && liveData === null,
      error: live ? (liveData?.error ?? null) : null,
      isAccepted,
      accept,
      complete,
      verify,
      refresh,
      reset,
    }),
    [tasks, live, liveData, isAccepted, accept, complete, verify, refresh, reset],
  );

  return <AcceptedTasksContext.Provider value={value}>{children}</AcceptedTasksContext.Provider>;
}

export function useAcceptedTasks(): AcceptedTasksContextValue {
  const ctx = useContext(AcceptedTasksContext);
  if (!ctx) throw new Error("useAcceptedTasks must be used within an AcceptedTasksProvider");
  return ctx;
}
