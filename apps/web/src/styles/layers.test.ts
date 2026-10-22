import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const css = readFileSync(join(__dirname, "app.css"), "utf8");

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
});
