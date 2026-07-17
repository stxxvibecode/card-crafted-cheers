import { z } from "zod";

export type LegacyTemplateId =
  "confetti" | "fireworks" | "kinetic" | "hearts" | "starfield" | "ribbons" | "ai";

export type TemplateId = LegacyTemplateId | "v2";

export type LegacyCodeSpec = {
  template: LegacyTemplateId;
  palette: string[]; // 3-5 hex colors, first is background
  phrase: string; // short headline (e.g. "Happy Birthday")
  message?: string; // full personal note, rendered as secondary text
  tempo: number; // 0.5 (slow) — 2 (fast)
  seed: number;
  source?: string; // only when template === 'ai' — sandboxed JS body
};

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit hex color");

export const CardSpecV2Schema = z
  .object({
    version: z.literal(2),
    template: z.literal("v2"),
    id: z.string().min(1).max(120),
    seed: z.number().int().min(0).max(999_999),
    format: z.enum(["portrait", "square", "story"]),
    occasion: z.string().min(1).max(64),
    theme: z.object({
      background: hexColor,
      ink: hexColor,
      accent: hexColor,
      fontPair: z.enum(["editorial", "modern", "playful", "mono"]),
    }),
    content: z.object({
      eyebrow: z.string().max(72).optional(),
      headline: z.string().min(1).max(80),
      message: z.string().max(600),
      recipient: z.string().max(80).optional(),
      sender: z.string().max(80).optional(),
      event: z
        .object({
          date: z.string().max(80).optional(),
          time: z.string().max(80).optional(),
          location: z.string().max(120).optional(),
        })
        .optional(),
    }),
    composition: z.object({
      layout: z.enum(["poster", "split", "ticket"]),
      alignment: z.enum(["left", "center", "right", "off-axis"]),
      density: z.enum(["quiet", "balanced", "expressive"]),
    }),
    motif: z.object({
      kind: z.enum(["ribbon", "bloom", "spark", "orbit", "light", "confetti", "none"]),
      intensity: z.number().min(0).max(1),
    }),
    motion: z.object({
      entrance: z.enum(["rise", "fade", "scale", "none"]),
      idle: z.enum(["float", "drift", "pulse", "none"]),
      durationMs: z.number().int().min(0).max(6000),
      reducedMotion: z.boolean(),
    }),
    interaction: z
      .object({
        kind: z.enum(["reveal", "reaction", "rsvp", "keepsake"]),
        labels: z.array(z.string().min(1).max(24)).max(3).optional(),
      })
      .optional(),
  })
  .strict();

export type CardSpecV2 = z.infer<typeof CardSpecV2Schema>;
export type CodeSpec = LegacyCodeSpec | CardSpecV2;

export function isCardSpecV2(spec: CodeSpec | null | undefined): spec is CardSpecV2 {
  return !!spec && spec.template === "v2" && spec.version === 2;
}

export const TEMPLATES: {
  id: Exclude<LegacyTemplateId, "ai">;
  name: string;
  bestFor: string[];
  palette: string[];
}[] = [
  {
    id: "confetti",
    name: "Confetti",
    bestFor: ["birthday", "congrats", "anniversary"],
    palette: ["#0f0f14", "#ff6b6b", "#ffd166", "#06d6a0", "#4cc9f0"],
  },
  {
    id: "fireworks",
    name: "Fireworks",
    bestFor: ["congrats", "anniversary", "holiday"],
    palette: ["#050914", "#ff5f5f", "#ffcf5f", "#5fd7ff", "#c084fc"],
  },
  {
    id: "kinetic",
    name: "Kinetic Serif",
    bestFor: ["thank you", "thinking of you", "love"],
    palette: ["#faf6f0", "#1a1a1a", "#c9a961", "#e07856", "#7a9e7e"],
  },
  {
    id: "hearts",
    name: "Floating Hearts",
    bestFor: ["love", "anniversary", "thinking of you"],
    palette: ["#fef1f2", "#ec4899", "#f472b6", "#be123c", "#fda4af"],
  },
  {
    id: "starfield",
    name: "Starfield",
    bestFor: ["get well", "thinking of you", "holiday"],
    palette: ["#02030a", "#e0e7ff", "#a5b4fc", "#fef08a", "#f5f3ff"],
  },
  {
    id: "ribbons",
    name: "Ribbons",
    bestFor: ["birthday", "just because", "holiday"],
    palette: ["#fff8ee", "#ef4444", "#f59e0b", "#10b981", "#3b82f6"],
  },
];

export function suggestTemplate(occasion?: string): Exclude<LegacyTemplateId, "ai"> {
  const o = occasion?.toLowerCase();
  if (!o) return "kinetic";
  const hit = TEMPLATES.find((t) => t.bestFor.includes(o));
  return hit?.id ?? "kinetic";
}

// Raw source of each template component for the "View code" panel.
// Vite's ?raw suffix inlines the file as a string at build time.
import confettiSrc from "./templates/Confetti.tsx?raw";
import fireworksSrc from "./templates/Fireworks.tsx?raw";
import kineticSrc from "./templates/KineticSerif.tsx?raw";
import heartsSrc from "./templates/Hearts.tsx?raw";
import starfieldSrc from "./templates/Starfield.tsx?raw";
import ribbonsSrc from "./templates/Ribbons.tsx?raw";

const TEMPLATE_SOURCES: Record<Exclude<LegacyTemplateId, "ai">, string> = {
  confetti: confettiSrc,
  fireworks: fireworksSrc,
  kinetic: kineticSrc,
  hearts: heartsSrc,
  starfield: starfieldSrc,
  ribbons: ribbonsSrc,
};

export function getTemplateSource(id: TemplateId): string | null {
  if (id === "ai" || id === "v2") return null;
  return TEMPLATE_SOURCES[id] ?? null;
}
