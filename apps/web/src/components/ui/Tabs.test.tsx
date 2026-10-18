import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { TabPanel, Tabs } from "./Tabs";

const TABS = [
  { id: "a", label: "Alpha" },
  { id: "b", label: "Beta" },
  { id: "c", label: "Gamma" },
] as const;

function Harness() {
  const [value, setValue] = useState<"a" | "b" | "c">("a");
  return (
    <>
      <Tabs idBase="t" label="Sections" tabs={[...TABS]} value={value} onChange={setValue} />
      <TabPanel idBase="t" id={value}>
        panel {value}
      </TabPanel>
    </>
  );
}

describe("Tabs", () => {
  it("has a single tab stop on the selected tab", () => {
    render(<Harness />);
    expect(screen.getByRole("tab", { name: "Alpha" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: "Beta" })).toHaveAttribute("tabindex", "-1");
  });

  it("moves and selects with arrow keys, wrapping, Home and End", async () => {
    render(<Harness />);
    const user = userEvent.setup();
    await user.tab();
    expect(screen.getByRole("tab", { name: "Alpha" })).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Beta" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Beta" })).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Gamma" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Alpha" })).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Gamma" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "Alpha" })).toHaveFocus();
  });

  it("links the selected tab to its panel", async () => {
    render(<Harness />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: "Beta" }));
    const panel = screen.getByRole("tabpanel");
    expect(panel).toHaveTextContent("panel b");
    expect(screen.getByRole("tab", { name: "Beta" })).toHaveAttribute("aria-controls", panel.id);
    expect(panel).toHaveAttribute("aria-labelledby", screen.getByRole("tab", { name: "Beta" }).id);
  });
});
