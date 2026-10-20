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
  it("shows air, water and heat readings with Malaysia time across tabs", async () => {
    setup({ body: SAFETY });
    const user = userEvent.setup();

    // Air is the default tab.
    const air = await screen.findByLabelText("Air quality: Elmina West");
    expect(within(air).getByText("62")).toBeInTheDocument();
    expect(within(air).getByText("API · Moderate")).toBeInTheDocument();
    // 00:30 UTC is 8:30 am in Kuala Lumpur.
    expect(within(air).getByText(/Updated:/)).toBeInTheDocument();
    expect(within(air).getByText(/8:30 am/)).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Water" }));
    const water = await screen.findByLabelText("Water levels: Sungai Buloh");
    expect(within(water).getByText("Watch")).toBeInTheDocument();
    expect(within(water).getByText(/normal max/)).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Heat" }));
    const heat = await screen.findByLabelText("Heat: Elmina East");
    expect(within(heat).getByText("34°C")).toBeInTheDocument();
    expect(within(heat).getByText("39°C")).toBeInTheDocument();
    expect(within(heat).getByText("70%")).toBeInTheDocument();
  });

  it("filters facility reports by status in the Facilities tab", async () => {
    setup({ body: SAFETY });
    const user = userEvent.setup();

    await user.click(await screen.findByRole("tab", { name: "Facilities" }));
    expect(await screen.findByLabelText("Facility report: Broken swing")).toBeInTheDocument();
    expect(screen.getByLabelText("Facility report: Fixed gate")).toBeInTheDocument();

    await user.selectOptions(screen.getByRole("combobox", { name: "Sort by" }), "resolved");
    expect(screen.queryByLabelText("Facility report: Broken swing")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Facility report: Fixed gate")).toBeInTheDocument();

    await user.selectOptions(screen.getByRole("combobox", { name: "Sort by" }), "in_progress");
    expect(screen.queryByLabelText("Facility report: Broken swing")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Facility report: Fixed gate")).not.toBeInTheDocument();
  });

  it("reveals a facility report's description when its row is expanded", async () => {
    setup({ body: SAFETY });
    const user = userEvent.setup();

    await user.click(await screen.findByRole("tab", { name: "Facilities" }));
    const card = await screen.findByLabelText("Facility report: Broken swing");
    const toggle = within(card).getByRole("button", { name: /Broken swing\. Show details/ });
    await user.click(toggle);
    // The row is now expanded and its toggle announces that details are shown.
    expect(
      within(card).getByRole("button", { name: /Broken swing\. Hide details/ }),
    ).toBeInTheDocument();
    expect(within(card).getByText("The seat is cracked.")).toBeInTheDocument();
  });

  it("explains when there are no readings or reports yet", async () => {
    setup({ body: { readings: [], facilityReports: [] } });
    const user = userEvent.setup();

    // The default Air tab shows its own empty state.
    expect(
      await screen.findByText("No air quality readings have been posted yet."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Facilities" }));
    expect(await screen.findByText("No facility problems have been reported.")).toBeInTheDocument();
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
