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

describe("point totals", () => {
  it("lets the points tile shrink and break a long total inside the card", () => {
    expect(rule(".play-summary")).toContain("flex-wrap: wrap");
    expect(rule(".play-summary__points,\n.play-summary__streak")).toContain("min-width: 0");
    expect(rule(".play-summary__points-value,\n.play-summary__streak-value")).toContain(
      "overflow-wrap: anywhere",
    );
  });

  it("lets the Profile hub row text shrink so a long summary stays in the row", () => {
    expect(rule(".apple-inset-btn-row__left")).toContain("min-width: 0");
    expect(rule(".apple-inset-btn-row__left > div")).toContain("overflow-wrap: anywhere");
  });
});

describe("hero header", () => {
  it("wraps the name between words and lets the buttons move to their own row", () => {
    // The name sharing a 109px-wide row with the buttons at X-Large forced a break inside every word.
    expect(rule(".app-hero__greeting-row")).toContain("flex-wrap: wrap");
    expect(rule(".app-hero__text")).toContain("overflow-wrap: break-word");
    expect(rule(".app-hero__text")).not.toContain("anywhere");
    expect(rule(".text-size-xlarge .app-hero__actions")).toContain("order: -1");
  });
});

describe("segmented tabs", () => {
  it("keeps the four columns equal so the sliding pill sits under the active label", () => {
    // 1fr columns grow to their label width, so uneven columns pushed the pill off the active tab.
    expect(rule(".seg-tabs")).toContain("minmax(0, 1fr)");
  });

  it("uses a 2x2 grid at X-Large text without the sliding pill", () => {
    expect(rule(".text-size-xlarge .seg-tabs")).toContain("repeat(2, minmax(0, 1fr))");
    expect(rule(".text-size-xlarge .seg-tabs__indicator")).toContain("display: none");
    expect(rule(".text-size-xlarge .seg-tabs__tab--active")).toContain(
      "background: var(--surface)",
    );
  });

  it("has an active label that passes 4.5:1 even over the grey track", () => {
    // The label measured 4.28:1 when the pill slipped away and it sat on the track.
    const tokens = readFileSync(
      resolve(process.cwd(), "../../packages/design-tokens/tokens.css"),
      "utf8",
    );
    expect(rule(".seg-tabs__tab--active")).toContain("color: var(--brand-primary-hover)");
    const hex = tokens.match(/--brand-primary-hover:\s*#([0-9a-f]{6})/i)?.[1] ?? "";
    const channel = (i: number) => {
      const v = parseInt(hex.slice(i, i + 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    const label = 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
    // The track is 12% grey over the page background, about rgb(232, 233, 235).
    const track = 0.2126 * 0.807 + 0.7152 * 0.815 + 0.0722 * 0.831;
    expect((track + 0.05) / (label + 0.05)).toBeGreaterThanOrEqual(4.5);
  });
});
