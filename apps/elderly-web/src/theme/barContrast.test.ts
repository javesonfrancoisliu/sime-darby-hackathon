import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

// Vitest runs from apps/elderly-web, so these paths are relative to the package root.
const tokensCss = readFileSync(
  resolve(process.cwd(), "../../packages/design-tokens/tokens.css"),
  "utf8",
);
const appCss = readFileSync(resolve(process.cwd(), "src/theme/app.css"), "utf8");

const MIN_NON_TEXT_CONTRAST = 3;

function token(name: string): string {
  const match = tokensCss.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`));
  if (!match?.[1]) throw new Error(`Token --${name} not found`);
  return match[1];
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

function rule(selector: string): string {
  const match = appCss.match(new RegExp(`${selector.replace(".", "\\.")}\\s*\\{([^}]*)\\}`, "s"));
  if (!match?.[1]) throw new Error(`Rule ${selector} not found`);
  return match[1];
}

describe("progress bar contrast", () => {
  it("edges every fill in a dark line that stands out from the light track", () => {
    expect(rule(".safety-bar__fill")).toContain(
      "box-shadow: inset 0 0 0 1.5px var(--text-primary)",
    );
    expect(contrast(token("text-primary"), token("surface-muted"))).toBeGreaterThanOrEqual(
      MIN_NON_TEXT_CONTRAST,
    );
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
