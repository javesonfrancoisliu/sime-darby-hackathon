import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ELDER, VOLUNTEER } from "./test/fixtures";
import { installFakeApi, signInAs } from "./test/fakeApi";
import { renderApp } from "./test/renderApp";
import { signedInRoutes } from "./test/routes";

const liveRoutes = (user: typeof VOLUNTEER | typeof ELDER) => signedInRoutes(user);

describe("session wiring", () => {
  it("keeps the navigation on screen while the signed-in user loads", async () => {
    installFakeApi({ ...liveRoutes(VOLUNTEER), "GET /api/me": () => new Promise(() => {}) });
    signInAs(VOLUNTEER.id);
    renderApp("/");

    expect(await screen.findByRole("status", { name: "Signing in" })).toBeInTheDocument();
    expect(screen.getAllByRole("navigation", { name: "Primary" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /Township Connect/ })).toBeInTheDocument();
  });

  it("sends the signed-in user id on live calls", async () => {
    const { calls } = installFakeApi(liveRoutes(VOLUNTEER));
    signInAs(VOLUNTEER.id);
    renderApp("/volunteer");

    expect(await screen.findByRole("heading", { name: "Volunteer nearby" })).toBeInTheDocument();
    const live = calls.filter((c) => c.path === "/api/opportunities");
    expect(live.length).toBeGreaterThan(0);
    expect(live.every((c) => c.headers["x-demo-user"] === VOLUNTEER.id)).toBe(true);
  });

  it("shows the signed-out profile when the stored user no longer exists", async () => {
    installFakeApi({
      "GET /api/me": { status: 401, body: { error: { code: "UNAUTHENTICATED", message: "No" } } },
      "GET /api/events": { body: { events: [] } },
    });
    signInAs(VOLUNTEER.id);
    renderApp("/profile");

    expect(await screen.findByRole("heading", { name: "Profile" })).toBeInTheDocument();
    expect(window.localStorage.getItem("tc.demoUserId")).toBeNull();
  });
});

describe("YoungOnly role gating", () => {
  it("lets a volunteer open the volunteer page", async () => {
    installFakeApi(liveRoutes(VOLUNTEER));
    signInAs(VOLUNTEER.id);
    renderApp("/volunteer");
    expect(await screen.findByRole("heading", { name: "Volunteer nearby" })).toBeInTheDocument();
  });

  it("sends a resident from the volunteer page to Community", async () => {
    installFakeApi(liveRoutes(ELDER));
    signInAs(ELDER.id);
    renderApp("/volunteer");
    expect(await screen.findByRole("heading", { name: "Neighbourhood Hub" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Volunteer nearby" })).not.toBeInTheDocument();
  });

  it("sends a resident from the challenges page to Community", async () => {
    installFakeApi(liveRoutes(ELDER));
    signInAs(ELDER.id);
    renderApp("/community/challenges");
    expect(await screen.findByRole("heading", { name: "Neighbourhood Hub" })).toBeInTheDocument();
  });

  it("does not show a resident the Volunteer link", async () => {
    installFakeApi(liveRoutes(ELDER));
    signInAs(ELDER.id);
    renderApp("/community");
    await screen.findByRole("heading", { name: "Neighbourhood Hub" });
    expect(screen.queryByRole("link", { name: "Volunteer" })).not.toBeInTheDocument();
  });
});
