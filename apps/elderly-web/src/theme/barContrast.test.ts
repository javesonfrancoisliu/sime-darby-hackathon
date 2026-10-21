import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

// Vitest runs from apps/elderly-web, so these paths are relative to the package root.
const tokensCss = readFileSync(
  resolve(process.cwd(), "../../packages/design-tokens/tokens.css"),
  "utf8",
);
const appCss = readFileSync(resolve(process.cwd(), "src/theme/app.css"), "utf8");

function rule(selector: string): string {
  const match = appCss.match(new RegExp(`${selector.replace(".", "\\.")}\\s*\\{([^}]*)\\}`, "s"));
  if (!match?.[1]) throw new Error(`Rule ${selector} not found`);
  return match[1];
}

describe("progress bar contrast", () => {
  it("draws progress fills with no border edge", () => {
    // The dark inset edge was removed by request; fills are now clean bars.
    expect(rule(".safety-bar__fill")).not.toContain("box-shadow");
  });

  it("uses one light track for every bar", () => {
    expect(appCss).not.toContain("bar-track-amber");
    expect(tokensCss).not.toContain("bar-track-amber");
  });

  it("never fills a bar with the white text colour of a solid tone", () => {
    for (const tone of ["good", "caution", "alert", "extreme", "solid-danger"]) {
      const body = rule(`.tone-${tone}`);
      expect(body, tone).toMatch(/--tone-bar:/);
      expect(body, tone).not.toMatch(/--tone-bar:\s*var\(--tone-solid-text\)/);
    }
    expect(rule(".safety-bar__fill--tone")).toContain("background: var(--tone-bar)");
  });
});

describe("voucher list", () => {
  it("drops the default list indent so cards line up with the sheet content", () => {
    const body = rule(".voucher-list");
    expect(body).toContain("list-style: none");
    expect(body).toContain("padding: 0");
  });
});
