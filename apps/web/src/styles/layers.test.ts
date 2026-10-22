import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const css = readFileSync(join(__dirname, "app.css"), "utf8");

// The declarations of every rule whose selector is exactly the one given.
function declarations(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rule = new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`, "g");
  return [...css.matchAll(rule)].map((match) => match[1] ?? "").join("\n");
}

// Every z-index declared in a rule whose selector is exactly the one given.
function zIndexes(selector: string): number[] {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rule = new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`, "g");
  return [...css.matchAll(rule)].flatMap((match) =>
    [...(match[1] ?? "").matchAll(/z-index:\s*(-?\d+)/g)].map((z) => Number(z[1])),
  );
}

describe("dialog layers", () => {
  const sheet = zIndexes(".ui-sheet-root");
  const modal = zIndexes(".ui-modal-backdrop");
  const toast = zIndexes(".ui-toast-region");

  it("declares a z-index for the sheet, the modal backdrop and the toast region", () => {
    expect(sheet.length).toBeGreaterThan(0);
    expect(modal.length).toBeGreaterThan(0);
    expect(toast.length).toBeGreaterThan(0);
  });

  it("keeps a dialog opened from a sheet above the sheet", () => {
    expect(Math.min(...modal)).toBeGreaterThan(Math.max(...sheet));
  });

  it("keeps the toast above the dialogs", () => {
    expect(Math.min(...toast)).toBeGreaterThan(Math.max(...modal));
  });

  it("keeps the layer roots out of a stacking context of their own", () => {
    // A transform, filter or similar on a root would trap its children below the other layers.
    for (const selector of [".ui-sheet-root", ".ui-modal-backdrop", ".ui-toast-region"]) {
      expect(declarations(selector), selector).not.toMatch(
        /(?:^|[\s;])(transform|filter|perspective|will-change|contain|isolation|opacity)\s*:/,
      );
    }
  });
});

describe("bottom bar labels", () => {
  it("lets the label size shrink with the screen so Community fits its column", () => {
    const link = declarations(".app-mobilenav-link");
    expect(link).toMatch(/font-size:\s*clamp\(\s*10px,\s*3\.1vw,/);
  });
});
