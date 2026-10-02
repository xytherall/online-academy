import { describe, expect, it } from "vitest";
import { dueDateBadge } from "./status-badge";

describe("dueDateBadge", () => {
  const now = new Date("2026-10-02T10:00:00Z");

  it("labels a past due date as Overdue", () => {
    expect(dueDateBadge("2026-10-01T10:00:00Z", now)).toEqual({ label: "Overdue", variant: "late" });
  });

  it("labels a due date within 7 days as Due soon", () => {
    expect(dueDateBadge("2026-10-09T10:00:00Z", now)).toEqual({ label: "Due soon", variant: "warning" });
  });

  it("labels a due date more than 7 days away as Upcoming", () => {
    expect(dueDateBadge("2026-10-10T09:49:00Z", now)).toEqual({ label: "Upcoming", variant: "info" });
  });
});
