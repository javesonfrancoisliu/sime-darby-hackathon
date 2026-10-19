import { beforeEach, describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommunityEvent } from "@sdh/contracts";
import { renderApp } from "../test/renderRoute";
import { installFakeApi, signInAs } from "../test/fakeApi";
import { ELDER, MAINTENANCE, UPDATE_NOTICE } from "../test/fixtures";

function makeEvent(overrides: Partial<CommunityEvent> = {}): CommunityEvent {
  return CommunityEvent.parse({
    id: "3a5c8e07-be5f-4b88-8c23-5f6ebe6c7d06",
    title: "Morning Yoga",
    category: "health_literacy",
    description: "Gentle stretching",
    startsAt: "2026-10-24T07:00:00+08:00",
    durationMinutes: 60,
    location: { lat: 3.2, lng: 101.5, area: "Central Park" },
    capacity: 12,
    signupCount: 7,
    status: "upcoming",
    createdBy: "4b6d9f18-cf60-4c99-9d34-6a7fcf7d8e07",
    createdAt: "2026-10-01T09:00:00+08:00",
    updatedAt: "2026-10-01T09:00:00+08:00",
    joined: false,
    ...overrides,
  });
}

const yoga = makeEvent();
const market = makeEvent({
  id: "5c7eaf29-d071-4daa-8e45-7b80d08e9f08",
  title: "Farmers Market",
  category: "community_activity",
  capacity: 5,
  signupCount: 5,
});
const doneEvent = makeEvent({
  id: "6d8fb03a-e182-4ebb-9f56-8c91e19fa009",
  title: "Old Picnic",
  status: "completed",
});

beforeEach(() => signInAs());

describe("Community events from the API", () => {
  it("lists upcoming events with real spot counts and sends the sign-in header", async () => {
    const { calls } = installFakeApi({
      "GET /api/events": { body: { events: [yoga, market, doneEvent] } },
    });
    await renderApp("/community");

    expect(await screen.findByText("Morning Yoga")).toBeInTheDocument();
    expect(screen.getByText("Farmers Market")).toBeInTheDocument();
    expect(screen.queryByText("Old Picnic")).not.toBeInTheDocument();
    expect(screen.getByText(/Only/)).toHaveTextContent("Only 5 spots left");
    expect(screen.getByText("This event is full")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Full" })).toBeDisabled();
    expect(screen.getAllByText("Central Park")).toHaveLength(2);

    const call = calls.find((c) => c.path === "/api/events?purpose=activity");
    expect(call?.method).toBe("GET");
    expect(call?.headers["x-demo-user"]).toBe(ELDER.id);
  });

  it("registers with POST /api/events/{id}/join and shows the updated count", async () => {
    const { calls } = installFakeApi({
      "GET /api/events": { body: { events: [yoga] } },
      [`POST /api/events/${yoga.id}/join`]: {
        body: { ...yoga, joined: true, signupCount: 8 },
      },
    });
    await renderApp("/community");
    await userEvent.click(await screen.findByRole("button", { name: /^Register for / }));

    const done = await screen.findByRole("button", { name: /Registered/ });
    expect(done).toHaveAttribute("aria-pressed", "true");
    expect(done).toBeDisabled();
    expect(screen.getByText(/You have a spot/)).toHaveTextContent("4");

    const posts = calls.filter((c) => c.method === "POST");
    expect(posts).toHaveLength(1);
    expect(posts[0]?.path).toBe(`/api/events/${yoga.id}/join`);
    expect(posts[0]?.headers["x-demo-user"]).toBe(ELDER.id);
    expect(posts[0]?.body).toBeUndefined();
  });

  it("shows friendly words when registering fails and lets the person try again", async () => {
    let attempts = 0;
    installFakeApi({
      "GET /api/events": { body: { events: [yoga] } },
      [`POST /api/events/${yoga.id}/join`]: () =>
        ++attempts === 1
          ? { status: 409, body: { error: { code: "CONFLICT", message: "Event is full" } } }
          : { body: { ...yoga, joined: true, signupCount: 8 } },
    });
    await renderApp("/community");
    await userEvent.click(await screen.findByRole("button", { name: /^Register for / }));
    expect(await screen.findByText(/already changed/i)).toBeInTheDocument();
    expect(screen.queryByText("Event is full")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /^Register for / }));
    expect(await screen.findByRole("button", { name: /Registered/ })).toBeInTheDocument();
  });

  it("shows an error with Try again when events cannot load", async () => {
    let attempts = 0;
    installFakeApi({
      "GET /api/events": () =>
        ++attempts === 1
          ? { status: 500, body: { error: { code: "INTERNAL", message: "boom" } } }
          : { body: { events: [yoga] } },
    });
    await renderApp("/community");
    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.queryByText("Morning Yoga at Central Park")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Morning Yoga")).toBeInTheDocument();
  });
});

