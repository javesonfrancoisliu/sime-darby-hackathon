import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { installFakeApi, signInAs } from "../../test/fakeApi";
import { SAFETY, VOLUNTEER } from "../../test/fixtures";
import { renderApp } from "../../test/renderApp";
import { signedInRoutes } from "../../test/routes";

function setup(safety: unknown) {
  installFakeApi(signedInRoutes(VOLUNTEER, { "GET /api/safety": safety }));
  signInAs(VOLUNTEER.id);
  renderApp("/safety");
}

describe("safety page", () => {
  it("shows air, water and heat readings with Malaysia time", async () => {
    setup({ body: SAFETY });

    const air = await screen.findByLabelText("Air quality: Elmina West");
    expect(within(air).getByText("62 AQI")).toBeInTheDocument();
    expect(within(air).getByText("Moderate")).toBeInTheDocument();
    // 00:30 UTC is 8:30 am in Kuala Lumpur.
    expect(within(air).getByText(/Measured 19 Oct 2026, 8:30 am/)).toBeInTheDocument();

    const water = screen.getByLabelText("Water levels: Sungai Buloh");
    expect(within(water).getByText("Watch")).toBeInTheDocument();
    expect(within(water).getByText(/normal up to 2 m/)).toBeInTheDocument();

    const heat = screen.getByLabelText("Heat: Elmina East");
    expect(within(heat).getByText(/Feels like 39/)).toBeInTheDocument();
  });

  it("filters facility reports by status", async () => {
    setup({ body: SAFETY });
    const user = userEvent.setup();

    expect(await screen.findByLabelText("Facility report: Broken swing")).toBeInTheDocument();
    expect(screen.getByLabelText("Facility report: Fixed gate")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Resolved" }));
    expect(screen.queryByLabelText("Facility report: Broken swing")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Facility report: Fixed gate")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "In progress" }));
    expect(screen.getByText("No reports with this status")).toBeInTheDocument();
  });

  it("explains when there are no readings or reports yet", async () => {
    setup({ body: { readings: [], facilityReports: [] } });
    expect(await screen.findByText("No facility reports")).toBeInTheDocument();
    expect(screen.getAllByText("No readings yet")).toHaveLength(3);
  });

  it("reports an error and offers a retry", async () => {
    setup({ status: 500, body: { error: { code: "INTERNAL", message: "Sensors are down" } } });
    expect(await screen.findByText("Couldn't load safety information")).toBeInTheDocument();
    expect(screen.getByText("Sensors are down")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("shows a loading state first", async () => {
    setup(() => new Promise(() => {}));
    expect(
      await screen.findByRole("status", { name: "Loading safety information" }),
    ).toBeInTheDocument();
  });
});
