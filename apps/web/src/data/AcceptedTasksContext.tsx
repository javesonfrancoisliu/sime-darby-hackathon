import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";

import type { CommunityEvent, EventsResponse, HelpRequest, RequestsResponse } from "@sdh/contracts";

import { apiFetch, errorMessage, useSession } from "@sdh/api-client";
import { useLoader } from "../lib/useLoader";
import type { Opportunity, OpportunityKind } from "../types/volunteer";

// Tracks the volunteer's accepted Township Connect tasks, read from GET /api/requests/mine and the
// events the volunteer joined. Held once at the app root so every screen shares one instance.
//
// Status model:
//   accepted  -> the volunteer took the task (request matched, or event joined)
//   completed -> volunteer-reported completion; requests still wait for resident confirmation
//   confirmed -> the resident confirmed (confirmedAt set); points were awarded by the server

export type AcceptedTaskStatus = "accepted" | "completed" | "confirmed";

export type AcceptedTask = {
  id: string;
  // Volunteers can report completion of their own requests or event attendance.
  kind: OpportunityKind;
  title: string;
  area: string;
  category: Opportunity["category"];
  scheduledAt: string;
  durationMinutes: number;
  status: AcceptedTaskStatus;
  acceptedAt: string;
  completedAt?: string;
  confirmedAt?: string;
};

function requestToTask(request: HelpRequest): AcceptedTask | null {
  if (request.status !== "matched" && request.status !== "completed") return null;
  return {
    id: request.id,
    kind: "request",
    title: request.title,
    area: request.location.area,
    category: request.category,
    scheduledAt: request.scheduledAt,
    durationMinutes: request.durationMinutes,
    status:
      request.status === "matched" ? "accepted" : request.confirmedAt ? "confirmed" : "completed",
    acceptedAt: request.acceptedAt ?? request.updatedAt,
    completedAt: request.completedAt,
    confirmedAt: request.confirmedAt,
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
    status: event.attendanceCompletedAt || event.status === "completed" ? "completed" : "accepted",
    completedAt: event.attendanceCompletedAt,
    acceptedAt: event.updatedAt,
  };
}

type LiveTasks = { requests: HelpRequest[]; events: CommunityEvent[]; error: string | null };

// Settled separately so a failing events call does not hide the volunteer's requests.
async function loadTasks(userId: string | null): Promise<LiveTasks> {
  const [requests, events] = await Promise.allSettled([
    apiFetch<RequestsResponse>("/api/requests/mine", { userId }),
    apiFetch<EventsResponse>("/api/events?includeJoined=true", { userId }),
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
  loading: boolean;
  error: string | null;
  isAccepted: (id: string) => boolean;
  // Accept a request or join an event. Rejects with an ApiError.
  accept: (opportunity: Opportunity) => Promise<void>;
  // Joins an event as the signed-in user, then refreshes the task list even if the join fails.
  joinEvent: (eventId: string) => Promise<void>;
  // Volunteer-reported completion. The resident still has to confirm before points are awarded.
  complete: (id: string, minutesSpent: number) => Promise<void>;
  // Re-reads the tasks from the API.
  refresh: () => Promise<void>;
};

const AcceptedTasksContext = createContext<AcceptedTasksContextValue | null>(null);

export function AcceptedTasksProvider({ children }: { children: ReactNode }) {
  const { userId } = useSession();
  const { loaded, reload } = useLoader(userId, loadTasks, userId !== null);
  const data = loaded !== null && loaded.scope === userId ? loaded.value : null;

  const tasks = useMemo<AcceptedTask[]>(() => {
    if (userId === null || data === null) return [];
    const fromRequests = data.requests
      .map(requestToTask)
      .filter((t): t is AcceptedTask => t !== null);
    return [...fromRequests, ...data.events.map(eventToTask)].sort((a, b) =>
      a.scheduledAt.localeCompare(b.scheduledAt),
    );
  }, [userId, data]);

  const isAccepted = useCallback((id: string) => tasks.some((t) => t.id === id), [tasks]);

  const joinEvent = useCallback(
    async (eventId: string) => {
      try {
        await apiFetch(`/api/events/${encodeURIComponent(eventId)}/join`, {
          method: "POST",
          userId,
        });
      } finally {
        // Wait for the list so the card does not vanish before the task appears.
        await reload();
      }
    },
    [userId, reload],
  );

  const accept = useCallback(
    async (opportunity: Opportunity) => {
      if (opportunity.kind === "event") {
        await joinEvent(opportunity.id);
        return;
      }
      await apiFetch(`/api/requests/${encodeURIComponent(opportunity.id)}/accept`, {
        method: "POST",
        userId,
      });
      await reload();
    },
    [userId, reload, joinEvent],
  );

  const complete = useCallback(
    async (id: string, minutesSpent: number) => {
      const task = tasks.find((item) => item.id === id);
      const path =
        task?.kind === "event"
          ? `/api/events/${encodeURIComponent(id)}/attendance/complete`
          : `/api/requests/${encodeURIComponent(id)}/complete`;
      await apiFetch(path, {
        method: "POST",
        body: { minutesSpent },
        userId,
      });
      await reload();
    },
    [userId, reload, tasks],
  );

  const value = useMemo<AcceptedTasksContextValue>(
    () => ({
      tasks,
      loading: userId !== null && data === null,
      error: data?.error ?? null,
      isAccepted,
      accept,
      joinEvent,
      complete,
      refresh: reload,
    }),
    [tasks, userId, data, isAccepted, accept, joinEvent, complete, reload],
  );

  return <AcceptedTasksContext.Provider value={value}>{children}</AcceptedTasksContext.Provider>;
}

export function useAcceptedTasks(): AcceptedTasksContextValue {
  const ctx = useContext(AcceptedTasksContext);
  if (!ctx) throw new Error("useAcceptedTasks must be used within an AcceptedTasksProvider");
  return ctx;
}
