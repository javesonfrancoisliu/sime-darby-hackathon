import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateRequestBody } from "@sdh/contracts";
import { renderApp } from "../test/renderRoute";
import { installFakeApi, signInAs } from "../test/fakeApi";
import { ELDER, makeRequest } from "../test/fixtures";

// 11:00 in Malaysia on Monday 19 Oct 2026: the morning slot is past, the others are open.
const MIDDAY = new Date("2026-10-19T03:00:00Z");

const created = makeRequest({ status: "pending_review" });

function createRoute() {
  return { "POST /api/requests": { status: 201, body: created } };
}

async function pick(name: string | RegExp) {
  await userEvent.click(screen.getByRole("button", { name }));
}

async function walkToConfirm(note = "Milk and bread") {
  await renderApp("/request/groceries");
  if (note) await userEvent.type(screen.getByLabelText(/Tell us more/), note);
  await pick("Next");
  await pick("Today");
  await pick(/Afternoon/);
  await pick("Next");
  await pick("1 hour");
  await pick("Next");
}

beforeEach(() => {
  signInAs();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(MIDDAY);
});
afterEach(() => vi.useRealTimers());

describe("Request flow", () => {
  it("walks note, day and time, length, confirm, then sends the contract body", async () => {
    const { calls } = installFakeApi(createRoute());
    await walkToConfirm();

    expect(screen.getByText("At your home in Elmina Valley")).toBeInTheDocument();
    expect(screen.getByText(/19 Oct|20 Oct/)).toBeInTheDocument();
    expect(screen.getByText("1 hour")).toBeInTheDocument();
    await pick("Send request");
    expect(await screen.findByText("Request sent")).toBeInTheDocument();

    const posts = calls.filter((c) => c.method === "POST");
    expect(posts).toHaveLength(1);
    expect(posts[0]?.path).toBe("/api/requests");
    expect(posts[0]?.headers["x-demo-user"]).toBe(ELDER.id);
    expect(CreateRequestBody.parse(posts[0]?.body)).toEqual({
      category: "groceries",
      title: "Groceries",
      description: "Milk and bread",
      scheduledAt: "2026-10-19T14:00:00+08:00",
      durationMinutes: 60,
      location: { lat: ELDER.location.lat, lng: ELDER.location.lng, area: "Elmina Valley" },
    });
    expect(calls.some((c) => c.method === "GET" && c.path === "/api/me")).toBe(true);
  });

  it("sends tomorrow's date and an empty note when the note is skipped", async () => {
    const { calls } = installFakeApi(createRoute());
    await renderApp("/request/transport");
    await pick("Next");
    await pick("Tomorrow");
    await pick(/Morning/);
    await pick("Next");
    await pick("2 hours");
    await pick("Next");
    await pick("Send request");
    await screen.findByText("Request sent");
    expect(calls.find((c) => c.method === "POST")?.body).toMatchObject({
      category: "transport",
      title: "Transport",
      description: "",
      scheduledAt: "2026-10-20T09:00:00+08:00",
      durationMinutes: 120,
    });
  });

  it("limits the note to 500 letters and shows a counter", async () => {
    installFakeApi();
    await renderApp("/request/groceries");
    const note = screen.getByLabelText(/Tell us more/);
    expect(note).toHaveAttribute("maxlength", "500");
    expect(screen.getByText("0 of 500 letters")).toBeInTheDocument();
    await userEvent.type(note, "Hello there");
    expect(screen.getByText("11 of 500 letters")).toBeInTheDocument();
  });

  it("keeps Next disabled until a day, a time and a length are chosen", async () => {
    installFakeApi();
    await renderApp("/request/groceries");
    await pick("Next");
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    await pick("Tomorrow");
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    await pick(/Evening/);
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
    await pick("Next");
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    await pick("30 minutes");
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
  });

  it("disables time slots that have already passed today but not tomorrow", async () => {
    installFakeApi();
    await renderApp("/request/groceries");
    await pick("Next");
    await pick("Today");
    expect(screen.getByRole("button", { name: /Morning/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Afternoon/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Evening/ })).toBeEnabled();
    await pick("Tomorrow");
    expect(screen.getByRole("button", { name: /Morning/ })).toBeEnabled();
  });

  it("explains when no time is left today", async () => {
    vi.setSystemTime(new Date("2026-10-19T12:30:00Z"));
    installFakeApi();
    await renderApp("/request/groceries");
    await pick("Next");
    await pick("Today");
    for (const name of [/Morning/, /Afternoon/, /Evening/]) {
      expect(screen.getByRole("button", { name })).toBeDisabled();
    }
    expect(screen.getByText(/no more times today/i)).toBeInTheDocument();
  });

  it("drops a chosen time that becomes past when switching to today", async () => {
    installFakeApi();
    await renderApp("/request/groceries");
    await pick("Next");
    await pick("Tomorrow");
    await pick(/Morning/);
    await pick("Today");
    expect(screen.getByRole("button", { name: /Morning/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("goes back one step at a time and keeps the choices", async () => {
    installFakeApi();
    await renderApp("/request/groceries");
    await userEvent.type(screen.getByLabelText(/Tell us more/), "Rice");
    await pick("Next");
    await pick("Tomorrow");
    await pick(/Evening/);
    await pick("Next");
    expect(screen.getByText("Step 3 of 4")).toBeInTheDocument();
    await pick(/back/i);
    expect(screen.getByRole("button", { name: /Evening/ })).toHaveAttribute("aria-pressed", "true");
    await pick(/back/i);
    expect(screen.getByLabelText(/Tell us more/)).toHaveValue("Rice");
  });

  it("sends only once when Send is pressed twice while sending", async () => {
    let finish: () => void = () => {};
    const { calls } = installFakeApi({
      "POST /api/requests": () =>
        new Promise((resolve) => {
          finish = () => resolve({ status: 201, body: created });
        }),
    });
    await walkToConfirm();
    const send = screen.getByRole("button", { name: "Send request" });
    await userEvent.click(send);
    await userEvent.click(screen.getByRole("button", { name: /Sending/ }));
    await userEvent.dblClick(screen.getByRole("button", { name: /Sending/ }));

    expect(screen.getByRole("button", { name: /Sending/ })).toBeDisabled();
    expect(calls.filter((c) => c.method === "POST")).toHaveLength(1);
    finish();
    expect(await screen.findByText("Request sent")).toBeInTheDocument();
    expect(calls.filter((c) => c.method === "POST")).toHaveLength(1);
  });

  it("shows friendly words and Try again on failure, and the retry works", async () => {
    let attempts = 0;
    const { calls } = installFakeApi({
      "POST /api/requests": () =>
        ++attempts === 1
          ? {
              status: 400,
              body: { error: { code: "VALIDATION_FAILED", message: "scheduledAt: Invalid" } },
            }
          : { status: 201, body: created },
    });
    await walkToConfirm();
    await pick("Send request");

    expect(await screen.findByText(/was not accepted/i)).toBeInTheDocument();
    expect(screen.queryByText(/scheduledAt/)).not.toBeInTheDocument();
    await pick("Try again");
    expect(await screen.findByText("Request sent")).toBeInTheDocument();
    expect(calls.filter((c) => c.method === "POST")).toHaveLength(2);
  });

  it("sends the person back to pick a new time when the chosen time has passed", async () => {
    const { calls } = installFakeApi(createRoute());
    await walkToConfirm();
    vi.setSystemTime(new Date("2026-10-19T07:00:00Z"));
    await pick("Send request");

    expect(await screen.findByText(/That time has passed/)).toBeInTheDocument();
    expect(screen.getByText("When?")).toBeInTheDocument();
    expect(calls.filter((c) => c.method === "POST")).toHaveLength(0);
  });

  it("shows a message for an unknown category", async () => {
    installFakeApi();
    await renderApp("/request/volunteer_support");
    expect(screen.getByText(/not recognised/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Choose a category" })).toBeInTheDocument(),
    );
  });

  it("opens the flow for the contract category home_help", async () => {
    installFakeApi();
    await renderApp("/request/home_help");
    expect(screen.getByRole("heading", { name: "Help at home" })).toBeInTheDocument();
  });
});
