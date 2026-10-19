import { describe, expect, it } from "vitest";
import { maintenanceLabel } from "./events";

const NOW = new Date("2026-10-19T12:00:00+08:00");

describe("maintenanceLabel", () => {
  it("shows Finished when an in-progress window has passed", () => {
    expect(maintenanceLabel("in_progress", "2026-10-19T10:00:00+08:00", NOW)).toBe("Finished");
  });

  it("keeps Happening now while the window is open", () => {
    expect(maintenanceLabel("in_progress", "2026-10-19T14:00:00+08:00", NOW)).toBe("Happening now");
  });

  it("keeps the stored status for other cases", () => {
    expect(maintenanceLabel("scheduled", "2026-10-19T10:00:00+08:00", NOW)).toBe("Planned");
    expect(maintenanceLabel("completed", undefined, NOW)).toBe("Finished");
  });
});
