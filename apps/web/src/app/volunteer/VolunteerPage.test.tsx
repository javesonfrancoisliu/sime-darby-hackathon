import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { installFakeApi, signInAs } from "../../test/fakeApi";
import {
  makeEvent,
  makeDrive,
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
  it("excludes community volunteer drives from the feed and accepted tasks", async () => {
    const drive = makeDrive({ title: "Neighbour volunteer drive", joined: true });
    installFakeApi({
      ...baseRoutes,
      "GET /api/opportunities": {
        body: {
          items: [
            {
              ...makeRequestOpportunity(),
              matchScore: 97,
              matchSource: "ai",
              explanationSource: "ai",
              reasons: ["Your grocery skills suit this nearby request."],
            },
            { kind: "event", event: drive, distanceKm: 1, matchScore: 60, reasons: [] },
          ],
        },
      },
      "GET /api/events": { body: { events: [drive] } },
    });
    signInAs(VOLUNTEER.id);
    renderApp("/volunteer");
    const card = await screen.findByLabelText("Opportunity: Groceries");
    await userEvent.click(within(card).getByRole("button", { name: /97% match/ }));
    expect(within(card).getByText("Claude explanation")).toBeVisible();
    expect(within(card).getByText("Your grocery skills suit this nearby request.")).toBeVisible();
    expect(within(card).getByRole("button", { name: "Accept & help" })).toBeVisible();
    expect(screen.queryByText(drive.title)).not.toBeInTheDocument();
    expect(screen.getAllByLabelText(/^Opportunity:/)).toHaveLength(1);
  });
  it("keeps ordinary community activities out of the opportunity feed", async () => {
    const event = makeEvent({ title: "Community tea morning", joined: false });
    installFakeApi({
      ...baseRoutes,
      "GET /api/opportunities": {
        body: {
          items: [
            makeRequestOpportunity(),
            {
              kind: "event",
              event,
              distanceKm: 0.5,
              matchScore: 97,
              reasons: ["About 0.5 km away"],
              matchSource: "rules",
            },
          ],
        },
      },
      "GET /api/events": { body: { events: [event] } },
    });
    signInAs(VOLUNTEER.id);
    renderApp("/volunteer");
    const request = await screen.findByLabelText("Opportunity: Groceries");
    expect(
      within(request).getByRole("button", { name: /match. Why this matches you/ }),
    ).toBeVisible();
    expect(screen.queryByText("Community tea morning")).not.toBeInTheDocument();
    expect(screen.getAllByLabelText(/^Opportunity:/)).toHaveLength(1);
  });
  it("respects personalized AI order instead of overwriting it with the numeric baseline", async () => {
    const first = {
      ...makeRequestOpportunity({ title: "Contextually best", distanceKm: 2 }),
      matchScore: 70,
      matchRank: 1,
      matchSource: "ai",
      explanationSource: "ai",
      reasons: ["Relevant grocery experience fits carrying bags."],
    };
    const second = {
      ...makeRequestOpportunity({
        id: "00000000-0000-4000-8000-000000000088",
        title: "Closer general task",
        distanceKm: 0.5,
      }),
      matchScore: 97,
      matchRank: 2,
      matchSource: "ai",
    };
    installFakeApi({
      ...baseRoutes,
      "GET /api/opportunities": { body: { items: [first, second] } },
    });
    signInAs(VOLUNTEER.id);
    renderApp("/volunteer");
    await screen.findByText("Contextually best");
    const cards = () => screen.getAllByLabelText(/^Opportunity:/);
    expect(cards()[0]).toHaveAccessibleName(/Contextually best/);
    expect(screen.getAllByText("AI-assisted")).toHaveLength(2);
    await userEvent.click(screen.getByRole("button", { name: /70% match/ }));
    expect(screen.getByText("Relevant grocery experience fits carrying bags.")).toBeInTheDocument();
    expect(screen.getByText("Claude explanation")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /70% match/ })).toHaveAttribute(
      "title",
      expect.stringContaining("skills (50%)"),
    );
    expect(screen.queryByText(/Your score combines/)).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Sort by" }), "nearest");
    expect(cards()[0]).toHaveAccessibleName(/Closer general task/);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Sort by" }), "best_match");
    expect(cards()[0]).toHaveAccessibleName(/Contextually best/);
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
    expect(within(card).queryByText("Personalized rules")).not.toBeInTheDocument();
    await user.click(match);
    const reasons = within(card).getByRole("region", { name: "Why this matches you" });
    expect(within(reasons).getByText(/Close to you/)).toBeInTheDocument();
    expect(within(reasons).getByText("Personalized rules")).toBeInTheDocument();
    expect(within(reasons).queryByText(/50%/)).not.toBeInTheDocument();
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

  it("highlights urgent opportunities with an Urgent text label", async () => {
    const opportunity = makeRequestOpportunity();
    if (opportunity.kind !== "request") throw new Error("Expected a request fixture");
    opportunity.request.scheduledAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    installFakeApi({ ...baseRoutes, "GET /api/opportunities": { body: { items: [opportunity] } } });
    signInAs(VOLUNTEER.id);
    renderApp("/volunteer");
    const card = await screen.findByLabelText("Opportunity: Groceries. Urgent");
    expect(card).toHaveClass("opportunity-card--urgent");
    expect(within(card).getByText("Urgent")).toBeVisible();
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

  it("keeps joined event tracking and completion on Community instead of Volunteer Nearby", async () => {
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
    renderApp("/community");
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
