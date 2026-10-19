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
    expect(document.title).toBe("Health and safety - Help a Neighbour");
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toHaveFocus());
  });
});

describe("tab bar", () => {
  it("marks Home as current on the request screens", async () => {
    installFakeApi({ "GET /api/requests/mine": { body: { requests: [] } } });
    await renderApp("/requests");
    expect(screen.getByRole("button", { name: "Home" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Safety" })).not.toHaveAttribute("aria-current");
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
