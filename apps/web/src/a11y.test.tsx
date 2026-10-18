import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { DEMO_TOWNSHIP } from "./lib/township";
import { installFakeApi } from "./test/fakeApi";
import { renderApp } from "./test/renderApp";

const PAGES: [path: string, title: string][] = [
  ["/", `Welcome to ${DEMO_TOWNSHIP.name} - Township Connect`],
  ["/community", "Neighbourhood Hub - Township Connect"],
  ["/community/challenges", "Community Challenges - Township Connect"],
  ["/volunteer", "Volunteer nearby - Township Connect"],
  ["/safety", "Health & Safety - Township Connect"],
  ["/profile", "Profile - Township Connect"],
];

async function settled() {
  await waitFor(() => {
    expect(screen.queryByRole("status", { name: /Loading/ })).not.toBeInTheDocument();
  });
}

describe("page structure", () => {
  it.each(PAGES)("%s sets its own document title", async (path, title) => {
    installFakeApi();
    renderApp(path);
    await waitFor(() => expect(document.title).toBe(title));
  });

  it.each(PAGES)("%s never skips a heading level", async (path) => {
    installFakeApi();
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
    installFakeApi();
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
    installFakeApi();
    renderApp("/community");
    await settled();
    const live = document.querySelectorAll("main [aria-live]");
    expect(live).toHaveLength(1);
    expect(live[0]).toHaveTextContent(/\d+ updates? shown/);
  });
});
