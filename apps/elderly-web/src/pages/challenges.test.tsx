import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ChallengesPage } from "./ChallengesPage";
import { AccessibilityProvider } from "../context/AccessibilityContext";

function renderPage() {
  return render(
    <MemoryRouter>
      <AccessibilityProvider>
        <ChallengesPage />
      </AccessibilityProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Community Play gamification", () => {
  it("labels the points, streak and rewards as example data", async () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Demo data");
    await userEvent.click(screen.getByRole("tab", { name: /Rewards/i }));
    expect(screen.getByText(/Example rewards/)).toBeInTheDocument();
  });

  it("checks in on the Streak tab: streak increments, points grow, button confirms", async () => {
    renderPage();
    // Points appear in the header chip and the streak summary.
    expect(screen.getAllByText("260").length).toBeGreaterThan(0);
    const checkIn = screen.getByRole("button", { name: /Check in today/i });
    await userEvent.click(checkIn);
    expect(screen.getAllByText("270").length).toBeGreaterThan(0); // +10
    expect(screen.getByRole("button", { name: /Checked in today/i })).toBeDisabled();
  });

  it("shows team (not individual) goals on the Goals tab", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("tab", { name: /Goals/i }));
    expect(screen.getByText(/every neighbour/i)).toBeInTheDocument();
  });

  it("redeems a reward on the Rewards tab and deducts points", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("tab", { name: /Rewards/i }));
    const toast = screen.getByText("Free kopi & kaya toast").closest(".play-reward") as HTMLElement;
    const redeem = within(toast).getByRole("button", { name: /^Redeem$/i });
    await userEvent.click(redeem);
    expect(within(toast).getByRole("button", { name: /Redeemed/i })).toBeDisabled();
    expect(screen.getByText("180")).toBeInTheDocument(); // 260 - 80
  });
});
