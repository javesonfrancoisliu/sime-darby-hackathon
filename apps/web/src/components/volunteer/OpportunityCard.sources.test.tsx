import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import type { Opportunity } from "../../types/volunteer";
import { OpportunityCard } from "./OpportunityCard";

it.each(["request", "event"] as const)(
  "labels AI ranking and explanation independently on a %s card",
  async (kind) => {
    const opportunity: Opportunity = {
      id: "fictional-card",
      kind,
      title: "Nearby help",
      summary: "Details",
      category: "community_activity",
      distanceKm: 0.5,
      area: "Elmina West",
      scheduledAt: "2027-01-01T02:00:00Z",
      durationMinutes: 60,
      matchScore: 77,
      matchSource: "ai",
      explanationSource: "rules",
      reasons: ["About 0.5 km away"],
      fitsMySchedule: false,
    };
    const { rerender } = render(
      <ul>
        <OpportunityCard
          opportunity={opportunity}
          urgency="low"
          joined={false}
          onAccept={vi.fn()}
        />
      </ul>,
    );
    expect(screen.getByText("AI-assisted")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: /77% match/ }));
    const region = screen.getByRole("region", { name: "Why this matches you" });
    expect(within(region).getByText("Rule-based explanation (fallback)")).toBeVisible();
    expect(within(region).getByText("You are about 0.5 km away")).toBeVisible();
    rerender(
      <ul>
        <OpportunityCard
          opportunity={{
            ...opportunity,
            explanationSource: "ai",
            reasons: ["Listed community skills fit this nearby activity."],
          }}
          urgency="low"
          joined={false}
          onAccept={vi.fn()}
        />
      </ul>,
    );
    expect(screen.getByText("AI-assisted")).toBeVisible();
    expect(within(region).getByText("Claude explanation")).toBeVisible();
    expect(
      within(region).getByText("Listed community skills fit this nearby activity."),
    ).toBeVisible();
    expect(within(region).queryByText("Rule-based explanation (fallback)")).not.toBeInTheDocument();
    rerender(
      <ul>
        <OpportunityCard
          opportunity={{ ...opportunity, explanationSource: undefined }}
          urgency="low"
          joined={false}
          onAccept={vi.fn()}
        />
      </ul>,
    );
    expect(within(region).getByText("Explanation source not recorded")).toBeVisible();
  },
);

it("keeps a long validated explanation accessible with Show more and Show less", async () => {
  const reason =
    "Your listed digital help skills and nearby location suit this request. Your saved availability covers the requested time, and your profile describes helping relatives with their phones each week.";
  render(
    <ul>
      <OpportunityCard
        opportunity={{
          id: "long-reason",
          kind: "request",
          title: "Phone help",
          summary: "Details",
          category: "digital_literacy",
          distanceKm: 0.5,
          area: "Elmina West",
          scheduledAt: "2027-01-01T02:00:00Z",
          durationMinutes: 60,
          matchScore: 77,
          matchSource: "ai",
          explanationSource: "ai",
          reasons: [reason],
          fitsMySchedule: false,
        }}
        urgency="low"
        joined={false}
        onAccept={vi.fn()}
      />
    </ul>,
  );
  await userEvent.click(screen.getByRole("button", { name: /77% match/ }));
  const more = screen.getByRole("button", { name: "Show more" });
  expect(more).toHaveAttribute("aria-expanded", "false");
  const text = screen.getByText(reason);
  expect(text.parentElement).toHaveClass("opportunity-card__reason-lines--preview");
  expect(more).toHaveAttribute("aria-controls", text.parentElement!.id);
  await userEvent.click(more);
  expect(screen.getByRole("button", { name: "Show less" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  expect(text.parentElement).not.toHaveClass("opportunity-card__reason-lines--preview");
  await userEvent.click(screen.getByRole("button", { name: "Show less" }));
  expect(text.parentElement).toHaveClass("opportunity-card__reason-lines--preview");
});

it("shows an Urgent text label on urgent requests only", () => {
  const opportunity: Opportunity = {
    id: "fictional-urgent",
    kind: "request",
    title: "Nearby help",
    summary: "Details",
    category: "groceries",
    distanceKm: 0.5,
    area: "Elmina West",
    scheduledAt: "2027-01-01T02:00:00Z",
    durationMinutes: 60,
    matchScore: 77,
    reasons: [],
    fitsMySchedule: false,
  };
  const { rerender } = render(
    <ul>
      <OpportunityCard opportunity={opportunity} urgency="high" joined={false} onAccept={vi.fn()} />
    </ul>,
  );
  expect(screen.getByText("Urgent")).toBeVisible();
  rerender(
    <ul>
      <OpportunityCard
        opportunity={opportunity}
        urgency="medium"
        joined={false}
        onAccept={vi.fn()}
      />
    </ul>,
  );
  expect(screen.queryByText("Urgent")).not.toBeInTheDocument();
});
