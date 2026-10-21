import { beforeEach, describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "../test/renderRoute";
import { installFakeApi, signInAs } from "../test/fakeApi";
import { BADGE, POINTS, REWARD, STREAK, TEAM_CHALLENGE } from "../test/fixtures";
import { malaysiaToday } from "../requests/schedule";

beforeEach(() => signInAs());

const baseRoutes = {
  "GET /api/me/points": { body: POINTS(260) },
  "GET /api/me/streak": { body: STREAK },
  "GET /api/challenges": { body: { challenges: [TEAM_CHALLENGE] } },
  "GET /api/rewards": { body: { rewards: [REWARD] } },
  "GET /api/badges": { body: { badges: [BADGE] } },
};

const alreadyDone = {
  status: 409,
  body: { error: { code: "ALREADY_DONE", message: "done" } },
};

describe("Community Play from the API", () => {
  it("shows live points and streak with no demo labels", async () => {
    installFakeApi(baseRoutes);
    await renderApp("/challenges");
    expect((await screen.findAllByText("260")).length).toBeGreaterThan(0);
    expect(screen.getByText("Community Play")).toBeInTheDocument();
    expect(screen.getByText("Elmina Valley")).toBeInTheDocument();
    expect(screen.queryByText(/demo|example/i)).not.toBeInTheDocument();
  });

  it("checks in with POST and shows the new streak, points and a disabled button", async () => {
    const { calls } = installFakeApi({
      ...baseRoutes,
      "POST /api/me/check-in": {
        body: {
          streak: {
            current: 4,
            best: 5,
            lastCheckInDate: malaysiaToday(),
            recent: [malaysiaToday()],
          },
          pointsAwarded: 10,
          points: 270,
        },
      },
    });
    await renderApp("/challenges");
    await userEvent.click(await screen.findByRole("button", { name: /Check in today/i }));
    expect((await screen.findAllByText("270")).length).toBeGreaterThan(0);
    expect(await screen.findByRole("button", { name: /Checked in today/i })).toBeDisabled();
    expect(calls.filter((c) => c.method === "POST")).toHaveLength(1);
  });

  it("explains kindly when already checked in today", async () => {
    installFakeApi({ ...baseRoutes, "POST /api/me/check-in": alreadyDone });
    await renderApp("/challenges");
    await userEvent.click(await screen.findByRole("button", { name: /Check in today/i }));
    expect(await screen.findByText(/already checked in today/i)).toBeInTheDocument();
  });

  it("shows the team goal for the resident's precinct and adds a part once a day", async () => {
    installFakeApi({
      ...baseRoutes,
      [`POST /api/challenges/${TEAM_CHALLENGE.id}/contribute`]: {
        body: { teamProgress: { precinct: "Elmina Valley", current: 121 }, pointsAwarded: 5 },
      },
    });
    await renderApp("/challenges");
    await userEvent.click(await screen.findByRole("tab", { name: /Goals/i }));
    expect(await screen.findByText("120 / 500 steps")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Add my part today/i }));
    expect(await screen.findByText("121 / 500 steps")).toBeInTheDocument();
  });

  it("handles ALREADY_DONE on contribute with kind words", async () => {
    installFakeApi({
      ...baseRoutes,
      [`POST /api/challenges/${TEAM_CHALLENGE.id}/contribute`]: alreadyDone,
    });
    await renderApp("/challenges");
    await userEvent.click(await screen.findByRole("tab", { name: /Goals/i }));
    await userEvent.click(await screen.findByRole("button", { name: /Add my part today/i }));
    expect(await screen.findByText(/already added your part today/i)).toBeInTheDocument();
  });

  it("explains a missing precinct instead of a generic failure", async () => {
    installFakeApi({
      ...baseRoutes,
      [`POST /api/challenges/${TEAM_CHALLENGE.id}/contribute`]: {
        status: 400,
        body: { error: { code: "VALIDATION_FAILED", message: "Put your precinct in your area" } },
      },
    });
    await renderApp("/challenges");
    await userEvent.click(await screen.findByRole("tab", { name: /Goals/i }));
    await userEvent.click(await screen.findByRole("button", { name: /Add my part today/i }));
    const message = await screen.findByText(/Team goals need your neighbourhood/i);
    for (const precinct of ["Elmina West", "Elmina Valley", "Elmina East", "Central Park"]) {
      expect(message).toHaveTextContent(precinct);
    }
  });

  it("lists rewards cheapest first and says how many points a locked one still needs", async () => {
    const dear = {
      ...REWARD,
      id: "00000000-0000-4000-8000-000000000062",
      title: "Big voucher",
      pointsCost: 400,
      status: "locked",
    };
    const cheap = {
      ...REWARD,
      id: "00000000-0000-4000-8000-000000000063",
      title: "Tea bag",
      pointsCost: 20,
    };
    installFakeApi({
      ...baseRoutes,
      "GET /api/rewards": { body: { rewards: [dear, REWARD, cheap] } },
    });
    await renderApp("/challenges");
    await userEvent.click(await screen.findByRole("tab", { name: /Rewards/i }));
    await screen.findByText("Big voucher");
    const titles = [...document.querySelectorAll(".play-reward__title")].map((n) => n.textContent);
    expect(titles).toEqual(["Tea bag", "Free kopi", "Big voucher"]);
    expect(screen.getByText("140 more points to unlock")).toBeInTheDocument();
    expect(screen.getAllByText(/more points to unlock/)).toHaveLength(1);
  });

  it("uses the singular when a locked reward is one point away", async () => {
    const close = { ...REWARD, pointsCost: 261, status: "locked" };
    installFakeApi({ ...baseRoutes, "GET /api/rewards": { body: { rewards: [close] } } });
    await renderApp("/challenges");
    await userEvent.click(await screen.findByRole("tab", { name: /Rewards/i }));
    expect(await screen.findByText("1 more point to unlock")).toBeInTheDocument();
  });

  it("loads the rewards again after a check-in so unlocked ones can be redeemed", async () => {
    const { calls } = installFakeApi({
      ...baseRoutes,
      "POST /api/me/check-in": {
        body: {
          streak: {
            current: 1,
            best: 1,
            lastCheckInDate: malaysiaToday(),
            recent: [malaysiaToday()],
          },
          pointsAwarded: 10,
          points: 270,
        },
      },
    });
    await renderApp("/challenges");
    await userEvent.click(await screen.findByRole("button", { name: /Check in today/i }));
    await screen.findByRole("button", { name: /Checked in today/i });
    await waitFor(() =>
      expect(calls.filter((c) => c.method === "GET" && c.path === "/api/rewards")).toHaveLength(2),
    );
  });

  it("redeems a reward and deducts the points", async () => {
    let redeemed = false;
    installFakeApi({
      ...baseRoutes,
      "GET /api/rewards": () => ({
        body: {
          rewards: [
            redeemed
              ? { ...REWARD, status: "redeemed", redeemedAt: "2026-10-19T10:00:00Z" }
              : REWARD,
          ],
        },
      }),
      [`POST /api/rewards/${REWARD.id}/redeem`]: () => {
        redeemed = true;
        return {
          body: {
            redemption: {
              rewardId: REWARD.id,
              title: REWARD.title,
              pointsSpent: 80,
              redeemedAt: "2026-10-19T10:00:00Z",
            },
            points: 180,
          },
        };
      },
    });
    await renderApp("/challenges");
    await userEvent.click(await screen.findByRole("tab", { name: /Rewards/i }));
    const card = (await screen.findByText("Free kopi")).closest(".play-reward") as HTMLElement;
    await userEvent.click(within(card).getByRole("button", { name: /^Redeem$/ }));
    expect(await within(card).findByRole("button", { name: /Redeemed/ })).toBeDisabled();
    expect(screen.getAllByText("180").length).toBeGreaterThan(0);
  });

  it("says plainly when the server reports not enough points", async () => {
    installFakeApi({
      ...baseRoutes,
      [`POST /api/rewards/${REWARD.id}/redeem`]: {
        status: 409,
        body: { error: { code: "INSUFFICIENT_POINTS", message: "no" } },
      },
    });
    await renderApp("/challenges");
    await userEvent.click(await screen.findByRole("tab", { name: /Rewards/i }));
    await userEvent.click(await screen.findByRole("button", { name: /^Redeem$/ }));
    expect(await screen.findByText(/do not have enough points/i)).toBeInTheDocument();
  });

  it("disables a reward the resident cannot afford", async () => {
    installFakeApi({ ...baseRoutes, "GET /api/me/points": { body: POINTS(20) } });
    await renderApp("/challenges");
    await userEvent.click(await screen.findByRole("tab", { name: /Rewards/i }));
    expect(await screen.findByRole("button", { name: /Not enough/ })).toBeDisabled();
  });

  it("lists badges from the API", async () => {
    installFakeApi(baseRoutes);
    await renderApp("/challenges");
    await userEvent.click(await screen.findByRole("tab", { name: /Badges/i }));
    expect(await screen.findByText("First step")).toBeInTheDocument();
  });

  it("shows an error with Try again when the streak cannot load", async () => {
    installFakeApi({ ...baseRoutes, "GET /api/me/streak": { status: 500, body: {} } });
    await renderApp("/challenges");
    expect(await screen.findByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("opens the sub-tab named in the URL hash", async () => {
    installFakeApi(baseRoutes);
    await renderApp("/challenges#rewards");
    expect(await screen.findByText("Free kopi")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Rewards/i })).toHaveAttribute("aria-selected", "true");
  });

  it("falls back to the streak tab for an unknown hash", async () => {
    installFakeApi(baseRoutes);
    await renderApp("/challenges#nothing");
    expect(await screen.findByRole("tab", { name: /Streak/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});
