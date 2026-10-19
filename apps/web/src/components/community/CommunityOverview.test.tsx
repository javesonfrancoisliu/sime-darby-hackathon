import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { COMMUNITY_ITEMS } from "../../data/community.mock";
import * as communityItems from "../../data/useCommunityItems";
import { CommunityOverview } from "./CommunityOverview";

function renderOverview() {
  return render(
    <MemoryRouter>
      <CommunityOverview />
    </MemoryRouter>,
  );
}

describe("CommunityOverview", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the Demo data label while the list is simulated", () => {
    renderOverview();
    expect(screen.getByText("Demo data")).toBeInTheDocument();
  });

  it("hides the Demo data label when the list is live data", () => {
    const live = COMMUNITY_ITEMS.slice(0, 3).map((item) => ({ ...item, isDemoData: false }));
    vi.spyOn(communityItems, "useLatestCommunityItems").mockReturnValue(live);
    renderOverview();
    expect(screen.queryByText("Demo data")).not.toBeInTheDocument();
  });
});
