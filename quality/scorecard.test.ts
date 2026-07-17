import { describe, expect, test } from "bun:test";
import { QUALITY_FIXTURES } from "./fixtures";
import { createBlankReport, finalizeReport } from "./scorecard";

describe("quality baseline", () => {
  test("contains 24 unique, representative prompts", () => {
    expect(QUALITY_FIXTURES).toHaveLength(24);
    expect(new Set(QUALITY_FIXTURES.map((fixture) => fixture.id)).size).toBe(24);
    expect(new Set(QUALITY_FIXTURES.map((fixture) => fixture.medium))).toEqual(
      new Set(["art", "code"]),
    );
  });

  test("requires both score and absence of blockers to pass", () => {
    const report = createBlankReport("birthday-dawn-fishing");
    report.score = {
      legibility: 20,
      composition: 20,
      occasionFit: 20,
      motion: 20,
      recipientExperience: 20,
    };
    report.issues.push({
      dimension: "legibility",
      severity: "blocker",
      detail: "Message is clipped.",
    });

    expect(finalizeReport(report).passed).toBe(false);
  });
});
