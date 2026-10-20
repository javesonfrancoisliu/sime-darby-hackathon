import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PutSettingsBody, UpdateMeBody, User } from "@sdh/contracts";
import { describe, expect, it, vi } from "vitest";

import { installFakeApi, signInAs } from "../../test/fakeApi";
import { makeReward, VOLUNTEER } from "../../test/fixtures";
import { renderApp } from "../../test/renderApp";
import { signedInRoutes } from "../../test/routes";

const signedIn = (overrides: Record<string, unknown> = {}) => signedInRoutes(VOLUNTEER, overrides);

describe("profile page", () => {
  it("offers the local sign-in and no profile when signed out", async () => {
    installFakeApi({ "GET /api/demo/users": { body: { users: [] } } });
    renderApp("/profile");
    expect(
      await screen.findByText("No people are set up yet. Please ask the team to add them."),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Your profile")).not.toBeInTheDocument();
    expect(screen.queryByText(/pnpm|db:seed/)).not.toBeInTheDocument();
  });

  it("shows the signed-in user name and area", async () => {
    installFakeApi(signedIn());
    signInAs(VOLUNTEER.id);
    renderApp("/profile");
    const card = await screen.findByLabelText("Your profile");
    expect(within(card).getByText(VOLUNTEER.name)).toBeInTheDocument();
    expect(within(card).getByText(VOLUNTEER.area)).toBeInTheDocument();
  });

  it("shows the volunteer level and progress from completed contributions", async () => {
    installFakeApi(
      signedIn({
        "GET /api/contributions/mine": {
          body: { totalMinutes: 300, completedCount: 5, items: [] },
        },
      }),
    );
    signInAs(VOLUNTEER.id);
    renderApp("/profile");
    expect(
      await screen.findByText("Lv. 2 Community Helper", {}, { timeout: 5_000 }),
    ).toBeInTheDocument();
    expect(screen.getByText("5 / 10 tasks")).toBeInTheDocument();
    expect(screen.getByText("5 more tasks to reach Community Champion")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Volunteer level progress" })).toHaveAttribute(
      "aria-valuenow",
      "5",
    );
    expect(screen.queryByText("Verified volunteer")).not.toBeInTheDocument();
  });

  it("keeps the previous initials in the avatar while the name is cleared", async () => {
    installFakeApi(signedIn());
    signInAs(VOLUNTEER.id);
    renderApp("/profile");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Edit personal information" }));
    const dialog = await screen.findByRole("dialog");
    await user.clear(within(dialog).getByLabelText("Display name"));
    expect(dialog.querySelector(".ui-avatar")).not.toHaveTextContent("?");
  });

  it("describes saved preferences without implying a fresh save", async () => {
    installFakeApi(signedIn());
    signInAs(VOLUNTEER.id);
    renderApp("/profile");
    expect(
      await screen.findByText(
        "Your skills and availability are saved to your account and used for volunteer matching.",
      ),
    ).toBeInTheDocument();
  });

  it("saves the name and area with PATCH /api/me and shows the reply", async () => {
    const { calls } = installFakeApi({
      ...signedIn(),
      "PATCH /api/me": ({ body }) => ({ body: User.parse({ ...VOLUNTEER, ...(body as object) }) }),
    });
    signInAs(VOLUNTEER.id);
    renderApp("/profile");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Edit personal information" }));
    const dialog = await screen.findByRole("dialog");
    const name = within(dialog).getByLabelText("Display name");
    await user.clear(name);
    await user.type(name, "Aisha R");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const patch = calls.find((c) => c.method === "PATCH");
    expect(patch?.path).toBe("/api/me");
    expect(patch?.headers["x-demo-user"]).toBe(VOLUNTEER.id);
    expect(UpdateMeBody.parse(patch?.body)).toEqual({ name: "Aisha R", area: VOLUNTEER.area });
    expect(within(screen.getByLabelText("Your profile")).getByText("Aisha R")).toBeInTheDocument();
  });

  it("sends skills and availability slots when preferences are saved", async () => {
    const { calls } = installFakeApi({
      ...signedIn(),
      "PATCH /api/me": ({ body }) => ({ body: User.parse({ ...VOLUNTEER, ...(body as object) }) }),
    });
    signInAs(VOLUNTEER.id);
    renderApp("/profile");
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: "Volunteering preferences. Show details" }),
    );
    await user.click(screen.getByRole("button", { name: "Edit volunteer preferences" }));
    const dialog = await screen.findByRole("dialog");
    const skills = within(dialog).getByRole("group", { name: "Skills" });
    await user.click(within(skills).getByRole("button", { name: "Groceries" }));
    const days = within(dialog).getByRole("group", { name: "Preferred days" });
    await user.click(within(days).getByRole("button", { name: "Weekends" }));
    const times = within(dialog).getByRole("group", { name: "Preferred time of day" });
    await user.click(within(times).getByRole("button", { name: "Morning" }));
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const body = UpdateMeBody.parse(calls.find((c) => c.method === "PATCH")?.body);
    expect(body.skills).toEqual(["groceries"]);
    expect(body.availability).toEqual([
      { day: "sat", start: "08:00", end: "12:00" },
      { day: "sun", start: "08:00", end: "12:00" },
    ]);
  });

  it("leaves the stored availability alone when only skills change", async () => {
    const scheduled = User.parse({
      ...VOLUNTEER,
      availability: [{ day: "mon", start: "09:00", end: "11:00" }],
    });
    const { calls } = installFakeApi({
      ...signedIn({ "GET /api/me": { body: scheduled } }),
      "PATCH /api/me": ({ body }) => ({ body: User.parse({ ...scheduled, ...(body as object) }) }),
    });
    signInAs(scheduled.id);
    renderApp("/profile");
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: "Volunteering preferences. Show details" }),
    );
    await user.click(screen.getByRole("button", { name: "Edit volunteer preferences" }));
    const dialog = await screen.findByRole("dialog");
    const skills = within(dialog).getByRole("group", { name: "Skills" });
    await user.click(within(skills).getByRole("button", { name: "Groceries" }));
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const body = UpdateMeBody.parse(calls.find((c) => c.method === "PATCH")?.body);
    expect(body).toEqual({ skills: ["groceries"] });
  });

  it("asks for a day and a time together instead of wiping availability", async () => {
    const { calls } = installFakeApi(signedIn());
    signInAs(VOLUNTEER.id);
    renderApp("/profile");
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: "Volunteering preferences. Show details" }),
    );
    await user.click(screen.getByRole("button", { name: "Edit volunteer preferences" }));
    const dialog = await screen.findByRole("dialog");
    const days = within(dialog).getByRole("group", { name: "Preferred days" });
    await user.click(within(days).getByRole("button", { name: "Weekends" }));
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await within(dialog).findByText(/at least one day and one time/)).toBeInTheDocument();
    expect(calls.some((c) => c.method === "PATCH")).toBe(false);
  });

  it("limits the display name field to the contract length", async () => {
    const { calls } = installFakeApi(signedIn());
    signInAs(VOLUNTEER.id);
    renderApp("/profile");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Edit personal information" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText("Display name")).toHaveAttribute("maxlength", "80");
    expect(calls.some((c) => c.method === "PATCH")).toBe(false);
  });

  it("keeps the dialog open and shows the error when saving fails", async () => {
    installFakeApi({
      ...signedIn(),
      "PATCH /api/me": {
        status: 400,
        body: { error: { code: "VALIDATION_FAILED", message: "Name is too long" } },
      },
    });
    signInAs(VOLUNTEER.id);
    renderApp("/profile");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Edit personal information" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await within(dialog).findByText("Name is too long")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("saves interests and languages with PATCH /api/me", async () => {
    const { calls } = installFakeApi({
      ...signedIn(),
      "PATCH /api/me": ({ body }) => ({ body: User.parse({ ...VOLUNTEER, ...(body as object) }) }),
    });
    signInAs(VOLUNTEER.id);
    renderApp("/profile");
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: "Volunteering preferences. Show details" }),
    );
    await user.click(screen.getByRole("button", { name: "Edit volunteer preferences" }));
    const dialog = await screen.findByRole("dialog");
    const interests = within(dialog).getByRole("group", { name: "Assistance interests" });
    await user.click(within(interests).getByRole("button", { name: "Transport" }));
    const languages = within(dialog).getByRole("group", { name: "Communication languages" });
    await user.click(within(languages).getByRole("button", { name: "Bahasa Melayu" }));
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const body = UpdateMeBody.parse(calls.find((c) => c.method === "PATCH")?.body);
    expect(body).toEqual({ interests: ["transport"], languages: ["ms"] });
  });

  it("saves a settings toggle with PUT /api/me/settings", async () => {
    const { calls } = installFakeApi({
      ...signedIn(),
      "PUT /api/me/settings": ({ body }) => ({
        body: { ...(body as object), updatedAt: "2026-10-19T00:00:00Z" },
      }),
    });
    signInAs(VOLUNTEER.id);
    renderApp("/profile");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Settings. Show details" }));
    const toggle = await screen.findByRole("switch", { name: /Volunteering updates/ });
    await waitFor(() => expect(toggle).toBeEnabled());
    expect(toggle).not.toBeChecked();
    await user.click(toggle);

    await waitFor(() => expect(calls.some((c) => c.method === "PUT")).toBe(true));
    const put = calls.find((c) => c.method === "PUT");
    expect(put?.path).toBe("/api/me/settings");
    expect(PutSettingsBody.parse(put?.body)).toMatchObject({ notifyVolunteering: true });
  });

  it("saves the leaderboard choice with PATCH /api/me", async () => {
    const { calls } = installFakeApi({
      ...signedIn(),
      "PATCH /api/me": ({ body }) => ({ body: User.parse({ ...VOLUNTEER, ...(body as object) }) }),
    });
    signInAs(VOLUNTEER.id);
    renderApp("/profile");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Settings. Show details" }));
    await user.click(await screen.findByRole("switch", { name: /Show me on the leaderboard/ }));

    await waitFor(() => expect(calls.some((c) => c.method === "PATCH")).toBe(true));
    expect(UpdateMeBody.parse(calls.find((c) => c.method === "PATCH")?.body)).toEqual({
      leaderboardOptIn: true,
    });
    expect(screen.getByRole("switch", { name: /Show me on the leaderboard/ })).toBeChecked();
  });

  it("turns on larger text and applies the comfort sizing to the app shell", async () => {
    installFakeApi(signedIn());
    signInAs(VOLUNTEER.id);
    const { container } = renderApp("/profile");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Settings. Show details" }));
    const toggle = await screen.findByRole("switch", { name: /Larger text/ });
    expect(toggle).not.toBeChecked();
    expect(container.querySelector(".app-shell")).not.toHaveClass("easy-view");

    await user.click(toggle);

    await waitFor(() => expect(toggle).toBeChecked());
    expect(container.querySelector(".app-shell")).toHaveClass("easy-view");
  });

  it("lists the redeemed rewards with their date", async () => {
    installFakeApi(
      signedIn({
        "GET /api/rewards": {
          body: {
            rewards: [
              makeReward({
                title: "Coffee voucher",
                status: "redeemed",
                redeemedAt: "2026-10-18T02:00:00Z",
              }),
              makeReward({ id: "0a1b2c3d-9999-4a99-8a99-000000000009", title: "Tote bag" }),
            ],
          },
        },
      }),
    );
    signInAs(VOLUNTEER.id);
    renderApp("/profile");

    expect(await screen.findByText("Coffee voucher")).toBeInTheDocument();
    expect(screen.getByText(/Expires 17 Nov 2026/)).toBeInTheDocument();
    expect(screen.queryByText("Tote bag")).not.toBeInTheDocument();
  });

  it("keeps a voucher usable after redemption and marks it claimed only after use", async () => {
    let used = false;
    const reward = makeReward({ status: "redeemed", redeemedAt: "2026-10-18T02:00:00Z" });
    const usedAt = "2026-10-20T02:00:00Z";
    const { calls } = installFakeApi(
      signedIn({
        "GET /api/rewards": () => ({
          body: { rewards: [{ ...reward, usedAt: used ? usedAt : undefined }] },
        }),
        [`POST /api/rewards/${reward.id}/use`]: () => {
          used = true;
          return {
            body: {
              rewardId: reward.id,
              title: reward.title,
              pointsSpent: reward.pointsCost,
              redeemedAt: reward.redeemedAt,
              usedAt,
            },
          };
        },
      }),
    );
    signInAs(VOLUNTEER.id);
    renderApp("/profile");
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Use now" }));
    await user.click(screen.getByRole("button", { name: "Not yet" }));
    expect(calls.some((call) => call.method === "POST")).toBe(false);
    await user.click(screen.getByRole("button", { name: "Use now" }));
    await user.click(screen.getByRole("button", { name: "Yes, use now" }));
    expect(await screen.findByText("Claimed")).toBeInTheDocument();
    expect(screen.getByText("Claimed 20 Oct 2026")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Use now" })).not.toBeInTheDocument();
    expect(calls.filter((call) => call.method === "POST")).toHaveLength(1);
  });

  it("opens the Rewards tab directly from My rewards", async () => {
    installFakeApi(signedIn());
    signInAs(VOLUNTEER.id);
    renderApp("/profile");
    const user = userEvent.setup();
    const link = await screen.findByRole("link", { name: "See available rewards in Challenges" });
    expect(link).toHaveAttribute("href", "/community/challenges?tab=rewards");
    await user.click(link);
    expect(await screen.findByRole("tab", { name: "Rewards" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("heading", { name: "Rewards & Vouchers" })).toBeInTheDocument();
  });

  it("does not offer Use now for an expired voucher", async () => {
    installFakeApi(
      signedIn({
        "GET /api/rewards": {
          body: {
            rewards: [
              makeReward({
                status: "redeemed",
                redeemedAt: "2020-01-01T00:00:00Z",
                expiresAt: "2020-01-31T00:00:00Z",
              }),
            ],
          },
        },
      }),
    );
    signInAs(VOLUNTEER.id);
    renderApp("/profile");
    expect(await screen.findByText("Expired 31 Jan 2020")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Use now" })).not.toBeInTheDocument();
  });

  it("hides the local sign-in picker in a build that switches it off", async () => {
    vi.stubEnv("VITE_DEMO_SIGN_IN", "false");
    const { calls } = installFakeApi();
    renderApp("/profile");
    expect(await screen.findByText("Please sign in")).toBeInTheDocument();
    expect(screen.queryByLabelText("Local sign-in")).not.toBeInTheDocument();
    expect(calls.some((c) => c.path.startsWith("/api/demo/users"))).toBe(false);
  });
});
