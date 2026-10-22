import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

// Vitest runs from apps/web, so these paths are relative to the package root.
const tokensCss = readFileSync(
  resolve(process.cwd(), "../../packages/design-tokens/tokens.css"),
  "utf8",
);
const appCss = readFileSync(resolve(process.cwd(), "src/styles/app.css"), "utf8");

const MIN_CONTROL_CONTRAST = 3;

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

describe("control edge contrast", () => {
  it("meets 3:1 against the surface and the page background", () => {
    expect(contrast(token("control-border"), token("surface"))).toBeGreaterThanOrEqual(
      MIN_CONTROL_CONTRAST,
    );
    expect(contrast(token("control-border"), token("page-bg"))).toBeGreaterThanOrEqual(
      MIN_CONTROL_CONTRAST,
    );
  });

  it("is used for inputs, chips, option buttons and the off switch", () => {
    expect(tokensCss).toMatch(/\.ui-input\s*\{[^}]*border: 1px solid var\(--control-border\)/s);
    for (const selector of [".ui-chip", ".ui-icon-button", ".quiz-option"]) {
      const rule = appCss.match(new RegExp(`${selector.replace(".", "\\.")}\\s*\\{[^}]*\\}`, "s"));
      expect(rule?.[0], selector).toContain("var(--control-border)");
    }
    expect(appCss).toMatch(
      /\.settings-switch::before\s*\{[^}]*background: var\(--control-border\)/s,
    );
  });
});

describe("warning colours", () => {
  const MIN_TEXT_CONTRAST = 4.5;

  it("keeps dark text on the amber tint readable", () => {
    expect(contrast(token("text-primary"), token("warning-tint"))).toBeGreaterThanOrEqual(
      MIN_TEXT_CONTRAST,
    );
  });

  it("defines the amber and its tint once", () => {
    expect(tokensCss).toMatch(/--warn-accent:\s*var\(--warning-fill\)/);
    expect(tokensCss).toMatch(/--warning-bg:\s*var\(--warning-tint\)/);
    expect(tokensCss).toMatch(/--tone-caution-bg:\s*var\(--warning-tint\)/);
  });

  it("tints the warning badge and colours only its icon amber", () => {
    expect(tokensCss).toMatch(/\.ui-badge--warning\s*\{[^}]*background: var\(--warning-bg\)/s);
    expect(tokensCss).toMatch(/\.ui-badge--warning svg\s*\{[^}]*color: var\(--warning-fill\)/s);
    expect(tokensCss).toMatch(/\.ui-badge--warning\s*\{[^}]*color: var\(--warning-ink\)/s);
  });

  it("no longer uses or documents the removed --warning token", () => {
    const docs = ["DESIGN_SYSTEM.md", "township_frontend_design_guidelines.md"].map((f) =>
      readFileSync(resolve(process.cwd(), "../../packages/design-tokens/docs", f), "utf8"),
    );
    for (const text of [tokensCss, appCss, ...docs]) {
      expect(text).not.toMatch(/var\(--warning\)|`--warning`/);
    }
  });
});

describe("raised centre button", () => {
  it("keeps a transparent outline for focus and the current page in forced-colors modes", () => {
    expect(appCss).toMatch(
      /\.app-mobilenav-link--centre\[aria-current="page"\] \.app-mobilenav-orb\s*\{[^}]*outline: 3px solid transparent/s,
    );
    expect(appCss).toMatch(
      /\.app-mobilenav-link--centre:focus-visible \.app-mobilenav-orb\s*\{[^}]*outline: 3px solid transparent/s,
    );
  });

  it("lifts the mobile toast above the orb and its ring", () => {
    expect(appCss).toMatch(/\.ui-toast-region\s*\{[^}]*bottom: calc\(72px \+ 32px \+ 7px/s);
  });
});

describe("mobile bottom nav labels", () => {
  it("lets five labels share a narrow bar by shrinking the font and the side padding", () => {
    expect(appCss).toMatch(
      /\.app-mobilenav-link\s*\{[^}]*min-width: 0[^}]*padding: var\(--space-2\) 2px[^}]*font-size: clamp\(10px, 3\.1vw, 13px\)/s,
    );
  });
});
