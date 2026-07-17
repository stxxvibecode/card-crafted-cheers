import { expect, test } from "bun:test";
import { CardSpecV2Schema, isCardSpecV2 } from "./registry";

const validSpec = {
  version: 2,
  template: "v2",
  id: "card-test",
  seed: 42,
  format: "square",
  occasion: "Birthday",
  theme: { background: "#201e36", ink: "#fbf7ed", accent: "#ff9f68", fontPair: "modern" },
  content: { headline: "Happy Birthday", message: "Hope your year is full of good surprises." },
  composition: { layout: "poster", alignment: "off-axis", density: "balanced" },
  motif: { kind: "spark", intensity: 0.65 },
  motion: { entrance: "rise", idle: "pulse", durationMs: 3200, reducedMotion: false },
};

test("CardSpec v2 accepts a complete runtime contract", () => {
  const parsed = CardSpecV2Schema.parse(validSpec);
  expect(isCardSpecV2(parsed)).toBe(true);
});

test("CardSpec v2 rejects unbounded layouts and invalid colors", () => {
  expect(() =>
    CardSpecV2Schema.parse({ ...validSpec, theme: { ...validSpec.theme, accent: "orange" } }),
  ).toThrow();
  expect(() =>
    CardSpecV2Schema.parse({
      ...validSpec,
      composition: { ...validSpec.composition, layout: "freeform" },
    }),
  ).toThrow();
});
