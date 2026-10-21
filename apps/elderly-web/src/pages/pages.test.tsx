import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "../test/renderRoute";
import { installFakeApi, signInAs } from "../test/fakeApi";
import { AIR, ELDER, HEAT, makeRequest } from "../test/fixtures";

const open = makeRequest({ id: "9d2f5c74-8b2c-4e55-9f90-2c3b8e3f4a03" });
const matched = makeRequest({
  id: "1e3a6d85-9c3d-4f66-8a01-3d4c9f4a5b04",
  category: "transport",
  title: "Transport",
  description: "Lift to clinic",
  status: "matched",
  volunteerName: "Aisha",
});
const checking = makeRequest({
  id: "2f4b7e96-ad4e-4a77-9b12-4e5dad5b6c05",
  status: "pending_review",
});

const listOf = (...requests: unknown[]) => ({ "GET /api/requests/mine": { body: { requests } } });

beforeEach(() => signInAs());
afterEach(() => vi.useRealTimers());

describe("Home + navigation", () => {
  it("greets the signed-in resident and shows both primary actions", async () => {
    installFakeApi(listOf());
    await renderApp("/");
    expect(await screen.findByText(ELDER.name)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request help" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View my requests" })).toBeInTheDocument();
  });

  it("names the area and reading time on the air quality card", async () => {
    installFakeApi({
      ...listOf(),
      "GET /api/safety": { body: { readings: [AIR, HEAT], facilityReports: [] } },
    });
    await renderApp("/");
    expect(await screen.findByText("Air Quality (Haze)")).toBeInTheDocument();
    expect(screen.getAllByText(/^Updated /).length).toBeGreaterThan(0);
  });

  it("shows the title and plain status of recent requests", async () => {
    installFakeApi(listOf(open, matched));
    await renderApp("/");
    expect(await screen.findByText("Finding a volunteer")).toBeInTheDocument();
    expect(screen.getByText("Volunteer coming")).toBeInTheDocument();
  });

  it("non-home screen shows a back control", async () => {
    installFakeApi();
    await renderApp("/request");
    expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
  });
});

