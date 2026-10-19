import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { installFakeApi, signInAs } from "./test/fakeApi";
import { TOWNSHIP, VOLUNTEER } from "./test/fixtures";
import { renderApp } from "./test/renderApp";
import { signedInRoutes } from "./test/routes";

const PAGES: [path: string, title: string][] = [
  ["/", `Welcome to ${TOWNSHIP.name} - Help a Neighbour`],
  ["/community", "Neighbourhood Hub - Help a Neighbour"],
  ["/community/challenges", "Community Challenges - Help a Neighbour"],
  ["/volunteer", "Volunteer nearby - Help a Neighbour"],
  ["/safety", "Health & Safety - Help a Neighbour"],
  ["/profile", "Profile - Help a Neighbour"],
];

async function settled() {
  await waitFor(() => {
    expect(screen.queryByRole("status", { name: /Loading/ })).not.toBeInTheDocument();
  });
}

describe("page structure", () => {
  it.each(PAGES)("%s sets its own document title", async (path, title) => {
    installFakeApi(signedInRoutes(VOLUNTEER));
    signInAs(VOLUNTEER.id);
    renderApp(path);
    await waitFor(() => expect(document.title).toBe(title));
  });

  it.each(PAGES)("%s never skips a heading level", async (path) => {
    installFakeApi(signedInRoutes(VOLUNTEER));
    signInAs(VOLUNTEER.id);
    renderApp(path);
    await screen.findByRole("heading", { level: 1 });
    await settled();

    const levels = Array.from(document.querySelectorAll("main h1, main h2, main h3, main h4")).map(
      (heading) => Number(heading.tagName.slice(1)),
    );
    expect(levels[0]).toBe(1);
    levels.forEach((level, i) => {
      if (i > 0) expect(level, `${path} heading ${i}`).toBeLessThanOrEqual(levels[i - 1]! + 1);
    });
  });
});

describe("skip link", () => {
  it("is the first control and targets the main region", async () => {
    installFakeApi(signedInRoutes(VOLUNTEER));
    signInAs(VOLUNTEER.id);
    renderApp("/");
    const user = userEvent.setup();
    await user.tab();
    const link = screen.getByRole("link", { name: "Skip to main content" });
    expect(link).toHaveFocus();
    expect(link).toHaveAttribute("href", "#main-content");
    expect(document.getElementById("main-content")?.tagName).toBe("MAIN");
  });
});

describe("community results", () => {
  it("announces only the count, not the whole list", async () => {
    installFakeApi(signedInRoutes(VOLUNTEER));
    signInAs(VOLUNTEER.id);
    renderApp("/community");
    await screen.findByText(/\d+ updates? shown/);
    await settled();
    const live = document.querySelectorAll("main [aria-live]");
    expect(live).toHaveLength(1);
    expect(live[0]).toHaveTextContent(/\d+ updates? shown/);
  });
});
