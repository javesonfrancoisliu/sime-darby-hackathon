import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SessionProvider } from "@sdh/api-client";
import type { ReactNode } from "react";

import { installFakeApi, signInAs } from "../test/fakeApi";
import { makeEvent, makeRequest, VOLUNTEER } from "../test/fixtures";
import type { Opportunity } from "../types/volunteer";
import { AcceptedTasksProvider, useAcceptedTasks } from "./AcceptedTasksContext";

function wrapper({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AcceptedTasksProvider>{children}</AcceptedTasksProvider>
    </SessionProvider>
  );
}

const REQUEST_ID = makeRequest().id;

function opportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: REQUEST_ID,
    kind: "request",
    title: "Groceries",
    summary: "Milk",
    category: "groceries",
    distanceKm: 1,
    area: "Elmina Valley",
    scheduledAt: "2026-10-20T09:00:00+08:00",
    durationMinutes: 60,
    matchScore: 70,
    reasons: [],
    fitsMySchedule: false,
    ...overrides,
  };
}

describe("AcceptedTasksContext signed out", () => {
  it("lists nothing and does not call the API", () => {
    const { fetchMock } = installFakeApi();
    const { result } = renderHook(() => useAcceptedTasks(), { wrapper });
    expect(result.current.tasks).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("AcceptedTasksContext signed in", () => {
  it("maps matched and completed requests and joined events to tasks", async () => {
    const matched = makeRequest({ status: "matched", title: "Matched one" });
    const done = makeRequest({
      id: "c36d9ab8-cf60-4c99-8dd4-6a7fcf7d8e07",
      status: "completed",
      title: "Done one",
      scheduledAt: "2026-10-21T09:00:00+08:00",
    });
    const open = makeRequest({ id: "d47eabc9-d071-4daa-9ee5-7b80d08e9f08", status: "open" });
    installFakeApi({
      "GET /api/me": { body: VOLUNTEER },
      "GET /api/requests/mine": { body: { requests: [matched, done, open] } },
      "GET /api/events": {
        body: {
          events: [
            makeEvent({ joined: true }),
            makeEvent({ id: "e58fbcda-e182-4ebb-8ff6-8c91e19fa009", joined: false }),
          ],
        },
      },
    });
    signInAs(VOLUNTEER.id);
    const { result } = renderHook(() => useAcceptedTasks(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.tasks.map((t) => [t.title, t.kind, t.status])).toEqual([
      ["Matched one", "request", "accepted"],
      ["Done one", "request", "completed"],
      ["Tea morning", "event", "accepted"],
    ]);
  });

  it("shows a completed task as confirmed once the resident has confirmed it", async () => {
    const waiting = makeRequest({ status: "completed", title: "Waiting one" });
    const confirmed = makeRequest({
      id: "c36d9ab8-cf60-4c99-8dd4-6a7fcf7d8e07",
      status: "completed",
      title: "Confirmed one",
      confirmedAt: "2026-10-21T10:00:00+08:00",
    });
    installFakeApi({
      "GET /api/me": { body: VOLUNTEER },
      "GET /api/requests/mine": { body: { requests: [waiting, confirmed] } },
      "GET /api/events": { body: { events: [] } },
    });
    signInAs(VOLUNTEER.id);
    const { result } = renderHook(() => useAcceptedTasks(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.tasks.map((t) => [t.title, t.status])).toEqual([
      ["Waiting one", "completed"],
      ["Confirmed one", "confirmed"],
    ]);
  });

  it("shows the task before accept resolves", async () => {
    let accepted = false;
    const { calls } = installFakeApi({
      "GET /api/me": { body: VOLUNTEER },
      "GET /api/requests/mine": () => ({
        body: { requests: accepted ? [makeRequest({ status: "matched" })] : [] },
      }),
      "GET /api/events": { body: { events: [] } },
      [`POST /api/requests/${REQUEST_ID}/accept`]: () => {
        accepted = true;
        return { body: makeRequest({ status: "matched" }) };
      },
    });
    signInAs(VOLUNTEER.id);
    const { result } = renderHook(() => useAcceptedTasks(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.tasks).toHaveLength(0);

    await act(() => result.current.accept(opportunity()));
    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.isAccepted(REQUEST_ID)).toBe(true);
    const post = calls.find((c) => c.method === "POST");
    expect(post?.headers["x-demo-user"]).toBe(VOLUNTEER.id);
  });

  it("joins an event through the events endpoint", async () => {
    const event = makeEvent();
    const { calls } = installFakeApi({
      "GET /api/me": { body: VOLUNTEER },
      "GET /api/requests/mine": { body: { requests: [] } },
      "GET /api/events": { body: { events: [] } },
      [`POST /api/events/${event.id}/join`]: { body: event },
    });
    signInAs(VOLUNTEER.id);
    const { result } = renderHook(() => useAcceptedTasks(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => result.current.accept(opportunity({ id: event.id, kind: "event" })));
    expect(
      calls.some((c) => c.method === "POST" && c.path === `/api/events/${event.id}/join`),
    ).toBe(true);
  });

  it("posts the minutes spent and shows the completed task before complete resolves", async () => {
    let finished = false;
    const { calls } = installFakeApi({
      "GET /api/me": { body: VOLUNTEER },
      "GET /api/requests/mine": () => ({
        body: { requests: [makeRequest({ status: finished ? "completed" : "matched" })] },
      }),
      "GET /api/events": { body: { events: [] } },
      [`POST /api/requests/${REQUEST_ID}/complete`]: () => {
        finished = true;
        return { body: makeRequest({ status: "completed" }) };
      },
    });
    signInAs(VOLUNTEER.id);
    const { result } = renderHook(() => useAcceptedTasks(), { wrapper });
    await waitFor(() => expect(result.current.tasks[0]?.status).toBe("accepted"));

    await act(() => result.current.complete(REQUEST_ID, 75));
    expect(result.current.tasks[0]?.status).toBe("completed");
    expect(calls.find((c) => c.method === "POST")?.body).toEqual({ minutesSpent: 75 });
  });

  it("rejects when the API refuses the accept and leaves the list alone", async () => {
    installFakeApi({
      "GET /api/me": { body: VOLUNTEER },
      "GET /api/requests/mine": { body: { requests: [] } },
      "GET /api/events": { body: { events: [] } },
      [`POST /api/requests/${REQUEST_ID}/accept`]: {
        status: 409,
        body: { error: { code: "CONFLICT", message: "Already taken" } },
      },
    });
    signInAs(VOLUNTEER.id);
    const { result } = renderHook(() => useAcceptedTasks(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const err = await result.current.accept(opportunity()).catch((e: unknown) => e);
    expect(err).toMatchObject({ code: "CONFLICT", message: "Already taken" });
    expect(result.current.tasks).toHaveLength(0);
  });

  it("keeps requests when the events call fails and reports the error", async () => {
    installFakeApi({
      "GET /api/me": { body: VOLUNTEER },
      "GET /api/requests/mine": { body: { requests: [makeRequest({ status: "matched" })] } },
      "GET /api/events": {
        status: 500,
        body: { error: { code: "INTERNAL", message: "Events are down" } },
      },
    });
    signInAs(VOLUNTEER.id);
    const { result } = renderHook(() => useAcceptedTasks(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.error).toBe("Events are down");
  });
});