describe("Category selection", () => {
  it("offers five categories with simple names and routes on selection", async () => {
    installFakeApi();
    await renderApp("/request");
    for (const name of [
      /^Grocery Trip Together/,
      /^Transport to Amenities/,
      /^Digital Literacy Guidance/,
      /^Youth Support & Repairs/,
      /^Health Literacy & Events/,
    ]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    await userEvent.click(screen.getByRole("button", { name: /^Grocery Trip Together/ }));
    expect(screen.getByLabelText(/Tell us more/)).toBeInTheDocument();
  });
});

describe("Requests list", () => {
  it("shows the empty state with a create action", async () => {
    installFakeApi(listOf());
    await renderApp("/requests");
    expect(await screen.findByText(/no requests yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request help" })).toBeInTheDocument();
  });

  it("shows a friendly error with Try again, never the raw server text", async () => {
    let attempts = 0;
    installFakeApi({
      "GET /api/requests/mine": () =>
        ++attempts === 1
          ? { status: 500, body: { error: { code: "INTERNAL", message: "stack trace here" } } }
          : { body: { requests: [open] } },
    });
    await renderApp("/requests");
    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.queryByText(/stack trace/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Groceries")).toBeInTheDocument();
  });

  it("renders title, time and plain status for each request", async () => {
    installFakeApi(listOf(checking, matched));
    await renderApp("/requests");
    expect(await screen.findByText("Being checked")).toBeInTheDocument();
    expect(screen.getByText("Volunteer coming")).toBeInTheDocument();
    expect(screen.getByText("Lift to clinic")).toBeInTheDocument();
    expect(screen.getByText("Aisha")).toBeInTheDocument();
    expect(screen.getAllByText(/20 Oct/).length).toBe(2);
  });

  it("shows a volunteer accepting without a reload", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let current = open;
    installFakeApi({ "GET /api/requests/mine": () => ({ body: { requests: [current] } }) });
    await renderApp("/requests");
    expect(await screen.findByText("Finding a volunteer")).toBeInTheDocument();

    current = makeRequest({ ...open, status: "matched", volunteerName: "Aisha" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(await screen.findByText("Volunteer coming")).toBeInTheDocument();
    expect(screen.getByText("Aisha")).toBeInTheDocument();
  });
});

describe("Notes with line breaks", () => {
  const multi = makeRequest({
    id: "3a5c8fa7-be5f-4b88-8c23-5f6ebe6c7d06",
    description: "Milk\nBread\nEggs",
    status: "matched",
    volunteerName: "Aisha",
  });

  it("keeps the line breaks in the list", async () => {
    installFakeApi(listOf(multi));
    await renderApp("/requests");
    expect(await screen.findByText(/Milk/)).toHaveClass("text-multiline");
  });

  it("keeps the line breaks in the detail", async () => {
    installFakeApi({ [`GET /api/requests/${multi.id}`]: { body: multi } });
    await renderApp(`/requests/${multi.id}`);
    expect(await screen.findByText(/Milk/)).toHaveClass("text-multiline");
  });
});

describe("Cancelled after a volunteer was matched", () => {
  const cancelled = makeRequest({
    id: "4b6d9ab8-cf6a-4c99-9d34-6a7fcf7d8e07",
    description: "Lift to clinic",
    status: "cancelled",
    volunteerName: "Aisha",
  });

  it("keeps showing the volunteer on the list and the detail", async () => {
    installFakeApi({
      ...listOf(cancelled),
      [`GET /api/requests/${cancelled.id}`]: { body: cancelled },
    });
    const { unmount } = await renderApp("/requests");
    expect(await screen.findByText("Aisha")).toBeInTheDocument();
    unmount();
    await renderApp(`/requests/${cancelled.id}`);
    expect(await screen.findByText("Aisha")).toBeInTheDocument();
    expect(screen.queryByText("No volunteer")).not.toBeInTheDocument();
  });

  it("still says No volunteer when none was ever matched", async () => {
    const never = makeRequest({ ...cancelled, volunteerName: undefined });
    installFakeApi({ [`GET /api/requests/${never.id}`]: { body: never } });
    await renderApp(`/requests/${never.id}`);
    expect(await screen.findByText("No volunteer")).toBeInTheDocument();
  });

  it("keeps a wrapped description left aligned", async () => {
    installFakeApi({ [`GET /api/requests/${cancelled.id}`]: { body: cancelled } });
    await renderApp(`/requests/${cancelled.id}`);
    expect(await screen.findByText("Lift to clinic")).toHaveClass("apple-inset-value--wrap");
  });
});

describe("Request detail", () => {
  it("shows the title, when and where, not the request id", async () => {
    installFakeApi({ [`GET /api/requests/${open.id}`]: { body: open } });
    await renderApp(`/requests/${open.id}`);
    expect(await screen.findByRole("heading", { name: "Groceries" })).toBeInTheDocument();
    expect(screen.queryByText(new RegExp(open.id))).not.toBeInTheDocument();
    expect(screen.getByText(/At your home in Elmina Valley/)).toBeInTheDocument();
    expect(screen.getByText("Not matched yet")).toBeInTheDocument();
  });

  it("shows the volunteer name when matched and offers Cancel with a warning for the volunteer", async () => {
    installFakeApi({ [`GET /api/requests/${matched.id}`]: { body: matched } });
    await renderApp(`/requests/${matched.id}`);
    expect(await screen.findByText("Aisha")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cancel request" }));
    expect(screen.getByText(/Your volunteer will be told/)).toBeInTheDocument();
  });

  it("shows the team's note on a rejected request and hides Cancel", async () => {
    const rejected = makeRequest({ status: "rejected", reviewNote: "Please add more detail" });
    installFakeApi({ [`GET /api/requests/${rejected.id}`]: { body: rejected } });
    await renderApp(`/requests/${rejected.id}`);
    expect(await screen.findByText("Please add more detail")).toBeInTheDocument();
    expect(screen.getByText("Not accepted")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel request" })).not.toBeInTheDocument();
  });

  it("explains an unknown request in plain words", async () => {
    installFakeApi({
      [`GET /api/requests/${open.id}`]: {
        status: 404,
        body: { error: { code: "NOT_FOUND", message: "Request not found" } },
      },
    });
    await renderApp(`/requests/${open.id}`);
    expect(await screen.findByText("We could not find this request.")).toBeInTheDocument();
  });
});

describe("Cancel flow", () => {
  for (const status of ["pending_review", "open", "matched"] as const) {
    it(`cancels a ${status} request after a confirmation`, async () => {
      const req = makeRequest({ status });
      const { calls } = installFakeApi({
        [`GET /api/requests/${req.id}`]: { body: req },
        [`POST /api/requests/${req.id}/cancel`]: { body: { ...req, status: "cancelled" } },
      });
      await renderApp(`/requests/${req.id}`);
      await userEvent.click(await screen.findByRole("button", { name: "Cancel request" }));
      expect(calls.some((c) => c.method === "POST")).toBe(false);

      await userEvent.click(screen.getByRole("button", { name: "Yes, cancel request" }));
      expect(await screen.findByText("Cancelled")).toBeInTheDocument();
      expect(calls.filter((c) => c.method === "POST")).toHaveLength(1);
      expect(screen.queryByRole("button", { name: "Cancel request" })).not.toBeInTheDocument();
    });
  }

  it("moves focus into the confirmation, then announces the cancellation", async () => {
    const req = makeRequest({ status: "open" });
    installFakeApi({
      [`GET /api/requests/${req.id}`]: { body: req },
      [`POST /api/requests/${req.id}/cancel`]: { body: { ...req, status: "cancelled" } },
    });
    await renderApp(`/requests/${req.id}`);
    await userEvent.click(await screen.findByRole("button", { name: "Cancel request" }));
    expect(screen.getByText("This request will be closed.").parentElement).toHaveFocus();

    await userEvent.click(screen.getByRole("button", { name: "Yes, cancel request" }));
    expect(await screen.findByText("Your request was cancelled.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: req.title })).toHaveFocus();
  });

  it("keeps the status and explains in plain words when cancel is refused", async () => {
    installFakeApi({
      [`GET /api/requests/${open.id}`]: { body: open },
      [`POST /api/requests/${open.id}/cancel`]: {
        status: 409,
        body: { error: { code: "CONFLICT", message: "Already matched" } },
      },
    });
    await renderApp(`/requests/${open.id}`);
    await userEvent.click(await screen.findByRole("button", { name: "Cancel request" }));
    await userEvent.click(screen.getByRole("button", { name: "Yes, cancel request" }));
    expect(await screen.findByText(/already changed/i)).toBeInTheDocument();
    expect(screen.queryByText("Already matched")).not.toBeInTheDocument();
    expect(screen.getByText("Finding a volunteer")).toBeInTheDocument();
  });
});

describe("Confirm a volunteer came", () => {
  const done = makeRequest({ status: "completed", volunteerName: "Aisha" });

  it("asks once, posts the confirmation and then thanks the resident", async () => {
    const { calls } = installFakeApi({
      [`GET /api/requests/${done.id}`]: { body: done },
      [`POST /api/requests/${done.id}/confirm`]: {
        body: { ...done, confirmedAt: "2026-10-19T10:00:00Z" },
      },
    });
    await renderApp(`/requests/${done.id}`);
    expect(await screen.findByText("Did your volunteer come?")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Yes, they helped me" }));
    expect(await screen.findByText("Thank you, you confirmed")).toBeInTheDocument();
    expect(screen.queryByText("Did your volunteer come?")).not.toBeInTheDocument();
    expect(calls.filter((c) => c.method === "POST")).toHaveLength(1);
  });

  it("says waiting for confirmation until the resident confirms", async () => {
    installFakeApi({ [`GET /api/requests/${done.id}`]: { body: done } });
    await renderApp(`/requests/${done.id}`);
    await screen.findByText("Did your volunteer come?");
    expect(screen.getByText("Waiting for your confirmation")).toBeInTheDocument();
    expect(screen.queryByText("Completed")).not.toBeInTheDocument();
  });

  it("shows the success box with a check once confirmed", async () => {
    const confirmed = makeRequest({ ...done, confirmedAt: "2026-10-19T10:00:00Z" });
    installFakeApi({ [`GET /api/requests/${confirmed.id}`]: { body: confirmed } });
    await renderApp(`/requests/${confirmed.id}`);
    const box = (await screen.findByText("Thank you, you confirmed")).closest(
      ".apple-confirm-card",
    );
    expect(box).toHaveClass("apple-confirm-card--success");
    expect(box?.querySelector("svg")).not.toBeNull();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.queryByText("Waiting for your confirmation")).not.toBeInTheDocument();
  });

  it("wraps a very long volunteer name inside its chip", async () => {
    const long = makeRequest({ ...done, volunteerName: "A".repeat(80) });
    installFakeApi({ [`GET /api/requests/${long.id}`]: { body: long } });
    await renderApp(`/requests/${long.id}`);
    const name = await screen.findByText("A".repeat(80));
    expect(name).toHaveClass("apple-volunteer-chip__name");
  });

  it("shows the thank you straight away when already confirmed", async () => {
    const confirmed = makeRequest({ ...done, confirmedAt: "2026-10-19T10:00:00Z" });
    installFakeApi({ [`GET /api/requests/${confirmed.id}`]: { body: confirmed } });
    await renderApp(`/requests/${confirmed.id}`);
    expect(await screen.findByText("Thank you, you confirmed")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Yes, they helped me" })).not.toBeInTheDocument();
  });

  it("treats ALREADY_DONE as confirmed", async () => {
    installFakeApi({
      [`GET /api/requests/${done.id}`]: { body: done },
      [`POST /api/requests/${done.id}/confirm`]: {
        status: 409,
        body: { error: { code: "ALREADY_DONE", message: "done" } },
      },
    });
    await renderApp(`/requests/${done.id}`);
    await userEvent.click(await screen.findByRole("button", { name: "Yes, they helped me" }));
    expect(await screen.findByText("Thank you, you confirmed")).toBeInTheDocument();
  });

  it("does not ask while the request is not completed", async () => {
    installFakeApi({ [`GET /api/requests/${matched.id}`]: { body: matched } });
    await renderApp(`/requests/${matched.id}`);
    await screen.findByText("Aisha");
    expect(screen.queryByText("Did your volunteer come?")).not.toBeInTheDocument();
  });
});
