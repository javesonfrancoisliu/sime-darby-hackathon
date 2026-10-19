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

describe("community page", () => {
  it("shows notices, volunteer drives and events in one feed", async () => {
    installFakeApi(feedRoutes);
    signInAs(VOLUNTEER.id);
    renderApp("/community");

    expect(await screen.findByLabelText("Event: Live tea morning")).toBeInTheDocument();
    expect(screen.getByLabelText("Volunteering: River clean-up drive")).toBeInTheDocument();
    expect(screen.getByLabelText("Maintenance: Lift service at Block C")).toBeInTheDocument();
    expect(screen.getByLabelText("Township update: New recycling hours")).toBeInTheDocument();
    expect(screen.getByText("Elmina")).toBeInTheDocument();
    expect(screen.getByText("5 updates shown")).toBeInTheDocument();
  });

  it("features the high priority update even when it is not the newest", async () => {
    installFakeApi(feedRoutes);
    signInAs(VOLUNTEER.id);
    renderApp("/community");

    const featured = await screen.findByRole("region", { name: "Featured update" });
    expect(within(featured).getByText("Water cut tonight")).toBeInTheDocument();
  });

  it("shows the high priority badge in the update dialog and one featured heading", async () => {
    installFakeApi(feedRoutes);
    signInAs(VOLUNTEER.id);
    renderApp("/community");
    const user = userEvent.setup();

    const card = await screen.findByLabelText("Township update: Water cut tonight");
    await user.click(within(card).getByRole("button", { name: "Read more" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("High priority")).toBeInTheDocument();
    expect(screen.getAllByText("Featured update")).toHaveLength(1);
  });

  it("shows a maintenance window on one line when it starts and ends the same day", async () => {
    installFakeApi(feedRoutes);
    signInAs(VOLUNTEER.id);
    renderApp("/community");
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
    // The notices that did load stay visible.
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
      within(await screen.findByLabelText(/Live tea morning/)).getByRole("button", {
        name: /details/i,
      }),
    );
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Register to attend" }));
    // A yes/no confirmation now precedes registration.
    await user.click(await screen.findByRole("button", { name: "Yes, register" }));

    expect(await screen.findByRole("dialog", { name: "You're registered" })).toBeInTheDocument();
    const post = calls.find((c) => c.method === "POST");
    expect(post?.path).toBe(`/api/events/${EVENT.id}/join`);
    expect(post?.headers["x-demo-user"]).toBe(VOLUNTEER.id);
  });
});
