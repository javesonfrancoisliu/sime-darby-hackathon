import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { makeReward } from "../../test/fixtures";
import { RewardsPanel } from "./RewardsPanel";

function renderPanel(pointsCost: number) {
  render(
    <RewardsPanel
      rewards={[makeReward({ title: "Sticker", pointsCost, status: "available" })]}
      balance={100}
      loading={false}
      error={null}
      redeemingId={null}
      onRedeem={() => {}}
    />,
  );
}

describe("rewards panel", () => {
  it("writes a one point cost in the singular", () => {
    renderPanel(1);
    expect(screen.getByText("1 pt")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Redeem Sticker for 1 pt" })).toBeInTheDocument();
  });

  it("writes other costs in the plural", () => {
    renderPanel(40);
    expect(screen.getByText("40 pts")).toBeInTheDocument();
  });
});
