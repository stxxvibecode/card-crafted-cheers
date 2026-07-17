export type QualityDimension =
  "legibility" | "composition" | "occasionFit" | "motion" | "recipientExperience";

export type QualityScore = Record<QualityDimension, number>;

export type QualityIssue = {
  dimension: QualityDimension;
  severity: "blocker" | "warning";
  detail: string;
};

export type QualityEvidence = {
  screenshots: string[];
  creatorUrl?: string;
  recipientUrl?: string;
  viewport: { width: number; height: number };
  notes?: string;
};

export type QualityReport = {
  fixtureId: string;
  score: QualityScore;
  total: number;
  passed: boolean;
  issues: QualityIssue[];
  evidence: QualityEvidence[];
};

export const QUALITY_DIMENSIONS: Array<{
  key: QualityDimension;
  label: string;
  guidance: string;
}> = [
  {
    key: "legibility",
    label: "Legibility",
    guidance:
      "Headline and message are complete, readable, contrasted, and safely inside the frame.",
  },
  {
    key: "composition",
    label: "Composition",
    guidance:
      "The card has a clear focal point, intentional spacing, and no generic or crowded layout.",
  },
  {
    key: "occasionFit",
    label: "Occasion fit",
    guidance: "Visual direction, copy, and interaction are specific to the recipient and moment.",
  },
  {
    key: "motion",
    label: "Motion",
    guidance:
      "Motion supports the emotion, settles into a usable final frame, and respects reduced motion.",
  },
  {
    key: "recipientExperience",
    label: "Recipient experience",
    guidance: "Open, response, RSVP, and keepsake actions feel coherent and work on a phone.",
  },
];

export function createBlankReport(
  fixtureId: string,
  evidence: QualityEvidence[] = [],
): QualityReport {
  const score: QualityScore = {
    legibility: 0,
    composition: 0,
    occasionFit: 0,
    motion: 0,
    recipientExperience: 0,
  };

  return { fixtureId, score, total: 0, passed: false, issues: [], evidence };
}

export function finalizeReport(report: Omit<QualityReport, "total" | "passed">): QualityReport {
  const values = Object.values(report.score);
  const total = values.reduce((sum, value) => sum + value, 0);
  const hasBlocker = report.issues.some((issue) => issue.severity === "blocker");

  return { ...report, total, passed: total >= 80 && !hasBlocker };
}
