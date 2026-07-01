export type TemplateId =
  | "confetti"
  | "fireworks"
  | "kinetic"
  | "hearts"
  | "starfield"
  | "ribbons"
  | "ai";

export type CodeSpec = {
  template: TemplateId;
  palette: string[];   // 3-5 hex colors, first is background
  phrase: string;
  tempo: number;       // 0.5 (slow) — 2 (fast)
  seed: number;
  source?: string;     // only when template === 'ai' — sandboxed JS body
};

export const TEMPLATES: {
  id: Exclude<TemplateId, "ai">;
  name: string;
  bestFor: string[];
  palette: string[];
}[] = [
  { id: "confetti",  name: "Confetti",       bestFor: ["birthday", "congrats", "anniversary"], palette: ["#0f0f14", "#ff6b6b", "#ffd166", "#06d6a0", "#4cc9f0"] },
  { id: "fireworks", name: "Fireworks",      bestFor: ["congrats", "anniversary", "holiday"],  palette: ["#050914", "#ff5f5f", "#ffcf5f", "#5fd7ff", "#c084fc"] },
  { id: "kinetic",   name: "Kinetic Serif",  bestFor: ["thank you", "thinking of you", "love"],palette: ["#faf6f0", "#1a1a1a", "#c9a961", "#e07856", "#7a9e7e"] },
  { id: "hearts",    name: "Floating Hearts",bestFor: ["love", "anniversary", "thinking of you"],palette: ["#fef1f2", "#ec4899", "#f472b6", "#be123c", "#fda4af"] },
  { id: "starfield", name: "Starfield",      bestFor: ["get well", "thinking of you", "holiday"],palette: ["#02030a", "#e0e7ff", "#a5b4fc", "#fef08a", "#f5f3ff"] },
  { id: "ribbons",   name: "Ribbons",        bestFor: ["birthday", "just because", "holiday"], palette: ["#fff8ee", "#ef4444", "#f59e0b", "#10b981", "#3b82f6"] },
];

export function suggestTemplate(occasion?: string): Exclude<TemplateId, "ai"> {
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

const TEMPLATE_SOURCES: Record<Exclude<TemplateId, "ai">, string> = {
  confetti: confettiSrc,
  fireworks: fireworksSrc,
  kinetic: kineticSrc,
  hearts: heartsSrc,
  starfield: starfieldSrc,
  ribbons: ribbonsSrc,
};

export function getTemplateSource(id: TemplateId): string | null {
  if (id === "ai") return null;
  return TEMPLATE_SOURCES[id] ?? null;
}
