import { expect, test } from "bun:test";
import { CardSpecV2Schema } from "./registry";
import { applyCardSpecPatches } from "./spec-patch";
import { commitVersion, createVersionHistory, moveVersion } from "./version-history";

const spec = CardSpecV2Schema.parse({
  version: 2,
  template: "v2",
  id: "history",
  seed: 7,
  format: "square",
  occasion: "Birthday",
  theme: { background: "#ffffff", ink: "#111111", accent: "#ff5500", fontPair: "modern" },
  content: { headline: "Happy birthday", message: "Have the best day." },
  composition: { layout: "poster", alignment: "left", density: "balanced" },
  motif: { kind: "spark", intensity: 0.5 },
  motion: { entrance: "rise", idle: "pulse", durationMs: 3200, reducedMotion: false },
});

test("validated patches preserve unrequested fields", () => {
  const next = applyCardSpecPatches(spec, [{ path: "theme.accent", value: "#0055ff" }]);
  expect(next.theme.accent).toBe("#0055ff");
  expect(next.content).toEqual(spec.content);
  expect(next.composition).toEqual(spec.composition);
});

test("history truncates redo versions after a new checkpoint", () => {
  const second = applyCardSpecPatches(spec, [
    { path: "content.headline", value: "A new headline" },
  ]);
  const third = applyCardSpecPatches(spec, [{ path: "motif.intensity", value: 0.2 }]);
  let history = commitVersion(createVersionHistory(spec), second, "Copy edit");
  history = moveVersion(history, -1);
  history = commitVersion(history, third, "Calmer");
  expect(history.versions).toHaveLength(2);
  expect(history.versions[1].name).toBe("Calmer");
});
