import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { App } from "../App";
import userEvent from "@testing-library/user-event";
import { RewardWithStatus } from "@sdh/contracts";
import { renderApp } from "../test/renderRoute";
import { installFakeApi, signInAs } from "../test/fakeApi";
import { DEFAULT_SETTINGS } from "@sdh/contracts";
import {
  ELDER,
  MEDICAL,
  MEDICAL_ROUTE,
  NOT_FOUND,
  POINTS,
  REWARD,
  STREAK,
  TOWNSHIP,
} from "../test/fixtures";

beforeEach(() => signInAs());

const CLAIMED = RewardWithStatus.parse({
  ...REWARD,
  status: "redeemed",
  redeemedAt: "2026-10-19T10:00:00+08:00",
  expiresAt: "2026-11-18T10:00:00+08:00",
});

const hubRoutes = {
  "GET /api/me/points": { body: POINTS(260) },
  "GET /api/me/streak": { body: STREAK },
  "GET /api/rewards": { body: { rewards: [CLAIMED] } },
  "GET /api/township": { body: TOWNSHIP },
  [`GET ${MEDICAL_ROUTE}`]: { body: MEDICAL },
  "GET /api/me/settings": {
    body: { ...DEFAULT_SETTINGS, updatedAt: "2026-10-18T09:00:00Z" },
  },
  "GET /api/challenges": { body: { challenges: [] } },
  "GET /api/badges": { body: { badges: [] } },
};

const sheetNamed = (name: string) => screen.findByRole("dialog", { name });

