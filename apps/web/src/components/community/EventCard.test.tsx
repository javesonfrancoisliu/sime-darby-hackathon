import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { EventItem } from "../../types/community";
import { EventCard } from "./EventCard";

function makeItem(overrides: Partial<EventItem> = {}): EventItem {
  return {
    id: "e1",
    category: "event",
    title: "Tea morning",
    summary: "Tea and a chat",
    publishedAt: "2026-10-18T01:00:00Z",
    updatedAt: "2026-10-18T01:00:00Z",
    eventType: "community_activity",
    startsAt: "2026-10-26T10:00:00+08:00",
    durationMinutes: 90,
    location: "Elmina West",
    organiser: "Resident committee",
    capacity: 10,
    signupCount: 3,
    ...overrides,
  };
}

describe("EventCard", () => {
  it("offers a Register button while there are spots", () => {
    render(<EventCard event={makeItem()} onRegister={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Register" })).toBeEnabled();
    expect(screen.queryByText("Full")).not.toBeInTheDocument();
  });

  it("shows a Full status instead of a disabled Register button when no spots are left", () => {
    render(<EventCard event={makeItem({ signupCount: 10 })} onRegister={vi.fn()} />);
    expect(screen.getByText("Full")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Register" })).not.toBeInTheDocument();
    expect(screen.queryByText("Fully booked")).not.toBeInTheDocument();
  });
});
