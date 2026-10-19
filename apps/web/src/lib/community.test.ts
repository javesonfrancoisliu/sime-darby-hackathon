import { describe, expect, it } from "vitest";

import { makeDrive, makeEvent, makeMaintenance, makeNotice } from "../test/fixtures";
import { eventToItem, noticeToItem, pickFeatured, sortFeed } from "./community";

const ID = "0a1b2c3d-4444-4a44-8a44-000000000004";

describe("notice feed", () => {
  it("features the first high priority update, not just the newest item", () => {
    const items = sortFeed([
      noticeToItem(makeNotice({ title: "Newest", publishedAt: "2026-10-18T09:00:00Z" })),
      noticeToItem(
        makeNotice({
          id: ID,
          title: "Urgent",
          priority: "high",
          publishedAt: "2026-10-10T09:00:00Z",
        }),
      ),
    ]);
    expect(items[0]?.title).toBe("Newest");
    expect(pickFeatured(items)?.title).toBe("Urgent");
  });

  it("falls back to the newest item when no update is high priority", () => {
    const items = sortFeed([
      noticeToItem(makeMaintenance({ priority: "high", publishedAt: "2026-10-01T09:00:00Z" })),
      noticeToItem(makeNotice({ title: "Newest", publishedAt: "2026-10-18T09:00:00Z" })),
    ]);
    expect(pickFeatured(items)?.title).toBe("Newest");
  });

  it("has nothing to feature when the feed is empty", () => {
    expect(pickFeatured([])).toBeUndefined();
  });
});

describe("feed mapping", () => {
  it("maps a maintenance notice with its window and impact", () => {
    expect(noticeToItem(makeMaintenance())).toMatchObject({
      category: "maintenance",
      location: "Elmina Valley",
      serviceImpact: "The lift is closed for the morning.",
      status: "scheduled",
    });
  });

  it("turns a volunteer drive into free slots and an activity into an event", () => {
    expect(eventToItem(makeDrive({ capacity: 10, signupCount: 4 }))).toMatchObject({
      category: "volunteer",
      slotsAvailable: 6,
      organiser: "Green Elmina",
    });
    expect(eventToItem(makeDrive({ capacity: 5, signupCount: 5 }))).toMatchObject({
      slotsAvailable: 0,
    });
    expect(eventToItem(makeEvent())).toMatchObject({ category: "event", capacity: 20 });
  });
});
