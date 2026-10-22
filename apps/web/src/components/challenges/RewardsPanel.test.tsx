import { render, screen } from "@testing-library/react";
import type { RewardWithStatus } from "@sdh/contracts";
import { describe, expect, it } from "vitest";

import { makeReward } from "../../test/fixtures";
import { RewardsPanel } from "./RewardsPanel";

function renderPanel(pointsCost: number) {
  render(
    <RewardsPanel
      rewards={[
        makeReward({ title: "Sticker", pointsCost, status: "available" }) as RewardWithStatus,
      ]}
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

  it("shows locked and redeemed rewards as status text, not disabled buttons", () => {
    render(
      <RewardsPanel
        rewards={[
          makeReward({
            id: "b25c8fa7-be5f-4b88-8cc3-5f6ebe6c7d06",
            title: "Big voucher",
            status: "locked",
          }) as RewardWithStatus,
          makeReward({
            id: "0f5b0e3e-6a8e-4d2c-9d53-1f6f7f0c1a22",
            title: "Old voucher",
            status: "redeemed",
          }) as RewardWithStatus,
        ]}
        balance={0}
        loading={false}
        error={null}
        redeemingId={null}
        onRedeem={() => {}}
      />,
    );
    expect(screen.getByText("Locked")).toBeInTheDocument();
    expect(screen.getByText("Redeemed")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
