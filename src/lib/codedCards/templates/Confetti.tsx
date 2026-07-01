import { useMemo } from "react";
import { rng } from "@/lib/occasion";

export function Confetti({ phrase, palette, tempo, seed }: { phrase: string; palette: string[]; tempo: number; seed: number }) {
  const [bg, ...accents] = palette;
  const pieces = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: 90 }, (_, i) => ({
      i,
      left: r() * 100,
      delay: r() * -6,
      duration: 4 + r() * 6,
      size: 6 + r() * 10,
      rotate: r() * 360,
      color: accents[Math.floor(r() * accents.length)] ?? "#fff",
      round: r() > 0.5,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ backgroundColor: bg }}>
      <style>{`@keyframes pgn-fall { from { transform: translate3d(0,-10%,0) rotate(0deg); } to { transform: translate3d(0,110vh,0) rotate(720deg); } }`}</style>
      {pieces.map((p) => (
        <span
          key={p.i}
          style={{
            position: "absolute",
            top: 0,
            left: `${p.left}%`,
            width: p.size,
            height: p.size * (p.round ? 1 : 0.4),
            backgroundColor: p.color,
            borderRadius: p.round ? "50%" : 2,
            transform: `rotate(${p.rotate}deg)`,
            animation: `pgn-fall ${p.duration / tempo}s linear ${p.delay}s infinite`,
            opacity: 0.9,
          }}
        />
      ))}
      <div className="absolute inset-0 grid place-items-center px-6 text-center">
        <h1 className="pgn-phrase" style={{ color: palette[1] ?? "#fff", fontFamily: '"Instrument Serif", serif', fontSize: "clamp(2.5rem, 8vw, 5rem)', lineHeight: 1.05, letterSpacing: "-0.02em", textShadow: `0 2px 30px ${bg}` }}>
          {phrase}
        </h1>
      </div>
    </div>
  );
}
