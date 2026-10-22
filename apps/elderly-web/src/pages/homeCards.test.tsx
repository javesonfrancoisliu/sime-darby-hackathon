import { beforeEach, describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "../test/renderRoute";
import { installFakeApi, signInAs } from "../test/fakeApi";
import { SafetyReading } from "@sdh/contracts";
import { malaysiaToday } from "../requests/schedule";
import { ELDER, POINTS, STREAK } from "../test/fixtures";

beforeEach(() => signInAs());

const homeRoutes = {
  "GET /api/requests/mine": { body: { requests: [] } },
  "GET /api/me/points": { body: POINTS(260) },
  "GET /api/me/streak": { body: STREAK },
};

describe("Home Community Play card", () => {
  it("shows live points and streak", async () => {
    installFakeApi(homeRoutes);
    await renderApp("/");
    const card = (await screen.findByRole("heading", { name: "Community Play" })).closest(
      ".app-cta-card",
    ) as HTMLElement;
    expect(await within(card).findByText("260")).toBeInTheDocument();
    expect(within(card).getByText("3")).toBeInTheDocument();
    expect(within(card).getByText("day streak")).toBeInTheDocument();
  });

  it("keeps the buttons and the rest of Home when points fail to load", async () => {
    installFakeApi({ ...homeRoutes, "GET /api/me/points": { status: 500, body: {} } });
    await renderApp("/");
    const card = (await screen.findByRole("heading", { name: "Community Play" })).closest(
      ".app-cta-card",
    ) as HTMLElement;
    expect(await within(card).findByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "I’m Okay!" })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Request help/ })).toBeInTheDocument();
  });

  it("opens the rewards tab", async () => {
    installFakeApi({
      ...homeRoutes,
      "GET /api/challenges": { body: { challenges: [] } },
      "GET /api/rewards": { body: { rewards: [] } },
      "GET /api/badges": { body: { badges: [] } },
    });
    await renderApp("/");
    await userEvent.click(await screen.findByRole("button", { name: "Goals and rewards" }));
    expect(await screen.findByRole("tab", { name: /Rewards/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("checks in from Home with the same API call as Play and shows the done state", async () => {
    const { calls } = installFakeApi({
      ...homeRoutes,
      "POST /api/me/check-in": {
        body: {
          streak: {
            current: 4,
            best: 5,
            lastCheckInDate: malaysiaToday(),
            recent: [malaysiaToday()],
          },
          pointsAwarded: 10,
          points: 270,
        },
      },
    });
    await renderApp("/");
    await userEvent.click(await screen.findByRole("button", { name: "I’m Okay!" }));
    const done = await screen.findByRole("button", { name: /You are okay today/ });
    expect(done).toBeDisabled();
    expect(calls.filter((c) => c.method === "POST" && c.path === "/api/me/check-in")).toHaveLength(
      1,
    );
    expect(screen.getByText("270")).toBeInTheDocument();
    expect(window.location.hash).not.toBe("#rewards");
  });

  it("shows the done state on load when already checked in today", async () => {
    installFakeApi({
      ...homeRoutes,
      "GET /api/me/streak": {
        body: { current: 4, best: 5, recent: [malaysiaToday()] },
      },
    });
    await renderApp("/");
    expect(await screen.findByRole("button", { name: /You are okay today/ })).toBeDisabled();
  });
});

describe("Home Around the township card", () => {
  it("opens volunteering and notices in Community", async () => {
    installFakeApi({
      ...homeRoutes,
      "GET /api/events": { body: { events: [] } },
      "GET /api/notices": { body: { notices: [] } },
    });
    await renderApp("/");
    expect(await screen.findByRole("heading", { name: "Around the township" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Volunteering" }));
    expect(await screen.findByRole("tab", { name: "Volunteer" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await userEvent.click(screen.getByRole("button", { name: "Home" }));
    await userEvent.click(await screen.findByRole("button", { name: "Notices" }));
    expect(await screen.findByRole("tab", { name: "Notices" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});

describe("Home hazard cards area matching", () => {
  const reading = (area: string, value: number) =>
    SafetyReading.parse({
      type: "air",
      area,
      value,
      unit: "API",
      level: "good",
      advice: "Fine.",
      measuredAt: "2026-10-01T09:00:00+08:00",
    });
  const safetyBody = (resident: string) => ({
    ...homeRoutes,
    "GET /api/me": { body: { ...ELDER, area: resident } },
    "GET /api/safety": {
      body: {
        readings: [reading("Central Park", 55), reading("Elmina West", 42)],
        facilityReports: [],
      },
    },
  });

  it("shows the precinct reading for a street-level resident area", async () => {
    installFakeApi(safetyBody("Block A, Elmina West"));
    await renderApp("/");
    expect(await screen.findByText("42")).toBeInTheDocument();
    expect(screen.queryByText(/Nearest reading/)).not.toBeInTheDocument();
  });

  it("labels the card as the nearest reading when no precinct matches", async () => {
    installFakeApi(safetyBody("Elmina East"));
    await renderApp("/");
    expect(await screen.findByText("Nearest reading: Central Park")).toBeInTheDocument();
  });
});
