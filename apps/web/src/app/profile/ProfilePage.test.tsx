import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UpdateMeBody, User } from "@sdh/contracts";
import { describe, expect, it, vi } from "vitest";

import { installFakeApi, signInAs } from "../../test/fakeApi";
import { VOLUNTEER } from "../../test/fixtures";
import { renderApp } from "../../test/renderApp";

describe("profile page", () => {
  it("labels the profile as demo data when signed out", async () => {
    installFakeApi({ "GET /api/demo/users": { body: { users: [] } } });
    renderApp("/profile");
    const card = await screen.findByLabelText("Your profile");
    expect(within(card).getByText("Alex Tan")).toBeInTheDocument();
    expect(within(card).getByText("Demo data")).toBeInTheDocument();
  });

  it("explains in plain words when no demo people exist yet", async () => {
    installFakeApi({ "GET /api/demo/users": { body: { users: [] } } });
    renderApp("/profile");
    expect(
      await screen.findByText("No demo people are set up yet. Please ask the team to add them."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/pnpm|db:seed/)).not.toBeInTheDocument();
  });

  it("shows the signed-in user name and area without a demo label", async () => {
    installFakeApi({ "GET /api/me": { body: VOLUNTEER } });
    signInAs(VOLUNTEER.id);
    renderApp("/profile");
    const card = await screen.findByLabelText("Your profile");
    expect(within(card).getByText(VOLUNTEER.name)).toBeInTheDocument();
    expect(within(card).getByText(VOLUNTEER.area)).toBeInTheDocument();
    expect(within(card).queryByText("Demo data")).not.toBeInTheDocument();
    expect(screen.queryByText("Alex Tan")).not.toBeInTheDocument();
  });

  it("saves the name and area with PATCH /api/me and shows the reply", async () => {
    const { calls } = installFakeApi({
      "GET /api/me": { body: VOLUNTEER },
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
      "GET /api/me": { body: VOLUNTEER },
      "PATCH /api/me": ({ body }) => ({ body: User.parse({ ...VOLUNTEER, ...(body as object) }) }),
    });
    signInAs(VOLUNTEER.id);
    renderApp("/profile");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Edit volunteer preferences" }));
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
      "GET /api/me": { body: scheduled },
      "PATCH /api/me": ({ body }) => ({ body: User.parse({ ...scheduled, ...(body as object) }) }),
    });
    signInAs(scheduled.id);
    renderApp("/profile");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Edit volunteer preferences" }));
    const dialog = await screen.findByRole("dialog");
    const skills = within(dialog).getByRole("group", { name: "Skills" });
    await user.click(within(skills).getByRole("button", { name: "Groceries" }));
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const body = UpdateMeBody.parse(calls.find((c) => c.method === "PATCH")?.body);
    expect(body).toEqual({ skills: ["groceries"] });
  });

  it("asks for a day and a time together instead of wiping availability", async () => {
    const { calls } = installFakeApi({ "GET /api/me": { body: VOLUNTEER } });
    signInAs(VOLUNTEER.id);
    renderApp("/profile");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Edit volunteer preferences" }));
    const dialog = await screen.findByRole("dialog");
    const days = within(dialog).getByRole("group", { name: "Preferred days" });
    await user.click(within(days).getByRole("button", { name: "Weekends" }));
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await within(dialog).findByText(/at least one day and one time/)).toBeInTheDocument();
    expect(calls.some((c) => c.method === "PATCH")).toBe(false);
  });

  it("limits the display name field to the contract length", async () => {
    const { calls } = installFakeApi({ "GET /api/me": { body: VOLUNTEER } });
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
      "GET /api/me": { body: VOLUNTEER },
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

  it("hides the demo sign-in picker in a build that switches it off", async () => {
    vi.stubEnv("VITE_DEMO_SIGN_IN", "false");
    const { calls } = installFakeApi({ "GET /api/demo/users": { body: { users: [] } } });
    renderApp("/profile");
    await screen.findByLabelText("Your profile");
    expect(screen.queryByLabelText("Demo sign-in")).not.toBeInTheDocument();
    expect(calls.some((c) => c.path.startsWith("/api/demo/users"))).toBe(false);
  });
});
