import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const tokens = readFileSync(
  join(__dirname, "../../../../packages/design-tokens/tokens.css"),
  "utf8",
);
const app = readFileSync(join(__dirname, "app.css"), "utf8");

// The declarations of the rule whose selector is exactly the one given.
function rule(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return css.match(new RegExp(`(?:^|[}\\n])\\s*${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? "";
}

describe("button icons", () => {
  it("never lets a flex button squeeze its icon", () => {
    // An svg is a flex item with flex-shrink 1, so a tight button shrank it (2.77px at 390).
    expect(rule(tokens, ".ui-button svg")).toContain("flex-shrink: 0");
  });

  it("stacks the Home shortcut icon above its label on the narrowest phones", () => {
    const narrow = app.slice(app.indexOf("@media (max-width: 360px) {\n  .home-challenge-links"));
    expect(narrow).toContain(".home-challenge-links .ui-button");
    expect(narrow).toContain("flex-direction: column");
  });
});
