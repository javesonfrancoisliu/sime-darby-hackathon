import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "../test/renderRoute";
import { installFakeApi, signInAs } from "../test/fakeApi";
import { ELDER, makeRequest } from "../test/fixtures";

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
      "Groceries",
      "Transport",
      "Phone and computer help",
      "Help at home",
      "Health help",
    ]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    await userEvent.click(screen.getByRole("button", { name: "Groceries" }));
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

describe("Request detail", () => {
  it("shows the title, when and where, not the request id", async () => {
    installFakeApi({ [`GET /api/requests/${open.id}`]: { body: open } });
    await renderApp(`/requests/${open.id}`);
    expect(await screen.findByRole("heading", { name: "Groceries" })).toBeInTheDocument();
    expect(screen.queryByText(new RegExp(open.id))).not.toBeInTheDocument();
    expect(screen.getByText(/At your home in Elmina Valley/)).toBeInTheDocument();
    expect(screen.getByText("Not matched yet")).toBeInTheDocument();
  });

  it("shows the volunteer name when matched and hides Cancel", async () => {
    installFakeApi({ [`GET /api/requests/${matched.id}`]: { body: matched } });
    await renderApp(`/requests/${matched.id}`);
    expect(await screen.findByText("Aisha")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel request" })).not.toBeInTheDocument();
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
    expect(await screen.findByText(/could not find that/i)).toBeInTheDocument();
  });
});

describe("Cancel flow", () => {
  for (const status of ["pending_review", "open"] as const) {
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

describe("Demo data", () => {
  it("shows a Demo data banner and demo requests only when switched on", async () => {
    vi.stubEnv("VITE_USE_MOCK", "true");
    window.localStorage.clear();
    const { fetchMock } = installFakeApi();
    await renderApp("/requests");
    expect(await screen.findByText(/Demo data/)).toBeInTheDocument();
    expect(await screen.findByText("Aisha Rahman")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows no banner and no demo requests in live mode", async () => {
    installFakeApi(listOf());
    await renderApp("/requests");
    await screen.findByText(/no requests yet/i);
    expect(screen.queryByText(/Demo data/)).not.toBeInTheDocument();
  });
});
