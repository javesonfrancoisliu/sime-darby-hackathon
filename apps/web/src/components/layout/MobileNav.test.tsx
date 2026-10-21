import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { installFakeApi, signInAs } from "../../test/fakeApi";
import { ELDER, VOLUNTEER } from "../../test/fixtures";
import { renderApp } from "../../test/renderApp";
import { signedInRoutes } from "../../test/routes";

function bar() {
  return within(screen.getAllByRole("navigation", { name: "Primary" }).at(-1)!);
}

async function openAs(user: typeof VOLUNTEER | typeof ELDER, path: string) {
  installFakeApi(signedInRoutes(user));
  signInAs(user.id);
  renderApp(path);
  await screen.findByRole("heading", { level: 1 });
}

describe("mobile bottom bar", () => {
  it("lists Home, Community, Volunteer, Play, Profile in order with their links", async () => {
    await openAs(VOLUNTEER, "/");
    const links = bar().getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual([
      "Home",
      "Community",
      "Volunteer",
      "Play",
      "Profile",
    ]);
    expect(links.map((l) => l.getAttribute("href"))).toEqual([
      "/",
      "/community",
      "/volunteer",
      "/community/challenges",
      "/profile",
    ]);
    expect(bar().queryByRole("link", { name: "Safety" })).not.toBeInTheDocument();
  });

  it("names the raised centre button Volunteer and marks it current on its page", async () => {
    await openAs(VOLUNTEER, "/volunteer");
    const centre = bar().getByRole("link", { name: "Volunteer" });
    expect(centre).toHaveClass("app-mobilenav-link--centre");
    expect(centre).toHaveAttribute("aria-current", "page");
    expect(bar().getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  it("lights Play and not Community on the Challenges page, keeping deep links", async () => {
    await openAs(VOLUNTEER, "/community/challenges?tab=rewards");
    expect(bar().getByRole("link", { name: "Play" })).toHaveAttribute("aria-current", "page");
    expect(bar().getByRole("link", { name: "Community" })).not.toHaveAttribute("aria-current");
  });

  it("lights Community, not Play, on the Community page", async () => {
    await openAs(VOLUNTEER, "/community?tab=events");
    expect(bar().getByRole("link", { name: "Community" })).toHaveAttribute("aria-current", "page");
    expect(bar().getByRole("link", { name: "Play" })).not.toHaveAttribute("aria-current");
  });

  it("opens the Volunteer page with the keyboard from the centre button", async () => {
    await openAs(VOLUNTEER, "/");
    const user = userEvent.setup();
    const centre = bar().getByRole("link", { name: "Volunteer" });
    centre.focus();
    expect(centre).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("heading", { name: "Volunteer nearby" })).toBeInTheDocument();
    expect(bar().getByRole("link", { name: "Volunteer" })).toHaveAttribute("aria-current", "page");
  });

  it("tabs through the five items in order", async () => {
    await openAs(VOLUNTEER, "/");
    const user = userEvent.setup();
    bar().getByRole("link", { name: "Community" }).focus();
    await user.tab();
    expect(bar().getByRole("link", { name: "Volunteer" })).toHaveFocus();
    await user.tab();
    expect(bar().getByRole("link", { name: "Play" })).toHaveFocus();
  });

  it("keeps the shared list for a resident, with no Volunteer or Play", async () => {
    await openAs(ELDER, "/");
    expect(
      bar()
        .getAllByRole("link")
        .map((l) => l.textContent),
    ).toEqual(["Home", "Safety", "Community", "Profile"]);
  });
});
