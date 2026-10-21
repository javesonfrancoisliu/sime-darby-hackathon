import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { App } from "../App";
import { dialNumber } from "../ui/CallConfirm";
import { installFakeApi, signInAs } from "../test/fakeApi";
import { ELDER } from "../test/fixtures";
import { renderApp, renderRoute } from "../test/renderRoute";

beforeEach(() => signInAs());

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

describe("session load failure", () => {
  it("shows the page frame, kinder words, a working Try again and the 999 call", async () => {
    let attempts = 0;
    installFakeApi({
      "GET /api/me": () =>
        ++attempts === 1
          ? { status: 500, body: { error: { code: "INTERNAL", message: "boom" } } }
          : { body: ELDER },
      "GET /api/requests/mine": { body: { requests: [] } },
    });
    renderRoute(<App />, "/");

    expect(
      await screen.findByRole("heading", { name: "We could not load your details" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("We could not reach the service right now. Please try again in a moment."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Call 999/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "We could not load your details" })).toBeNull(),
    );
    expect(await screen.findByText("Puan Salmah")).toBeInTheDocument();
  });
});

describe("request detail not found", () => {
  it("says the request cannot be found and links back to the list", async () => {
    installFakeApi({
      "GET /api/requests/nope": {
        status: 404,
        body: { error: { code: "NOT_FOUND", message: "x" } },
      },
      "GET /api/requests/mine": { body: { requests: [] } },
    });
    await renderApp("/requests/nope");
    expect(await screen.findByText("We could not find this request.")).toBeInTheDocument();
    expect(screen.queryByText(/was not accepted/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Back to my requests/ }));
    expect(await screen.findByRole("heading", { name: /my requests/i })).toBeInTheDocument();
  });

  it("treats a malformed id (400) the same way", async () => {
    installFakeApi({
      "GET /api/requests/bad": {
        status: 400,
        body: { error: { code: "VALIDATION_FAILED", message: "x" } },
      },
    });
    await renderApp("/requests/bad");
    expect(await screen.findByText("We could not find this request.")).toBeInTheDocument();
  });
});

describe("unknown paths", () => {
  it("says the page was not found and offers a way back to home", async () => {
    installFakeApi({ "GET /api/requests/mine": { body: { requests: [] } } });
    render(
      <MemoryRouter initialEntries={["/", "/nonsense/path"]} initialIndex={1}>
        <App />
        <Where />
      </MemoryRouter>,
    );
    expect(await screen.findByText("We could not find that page.")).toBeInTheDocument();
    expect(screen.getByTestId("where")).toHaveTextContent("/nonsense/path");
    await userEvent.click(screen.getByRole("button", { name: "Go to Home" }));
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent(/^\/$/));
  });
});

describe("missing fields in API replies", () => {
  it("still shows Rewards when the streak has no recent days", async () => {
    installFakeApi({
      "GET /api/me/streak": { body: { current: 1, best: 1 } },
      "GET /api/me/points": { body: { points: 0 } },
    });
    await renderApp("/challenges");
    expect(await screen.findByRole("heading", { level: 1 })).toBeInTheDocument();
  });
});

describe("dialling", () => {
  it("opens a tel link without replacing the page address", () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      expect(this.getAttribute("href")).toBe("tel:999");
    });
    const before = window.location.href;
    dialNumber("999");
    expect(click).toHaveBeenCalledTimes(1);
    expect(window.location.href).toBe(before);
    click.mockRestore();
  });
});
