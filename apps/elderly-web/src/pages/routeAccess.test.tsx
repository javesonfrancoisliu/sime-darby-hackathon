import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
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
    await renderApp("/safety");
    expect(document.title).toBe("Health and safety - Township Connect");
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toHaveFocus());
  });
});

describe("tab bar", () => {
  it("marks Home as current on the home and ask-for-help screens", async () => {
    installFakeApi({ "GET /api/requests/mine": { body: { requests: [] } } });
    await renderApp("/");
    expect(screen.getByRole("button", { name: "Home" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Help request" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("marks Help request as current on the request screens and not Home", async () => {
    installFakeApi({ "GET /api/requests/mine": { body: { requests: [] } } });
    await renderApp("/request");
    expect(screen.getByRole("button", { name: "Help request" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("button", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  it("lists Home, Community, Help request, Play, Profile in that order with no Safety tab", async () => {
    installFakeApi({ "GET /api/requests/mine": { body: { requests: [] } } });
    await renderApp("/community");
    const labels = Array.from(document.querySelectorAll(".app-tab-bar__label")).map(
      (el) => el.textContent,
    );
    expect(labels).toEqual(["Home", "Community", "Help request", "Play", "Profile"]);
    const bar = screen.getByRole("navigation", { name: "Main navigation" });
    expect(within(bar).queryByRole("button", { name: "Safety" })).not.toBeInTheDocument();
    expect(within(bar).queryByRole("button", { name: "Rewards" })).not.toBeInTheDocument();
  });

  it("opens the request flow from the raised centre button with a keyboard", async () => {
    installFakeApi({ "GET /api/requests/mine": { body: { requests: [] } } });
    await renderApp("/community");
    const centre = screen.getByRole("button", { name: "Help request" });
    centre.focus();
    await userEvent.keyboard("{Enter}");
    expect(await screen.findByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(document.title).toBe("Ask for help - Township Connect");
    expect(screen.getByRole("button", { name: "Help request" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("opens Play from its tab and marks it current", async () => {
    installFakeApi({ "GET /api/requests/mine": { body: { requests: [] } } });
    await renderApp("/");
    await userEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(document.title).toBe("Play - Township Connect");
    expect(screen.getByRole("button", { name: "Play" })).toHaveAttribute("aria-current", "page");
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
