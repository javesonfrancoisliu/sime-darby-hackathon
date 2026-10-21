import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { installFakeApi, signInAs } from "../test/fakeApi";
import {
  ELDER,
  makeDrive,
  makeEvent,
  makeMaintenance,
  makeNotice,
  SAFETY,
  VOLUNTEER,
} from "../test/fixtures";
import { renderApp } from "../test/renderApp";
import { signedInRoutes } from "../test/routes";

describe("home page", () => {
  it("names the township from the API and shows the latest live updates", async () => {
    installFakeApi(
      signedInRoutes(VOLUNTEER, {
        "GET /api/notices": { body: { items: [makeNotice()] } },
        "GET /api/events": { body: { events: [makeEvent({ title: "Live tea morning" })] } },
        "GET /api/safety": { body: SAFETY },
      }),
    );
    signInAs(VOLUNTEER.id);
    renderApp("/");

    expect(await screen.findByRole("heading", { name: "Welcome to Elmina" })).toBeInTheDocument();
    const community = await screen.findByLabelText("Latest community updates");
    expect(await within(community).findByText("New recycling hours")).toBeInTheDocument();
    expect(within(community).getByText("Live tea morning")).toBeInTheDocument();

    const safety = screen.getByLabelText("Safety summary for Elmina");
    // Readings render as the elderly-style "Township Live Conditions" carousel:
    // each card shows a big value + unit, a reading title and its area.
    expect(await within(safety).findByText("Township Live Conditions")).toBeInTheDocument();
    expect(within(safety).getByText("62")).toBeInTheDocument();
    expect(within(safety).getByText("AQI")).toBeInTheDocument();
    expect(within(safety).getByText("Air quality")).toBeInTheDocument();
    expect(within(safety).getByText("34°C")).toBeInTheDocument();
    // Each card names its area and when it was measured.
    expect(within(safety).getAllByText(/^Updated /).length).toBeGreaterThan(0);
    expect(within(safety).getByRole("link", { name: "All hazards" })).toHaveAttribute(
      "href",
      "/safety",
    );
    expect(
      within(community).getAllByRole("link", { name: /New recycling hours/ })[0],
    ).toHaveAttribute("href", "/community?tab=updates");
  });

  it("labels each update with its category and opens that Community tab", async () => {
    installFakeApi(
      signedInRoutes(VOLUNTEER, {
        "GET /api/notices": {
          body: {
            items: [
              makeNotice({ title: "Township note", publishedAt: "2026-10-20T09:00:00Z" }),
              makeMaintenance({ title: "Pipe repair", publishedAt: "2026-10-19T09:00:00Z" }),
            ],
          },
        },
        "GET /api/events": {
          body: {
            events: [
              makeEvent({ title: "Tea morning", createdAt: "2026-10-18T09:00:00Z" }),
              makeDrive({ title: "Park drive", createdAt: "2026-10-17T09:00:00Z" }),
            ],
          },
        },
      }),
    );
    signInAs(VOLUNTEER.id);
    renderApp("/");

    const community = await screen.findByLabelText("Latest community updates");
    const expected = [
      ["Township note", "Updates", "/community?tab=updates"],
      ["Pipe repair", "Notices", "/community?tab=notices"],
      ["Tea morning", "Events", "/community?tab=events"],
    ] as const;
    for (const [title, chip, href] of expected) {
      const link = await within(community).findByRole("link", { name: new RegExp(title) });
      expect(link).toHaveAttribute("href", href);
      expect(within(link).getByText(chip)).toBeInTheDocument();
    }
  });

  it("offers Community Challenges below Help a neighbour with deep links for a young resident", async () => {
    const { calls } = installFakeApi(signedInRoutes(VOLUNTEER));
    signInAs(VOLUNTEER.id);
    renderApp("/");

    const card = await screen.findByLabelText("Community Challenges card");
    const help = screen.getByLabelText("Help a neighbour");
    expect(help.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(card).getByRole("link", { name: "Open challenges" })).toHaveAttribute(
      "href",
      "/community/challenges",
    );
    expect(within(card).getByRole("link", { name: "Rankings" })).toHaveAttribute(
      "href",
      "/community/challenges?tab=leaderboard",
    );
    expect(within(card).getByRole("link", { name: "Badges" })).toHaveAttribute(
      "href",
      "/community/challenges?tab=badges",
    );
    expect(within(card).getByRole("link", { name: "Rewards" })).toHaveAttribute(
      "href",
      "/community/challenges?tab=rewards",
    );
    // No points are shown, so Home makes no extra request for them.
    expect(calls.some((c) => c.path.startsWith("/api/me/points"))).toBe(false);
  });

  it("opens the matching Challenges tab from a shortcut", async () => {
    installFakeApi(signedInRoutes(VOLUNTEER));
    signInAs(VOLUNTEER.id);
    renderApp("/");
    const user = userEvent.setup();

    const card = await screen.findByLabelText("Community Challenges card");
    await user.click(within(card).getByRole("link", { name: "Badges" }));
    expect(await screen.findByRole("tab", { name: "Badges" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("does not show Community Challenges to an elderly resident", async () => {
    installFakeApi(signedInRoutes(ELDER as typeof VOLUNTEER));
    signInAs(ELDER.id);
    renderApp("/");
    await screen.findByRole("heading", { name: "Welcome to Elmina" });
    expect(screen.queryByLabelText("Community Challenges card")).not.toBeInTheDocument();
  });

  it("shows empty and error states instead of invented content", async () => {
    installFakeApi(
      signedInRoutes(VOLUNTEER, {
        "GET /api/safety": {
          status: 500,
          body: { error: { code: "INTERNAL", message: "Sensors are down" } },
        },
      }),
    );
    signInAs(VOLUNTEER.id);
    renderApp("/");

    expect(await screen.findByText("Nothing new yet")).toBeInTheDocument();
    expect(await screen.findByText("Couldn't load safety readings")).toBeInTheDocument();
  });

  it("keeps Safety reachable from the live conditions link and Profile, with no header button", async () => {
    installFakeApi(signedInRoutes(VOLUNTEER, { "GET /api/safety": { body: SAFETY } }));
    signInAs(VOLUNTEER.id);
    renderApp("/");

    const header = (await screen.findByRole("heading", { name: "Welcome to Elmina" })).closest(
      "header",
    ) as HTMLElement;
    expect(within(header).queryByRole("link", { name: "Safety" })).not.toBeInTheDocument();
    const safety = screen.getByLabelText("Safety summary for Elmina");
    expect(within(safety).getByRole("link", { name: "All hazards" })).toHaveAttribute(
      "href",
      "/safety",
    );
    const nav = within(screen.getAllByRole("navigation", { name: "Primary" }).at(-1)!);
    expect(nav.queryByRole("link", { name: "Safety" })).not.toBeInTheDocument();
    // The live conditions link opens the existing Safety page.
    await userEvent.setup().click(within(safety).getByRole("link", { name: "All hazards" }));
    expect(await screen.findByRole("heading", { name: "Health & Safety" })).toBeInTheDocument();
  });
});
