import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { installFakeApi, signInAs } from "../../test/fakeApi";
import {
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
  "GET /api/opportunities": { body: { items: [makeRequestOpportunity()] } },
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
    expect(within(card).getByText(/1.5 km away/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Use my location/ })).not.toBeInTheDocument();
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
