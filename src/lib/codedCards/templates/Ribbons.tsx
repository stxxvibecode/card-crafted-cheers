import { useMemo } from "react";
import { rng } from "@/lib/occasion";

export function Ribbons({
  phrase,
  message,
  palette,
  tempo,
  seed,
}: {
  phrase: string;
  message?: string;
  palette: string[];
  tempo: number;
  seed: number;
}) {
  const [bg, ...accents] = palette;
  const ribbons = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: 6 }, (_, i) => ({
      i,
      color: accents[i % accents.length] ?? "#ef4444",
      d: `M ${-20 + r() * 20} ${20 + i * 60} C ${100 + r() * 100} ${r() * 200}, ${300 + r() * 100} ${300 + r() * 100}, ${520} ${100 + r() * 300}`,
      dur: 8 + r() * 8,
      delay: -r() * 8,
      width: 6 + r() * 10,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);
  return (
    <div className="relative h-full w-full overflow-hidden" style={{ backgroundColor: bg }}>
      <style>{`
        @keyframes pgn-draw { to { stroke-dashoffset: 0; } }
        @keyframes pgn-drift { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
      `}</style>
      <svg
        viewBox="0 0 500 500"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
      >
        {ribbons.map((rb) => (
          <path
            key={rb.i}
            d={rb.d}
            fill="none"
            stroke={rb.color}
            strokeWidth={rb.width}
            strokeLinecap="round"
            opacity={0.7}
            style={{
              strokeDasharray: 2000,
              strokeDashoffset: 2000,
              animation: `pgn-draw ${rb.dur / tempo}s ease-out ${rb.delay}s infinite, pgn-drift ${6 / tempo}s ease-in-out ${rb.delay}s infinite`,
            }}
          />
        ))}
      </svg>
      <div className="absolute inset-0 grid place-items-center px-6 text-center">
        <div className="flex max-w-[90%] flex-col items-center gap-4">
          <h1
            style={{
              color: palette[1] ?? "#111",
              fontFamily: '"Instrument Serif", serif',
              fontSize: "clamp(2.25rem, 7vw, 4.5rem)",
              lineHeight: 1.02,
              letterSpacing: "-0.02em",
              fontStyle: "italic",
            }}
          >
            {phrase}
          </h1>
          {message ? (
            <p
              style={{
                color: palette[1] ?? "#111",
                opacity: 0.8,
                fontFamily: '"Instrument Serif", serif',
                fontSize: "clamp(0.95rem, 1.6vw, 1.25rem)",
                lineHeight: 1.4,
                maxWidth: "36ch",
              }}
            >
              {message}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
