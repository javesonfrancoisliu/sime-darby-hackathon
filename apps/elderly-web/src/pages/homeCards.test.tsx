import { beforeEach, describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "../test/renderRoute";
import { installFakeApi, signInAs } from "../test/fakeApi";
import { POINTS, STREAK } from "../test/fixtures";

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
    expect(within(card).getByRole("button", { name: "I am okay" })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Request help/ })).toBeInTheDocument();
  });

  it("opens the check-in and the rewards tab", async () => {
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
    await userEvent.click(screen.getByRole("button", { name: "Home" }));
    await userEvent.click(await screen.findByRole("button", { name: "I am okay" }));
    expect(await screen.findByRole("tab", { name: /Streak/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
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
