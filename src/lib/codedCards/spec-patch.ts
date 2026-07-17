import { evaluateCardSpec, repairCardSpec } from "./quality";
import { CardSpecV2Schema, type CardSpecV2 } from "./registry";

export const EDITABLE_SPEC_PATHS = [
  "content.eyebrow",
  "content.headline",
  "content.message",
  "content.event.date",
  "content.event.time",
  "content.event.location",
  "theme.background",
  "theme.ink",
  "theme.accent",
  "theme.fontPair",
  "composition.layout",
  "composition.alignment",
  "composition.density",
  "motif.kind",
  "motif.intensity",
  "motion.entrance",
  "motion.idle",
  "motion.durationMs",
  "motion.reducedMotion",
] as const;

export type EditableSpecPath = (typeof EDITABLE_SPEC_PATHS)[number];
export type CardSpecPatch = { path: EditableSpecPath; value: unknown };

function setPath(target: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split(".");
  let cursor = target;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const key = parts[index];
    const next = cursor[key];
    cursor[key] = next && typeof next === "object" ? { ...(next as Record<string, unknown>) } : {};
    cursor = cursor[key] as Record<string, unknown>;
  }
  const finalKey = parts.at(-1)!;
  if (value === undefined || value === "") delete cursor[finalKey];
  else cursor[finalKey] = value;
}

export function applyCardSpecPatches(spec: CardSpecV2, patches: CardSpecPatch[]): CardSpecV2 {
  const next = structuredClone(spec) as unknown as Record<string, unknown>;
  delete next.quality;
  for (const patch of patches) {
    if (!EDITABLE_SPEC_PATHS.includes(patch.path))
      throw new Error(`Unsupported card edit: ${patch.path}`);
    setPath(next, patch.path, patch.value);
  }
  const parsed = CardSpecV2Schema.parse(next);
  const initial = evaluateCardSpec(parsed);
  const repaired = initial.passed ? parsed : repairCardSpec(parsed, initial);
  const quality = evaluateCardSpec(repaired);
  if (!quality.passed) throw new Error("That change would make the card unreadable.");
  return CardSpecV2Schema.parse({
    ...repaired,
    quality: { ...quality, repaired: !initial.passed },
  });
}
