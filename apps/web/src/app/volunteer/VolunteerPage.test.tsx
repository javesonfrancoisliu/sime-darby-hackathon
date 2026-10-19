import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { installFakeApi, signInAs } from "../../test/fakeApi";
import {
  makeRequest,
  makeRequestOpportunity,
  NO_CONTRIBUTIONS,
  PENDING_VOLUNTEER,
  VOLUNTEER,
} from "../../test/fixtures";
import { renderApp } from "../../test/renderApp";

const REQUEST_ID = makeRequest().id;

const baseRoutes = {
  "GET /api/me": { body: VOLUNTEER },
  "GET /api/events": { body: { events: [] } },
  "GET /api/requests/mine": { body: { requests: [] } },
  "GET /api/opportunities": { body: { items: [makeRequestOpportunity()] } },
  "GET /api/contributions/mine": { body: NO_CONTRIBUTIONS },
};

describe("volunteer page", () => {
  // jsdom has no geolocation; give the page one so the button logic is exercised.
  beforeEach(() => {
    Object.defineProperty(navigator, "geolocation", {
      value: { getCurrentPosition: vi.fn() },
      configurable: true,
    });
  });
  afterEach(() => {
    Reflect.deleteProperty(navigator, "geolocation");
  });

  it("shows a pending-verification state instead of a generic error", async () => {
    installFakeApi({
      ...baseRoutes,
      "GET /api/me": { body: PENDING_VOLUNTEER },
      "GET /api/opportunities": {
        status: 403,
        body: {
          error: { code: "FORBIDDEN", message: "Your volunteer profile is not verified yet" },
        },
      },
    });
    signInAs(PENDING_VOLUNTEER.id);
    renderApp("/volunteer");

    expect(
      await screen.findByText("Your volunteer profile is waiting for approval"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Couldn't load/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See community events" })).toHaveAttribute(
      "href",
      "/community",
    );
  });

  it("keeps the accepted tasks visible when the feed fails", async () => {
    installFakeApi({
      ...baseRoutes,
      "GET /api/requests/mine": {
        body: { requests: [makeRequest({ status: "matched", title: "Already mine" })] },
      },
      "GET /api/opportunities": {
        status: 500,
        body: { error: { code: "INTERNAL", message: "Feed is down" } },
      },
    });
    signInAs(VOLUNTEER.id);
    renderApp("/volunteer");

    expect(await screen.findByText("Couldn't load opportunities")).toBeInTheDocument();
    expect(screen.getByText("Feed is down")).toBeInTheDocument();
    expect(screen.getByLabelText("Accepted task: Already mine")).toBeInTheDocument();
  });

  it("keeps the feed when the accepted tasks fail", async () => {
    installFakeApi({
      ...baseRoutes,
      "GET /api/requests/mine": {
        status: 500,
        body: { error: { code: "INTERNAL", message: "Tasks are down" } },
      },
    });
    signInAs(VOLUNTEER.id);
    renderApp("/volunteer");

    expect(await screen.findByText("Couldn't load your accepted tasks")).toBeInTheDocument();
    expect(screen.getByLabelText("Opportunity: Groceries")).toBeInTheDocument();
  });

  it("uses server distances and hides the device location button when signed in", async () => {
    installFakeApi(baseRoutes);
    signInAs(VOLUNTEER.id);
    renderApp("/volunteer");

    const card = await screen.findByLabelText("Opportunity: Groceries");
    expect(within(card).getByText(/1.5 km away/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Use my location/ })).not.toBeInTheDocument();
  });

  it("moves a demo card from Urgent to Started as the clock passes its start time", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    try {
      installFakeApi();
      renderApp("/volunteer");
      const card = await screen.findByLabelText("Opportunity: Weekly grocery run");
      expect(within(card).getByText("Urgent")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(4 * 3_600_000);
      });
      expect(within(card).getByText("Started")).toBeInTheDocument();
      expect(within(card).queryByText("Urgent")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("offers the device location only on the signed-out demo", async () => {
    installFakeApi();
    renderApp("/volunteer");
    expect(await screen.findByRole("button", { name: /Use my location/ })).toBeInTheDocument();
  });

  it("confirms an accept only after the task is listed and the card is gone", async () => {
    let accepted = false;
    installFakeApi({
      ...baseRoutes,
      "GET /api/opportunities": () => ({
        body: { items: accepted ? [] : [makeRequestOpportunity()] },
      }),
      "GET /api/requests/mine": () => ({
        body: { requests: accepted ? [makeRequest({ status: "matched" })] : [] },
      }),
      [`POST /api/requests/${REQUEST_ID}/accept`]: () => {
        accepted = true;
        return { body: makeRequest({ status: "matched" }) };
      },
    });
    signInAs(VOLUNTEER.id);
    renderApp("/volunteer");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Accept & help" }));
    const dialog = await screen.findByRole("dialog", { name: "Thanks for stepping up" });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByLabelText("Accepted task: Groceries")).toBeInTheDocument();
    expect(screen.queryByLabelText("Opportunity: Groceries")).not.toBeInTheDocument();
  });

  it("shows the API message when accept is refused", async () => {
    installFakeApi({
      ...baseRoutes,
      [`POST /api/requests/${REQUEST_ID}/accept`]: {
        status: 409,
        body: { error: { code: "CONFLICT", message: "Someone else just took this" } },
      },
    });
    signInAs(VOLUNTEER.id);
    renderApp("/volunteer");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Accept & help" }));
    expect(await screen.findByText("Someone else just took this")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "OK" })).toBeEnabled());
  });
});
