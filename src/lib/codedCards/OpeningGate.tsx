import { useEffect, useState } from "react";
import { Mail } from "lucide-react";

/**
 * Tap-to-open overlay shown to recipients before the animation plays.
 * Matches the gate the exported standalone HTML uses so preview and download
 * behave the same way.
 */
export function OpeningGate({
  palette,
  recipientName,
  onOpen,
}: {
  palette: string[];
  recipientName?: string | null;
  onOpen: () => void;
}) {
  const bg = palette[0] ?? "#0f0f14";
  const accent = palette[2] ?? palette[1] ?? "#c9a961";
  const ink = isLight(bg) ? "#1a1a1a" : "#f8f5ef";

  // Autofocus the tap surface so keyboard users can hit Space/Enter.
  const [ref, setRef] = useState<HTMLButtonElement | null>(null);
  useEffect(() => {
    ref?.focus();
  }, [ref]);

  return (
    <button
      ref={setRef}
      type="button"
      onClick={onOpen}
      className="relative flex h-full w-full flex-col items-center justify-center gap-6 px-8 text-center outline-none transition"
      style={{ background: bg, color: ink }}
      aria-label="Tap to open card"
    >
      {/* seal */}
      <div
        className="grid h-16 w-16 place-items-center rounded-full transition-transform duration-500 group-hover:scale-105 motion-safe:animate-[pulse_3.6s_ease-in-out_infinite]"
        style={{
          background: accent,
          color: bg,
          boxShadow: `0 20px 50px -20px ${accent}80`,
        }}
      >
        <Mail className="h-7 w-7" strokeWidth={1.6} />
      </div>

      <div className="space-y-1.5">
        <div
          className="text-[10px] uppercase tracking-[0.28em] opacity-70"
          style={{ fontFamily: "ui-monospace, Menlo, monospace" }}
        >
          A card is waiting
        </div>
        <div
          className="text-3xl leading-tight sm:text-4xl"
          style={{ fontFamily: '"Instrument Serif", Georgia, serif', letterSpacing: "-0.01em" }}
        >
          Tap to open
        </div>
        {recipientName && (
          <div
            className="pt-2 text-sm italic opacity-70"
            style={{ fontFamily: '"Instrument Serif", Georgia, serif' }}
          >
            for {recipientName}
          </div>
        )}
      </div>
    </button>
  );
}

// Rough luminance check so text stays readable on any palette[0].
function isLight(hex: string): boolean {
  const m = hex.replace("#", "");
  const full =
    m.length === 3
      ? m
          .split("")
          .map((c) => c + c)
          .join("")
      : m.slice(0, 6);
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return false;
  const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return l > 0.6;
}
