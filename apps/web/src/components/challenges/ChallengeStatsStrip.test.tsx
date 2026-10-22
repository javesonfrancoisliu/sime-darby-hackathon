import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ChallengeStatsStrip } from "./ChallengeStatsStrip";

describe("challenge stats strip", () => {
  it("groups a large points total so it can sit inside its tile", () => {
    render(<ChallengeStatsStrip points={100000000133} completed={2} badges={1} />);
    expect(screen.getByText("100,000,000,133")).toBeInTheDocument();
  });
});
