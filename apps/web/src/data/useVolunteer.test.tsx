import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { installFakeApi, signInAs } from "../test/fakeApi";
import {
  makeEvent,
  makeRequestOpportunity,
  NO_CONTRIBUTIONS,
  PENDING_VOLUNTEER,
  VOLUNTEER,
} from "../test/fixtures";
import { sessionWrapper } from "../test/wrapper";
import { useVolunteerData } from "./useVolunteer";

const HOUR_MS = 3_600_000;

describe("useVolunteerData", () => {
  it("serves labelled demo data without calling the API when signed out", () => {
    const { fetchMock } = installFakeApi();
    const { result } = renderHook(() => useVolunteerData(), { wrapper: sessionWrapper });
    expect(result.current.live).toBe(false);
    expect(result.current.opportunities.length).toBeGreaterThan(0);
    expect(result.current.opportunities.every((o) => o.isDemoData)).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps requests and events from the API", async () => {
    const soon = new Date(Date.now() + 5 * HOUR_MS).toISOString();
    const later = new Date(Date.now() + 100 * HOUR_MS).toISOString();
    installFakeApi({
      "GET /api/me": { body: VOLUNTEER },
      "GET /api/opportunities": {
        body: {
          items: [
            makeRequestOpportunity({ scheduledAt: soon, distanceKm: 2.5 }),
            {
              kind: "event",
              matchScore: 60,
              reasons: [],
              distanceKm: 4,
              event: makeEvent({ startsAt: later }),
            },
          ],
        },
      },
      "GET /api/contributions/mine": {
        body: {
          totalMinutes: 90,
          completedCount: 2,
          items: [],
        },
      },
    });
    signInAs(VOLUNTEER.id);
    const { result } = renderHook(() => useVolunteerData(), { wrapper: sessionWrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const [request, event] = result.current.opportunities;
    expect(request).toMatchObject({
      kind: "request",
      distanceKm: 2.5,
      urgency: "high",
      isDemoData: false,
    });
    expect(event).toMatchObject({ kind: "event", distanceKm: 4, urgency: "low" });
    expect(event?.coords).toEqual({ lat: 3.2, lng: 101.5 });
    expect(result.current.impact).toMatchObject({ totalMinutes: 90, completedCount: 2 });
    expect(result.current.live).toBe(true);
  });

  it("flags an unverified volunteer instead of reporting an error", async () => {
    installFakeApi({
      "GET /api/me": { body: PENDING_VOLUNTEER },
      "GET /api/opportunities": {
        status: 403,
        body: {
          error: { code: "FORBIDDEN", message: "Your volunteer profile is not verified yet" },
        },
      },
      "GET /api/contributions/mine": { body: NO_CONTRIBUTIONS },
    });
    signInAs(PENDING_VOLUNTEER.id);
    const { result } = renderHook(() => useVolunteerData(), { wrapper: sessionWrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.notVerified).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.impactError).toBeNull();
  });

  it("keeps the feed when only the hours call fails", async () => {
    installFakeApi({
      "GET /api/me": { body: VOLUNTEER },
      "GET /api/opportunities": { body: { items: [makeRequestOpportunity()] } },
      "GET /api/contributions/mine": {
        status: 500,
        body: { error: { code: "INTERNAL", message: "Hours are down" } },
      },
    });
    signInAs(VOLUNTEER.id);
    const { result } = renderHook(() => useVolunteerData(), { wrapper: sessionWrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.opportunities).toHaveLength(1);
    expect(result.current.error).toBeNull();
    expect(result.current.impactError).toBe("Hours are down");
  });

  it("reports a feed error without falling back to demo data", async () => {
    installFakeApi({
      "GET /api/me": { body: VOLUNTEER },
      "GET /api/opportunities": {
        status: 500,
        body: { error: { code: "INTERNAL", message: "Feed is down" } },
      },
      "GET /api/contributions/mine": { body: NO_CONTRIBUTIONS },
    });
    signInAs(VOLUNTEER.id);
    const { result } = renderHook(() => useVolunteerData(), { wrapper: sessionWrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Feed is down");
    expect(result.current.opportunities).toEqual([]);
  });

  it("keeps the list on screen during a reload", async () => {
    let calls = 0;
    installFakeApi({
      "GET /api/me": { body: VOLUNTEER },
      "GET /api/opportunities": () => {
        calls += 1;
        return { body: { items: [makeRequestOpportunity()] } };
      },
      "GET /api/contributions/mine": { body: NO_CONTRIBUTIONS },
    });
    signInAs(VOLUNTEER.id);
    const { result } = renderHook(() => useVolunteerData(), { wrapper: sessionWrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const pending = result.current.reload();
    expect(result.current.loading).toBe(false);
    expect(result.current.opportunities).toHaveLength(1);
    await pending;
    expect(calls).toBe(2);
    vi.restoreAllMocks();
  });
});