describe("Profile hub", () => {
  it("lists the header and the four rows in order with live summaries", async () => {
    installFakeApi(hubRoutes);
    await renderApp("/me");
    expect(await screen.findByRole("heading", { name: "Puan Salmah" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();

    const rows = Array.from(document.querySelectorAll(".apple-inset-group .apple-inset-btn-row"));
    expect(rows.map((r) => r.querySelector(".apple-inset-btn-row__title")?.textContent)).toEqual([
      "My rewards",
      "My details",
      "Settings",
      "Help and safety",
    ]);
    await waitFor(() => expect(rows[0]).toHaveTextContent("260 points · 1 voucher"));
    await waitFor(() => expect(rows[1]).toHaveTextContent("Blood group O+"));
    expect(rows[2]).toHaveTextContent("Text size: Normal · Strong contrast: Off");
    expect(rows[3]).toHaveTextContent("Township security and 999");
  });

  it("says plainly when there is no Medical ID yet", async () => {
    installFakeApi({ ...hubRoutes, [`GET ${MEDICAL_ROUTE}`]: NOT_FOUND });
    await renderApp("/me");
    expect(await screen.findByRole("button", { name: /My details/ })).toHaveTextContent(
      "No Medical ID yet",
    );
  });

  it("drops the old drawers and sign-out placements", async () => {
    installFakeApi(hubRoutes);
    await renderApp("/me");
    await screen.findByRole("heading", { name: "Puan Salmah" });
    expect(screen.queryByText("Reading and sound")).not.toBeInTheDocument();
    expect(screen.queryByText("Emergency & Medical ID")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Read profile aloud" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Switch person/ })).toBeInTheDocument();
  });
});

describe("Edit your details", () => {
  it("saves a new name and neighbourhood with PATCH and updates the header", async () => {
    const { calls } = installFakeApi({
      ...hubRoutes,
      "PATCH /api/me": (call) => ({ body: { ...ELDER, ...(call.body as object) } }),
    });
    await renderApp("/me");
    await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
    const sheet = await sheetNamed("Edit your details");
    const name = within(sheet).getByLabelText("Your name");
    expect(name).toHaveValue("Puan Salmah");
    await userEvent.clear(name);
    await userEvent.type(name, "Puan Salmah Ali");
    await userEvent.click(within(sheet).getByRole("button", { name: "Elmina East" }));
    await userEvent.click(within(sheet).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByRole("heading", { name: "Puan Salmah Ali" })).toBeInTheDocument();
    expect(screen.getAllByText("Elmina East").length).toBeGreaterThan(0);
    const patch = calls.find((c) => c.method === "PATCH" && c.path === "/api/me");
    expect(patch?.body).toEqual({ name: "Puan Salmah Ali", area: "Elmina East" });
  });

  it("offers the four precincts", async () => {
    installFakeApi(hubRoutes);
    await renderApp("/me");
    await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
    const sheet = await sheetNamed("Edit your details");
    for (const precinct of ["Elmina West", "Elmina Valley", "Elmina East", "Central Park"]) {
      expect(within(sheet).getByRole("button", { name: precinct })).toBeInTheDocument();
    }
    expect(within(sheet).getByRole("button", { name: "Elmina Valley" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("asks for a name and sends nothing when it is empty", async () => {
    const { calls } = installFakeApi(hubRoutes);
    await renderApp("/me");
    await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
    const sheet = await sheetNamed("Edit your details");
    await userEvent.clear(within(sheet).getByLabelText("Your name"));
    await userEvent.click(within(sheet).getByRole("button", { name: "Save" }));
    expect(await within(sheet).findByText("Please type your name.")).toBeInTheDocument();
    expect(calls.some((c) => c.method === "PATCH")).toBe(false);
  });

  it("shows a plain error and keeps the sheet when saving fails", async () => {
    installFakeApi({
      ...hubRoutes,
      "PATCH /api/me": { status: 500, body: { error: { code: "INTERNAL", message: "boom" } } },
    });
    await renderApp("/me");
    await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
    const sheet = await sheetNamed("Edit your details");
    await userEvent.type(within(sheet).getByLabelText("Your name"), "x");
    await userEvent.click(within(sheet).getByRole("button", { name: "Save" }));
    expect(await within(sheet).findByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.queryByText("boom")).not.toBeInTheDocument();
  });
});

describe("My rewards sheet", () => {
  it("shows points and the claimed vouchers and uses one", async () => {
    const { calls } = installFakeApi({
      ...hubRoutes,
      [`POST /api/rewards/${REWARD.id}/use`]: {
        body: {
          rewardId: REWARD.id,
          title: REWARD.title,
          pointsSpent: 80,
          redeemedAt: "2026-10-19T10:00:00+08:00",
          usedAt: "2026-10-21T10:00:00+08:00",
        },
      },
    });
    await renderApp("/me");
    await userEvent.click(await screen.findByRole("button", { name: /^My rewards/ }));
    const sheet = await sheetNamed("My rewards");
    expect(await within(sheet).findByText("260")).toBeInTheDocument();
    expect(within(sheet).getByText("Free kopi")).toBeInTheDocument();
    expect(within(sheet).getByText(/Valid until/)).toBeInTheDocument();
    await userEvent.click(within(sheet).getByRole("button", { name: "Use now: Free kopi" }));
    expect(await within(sheet).findByRole("button", { name: "Used" })).toBeDisabled();
    expect(
      calls.some((c) => c.method === "POST" && c.path === `/api/rewards/${REWARD.id}/use`),
    ).toBe(true);
  });

  it("says so when no voucher has been claimed", async () => {
    installFakeApi({ ...hubRoutes, "GET /api/rewards": { body: { rewards: [REWARD] } } });
    await renderApp("/me");
    await userEvent.click(await screen.findByRole("button", { name: /^My rewards/ }));
    const sheet = await sheetNamed("My rewards");
    expect(await within(sheet).findByText(/not claimed any vouchers/i)).toBeInTheDocument();
  });

  it("goes to the rewards screen from See available rewards", async () => {
    installFakeApi({ ...hubRoutes, "GET /api/rewards": { body: { rewards: [REWARD] } } });
    await renderApp("/me");
    await userEvent.click(await screen.findByRole("button", { name: /^My rewards/ }));
    const sheet = await sheetNamed("My rewards");
    await userEvent.click(within(sheet).getByRole("button", { name: "See available rewards" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Rewards" })).toBeInTheDocument();
    expect(await screen.findByRole("tab", { name: /Rewards/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("shows a retry when the vouchers cannot load", async () => {
    installFakeApi({ ...hubRoutes, "GET /api/rewards": { status: 500, body: {} } });
    await renderApp("/me");
    await userEvent.click(await screen.findByRole("button", { name: /^My rewards/ }));
    const sheet = await sheetNamed("My rewards");
    expect(await within(sheet).findByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});

describe("My details page", () => {
  it("shows the Medical ID, the change button and the township sector", async () => {
    installFakeApi(hubRoutes);
    await renderApp("/me");
    await userEvent.click(await screen.findByRole("button", { name: /^My details/ }));
    expect(await screen.findByRole("heading", { name: "My details" })).toBeInTheDocument();
    expect(await screen.findByText("O+")).toBeInTheDocument();
    expect(screen.getByText("Township Sector")).toBeInTheDocument();
    expect(screen.getByText("Elmina Valley")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Change your Medical ID/ }));
    expect(
      await screen.findByRole("heading", { name: "Change your Medical ID" }),
    ).toBeInTheDocument();
  });

  it("goes back to the Profile", async () => {
    installFakeApi(hubRoutes);
    await renderApp("/me/details");
    await userEvent.click(await screen.findByRole("button", { name: /Go Back/ }));
    expect(await screen.findByRole("button", { name: /^Settings/ })).toBeInTheDocument();
  });
});

describe("Settings sheet", () => {
  it("opens from the Settings row and from the header Aa button", async () => {
    installFakeApi(hubRoutes);
    await renderApp("/me");
    await userEvent.click(await screen.findByRole("button", { name: /^Settings/ }));
    await sheetNamed("Settings");
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Text and sound settings" }));
    await sheetNamed("Settings");
  });

  it("holds every row: text size, contrast, read aloud, less movement, reminders, rankings", async () => {
    installFakeApi(hubRoutes);
    await renderApp("/me");
    await userEvent.click(await screen.findByRole("button", { name: /^Settings/ }));
    const sheet = await sheetNamed("Settings");
    expect(within(sheet).getByRole("radiogroup", { name: "Text size" })).toBeInTheDocument();
    for (const label of [
      "Strong contrast",
      "Read aloud",
      "Less movement",
      "Reminders",
      "Show me in Rankings",
    ]) {
      expect(within(sheet).getByRole("switch", { name: label })).toBeInTheDocument();
    }
    expect(within(sheet).queryByRole("button", { name: /Township security/ })).toBeNull();
  });

  it("changes the text size and strong contrast", async () => {
    installFakeApi(hubRoutes);
    const { container } = await renderApp("/me");
    await userEvent.click(await screen.findByRole("button", { name: /^Settings/ }));
    const sheet = await sheetNamed("Settings");
    await userEvent.click(within(sheet).getByRole("radio", { name: "A+ Large" }));
    await userEvent.click(within(sheet).getByRole("switch", { name: "Strong contrast" }));
    const root = container.querySelector(".app-root");
    expect(root).toHaveClass("text-size-large", "high-contrast");
  });

  it("sets both reminders with one row and saves them", async () => {
    const { calls } = installFakeApi({
      ...hubRoutes,
      "PUT /api/me/settings": (call) => ({ body: { ...(call.body as object), updatedAt: "x" } }),
    });
    await renderApp("/me");
    await userEvent.click(await screen.findByRole("button", { name: /^Settings/ }));
    const sheet = await sheetNamed("Settings");
    const reminders = within(sheet).getByRole("switch", { name: "Reminders" });
    await waitFor(() => expect(calls.some((c) => c.path === "/api/me/settings")).toBe(true));
    expect(reminders).toBeChecked();
    await userEvent.click(reminders);
    expect(reminders).not.toBeChecked();
    await waitFor(
      () => {
        const put = calls.find((c) => c.method === "PUT" && c.path === "/api/me/settings");
        expect(put?.body).toMatchObject({ notifyEvents: false, notifyVolunteering: false });
      },
      { timeout: 3000 },
    );
  });

  it("shows reminders off when the server has both turned off", async () => {
    installFakeApi({
      ...hubRoutes,
      "GET /api/me/settings": {
        body: {
          ...DEFAULT_SETTINGS,
          notifyEvents: false,
          notifyVolunteering: false,
          updatedAt: "2026-10-18T09:00:00Z",
        },
      },
    });
    await renderApp("/me");
    await userEvent.click(await screen.findByRole("button", { name: /^Settings/ }));
    const sheet = await sheetNamed("Settings");
    await waitFor(() =>
      expect(within(sheet).getByRole("switch", { name: "Reminders" })).not.toBeChecked(),
    );
  });

  it("opts in to Rankings with PATCH", async () => {
    const { calls } = installFakeApi({
      ...hubRoutes,
      "PATCH /api/me": (call) => ({ body: { ...ELDER, ...(call.body as object) } }),
    });
    await renderApp("/me");
    await userEvent.click(await screen.findByRole("button", { name: /^Settings/ }));
    const sheet = await sheetNamed("Settings");
    const rankings = within(sheet).getByRole("switch", { name: "Show me in Rankings" });
    expect(rankings).not.toBeChecked();
    await userEvent.click(rankings);
    await waitFor(() => expect(rankings).toBeChecked());
    const patch = calls.find((c) => c.method === "PATCH" && c.path === "/api/me");
    expect(patch?.body).toEqual({ leaderboardOptIn: true });
  });

  it("keeps Rankings as it was and says so when saving fails", async () => {
    installFakeApi({
      ...hubRoutes,
      "PATCH /api/me": { status: 500, body: { error: { code: "INTERNAL", message: "boom" } } },
    });
    await renderApp("/me");
    await userEvent.click(await screen.findByRole("button", { name: /^Settings/ }));
    const sheet = await sheetNamed("Settings");
    const rankings = within(sheet).getByRole("switch", { name: "Show me in Rankings" });
    await userEvent.click(rankings);
    expect(await within(sheet).findByText(/something went wrong/i)).toBeInTheDocument();
    expect(rankings).not.toBeChecked();
  });
});

describe("Help and safety sheet", () => {
  it("offers township security and Call 999, each behind the call confirmation", async () => {
    installFakeApi(hubRoutes);
    await renderApp("/me");
    await userEvent.click(await screen.findByRole("button", { name: /^Help and safety/ }));
    const sheet = await sheetNamed("Help and safety");
    await userEvent.click(within(sheet).getByRole("button", { name: /Township security/ }));
    expect(
      await screen.findByRole("slider", { name: /Slide to call 03-5000 1234/ }),
    ).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("slider")).not.toBeInTheDocument());
    await userEvent.click(within(sheet).getByRole("button", { name: /Call 999/ }));
    expect(await screen.findByRole("slider", { name: /Slide to call 999/ })).toBeInTheDocument();
  });

  it("leaves out the security line when the township has none set", async () => {
    installFakeApi({
      ...hubRoutes,
      "GET /api/township": { status: 500, body: {} },
    });
    await renderApp("/me");
    await userEvent.click(await screen.findByRole("button", { name: /^Help and safety/ }));
    const sheet = await sheetNamed("Help and safety");
    expect(within(sheet).getByRole("button", { name: /Call 999/ })).toBeInTheDocument();
    expect(within(sheet).queryByRole("button", { name: /Township security/ })).toBeNull();
  });
});

describe("Sheets with the browser's own history", () => {
  it("closes on the back button, stays on Profile and keeps focus off the page heading", async () => {
    installFakeApi(hubRoutes);
    window.history.pushState({}, "", "/me");
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>,
    );
    const row = await screen.findByRole("button", { name: /^Help and safety/ });
    await userEvent.click(row);
    await sheetNamed("Help and safety");
    window.history.back();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(window.location.pathname).toBe("/me");
    expect(screen.getByRole("heading", { level: 1, name: "Puan Salmah" })).not.toHaveFocus();
    expect(row).toHaveFocus();
  });

  it("closes with Done and leaves no extra history entry behind", async () => {
    installFakeApi(hubRoutes);
    window.history.pushState({}, "", "/me");
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>,
    );
    await userEvent.click(await screen.findByRole("button", { name: /^Help and safety/ }));
    await sheetNamed("Help and safety");
    expect(window.history.state?.sdhSheet).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(window.history.state?.sdhSheet).toBeUndefined());
    expect(window.location.pathname).toBe("/me");
  });
});
