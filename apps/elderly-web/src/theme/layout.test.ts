import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

// Vitest runs from apps/elderly-web, so these paths are relative to the package root.
const appCss = readFileSync(resolve(process.cwd(), "src/theme/app.css"), "utf8");

// The declarations of the rule whose selector is exactly this one, not a longer selector ending in it.
function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = appCss.match(new RegExp(`(?:^|[}\\n])\\s*${escaped}\\s*\\{([^}]*)\\}`, "s"));
  if (!match?.[1]) throw new Error(`Rule ${selector} not found`);
  return match[1];
}

describe("drawer cards", () => {
  it("does not pad the card again around a drawer that pads its own header", () => {
    // .safety-card pads var(--space-4) and .drawer__header pads it again, so the text column halves.
    expect(rule(".safety-card--drawer")).toContain("padding: 0");
    expect(rule(".drawer__header")).toContain("padding: var(--space-4)");
  });
});