describe("Notices, volunteering and updates from the API", () => {
  const drive = makeEvent({
    id: "7e90c14b-f293-4fcc-8f67-9da2f2a0b10a",
    title: "Grocery run for neighbours",
    purpose: "volunteer_drive",
    organiser: "Elmina Cares",
    capacity: 10,
    signupCount: 7,
  });

  it("lists maintenance notices and updates, with high priority marked Important", async () => {
    const { calls } = installFakeApi({
      "GET /api/events": { body: { events: [] } },
      "GET /api/notices": (call) => ({
        body: { items: call.path.includes("kind=update") ? [UPDATE_NOTICE] : [MAINTENANCE] },
      }),
    });
    await renderApp("/community");
    await userEvent.click(screen.getByRole("tab", { name: /Notices/ }));
    expect(await screen.findByText("Water supply cut")).toBeInTheDocument();
    expect(screen.getByText("No water in the morning.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: /Updates/ }));
    expect(await screen.findByText("Clinic opens on Saturday")).toBeInTheDocument();
    expect(screen.getByText("Important")).toBeInTheDocument();
    expect(screen.queryByText(/Pinned|Demo data/)).not.toBeInTheDocument();
    expect(calls.some((c) => c.path === "/api/notices?kind=maintenance")).toBe(true);
  });

  it("shows Finished for an in-progress notice whose window has passed", async () => {
    const past = {
      ...MAINTENANCE,
      status: "in_progress" as const,
      windowStart: "2026-01-01T09:00:00+08:00",
      windowEnd: "2026-01-01T12:00:00+08:00",
    };
    installFakeApi({
      "GET /api/events": { body: { events: [] } },
      "GET /api/notices": { body: { items: [past] } },
    });
    await renderApp("/community#maintenance");
    expect(await screen.findByText("Finished")).toBeInTheDocument();
    expect(screen.queryByText("Happening now")).not.toBeInTheDocument();
  });

  it("signs up to a volunteer drive with the join API and keeps it", async () => {
    const { calls } = installFakeApi({
      "GET /api/events": { body: { events: [drive] } },
      [`POST /api/events/${drive.id}/join`]: {
        body: { ...drive, joined: true, signupCount: 8 },
      },
    });
    await renderApp("/community");
    await userEvent.click(screen.getByRole("tab", { name: /Volunteer/i }));
    const card = (await screen.findByText("Grocery run for neighbours")).closest(
      ".safety-card",
    ) as HTMLElement;
    expect(within(card).getByText(/7 \/ 10/)).toBeInTheDocument();
    expect(within(card).getByText(/Elmina Cares/)).toBeInTheDocument();
    await userEvent.click(within(card).getByRole("button", { name: /I can help/i }));
    expect(await within(card).findByText(/8 \/ 10/)).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: /signed up/i })).toBeDisabled();
    expect(calls.filter((c) => c.method === "POST")).toHaveLength(1);
    expect(calls.some((c) => c.path === "/api/events?purpose=volunteer_drive")).toBe(true);
  });

  it("shows an empty state and an error state for notices", async () => {
    installFakeApi({
      "GET /api/events": { body: { events: [] } },
      "GET /api/notices": { body: { items: [] } },
    });
    await renderApp("/community#maintenance");
    expect(await screen.findByText(/no notices right now/i)).toBeInTheDocument();
  });
});

describe("Community deep link", () => {
  it("opens the Notices tab from the Home maintenance card link", async () => {
    installFakeApi({ "GET /api/events": { body: { events: [] } } });
    await renderApp("/community#maintenance");
    expect(screen.getByRole("tab", { name: /Notices/ })).toHaveAttribute("aria-selected", "true");
  });
});
