import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { installFakeApi, signInAs } from "../../test/fakeApi";
import {
  makeEvent,
  makePoints,
  makeRequest,
  makeRequestOpportunity,
  PENDING_VOLUNTEER,
  VOLUNTEER,
} from "../../test/fixtures";
import { renderApp } from "../../test/renderApp";
import { signedInRoutes } from "../../test/routes";

const REQUEST_ID = makeRequest().id;

const baseRoutes = signedInRoutes(VOLUNTEER, {
  "GET /api/opportunities": {
    body: {
      items: [{ ...makeRequestOpportunity(), reasons: ["Close to you", "About 1.5 km away"] }],
    },
  },
});

describe("volunteer page", () => {
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

  it("uses server distances", async () => {
    installFakeApi(baseRoutes);
    signInAs(VOLUNTEER.id);
    renderApp("/volunteer");

    const card = await screen.findByLabelText("Opportunity: Groceries");
    expect(within(card).getAllByText(/km away/)).toHaveLength(1);
    expect(within(card).getByText(/1.5 km away/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Use my location/ })).not.toBeInTheDocument();
  });

  it("expands opportunity details and independently reveals matching reasons", async () => {
    installFakeApi(baseRoutes);
    signInAs(VOLUNTEER.id);
    renderApp("/volunteer");
    const user = userEvent.setup();
    const card = await screen.findByLabelText("Opportunity: Groceries");
    const toggle = within(card).getByRole("button", { name: "Groceries. Show details" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(within(card).queryByRole("button", { name: "View details" })).not.toBeInTheDocument();
    expect(within(card).queryByText("Flexible")).not.toBeInTheDocument();
    expect(within(card).queryByText("Soon")).not.toBeInTheDocument();
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const match = within(card).getByRole("button", { name: /Why this matches you/ });
    await user.click(match);
    const reasons = within(card).getByRole("region", { name: "Why this matches you" });
    expect(within(reasons).getByText("Close to you")).toBeInTheDocument();
    expect(match).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    await user.click(match);
    expect(
      within(card).queryByRole("region", { name: "Why this matches you" }),
    ).not.toBeInTheDocument();
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(within(card).getByRole("button", { name: "Accept & help" })).toBeVisible();
  });

  it("highlights urgent opportunities without an urgency pill", async () => {
    const opportunity = makeRequestOpportunity();
    if (opportunity.kind !== "request") throw new Error("Expected a request fixture");
    opportunity.request.scheduledAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    installFakeApi({ ...baseRoutes, "GET /api/opportunities": { body: { items: [opportunity] } } });
    signInAs(VOLUNTEER.id);
    renderApp("/volunteer");
    const card = await screen.findByLabelText("Opportunity: Groceries. Urgent");
    expect(card).toHaveClass("opportunity-card--urgent");
    expect(within(card).queryByText("Urgent")).not.toBeInTheDocument();
  });

  it("distinguishes date ordering from urgency groups and matching", async () => {
    const atHours = (hours: number) => new Date(Date.now() + hours * 3600000).toISOString();
    const earlier = {
      ...makeRequestOpportunity({ title: "Earlier request", scheduledAt: atHours(5) }),
      matchScore: 50,
    };
    const betterFit = {
      ...makeRequestOpportunity({
        id: "0a1b2c3d-1111-4111-8111-000000000099",
        title: "Better fit request",
        scheduledAt: atHours(15),
      }),
      matchScore: 95,
    };
    installFakeApi({
      ...baseRoutes,
      "GET /api/opportunities": { body: { items: [earlier, betterFit] } },
    });
    signInAs(VOLUNTEER.id);
    renderApp("/volunteer");
    const user = userEvent.setup();
    const sort = await screen.findByRole("combobox", { name: "Sort by" });
    await screen.findByLabelText("Opportunity: Earlier request. Urgent");
    await user.selectOptions(sort, "soonest");
    let cards = screen.getAllByLabelText(/^Opportunity:/);
    expect(cards[0]).toHaveAttribute("aria-label", "Opportunity: Earlier request. Urgent");
    await user.selectOptions(sort, "urgent");
    cards = screen.getAllByLabelText(/^Opportunity:/);
    expect(cards[0]).toHaveAttribute("aria-label", "Opportunity: Better fit request. Urgent");
    expect(cards.every((card) => card.classList.contains("opportunity-card--urgent"))).toBe(true);
  });

  it("confirms event completion and persists it through the attendance endpoint", async () => {
    let completed = false;
    const event = makeEvent({ joined: true });
    const { calls } = installFakeApi({
      ...baseRoutes,
      "GET /api/events": () => ({
        body: {
          events: [
            { ...event, attendanceCompletedAt: completed ? new Date().toISOString() : undefined },
          ],
        },
      }),
      [`POST /api/events/${event.id}/attendance/complete`]: () => {
        completed = true;
        return { body: { ...event, attendanceCompletedAt: new Date().toISOString() } };
      },
    });
    signInAs(VOLUNTEER.id);
    renderApp("/volunteer");
    const user = userEvent.setup();
    const card = await screen.findByLabelText(`Accepted task: ${event.title}`);
    expect(within(card).queryByText(/organiser closes/)).not.toBeInTheDocument();
    await user.click(within(card).getByRole("button", { name: "Confirm completion" }));
    await user.click(screen.getByRole("button", { name: "Not yet" }));
    expect(calls.some((call) => call.method === "POST")).toBe(false);
    await user.click(within(card).getByRole("button", { name: "Confirm completion" }));
    await user.click(screen.getByRole("button", { name: "Yes, completed" }));
    expect(await screen.findByRole("dialog", { name: "Marked as completed" })).toBeInTheDocument();
    expect(
      within(screen.getByLabelText(`Accepted task: ${event.title}`)).getByText("Completed"),
    ).toBeInTheDocument();
    expect(
      calls.some(
        (call) =>
          call.path === `/api/events/${event.id}/attendance/complete` && call.method === "POST",
      ),
    ).toBe(true);
  });

  it("asks a signed-out visitor to sign in", async () => {
    installFakeApi();
    renderApp("/volunteer");
    expect(await screen.findByText("Please sign in")).toBeInTheDocument();
  });

  it("says a completed task is waiting for the resident and offers no confirm button", async () => {
    installFakeApi({
      ...baseRoutes,
      "GET /api/requests/mine": {
        body: { requests: [makeRequest({ status: "completed", title: "Done, unconfirmed" })] },
      },
    });
    signInAs(VOLUNTEER.id);
    renderApp("/volunteer");

    const card = await screen.findByLabelText("Accepted task: Done, unconfirmed");
    expect(within(card).getByText("Waiting for the resident to confirm")).toBeInTheDocument();
    expect(within(card).queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText(/Confirm \(Demo\)/)).not.toBeInTheDocument();
  });

  it("shows the points the server awarded once the resident has confirmed", async () => {
    const request = makeRequest({
      status: "completed",
      title: "Done and confirmed",
      confirmedAt: "2026-10-21T10:00:00+08:00",
    });
    installFakeApi({
      ...baseRoutes,
      "GET /api/requests/mine": { body: { requests: [request] } },
      "GET /api/me/points": {
        body: makePoints(60, [
          {
            awardKey: `volunteering:${request.id}`,
            sourceType: "volunteering",
            sourceId: request.id,
            points: 60,
            title: "Done and confirmed",
            awardedAt: "2026-10-21T02:00:00Z",
          },
        ]),
      },
    });
    signInAs(VOLUNTEER.id);
    renderApp("/volunteer");

    const card = await screen.findByLabelText("Accepted task: Done and confirmed");
    expect(
      await within(card).findByText("Confirmed by the resident, +60 points"),
    ).toBeInTheDocument();
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

    // Details expand inline; the accept action stays visible.
    await user.click(await screen.findByRole("button", { name: "Groceries. Show details" }));
    await user.click(await screen.findByRole("button", { name: "Accept & help" }));
    // A yes/no confirmation now precedes the accept.
    await user.click(await screen.findByRole("button", { name: "Yes, accept" }));
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

    await user.click(await screen.findByRole("button", { name: "Groceries. Show details" }));
    await user.click(await screen.findByRole("button", { name: "Accept & help" }));
    await user.click(await screen.findByRole("button", { name: "Yes, accept" }));
    expect(await screen.findByText("Someone else just took this")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "OK" })).toBeEnabled());
  });
});
