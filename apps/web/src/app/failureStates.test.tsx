import { render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { SessionProvider } from "@sdh/api-client";
import type { ReactNode } from "react";

import { App } from "../App";
import { AcceptedTasksProvider, useAcceptedTasks } from "../data/AcceptedTasksContext";
import { installFakeApi, signInAs } from "../test/fakeApi";
import { makeRequest, VOLUNTEER } from "../test/fixtures";
import { renderApp } from "../test/renderApp";
import { signedInRoutes } from "../test/routes";

const down = { status: 500, body: { error: { code: "INTERNAL", message: "boom" } } };

// First answer fails, then the API is back.
function flaky(good: unknown) {
  let attempts = 0;
  return () => (++attempts === 1 ? down : { body: good });
}

describe("API down for the signed-in person", () => {
  it.each([
    ["/volunteer", "Volunteer nearby"],
    ["/community/challenges", "Challenges"],
  ])("%s asks to try again instead of asking to sign in", async (path) => {
    installFakeApi(signedInRoutes(VOLUNTEER, { "GET /api/me": flaky(VOLUNTEER) }));
    signInAs(VOLUNTEER.id);
    renderApp(path);

    expect(await screen.findByText("We could not load this")).toBeInTheDocument();
    expect(screen.getByText("Check your connection and try again.")).toBeInTheDocument();
    expect(screen.queryByText("Please sign in")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.queryByText("We could not load this")).toBeNull());
  });

  it("the profile shows a retry and no Signed out badge", async () => {
    installFakeApi(
      signedInRoutes(VOLUNTEER, {
        "GET /api/me": flaky(VOLUNTEER),
        "GET /api/demo/users": { body: { users: [] } },
      }),
    );
    signInAs(VOLUNTEER.id);
    renderApp("/profile");

    expect(
      await screen.findByText("We could not load this. Check your connection and try again."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Signed out")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByLabelText("Your profile")).toBeInTheDocument();
  });

  it("still asks to sign in when nobody is signed in", async () => {
    installFakeApi({ "GET /api/demo/users": { body: { users: [] } } });
    renderApp("/volunteer");
    expect(await screen.findByText("Please sign in")).toBeInTheDocument();
  });
});

describe("unknown paths", () => {
  it("replaces the bad path with home", async () => {
    installFakeApi(signedInRoutes(VOLUNTEER));
    signInAs(VOLUNTEER.id);
    function Where() {
      return <p data-testid="where">{useLocation().pathname}</p>;
    }
    render(
      <MemoryRouter initialEntries={["/", "/zzz-unknown"]} initialIndex={1}>
        <App />
        <Where />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent(/^\/$/));
  });
});

describe("missing fields in API replies", () => {
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <SessionProvider>
        <AcceptedTasksProvider>{children}</AcceptedTasksProvider>
      </SessionProvider>
    );
  }

  it("keeps accepted tasks when a request has no location", async () => {
    // JSON drops undefined, so the reply really has no location.
    const noLocation = { ...makeRequest({ status: "matched" }), location: undefined };
    installFakeApi({
      "GET /api/me": { body: VOLUNTEER },
      "GET /api/requests/mine": { body: { requests: [noLocation] } },
      "GET /api/events": { body: { events: [] } },
    });
    signInAs(VOLUNTEER.id);
    const { result } = renderHook(() => useAcceptedTasks(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.tasks).toHaveLength(1);
  });

  it("shows the volunteer page when the points reply has no ledger", async () => {
    installFakeApi(signedInRoutes(VOLUNTEER, { "GET /api/me/points": { body: { points: 5 } } }));
    signInAs(VOLUNTEER.id);
    renderApp("/volunteer");
    expect(await screen.findByText("Volunteer nearby")).toBeInTheDocument();
  });

  it("shows the profile when the user has no availability", async () => {
    const noAvailability = { ...VOLUNTEER, availability: undefined };
    installFakeApi(signedInRoutes(VOLUNTEER, { "GET /api/me": { body: noAvailability } }));
    signInAs(VOLUNTEER.id);
    renderApp("/profile");
    expect(await screen.findByLabelText("Your profile")).toBeInTheDocument();
  });
});
