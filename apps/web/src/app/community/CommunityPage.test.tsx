import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { installFakeApi, signInAs } from "../../test/fakeApi";
import { makeEvent, NO_CONTRIBUTIONS, VOLUNTEER } from "../../test/fixtures";
import { renderApp } from "../../test/renderApp";

const EVENT = makeEvent({ title: "Live tea morning" });

const liveRoutes = {
  "GET /api/me": { body: VOLUNTEER },
  "GET /api/events": { body: { events: [EVENT] } },
  "GET /api/requests/mine": { body: { requests: [] } },
  "GET /api/contributions/mine": { body: NO_CONTRIBUTIONS },
};

describe("community page", () => {
  it("lists live events without a sample data note when signed in", async () => {
    installFakeApi(liveRoutes);
    signInAs(VOLUNTEER.id);
    renderApp("/community");

    expect(await screen.findByText("Live tea morning")).toBeInTheDocument();
    expect(screen.queryByText(/Showing sample data/)).not.toBeInTheDocument();
  });

  it("reports the error instead of sample events when signed in and the API fails", async () => {
    installFakeApi({
      ...liveRoutes,
      "GET /api/events": {
        status: 500,
        body: { error: { code: "INTERNAL", message: "Events are down" } },
      },
    });
    signInAs(VOLUNTEER.id);
    renderApp("/community");

    expect(await screen.findByText("Couldn't load community events")).toBeInTheDocument();
    expect(screen.getByText("Events are down")).toBeInTheDocument();
    expect(screen.queryByText(/Showing sample data/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("says it is showing sample data when signed out and the API is unreachable", async () => {
    installFakeApi();
    renderApp("/community");

    const note = await screen.findByRole("status", { name: "" });
    expect(note).toHaveTextContent(/Showing sample data/);
    expect(screen.queryByText("Couldn't load community events")).not.toBeInTheDocument();
  });

  it("shows live events without the note when signed out and the API has some", async () => {
    installFakeApi({ "GET /api/events": { body: { events: [EVENT] } } });
    renderApp("/community");

    expect(await screen.findByText("Live tea morning")).toBeInTheDocument();
    expect(screen.queryByText(/Showing sample data/)).not.toBeInTheDocument();
  });

  it("registers with the signed-in user id and the join endpoint", async () => {
    const { calls } = installFakeApi({
      ...liveRoutes,
      [`POST /api/events/${EVENT.id}/join`]: { body: { ...EVENT, joined: true } },
    });
    signInAs(VOLUNTEER.id);
    renderApp("/community");
    const user = userEvent.setup();

    await user.click(
      within(await screen.findByLabelText(/Live tea morning/)).getByRole("button", {
        name: /details/i,
      }),
    );
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /Register/ }));

    expect(await screen.findByRole("dialog", { name: "You're registered" })).toBeInTheDocument();
    const post = calls.find((c) => c.method === "POST");
    expect(post?.path).toBe(`/api/events/${EVENT.id}/join`);
    expect(post?.headers["x-demo-user"]).toBe(VOLUNTEER.id);
  });
});
