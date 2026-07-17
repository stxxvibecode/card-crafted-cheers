import { expect, test } from "bun:test";
import { CardSpecV2Schema } from "./registry";
import { evaluateCardSpec, repairCardSpec } from "./quality";

const base = CardSpecV2Schema.parse({
  version: 2,
  template: "v2",
  id: "quality-test",
  seed: 1,
  format: "square",
  occasion: "Birthday",
  theme: { background: "#201e36", ink: "#fbf7ed", accent: "#ff9f68", fontPair: "modern" },
  content: { headline: "Happy Birthday", message: "Hope today feels like a real celebration." },
  composition: { layout: "poster", alignment: "off-axis", density: "balanced" },
  motif: { kind: "spark", intensity: 0.6 },
  motion: { entrance: "rise", idle: "pulse", durationMs: 3200, reducedMotion: false },
});

test("quality gate accepts a proven structured card", () => {
  expect(evaluateCardSpec(base).passed).toBe(true);
});

test("quality gate repairs contrast and event-layout blockers without changing copy", () => {
  const invalid = {
    ...base,
    occasion: "Wedding invitation",
    theme: { ...base.theme, ink: "#201e37" },
  };
  const before = evaluateCardSpec(invalid);
  const repaired = repairCardSpec(invalid, before);
  const after = evaluateCardSpec(repaired);
  expect(before.passed).toBe(false);
  expect(after.passed).toBe(true);
  expect(repaired.content).toEqual(invalid.content);
  expect(repaired.composition.layout).toBe("ticket");
});
