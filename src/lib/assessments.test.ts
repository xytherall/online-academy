import { describe, expect, it } from "vitest";
import { computeAssessmentStatus, type AssessmentStatus } from "./assessments";

const NOW = new Date("2026-09-30T00:00:00Z");
const PAST = "2026-01-01T00:00:00Z";
const FUTURE = "2099-01-01T00:00:00Z";

describe("computeAssessmentStatus", () => {
  it("is Marked whenever marks is set, even without an upload, past due (owner decision, SPEC §15)", () => {
    const status: AssessmentStatus = computeAssessmentStatus(
      { type: "assignment", due_at: PAST },
      { submitted_at: null, is_late: false, marks: 8 },
      NOW,
    );
    expect(status).toBe("Marked");
  });

  it("is Marked for a test marked without a submission timestamp", () => {
    const status = computeAssessmentStatus(
      { type: "test", due_at: PAST },
      { submitted_at: null, is_late: false, marks: 30 },
      NOW,
    );
    expect(status).toBe("Marked");
  });

  it("is Missing only when past due, no submission, and no marks", () => {
    const status = computeAssessmentStatus({ type: "assignment", due_at: PAST }, null, NOW);
    expect(status).toBe("Missing");
  });

  it("is Missing for an assignment with a submission row that was never actually submitted or marked", () => {
    const status = computeAssessmentStatus(
      { type: "assignment", due_at: PAST },
      { submitted_at: null, is_late: false, marks: null },
      NOW,
    );
    expect(status).toBe("Missing");
  });

  it("is Not submitted (not Missing) when not yet due and nothing submitted", () => {
    const status = computeAssessmentStatus({ type: "assignment", due_at: FUTURE }, null, NOW);
    expect(status).toBe("Not submitted");
  });

  it("is Not yet marked for an unmarked test, regardless of due date", () => {
    expect(computeAssessmentStatus({ type: "test", due_at: PAST }, null, NOW)).toBe("Not yet marked");
    expect(computeAssessmentStatus({ type: "test", due_at: FUTURE }, null, NOW)).toBe("Not yet marked");
  });

  it("is Submitted / Submitted late for a test with an upload and no marks yet", () => {
    expect(
      computeAssessmentStatus({ type: "test", due_at: PAST }, { submitted_at: PAST, is_late: false, marks: null }, NOW),
    ).toBe("Submitted");
    expect(
      computeAssessmentStatus({ type: "test", due_at: PAST }, { submitted_at: NOW.toISOString(), is_late: true, marks: null }, NOW),
    ).toBe("Submitted late");
  });

  it("is Submitted / Submitted late for an on-time/late upload with no marks yet", () => {
    expect(
      computeAssessmentStatus(
        { type: "assignment", due_at: PAST },
        { submitted_at: PAST, is_late: false, marks: null },
        NOW,
      ),
    ).toBe("Submitted");
    expect(
      computeAssessmentStatus(
        { type: "assignment", due_at: PAST },
        { submitted_at: PAST, is_late: true, marks: null },
        NOW,
      ),
    ).toBe("Submitted late");
  });

  it("the late flag is unaffected by marks precedence — marked-without-upload stays not late unless the admin set it", () => {
    const withLateFlag = computeAssessmentStatus(
      { type: "assignment", due_at: PAST },
      { submitted_at: null, is_late: true, marks: 5 },
      NOW,
    );
    // Still "Marked" (marks take precedence for status), but is_late itself
    // is never recomputed here — it's whatever the admin/submission set.
    expect(withLateFlag).toBe("Marked");
  });
});
