import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

// Vitest runs from apps/elderly-web, so these paths are relative to the package root.
const tokensCss = readFileSync(
  resolve(process.cwd(), "../../packages/design-tokens/tokens.css"),
  "utf8",
);
const appCss = readFileSync(resolve(process.cwd(), "src/theme/app.css"), "utf8");

// The declarations of the rule whose selector is exactly this one, not a longer selector ending in it.
function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = appCss.match(new RegExp(`(?:^|[}\\n])\\s*${escaped}\\s*\\{([^}]*)\\}`, "s"));
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

describe("tab bar", () => {
  it("sizes the centre bump from the bar's own border and background", () => {
    const bump = rule(".app-tab-bar__bump");
    expect(bump).toContain("var(--tab-bar-border-width)");
    expect(bump).toContain("background: var(--tab-bar-bg)");
    expect(appCss).toMatch(/\.high-contrast \.app-tab-bar \{[^}]*--tab-bar-border-width: 3px/s);
  });

  it("keeps the raised label on one line so the bar height does not change", () => {
    // The raised rule itself must say so, even though the base label rule does as well.
    expect(rule(".app-tab-bar__item--raised .app-tab-bar__label")).toContain("white-space: nowrap");
  });

  it("keeps a transparent outline on the current-page centre button for forced-colors modes", () => {
    expect(
      rule(".app-tab-bar__item--raised.app-tab-bar__item--active .app-tab-bar__fab"),
    ).toContain("outline: 3px solid transparent");
  });
});

describe("bottom bar fit", () => {
  it("shrinks the label size with the screen and gives Help request a wider column", () => {
    expect(appCss).toMatch(/font-size:\s*min\(15px,\s*3\.2vw\)/);
    expect(rule(".app-tab-bar__item--raised")).toMatch(/flex:\s*1\.25 1 0/);
  });

  it("lets the hero name wrap so the buttons stay on screen at large text", () => {
    expect(rule(".app-hero__text")).toMatch(/min-width:\s*0/);
    expect(rule(".app-hero__actions")).toContain("flex-shrink: 0");
  });
});
