import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { installFakeApi, signInAs } from "../test/fakeApi";
import { makeEvent, makeNotice, SAFETY, VOLUNTEER } from "../test/fixtures";
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
    expect(await within(safety).findByText("Air quality: 62 AQI")).toBeInTheDocument();
    expect(within(safety).getByText("1 open facility report.")).toBeInTheDocument();
    expect(within(safety).getByText("Heat: 34°C")).toBeInTheDocument();
    expect(
      within(community).getAllByRole("link", { name: /New recycling hours/ })[0],
    ).toHaveAttribute("href", "/community");
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
});
