export const OCCASION_PHRASE: Record<string, string> = {
  "birthday": "Happy Birthday",
  "thank you": "Thank You",
  "thank-you": "Thank You",
  "thanks": "Thank You",
  "congrats": "Congratulations",
  "congratulations": "Congratulations",
  "get well": "Get Well Soon",
  "holiday": "Happy Holidays",
  "anniversary": "Happy Anniversary",
  "love": "With Love",
  "thinking of you": "Thinking of You",
  "just because": "Just Because",
};

export function phraseFor(occasion?: string | null): string | undefined {
  if (!occasion) return undefined;
  return OCCASION_PHRASE[occasion.trim().toLowerCase()];
}

// Deterministic RNG from a seed (mulberry32).
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
