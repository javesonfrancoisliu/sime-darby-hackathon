import { beforeEach, describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "../test/renderRoute";
import { installFakeApi, signInAs } from "../test/fakeApi";
import {
  AIR,
  FACILITIES,
  HEAT,
  MAINTENANCE,
  MEDICAL,
  MEDICAL_ROUTE,
  TOWNSHIP,
  WATER_ROWS,
} from "../test/fixtures";

beforeEach(() => signInAs());

const safetyRoutes = {
  "GET /api/safety": {
    body: { readings: [AIR, ...WATER_ROWS, HEAT], facilityReports: FACILITIES },
  },
};

describe("Call 999 on Home", () => {
  it("is a direct tel link outside any dialog", async () => {
    installFakeApi({ "GET /api/requests/mine": { body: { requests: [] } } });
    await renderApp("/");
    const link = await screen.findByRole("link", { name: /Call 999/ });
    expect(link).toHaveAttribute("href", "tel:999");
    expect(link.closest("[role=dialog]")).toBeNull();
  });
});

describe("Home live conditions", () => {
  it("shows the air, heat, maintenance and in-progress facility cards with the API advice", async () => {
    installFakeApi({
      "GET /api/requests/mine": { body: { requests: [] } },
      ...safetyRoutes,
      "GET /api/notices": { body: { items: [MAINTENANCE] } },
    });
    await renderApp("/");
    const section = (await screen.findByText("Township Live Conditions")).closest("section")!;
    expect(await within(section).findByText(AIR.advice)).toBeInTheDocument();
    expect(within(section).getByText(HEAT.advice)).toBeInTheDocument();
    expect(within(section).getByText("Water supply cut")).toBeInTheDocument();
    expect(within(section).getByText("Broken streetlight")).toBeInTheDocument();
    expect(screen.queryByText(/Demo data|Example readings/)).not.toBeInTheDocument();
  });

  it("explains a failed load with Try again and invents nothing", async () => {
    installFakeApi({ "GET /api/requests/mine": { body: { requests: [] } } });
    await renderApp("/");
    const section = (await screen.findByText("Township Live Conditions")).closest("section")!;
    expect(await within(section).findByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(within(section).queryByText(/Air Quality/)).not.toBeInTheDocument();
  });
});

describe("Me page", () => {
  it("shows the saved Medical ID and the township security line", async () => {
    installFakeApi({
      [`GET ${MEDICAL_ROUTE}`]: { body: MEDICAL },
      "GET /api/township": { body: TOWNSHIP },
    });
    await renderApp("/me");
    expect(await screen.findByText("O+")).toBeInTheDocument();
    expect(screen.getByText("012-345 6789")).toHaveClass("text-nowrap");
    expect(screen.getByText(/Zainal \(Son\)/)).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /Township security/ })).toHaveAttribute(
      "href",
      "tel:0350001234",
    );
  });

  it("shows an Add your Medical ID button when nothing is saved and hides an unset security line", async () => {
    installFakeApi({
      [`GET ${MEDICAL_ROUTE}`]: {
        status: 404,
        body: { error: { code: "NOT_FOUND", message: "x" } },
      },
    });
    await renderApp("/me");
    expect(await screen.findByRole("button", { name: /Add your Medical ID/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Township security/ })).not.toBeInTheDocument();
  });
});

describe("Safety page", () => {
  it("opens on the tab named in the link and names the panel", async () => {
    installFakeApi(safetyRoutes);
    await renderApp("/safety#temp");
    const tab = screen.getByRole("tab", { name: /Heat/ });
    expect(tab).toHaveAttribute("aria-selected", "true");
    const panel = screen.getByRole("tabpanel");
    expect(panel).toHaveAttribute("aria-labelledby", tab.id);
    expect(tab).toHaveAttribute("aria-controls", panel.id);
    const section = screen.getByRole("region", { name: "Temperature Alerts" });
    expect(panel).toContainElement(section);
    expect(await screen.findByText(HEAT.advice)).toBeInTheDocument();
  });

  it("keeps a Call 999 link in view", async () => {
    installFakeApi(safetyRoutes);
    await renderApp("/safety");
    expect(screen.getByRole("link", { name: /Call 999/ })).toHaveAttribute("href", "tel:999");
  });

  it("draws the moderate air quality bar in the caution tone on the standard track", async () => {
    installFakeApi(safetyRoutes);
    await renderApp("/safety");
    const bar = await screen.findByLabelText(/API level 82/);
    expect(bar.className).toBe("safety-bar");
    expect(bar.firstElementChild).toHaveClass("safety-bar__fill--tone", "tone-caution");
  });

  it("draws the water bars ok, mid and high by how near the level is to its normal maximum", async () => {
    installFakeApi(safetyRoutes);
    await renderApp("/safety#water");
    const fillOf = async (label: RegExp) => (await screen.findByLabelText(label)).firstElementChild;
    expect(await fillOf(/Water level 1.4 m/)).toHaveClass("safety-bar__fill--ok");
    expect(await fillOf(/Water level 2.1 m/)).toHaveClass("safety-bar__fill--mid");
    expect(await fillOf(/Water level 3.8 m/)).toHaveClass("safety-bar__fill--high");
  });

  it("labels a resolved report as Fixed and counts it", async () => {
    installFakeApi(safetyRoutes);
    await renderApp("/safety#facilities");
    expect(await screen.findByText("Cracked bench")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /^Fixed/ }));
    expect(screen.queryByText("Broken streetlight")).not.toBeInTheDocument();
    expect(screen.getByText("Cracked bench")).toBeInTheDocument();
  });

  it("shows a friendly error with Try again and no invented readings", async () => {
    installFakeApi();
    await renderApp("/safety");
    expect(await screen.findByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.queryByText(/API level/)).not.toBeInTheDocument();
  });
});
