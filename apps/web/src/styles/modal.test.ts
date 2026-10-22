import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const css = readFileSync(join(__dirname, "app.css"), "utf8");

// The declarations of the rule whose selector is exactly the one given.
function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return css.match(new RegExp(`(?:^|[}\\n])\\s*${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? "";
}

describe("modal layout", () => {
  it("scrolls only the body so the header and footer actions stay on screen", () => {
    // With .ui-modal itself scrolling, the footer sat after the content (y 865 on an 844px screen).
    expect(rule(".ui-modal")).toContain("display: flex");
    expect(rule(".ui-modal")).toContain("flex-direction: column");
    expect(rule(".ui-modal")).not.toContain("overflow: auto");
    expect(rule(".ui-modal-body")).toContain("overflow-y: auto");
    expect(rule(".ui-modal-body")).toContain("min-height: 0");
  });
});
