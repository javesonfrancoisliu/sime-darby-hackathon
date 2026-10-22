import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { BreakablePoints } from "./BreakablePoints";

describe("BreakablePoints", () => {
  it("reads as the grouped number and offers a line break only after each comma", () => {
    const { container } = render(
      <span>
        <BreakablePoints value={100000000089} />
      </span>,
    );
    expect(container).toHaveTextContent("100,000,000,089");
    expect(container.querySelectorAll("wbr")).toHaveLength(3);
    expect(container.innerHTML).toContain("100,<wbr>000,<wbr>000,<wbr>089");
  });

  it("adds no break to a total with no comma", () => {
    const { container } = render(
      <span>
        <BreakablePoints value={89} />
      </span>,
    );
    expect(container).toHaveTextContent("89");
    expect(container.querySelector("wbr")).toBeNull();
  });
});
