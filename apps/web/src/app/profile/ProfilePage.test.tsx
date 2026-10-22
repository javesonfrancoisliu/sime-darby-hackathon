import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PutSettingsBody, UpdateMeBody, User } from "@sdh/contracts";
import { describe, expect, it, vi } from "vitest";

import { installFakeApi, signInAs } from "../../test/fakeApi";
import { makeReward, SETTINGS, VOLUNTEER } from "../../test/fixtures";
import { renderApp } from "../../test/renderApp";
import { signedInRoutes } from "../../test/routes";

const signedIn = (overrides: Record<string, unknown> = {}) => signedInRoutes(VOLUNTEER, overrides);

// The toast region that announces a finished save.
const savedNotice = () => screen.queryByText("Saved")?.closest("[role=status][aria-live=polite]");

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
    await userEvent.setup().click(await screen.findByRole("button", { name: /^My details/ }));
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

  it("offers the four precincts and keeps the current one selected", async () => {
    installFakeApi(signedIn());
    signInAs(VOLUNTEER.id);
    renderApp("/profile");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Edit personal information" }));
    const dialog = await screen.findByRole("dialog");
    const group = within(dialog).getByRole("group", { name: "Township / neighbourhood" });
    expect(
      within(group)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(["Elmina West", "Elmina Valley", "Elmina East", "Central Park"]);
    expect(within(group).getByRole("button", { name: VOLUNTEER.area })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(dialog).queryByText(/Choose your precinct/)).not.toBeInTheDocument();
  });

  it("asks a person with an older free-text area to choose a precinct", async () => {
    const legacy = User.parse({ ...VOLUNTEER, area: "Precinct 1" });
    const { calls } = installFakeApi({
      ...signedIn({ "GET /api/me": { body: legacy } }),
      "PATCH /api/me": ({ body }) => ({ body: User.parse({ ...legacy, ...(body as object) }) }),
    });
    signInAs(legacy.id);
    renderApp("/profile");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Edit personal information" }));
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText("Choose your precinct to join team challenges"),
    ).toBeInTheDocument();
    const group = within(dialog).getByRole("group", { name: "Township / neighbourhood" });
    for (const pill of within(group).getAllByRole("button")) {
      expect(pill).toHaveAttribute("aria-pressed", "false");
    }
    await user.click(within(group).getByRole("button", { name: "Central Park" }));
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(UpdateMeBody.parse(calls.find((c) => c.method === "PATCH")?.body)).toEqual({
      name: legacy.name,
      area: "Central Park",
    });
  });

  it("sends skills and availability slots when preferences are saved", async () => {
    const { calls } = installFakeApi({
      ...signedIn(),
      "PATCH /api/me": ({ body }) => ({ body: User.parse({ ...VOLUNTEER, ...(body as object) }) }),
    });
    signInAs(VOLUNTEER.id);
    renderApp("/profile");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /^My details/ }));
    await user.click(await screen.findByRole("button", { name: "Edit preferences" }));
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

    await user.click(await screen.findByRole("button", { name: /^My details/ }));
    await user.click(await screen.findByRole("button", { name: "Edit preferences" }));
    const dialog = await screen.findByRole("dialog");
    const skills = within(dialog).getByRole("group", { name: "Skills" });
    await user.click(within(skills).getByRole("button", { name: "Groceries" }));
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const body = UpdateMeBody.parse(calls.find((c) => c.method === "PATCH")?.body);
    expect(body).toEqual({ skills: ["groceries"] });
  });

  it("shows a custom saved slot exactly instead of a lossy summary", async () => {
    const scheduled = User.parse({
      ...VOLUNTEER,
      availability: [{ day: "mon", start: "09:00", end: "11:00" }],
    });
    installFakeApi(signedIn({ "GET /api/me": { body: scheduled } }));
    signInAs(scheduled.id);
    renderApp("/profile");
    await userEvent.setup().click(await screen.findByRole("button", { name: /^My details/ }));

    expect(await screen.findByText("Mon 09:00 to 11:00")).toBeInTheDocument();
    expect(screen.queryByText("Weekdays")).not.toBeInTheDocument();
    expect(screen.queryByText("Morning")).not.toBeInTheDocument();
  });

  it("asks for a day and a time together instead of wiping availability", async () => {
    const { calls } = installFakeApi(signedIn());
    signInAs(VOLUNTEER.id);
    renderApp("/profile");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /^My details/ }));
    await user.click(await screen.findByRole("button", { name: "Edit preferences" }));
    const dialog = await screen.findByRole("dialog");
    const days = within(dialog).getByRole("group", { name: "Preferred days" });
    await user.click(within(days).getByRole("button", { name: "Weekends" }));
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await within(dialog).findByText(/at least one day and one time/)).toBeInTheDocument();
    expect(calls.some((c) => c.method === "PATCH")).toBe(false);

    // Fixing the form clears the message straight away.
    await user.click(within(days).getByRole("button", { name: "Weekends" }));
    expect(within(dialog).queryByText(/at least one day and one time/)).not.toBeInTheDocument();
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

    await user.click(await screen.findByRole("button", { name: /^My details/ }));
    await user.click(await screen.findByRole("button", { name: "Edit preferences" }));
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

    await user.click(await screen.findByRole("button", { name: /^Settings/ }));
    const toggle = await screen.findByRole("switch", { name: /Volunteering updates/ });
    await waitFor(() => expect(toggle).toBeEnabled());
    expect(toggle).not.toBeChecked();
    await user.click(toggle);

    await waitFor(() => expect(calls.some((c) => c.method === "PUT")).toBe(true));
    const put = calls.find((c) => c.method === "PUT");
    expect(put?.path).toBe("/api/me/settings");
    expect(PutSettingsBody.parse(put?.body)).toMatchObject({ notifyVolunteering: true });
  });

  it("says Saved after a settings toggle is saved", async () => {
    installFakeApi({
      ...signedIn(),
      "PUT /api/me/settings": ({ body }) => ({
        body: { ...(body as object), updatedAt: "2026-10-19T00:00:00Z" },
      }),
    });
    signInAs(VOLUNTEER.id);
    renderApp("/profile");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /^Settings/ }));
    const toggle = await screen.findByRole("switch", { name: /Volunteering updates/ });
    await waitFor(() => expect(toggle).toBeEnabled());
    await user.click(toggle);

    await waitFor(() => expect(savedNotice()).toBeInTheDocument());
  });

  it("shows an error with Try again when a settings toggle fails, then saves on retry", async () => {
    let attempts = 0;
    installFakeApi({
      ...signedIn(),
      "PUT /api/me/settings": ({ body }) => {
        attempts += 1;
        return attempts === 1
          ? { status: 500, body: { error: { code: "INTERNAL", message: "Please try later" } } }
          : { body: { ...(body as object), updatedAt: "2026-10-19T00:00:00Z" } };
      },
    });
    signInAs(VOLUNTEER.id);
    renderApp("/profile");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /^Settings/ }));
    const toggle = await screen.findByRole("switch", { name: /Volunteering updates/ });
    await waitFor(() => expect(toggle).toBeEnabled());
    await user.click(toggle);

    expect(await screen.findByRole("alert")).toHaveTextContent("Please try later");
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => expect(savedNotice()).toBeInTheDocument());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(attempts).toBe(2);
  });

  it("says Saved after personal details and preferences are saved", async () => {
    installFakeApi({
      ...signedIn(),
      "PATCH /api/me": ({ body }) => ({ body: User.parse({ ...VOLUNTEER, ...(body as object) }) }),
    });
    signInAs(VOLUNTEER.id);
    renderApp("/profile");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Edit personal information" }));
    let dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(savedNotice()).toBeInTheDocument();

    await user.click(await screen.findByRole("button", { name: /^My details/ }));
    await user.click(await screen.findByRole("button", { name: "Edit preferences" }));
    dialog = await screen.findByRole("dialog");
    await user.click(
      within(within(dialog).getByRole("group", { name: "Skills" })).getByRole("button", {
        name: "Groceries",
      }),
    );
    await user.click(within(dialog).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(savedNotice()).toBeInTheDocument();
  });

  it("saves the Rankings choice with PATCH /api/me", async () => {
    const { calls } = installFakeApi({
      ...signedIn(),
      "PATCH /api/me": ({ body }) => ({ body: User.parse({ ...VOLUNTEER, ...(body as object) }) }),
    });
    signInAs(VOLUNTEER.id);
    renderApp("/profile");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /^Settings/ }));
    await user.click(await screen.findByRole("switch", { name: /Show me in Rankings/ }));

    await waitFor(() => expect(calls.some((c) => c.method === "PATCH")).toBe(true));
    expect(UpdateMeBody.parse(calls.find((c) => c.method === "PATCH")?.body)).toEqual({
      leaderboardOptIn: true,
    });
    expect(screen.getByRole("switch", { name: /Show me in Rankings/ })).toBeChecked();
  });

  it("turns on larger text and applies the comfort sizing to the app shell", async () => {
    const { calls } = installFakeApi({
      ...signedIn(),
      "PUT /api/me/settings": ({ body }) => ({
        body: { ...(body as object), updatedAt: "2026-10-19T00:00:00Z" },
      }),
    });
    signInAs(VOLUNTEER.id);
    const { container } = renderApp("/profile");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /^Settings/ }));
    const toggle = await screen.findByRole("switch", { name: /Larger text/ });
    expect(toggle).not.toBeChecked();
    expect(container.querySelector(".app-shell")).not.toHaveClass("easy-view");

    await user.click(toggle);

    await waitFor(() => expect(toggle).toBeChecked());
    expect(container.querySelector(".app-shell")).toHaveClass("easy-view");
    await waitFor(() => expect(calls.some((c) => c.method === "PUT")).toBe(true));
    expect(PutSettingsBody.parse(calls.find((c) => c.method === "PUT")?.body)).toMatchObject({
      fontSize: "large",
      notifyEvents: true,
    });
  });

  it("loads larger text from the account and saves normal when it is turned off", async () => {
    const { calls } = installFakeApi({
      ...signedIn(),
      "GET /api/me/settings": { body: { ...SETTINGS, fontSize: "large" } },
      "PUT /api/me/settings": ({ body }) => ({
        body: { ...(body as object), updatedAt: "2026-10-19T00:00:00Z" },
      }),
    });
    signInAs(VOLUNTEER.id);
    const { container } = renderApp("/profile");
    const user = userEvent.setup();

    await waitFor(() => expect(container.querySelector(".app-shell")).toHaveClass("easy-view"));
    await user.click(await screen.findByRole("button", { name: /^Settings/ }));
    const toggle = await screen.findByRole("switch", { name: /Larger text/ });
    expect(toggle).toBeChecked();

    await user.click(toggle);

    await waitFor(() => expect(toggle).not.toBeChecked());
    await waitFor(() => expect(calls.some((c) => c.method === "PUT")).toBe(true));
    expect(PutSettingsBody.parse(calls.find((c) => c.method === "PUT")?.body).fontSize).toBe(
      "normal",
    );
  });

  it("puts larger text back and shows the error when saving fails", async () => {
    installFakeApi(
      signedIn({
        "PUT /api/me/settings": {
          status: 500,
          body: { error: { code: "INTERNAL", message: "Could not save" } },
        },
      }),
    );
    signInAs(VOLUNTEER.id);
    renderApp("/profile");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /^Settings/ }));
    const toggle = await screen.findByRole("switch", { name: /Larger text/ });
    await user.click(toggle);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    await waitFor(() => expect(toggle).not.toBeChecked());
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
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /^My rewards/ }));

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
    await user.click(await screen.findByRole("button", { name: /^My rewards/ }));
    await user.click(await screen.findByRole("button", { name: "Use Coffee voucher" }));
    await user.click(screen.getByRole("button", { name: "Not yet" }));
    expect(calls.some((call) => call.method === "POST")).toBe(false);
    await user.click(screen.getByRole("button", { name: "Use Coffee voucher" }));
    await user.click(screen.getByRole("button", { name: "Yes, use now" }));
    expect(await screen.findByText("Claimed")).toBeInTheDocument();
    expect(screen.getByText("Claimed 20 Oct 2026")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Use Coffee voucher" })).not.toBeInTheDocument();
    expect(calls.filter((call) => call.method === "POST")).toHaveLength(1);
  });

  it("opens the Rewards tab directly from My rewards", async () => {
    installFakeApi(signedIn());
    signInAs(VOLUNTEER.id);
    renderApp("/profile");
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /^My rewards/ }));
    const link = await screen.findByRole("link", { name: "See available rewards" });
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
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /^My rewards/ }));
    expect(await screen.findByText("Expired 31 Jan 2020")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Use Coffee voucher" })).not.toBeInTheDocument();
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
