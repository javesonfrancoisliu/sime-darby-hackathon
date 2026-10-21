import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { useHashTab } from "./useHashTab";

const TABS = ["one", "two", "three"] as const;

function Probe() {
  const [tab, setTab] = useHashTab(TABS, "one");
  const { hash } = useLocation();
  const navigate = useNavigate();
  return (
    <div>
      <p data-testid="tab">{tab}</p>
      <p data-testid="hash">{hash}</p>
      <button type="button" onClick={() => setTab("two")}>
        pick two
      </button>
      <button type="button" onClick={() => navigate("#three")}>
        link three
      </button>
      <button type="button" onClick={() => navigate("#nonsense")}>
        link nonsense
      </button>
    </div>
  );
}

function setup(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Probe />
    </MemoryRouter>,
  );
}

describe("useHashTab", () => {
  it("starts on the tab in the hash, else the fallback", () => {
    setup("/x#two");
    expect(screen.getByTestId("tab")).toHaveTextContent("two");
  });

  it("falls back for an unknown hash", () => {
    setup("/x#nope");
    expect(screen.getByTestId("tab")).toHaveTextContent("one");
  });

  it("writes the chosen tab to the hash", async () => {
    setup("/x");
    await userEvent.click(screen.getByRole("button", { name: "pick two" }));
    expect(screen.getByTestId("tab")).toHaveTextContent("two");
    expect(screen.getByTestId("hash")).toHaveTextContent("#two");
  });

  it("follows a hash change on the same page and ignores an unknown one", async () => {
    setup("/x");
    await userEvent.click(screen.getByRole("button", { name: "link three" }));
    expect(screen.getByTestId("tab")).toHaveTextContent("three");
    await userEvent.click(screen.getByRole("button", { name: "link nonsense" }));
    expect(screen.getByTestId("tab")).toHaveTextContent("three");
  });
});
