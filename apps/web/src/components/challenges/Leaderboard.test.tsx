import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Leaderboard } from "./Leaderboard";

describe("leaderboard", () => {
  it("writes one point in the singular and groups large totals", () => {
    render(
      <Leaderboard
        entries={[
          { rank: 1, displayName: "Aina T.", lifetimePoints: 1500, isCurrentUser: false },
          { rank: 2, displayName: "Ben L.", lifetimePoints: 1, isCurrentUser: false },
        ]}
        loading={false}
        error={null}
        optedIn
        optInBusy={false}
        optInError={null}
        onOptInChange={() => {}}
      />,
    );
    expect(screen.getByText("1,500 pts")).toBeInTheDocument();
    expect(screen.getByText("1 pt")).toBeInTheDocument();
  });
});
