import type { CardSpecV2 } from "./registry";

export type QualityIssue = {
  code: string;
  severity: "blocker" | "warning";
  path?: string;
  repairHint: string;
};

export type QualityResult = {
  passed: boolean;
  score: number;
  repaired: boolean;
  issues: QualityIssue[];
};

const EVENT_OCCASION =
  /rsvp|invitation|invite|wedding|shower|graduation|save.?the.?date|event|party|dinner|launch/i;
const QUIET_OCCASION = /thank|well|thinking|sympathy|condolence/i;

function luminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/../g)
    ?.map((value) => parseInt(value, 16) / 255) ?? [0, 0, 0];
  const [r, g, b] = channels.map((value) =>
    value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

export function evaluateCardSpec(spec: CardSpecV2): QualityResult {
  const issues: QualityIssue[] = [];
  const eventCard = EVENT_OCCASION.test(`${spec.occasion} ${spec.content.message}`);
  const quietCard = QUIET_OCCASION.test(`${spec.occasion} ${spec.content.message}`);
  const ratio = contrast(spec.theme.background, spec.theme.ink);

  if (ratio < 4.5)
    issues.push({
      code: "low_contrast",
      severity: "blocker",
      path: "theme.ink",
      repairHint: "Use ink with at least 4.5:1 contrast against the background.",
    });
  if (spec.content.message.length > 520)
    issues.push({
      code: "message_clipped",
      severity: "warning",
      path: "content.message",
      repairHint: "Consider a shorter message for the strongest mobile reading experience.",
    });
  if (spec.content.headline.length > 58)
    issues.push({
      code: "headline_clipped",
      severity: "warning",
      path: "content.headline",
      repairHint: "Consider a shorter headline that fits the card safe zone.",
    });
  if (eventCard && spec.composition.layout !== "ticket")
    issues.push({
      code: "occasion_mismatch",
      severity: "blocker",
      path: "composition.layout",
      repairHint: "Use the ticket layout for event and RSVP cards.",
    });
  if (eventCard && spec.interaction?.kind !== "rsvp")
    issues.push({
      code: "missing_rsvp",
      severity: "warning",
      path: "interaction",
      repairHint: "Use platform RSVP choices for an invitation.",
    });
  if (quietCard && ["confetti", "spark"].includes(spec.motif.kind))
    issues.push({
      code: "motion_mismatch",
      severity: "warning",
      path: "motif.kind",
      repairHint: "Use a quieter motif for a reflective occasion.",
    });
  if (!spec.motion.reducedMotion && spec.motion.durationMs < 900 && spec.motion.idle !== "none")
    issues.push({
      code: "excessive_motion",
      severity: "warning",
      path: "motion.durationMs",
      repairHint: "Slow the ambient animation to a calm, readable pace.",
    });
  if (spec.composition.layout === "ticket" && !spec.content.event)
    issues.push({
      code: "missing_event_details",
      severity: "warning",
      path: "content.event",
      repairHint: "Add date, time, or location when the sender provided them.",
    });

  const score = Math.max(
    0,
    100 - issues.reduce((total, issue) => total + (issue.severity === "blocker" ? 35 : 6), 0),
  );
  return {
    passed: !issues.some((issue) => issue.severity === "blocker") && score >= 80,
    score,
    repaired: false,
    issues,
  };
}

export function repairCardSpec(spec: CardSpecV2, result: QualityResult): CardSpecV2 {
  const codes = new Set(result.issues.map((issue) => issue.code));
  const eventCard = EVENT_OCCASION.test(`${spec.occasion} ${spec.content.message}`);
  const quietCard = QUIET_OCCASION.test(`${spec.occasion} ${spec.content.message}`);
  return {
    ...spec,
    theme: codes.has("low_contrast")
      ? { ...spec.theme, ink: luminance(spec.theme.background) > 0.5 ? "#171717" : "#fbf8f2" }
      : spec.theme,
    composition:
      eventCard && codes.has("occasion_mismatch")
        ? { ...spec.composition, layout: "ticket" }
        : spec.composition,
    motif:
      quietCard && codes.has("motion_mismatch")
        ? { ...spec.motif, kind: "light", intensity: Math.min(spec.motif.intensity, 0.4) }
        : spec.motif,
    motion: codes.has("excessive_motion") ? { ...spec.motion, durationMs: 2200 } : spec.motion,
    interaction: eventCard
      ? { kind: "rsvp", labels: ["Yes", "Maybe", "Can't make it"] }
      : spec.interaction,
  };
}
