import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "../test/renderRoute";
import { installFakeApi, signInAs } from "../test/fakeApi";

const TOP = { top: 0, left: 0, behavior: "instant" };

beforeEach(() => signInAs());

describe("Scroll and focus on page change", () => {
  it("starts the category list at the top with the heading focused", async () => {
    installFakeApi();
    await renderApp("/request");
    expect(window.scrollTo).toHaveBeenCalledWith(TOP);
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toHaveFocus());
  });

  it("returns to the top when a category opens the flow", async () => {
    installFakeApi();
    await renderApp("/request");
    vi.mocked(window.scrollTo).mockClear();
    await userEvent.click(screen.getAllByRole("button", { name: /^Grocery Trip Together/ })[0]!);
    expect(window.scrollTo).toHaveBeenCalledWith(TOP);
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toHaveFocus());
  });

  it("returns to the top and focuses the heading on each step", async () => {
    installFakeApi();
    await renderApp("/request/groceries");
    vi.mocked(window.scrollTo).mockClear();
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    const heading = screen.getByRole("heading", { level: 1, name: "When and how long?" });
    expect(window.scrollTo).toHaveBeenCalledWith(TOP);
    await waitFor(() => expect(heading).toHaveFocus());
  });

  it("keeps the browser's scroll position when going back, and still focuses the heading", async () => {
    installFakeApi();
    await renderApp("/request");
    await userEvent.click(screen.getAllByRole("button", { name: /^Grocery Trip Together/ })[0]!);
    vi.mocked(window.scrollTo).mockClear();
    await userEvent.click(screen.getByRole("button", { name: "Go Back" }));
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toHaveFocus());
    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});
