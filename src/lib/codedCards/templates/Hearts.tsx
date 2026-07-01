import { useMemo } from "react";
import { rng } from "@/lib/occasion";

export function Hearts({ phrase, message, palette, tempo, seed }: { phrase: string; message?: string; palette: string[]; tempo: number; seed: number }) {
  const [bg, ...accents] = palette;
  const hearts = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: 30 }, (_, i) => ({
      i,
      left: r() * 100,
      delay: r() * -10,
      duration: 6 + r() * 8,
      size: 12 + r() * 24,
      sway: 10 + r() * 30,
      color: accents[Math.floor(r() * accents.length)] ?? "#ec4899",
      opacity: 0.4 + r() * 0.5,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);
  return (
    <div className="relative h-full w-full overflow-hidden" style={{ backgroundColor: bg }}>
      <style>{`
        @keyframes pgn-float { 0% { transform: translate(0, 20%) scale(0.6); opacity: 0; } 10% { opacity: var(--o); } 100% { transform: translate(var(--sway), -110vh) scale(1); opacity: 0; } }
      `}</style>
      {hearts.map((h) => (
        <svg
          key={h.i}
          viewBox="0 0 24 24"
          style={{
            position: "absolute",
            bottom: 0,
            left: `${h.left}%`,
            width: h.size,
            height: h.size,
            color: h.color,
            ["--sway" as string]: `${h.sway}px`,
            ["--o" as string]: h.opacity,
            animation: `pgn-float ${h.duration / tempo}s ease-in ${h.delay}s infinite`,
          }}
        >
          <path fill="currentColor" d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6C19 16.5 12 21 12 21z" />
        </svg>
      ))}
      <div className="absolute inset-0 grid place-items-center px-6 text-center">
        <div className="flex max-w-[90%] flex-col items-center gap-4">
          <h1 style={{ color: palette[3] ?? palette[1], fontFamily: '"Instrument Serif", serif', fontSize: "clamp(2.25rem, 7vw, 4.5rem)", lineHeight: 1.05, letterSpacing: "-0.02em", fontStyle: "italic" }}>
            {phrase}
          </h1>
          {message ? (
            <p style={{ color: palette[3] ?? palette[1], opacity: 0.85, fontFamily: '"Instrument Serif", serif', fontSize: "clamp(0.95rem, 1.6vw, 1.25rem)", lineHeight: 1.4, maxWidth: "36ch" }}>
              {message}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
