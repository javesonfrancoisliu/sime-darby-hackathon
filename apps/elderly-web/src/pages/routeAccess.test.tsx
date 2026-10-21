import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { App } from "../App";
import { renderApp } from "../test/renderRoute";
import { installFakeApi, signInAs } from "../test/fakeApi";
import { makeRequest } from "../test/fixtures";

beforeEach(() => signInAs());

describe("page changes", () => {
  it("names the page and moves focus to its heading", async () => {
    installFakeApi({ "GET /api/requests/mine": { body: { requests: [] } } });
    await renderApp("/");
    await userEvent.click(screen.getByRole("button", { name: "Safety" }));
    expect(document.title).toBe("Health and safety - Township Connect");
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toHaveFocus());
  });
});

describe("tab bar", () => {
  it("marks Home as current on the home and ask-for-help screens", async () => {
    installFakeApi({ "GET /api/requests/mine": { body: { requests: [] } } });
    await renderApp("/request");
    expect(screen.getByRole("button", { name: "Home" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Safety" })).not.toHaveAttribute("aria-current");
  });

  it("marks no tab as current on My requests", async () => {
    installFakeApi({ "GET /api/requests/mine": { body: { requests: [] } } });
    await renderApp("/requests");
    expect(screen.getByRole("button", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  it("keeps all five labels without an ellipsis rule", async () => {
    installFakeApi({ "GET /api/requests/mine": { body: { requests: [] } } });
    await renderApp("/community");
    expect(screen.getByRole("button", { name: "Community" })).toBeInTheDocument();
    expect(document.querySelectorAll(".app-tab-bar__label")).toHaveLength(5);
  });

  it("calls the rewards tab Rewards, keeps its route and names the page", async () => {
    installFakeApi({ "GET /api/requests/mine": { body: { requests: [] } } });
    await renderApp("/");
    expect(screen.queryByRole("button", { name: "Play" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Rewards" }));
    expect(document.title).toBe("Rewards - Township Connect");
    expect(await screen.findByRole("heading", { level: 1, name: "Rewards" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rewards" })).toHaveAttribute("aria-current", "page");
  });

  it("has a skip link first that focuses main without changing the hash", async () => {
    installFakeApi({ "GET /api/requests/mine": { body: { requests: [] } } });
    await renderApp("/safety");
    const link = screen.getByRole("link", { name: "Skip to main content" });
    expect(document.querySelector("a, button")).toBe(link);
    await userEvent.click(link);
    expect(document.getElementById("main-content")).toHaveFocus();
    expect(window.location.hash).toBe("");
  });
});

describe("live announcements", () => {
  it("announces that a request was sent", async () => {
    installFakeApi();
    render(
      <MemoryRouter
        initialEntries={[{ pathname: "/request/confirmation", state: { request: makeRequest() } }]}
      >
        <App />
      </MemoryRouter>,
    );
    const status = await screen.findByRole("status");
    await waitFor(() => expect(status).toHaveTextContent("Your request was sent."));
  });
});
