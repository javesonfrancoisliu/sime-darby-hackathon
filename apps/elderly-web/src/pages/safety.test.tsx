import { beforeEach, describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
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
  it("confirms with a slide-to-call control before dialing", async () => {
    const user = userEvent.setup();
    installFakeApi({ "GET /api/requests/mine": { body: { requests: [] } } });
    await renderApp("/");
    // The trigger is a button, not a bare tel link.
    const trigger = await screen.findByRole("button", { name: /Call 999/ });
    expect(trigger).toBeInstanceOf(HTMLButtonElement);
    await user.click(trigger);
    // A confirm dialog opens with a slide-to-confirm control (no one-tap dial).
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Call 999?")).toBeInTheDocument();
    expect(within(dialog).getByRole("slider", { name: /Slide to call 999/ })).toBeInTheDocument();
  });
});

describe("Safety from Home", () => {
  it("opens the Safety page from the All hazards link with no tab marked current", async () => {
    installFakeApi({ "GET /api/requests/mine": { body: { requests: [] } }, ...safetyRoutes });
    await renderApp("/");
    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    expect(within(nav).queryByRole("button", { name: "Safety" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Safety" })).not.toBeInTheDocument();
    const link = await screen.findByRole("button", { name: "All hazards" });
    expect(link.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    // Same right arrow as the Youth app, on every see-all link of the page.
    for (const name of ["All hazards", "All services", "See all"]) {
      const seeAll = await screen.findByRole("button", { name });
      expect(seeAll.querySelector("svg.lucide-arrow-right")).not.toBeNull();
    }
    await userEvent.click(link);
    expect(document.title).toBe("Health and safety - Township Connect");
    expect(await screen.findByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(nav.querySelector("[aria-current]")).toBeNull();
  });

  it("still opens from a conditions card", async () => {
    installFakeApi({ "GET /api/requests/mine": { body: { requests: [] } }, ...safetyRoutes });
    await renderApp("/");
    await userEvent.click(await screen.findByRole("button", { name: /Air Quality/ }));
    expect(document.title).toBe("Health and safety - Township Connect");
  });
});

describe("Home live conditions", () => {
  it("shows the air, heat, maintenance and in-progress facility cards with the API advice", async () => {
    installFakeApi({
      "GET /api/requests/mine": { body: { requests: [] } },
      ...safetyRoutes,
      "GET /api/notices": { body: { items: [{ ...MAINTENANCE, area: "Elmina Valley" }] } },
    });
    await renderApp("/");
    const section = (await screen.findByText("Township Live Conditions")).closest("section")!;
    expect(await within(section).findByText(AIR.advice)).toBeInTheDocument();
    expect(within(section).getByText(HEAT.advice)).toBeInTheDocument();
    expect(within(section).getByText("34°C")).toBeInTheDocument();
    expect(within(section).getByText("Feels 39°C")).toBeInTheDocument();
    expect(within(section).getByText("Water supply cut")).toBeInTheDocument();
    expect(within(section).getByText("Broken streetlight")).toBeInTheDocument();
    expect(screen.queryByText(/Demo data|Example readings/)).not.toBeInTheDocument();
  });

  it("skips maintenance that is finished or in another area, and facility damage elsewhere", async () => {
    installFakeApi({
      "GET /api/requests/mine": { body: { requests: [] } },
      "GET /api/safety": {
        body: {
          readings: [AIR],
          facilityReports: FACILITIES.map((f) => ({ ...f, area: "Elmina East" })),
        },
      },
      "GET /api/notices": {
        body: {
          items: [
            { ...MAINTENANCE, title: "Done already", area: "Elmina Valley", status: "completed" },
            { ...MAINTENANCE, title: "Other precinct", area: "Elmina West" },
          ],
        },
      },
    });
    await renderApp("/");
    const section = (await screen.findByText("Township Live Conditions")).closest("section")!;
    expect(await within(section).findByText(AIR.advice)).toBeInTheDocument();
    expect(within(section).queryByText("Done already")).not.toBeInTheDocument();
    expect(within(section).queryByText("Other precinct")).not.toBeInTheDocument();
    expect(within(section).queryByText("Broken streetlight")).not.toBeInTheDocument();
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
  it("shows the saved Medical ID on My details and the township security line in Help and safety", async () => {
    installFakeApi({
      [`GET ${MEDICAL_ROUTE}`]: { body: MEDICAL },
      "GET /api/township": { body: TOWNSHIP },
    });
    await renderApp("/me");
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /^My details/ }));
    expect(await screen.findByText("O+", { selector: ".apple-inset-value" })).toBeInTheDocument();
    // The next-of-kin phone and township security now confirm before dialing.
    await user.click(screen.getByRole("button", { name: "012-345 6789" }));
    const dialog = await screen.findByRole("dialog", { name: /^Call 012-345 6789/ });
    expect(
      within(dialog).getByRole("slider", { name: /Slide to call 012-345 6789/ }),
    ).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.getByText(/Zainal \(Son\)/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await user.click(await screen.findByRole("button", { name: /Help and safety/ }));
    const help = await screen.findByRole("dialog", { name: "Help and safety" });
    await user.click(within(help).getByRole("button", { name: /Township security/ }));
    expect(
      await screen.findByRole("slider", { name: /Slide to call 03-5000 1234/ }),
    ).toBeInTheDocument();
  });

  it("shows an Add your Medical ID button when nothing is saved and hides an unset security line", async () => {
    installFakeApi({
      [`GET ${MEDICAL_ROUTE}`]: {
        status: 404,
        body: { error: { code: "NOT_FOUND", message: "x" } },
      },
    });
    await renderApp("/me");
    await userEvent.click(await screen.findByRole("button", { name: /^My details/ }));
    const sheet = await screen.findByRole("dialog", { name: "My details" });
    expect(
      await within(sheet).findByRole("button", { name: /Add your Medical ID/ }),
    ).toBeInTheDocument();
    expect(within(sheet).queryByRole("button", { name: /Township security/ })).toBeNull();
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

  it("keeps a Call 999 button in view that confirms with a slide control", async () => {
    const user = userEvent.setup();
    installFakeApi(safetyRoutes);
    await renderApp("/safety");
    await user.click(screen.getByRole("button", { name: /Call 999/ }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("slider", { name: /Slide to call 999/ })).toBeInTheDocument();
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

describe("Facility filter chips", () => {
  it("expose which status filter is pressed", async () => {
    const user = userEvent.setup();
    installFakeApi(safetyRoutes);
    await renderApp("/safety#facilities");
    const group = await screen.findByRole("group", { name: /filter by status/i });
    const buttons = within(group).getAllByRole("button");
    expect(buttons[0]).toHaveAttribute("aria-pressed", "true");
    await user.click(buttons[1]!);
    expect(buttons[1]).toHaveAttribute("aria-pressed", "true");
    expect(buttons[0]).toHaveAttribute("aria-pressed", "false");
  });
});
