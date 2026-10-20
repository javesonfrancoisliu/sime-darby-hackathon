import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { installFakeApi, signInAs } from "../../test/fakeApi";
import { makeDrive, makeEvent, makeMaintenance, makeNotice, VOLUNTEER } from "../../test/fixtures";
import { renderApp } from "../../test/renderApp";
import { signedInRoutes } from "../../test/routes";

const EVENT = makeEvent({ title: "Live tea morning" });
const DRIVE = makeDrive();
const URGENT = makeNotice({
  id: "0a1b2c3d-4444-4a44-8a44-000000000004",
  title: "Water cut tonight",
  priority: "high",
  publishedAt: "2026-10-15T09:00:00Z",
});

const feedRoutes = signedInRoutes(VOLUNTEER, {
  "GET /api/notices": { body: { items: [makeNotice(), makeMaintenance(), URGENT] } },
  "GET /api/events": { body: { events: [EVENT, DRIVE] } },
});

async function selectCategory(name: string) {
  await userEvent.setup().click(await screen.findByRole("tab", { name }));
}

describe("community page", () => {
  it("tracks and completes joined volunteer drives in the Community Volunteer tab", async () => {
    let completed = false;
    const drive = makeDrive({ joined: true });
    installFakeApi({
      ...feedRoutes,
      "GET /api/events": () => ({
        body: {
          events: [
            { ...drive, attendanceCompletedAt: completed ? new Date().toISOString() : undefined },
          ],
        },
      }),
      [`POST /api/events/${drive.id}/attendance/complete`]: () => {
        completed = true;
        return { body: { ...drive, attendanceCompletedAt: new Date().toISOString() } };
      },
    });
    signInAs(VOLUNTEER.id);
    renderApp("/community");
    await screen.findByRole("tab", { name: "Volunteer" });
    expect(screen.queryByLabelText(`Accepted task: ${drive.title}`)).not.toBeInTheDocument();
    await selectCategory("Volunteer");
    const card = await screen.findByLabelText(`Accepted task: ${drive.title}`);
    await userEvent.click(within(card).getByRole("button", { name: "Confirm completion" }));
    await userEvent.click(screen.getByRole("button", { name: "Yes, completed" }));
    expect(await screen.findByRole("dialog", { name: "Marked as completed" })).toBeVisible();
    expect(
      within(screen.getByLabelText(`Accepted task: ${drive.title}`)).getByText("Completed"),
    ).toBeVisible();
  });
  it("switches between events, notices, volunteering and updates", async () => {
    installFakeApi(feedRoutes);
    signInAs(VOLUNTEER.id);
    renderApp("/community");

    expect(await screen.findByLabelText("Event: Live tea morning")).toBeInTheDocument();
    await selectCategory("Volunteer");
    expect(screen.queryByLabelText("Event: Live tea morning")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Volunteering: River clean-up drive")).toBeInTheDocument();
    await selectCategory("Notices");
    expect(screen.getByLabelText("Maintenance: Lift service at Block C")).toBeInTheDocument();
    await selectCategory("Updates");
    expect(screen.getByLabelText("Township update: New recycling hours")).toBeInTheDocument();
    expect(screen.queryByText("Elmina")).not.toBeInTheDocument();
    expect(screen.getByText("2 updates shown")).toBeInTheDocument();
  });

  it("keeps high priority updates in the feed without a featured card", async () => {
    installFakeApi(feedRoutes);
    signInAs(VOLUNTEER.id);
    renderApp("/community");

    await selectCategory("Updates");
    expect(await screen.findByLabelText("Township update: Water cut tonight")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Featured update" })).not.toBeInTheDocument();
  });

  it("expands and collapses update details while keeping the priority visible", async () => {
    installFakeApi(feedRoutes);
    signInAs(VOLUNTEER.id);
    renderApp("/community");
    const user = userEvent.setup();

    await selectCategory("Updates");
    const card = await screen.findByLabelText("Township update: Water cut tonight");
    const toggle = within(card).getByRole("button", { name: "Water cut tonight. Show details" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(within(card).getByText(URGENT.description)).toBeInTheDocument();
    expect(within(card).getByText("High priority")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Featured update")).not.toBeInTheDocument();
  });

  it("shows a maintenance window on one line when it starts and ends the same day", async () => {
    installFakeApi(feedRoutes);
    signInAs(VOLUNTEER.id);
    renderApp("/community");
    await selectCategory("Notices");
    const card = await screen.findByLabelText("Maintenance: Lift service at Block C");
    expect(within(card).getByText("21 Oct 2026, 9:00 am – 1:00 pm")).toBeInTheDocument();
  });

  it("says it could not sign you up when a drive join fails", async () => {
    installFakeApi({
      ...feedRoutes,
      [`POST /api/events/${DRIVE.id}/join`]: {
        status: 409,
        body: { error: { code: "CONFLICT", message: "No slots left" } },
      },
    });
    signInAs(VOLUNTEER.id);
    renderApp("/community");
    const user = userEvent.setup();

    await selectCategory("Volunteer");
    const card = await screen.findByLabelText("Volunteering: River clean-up drive");
    await user.click(within(card).getByRole("button", { name: "Join" }));
    // A yes/no confirmation now precedes the join.
    await user.click(await screen.findByRole("button", { name: "Yes, join" }));
    expect(await screen.findByRole("dialog", { name: "Couldn't sign you up" })).toBeVisible();
  });

  it("shows free slots on a volunteer drive", async () => {
    installFakeApi(feedRoutes);
    signInAs(VOLUNTEER.id);
    renderApp("/community");

    await selectCategory("Volunteer");
    const card = await screen.findByLabelText("Volunteering: River clean-up drive");
    expect(within(card).getByText("6 slots left")).toBeInTheDocument();
    expect(within(card).getByText("Green Elmina")).toBeInTheDocument();
  });

  it("joins a volunteer drive through the join endpoint and shows the saved state", async () => {
    let joined = false;
    const { calls } = installFakeApi({
      ...feedRoutes,
      "GET /api/events": () => ({
        body: { events: [EVENT, { ...DRIVE, joined, signupCount: joined ? 5 : 4 }] },
      }),
      [`POST /api/events/${DRIVE.id}/join`]: () => {
        joined = true;
        return { body: { ...DRIVE, joined: true } };
      },
    });
    signInAs(VOLUNTEER.id);
    renderApp("/community");
    const user = userEvent.setup();

    await selectCategory("Volunteer");
    const card = await screen.findByLabelText("Volunteering: River clean-up drive");
    await user.click(within(card).getByRole("button", { name: "Join" }));
    await user.click(await screen.findByRole("button", { name: "Yes, join" }));

    expect(
      await screen.findByRole("dialog", { name: "You're signed up to volunteer" }),
    ).toBeVisible();
    expect(calls.find((c) => c.method === "POST")?.path).toBe(`/api/events/${DRIVE.id}/join`);
    expect(
      await within(screen.getByLabelText("Volunteering: River clean-up drive")).findByText(
        /signed up/,
      ),
    ).toBeInTheDocument();
  });

  it("reports the error when the community feed cannot load", async () => {
    installFakeApi({
      ...feedRoutes,
      "GET /api/events": {
        status: 500,
        body: { error: { code: "INTERNAL", message: "Events are down" } },
      },
    });
    signInAs(VOLUNTEER.id);
    renderApp("/community");

    expect(await screen.findByText("Couldn't load community updates")).toBeInTheDocument();
    expect(screen.getByText("Events are down")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    // The notices that did load stay available.
    await selectCategory("Updates");
    expect(screen.getByLabelText("Township update: New recycling hours")).toBeInTheDocument();
  });

  it("registers with the signed-in user id and the join endpoint", async () => {
    const { calls } = installFakeApi({
      ...feedRoutes,
      [`POST /api/events/${EVENT.id}/join`]: { body: { ...EVENT, joined: true } },
    });
    signInAs(VOLUNTEER.id);
    renderApp("/community");
    const user = userEvent.setup();

    await user.click(
      within(await screen.findByLabelText("Event: Live tea morning")).getByRole("button", {
        name: /details/i,
      }),
    );
    await user.click(
      within(screen.getByLabelText("Event: Live tea morning")).getByRole("button", {
        name: "Register",
      }),
    );
    // A yes/no confirmation now precedes registration.
    await user.click(await screen.findByRole("button", { name: "Yes, register" }));

    expect(await screen.findByRole("dialog", { name: "You're registered" })).toBeInTheDocument();
    const post = calls.find((c) => c.method === "POST");
    expect(post?.path).toBe(`/api/events/${EVENT.id}/join`);
    expect(post?.headers["x-demo-user"]).toBe(VOLUNTEER.id);
  });
});
