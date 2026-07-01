import { useEffect, useRef } from "react";
import { rng } from "@/lib/occasion";

export function Starfield({ phrase, message, palette, tempo, seed }: { phrase: string; message?: string; palette: string[]; tempo: number; seed: number }) {
  const [bg, ...accents] = palette;
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const r = rng(seed);
    let raf = 0;
    const resize = () => { cv.width = cv.clientWidth * devicePixelRatio; cv.height = cv.clientHeight * devicePixelRatio; };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(cv);
    const stars = Array.from({ length: 220 }, () => ({
      x: r() * cv.width, y: r() * cv.height,
      z: 0.2 + r() * 0.8,
      color: accents[Math.floor(r() * accents.length)] ?? "#fff",
      twinkle: r() * Math.PI * 2,
    }));
    const tick = (t: number) => {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, cv.width, cv.height);
      for (const s of stars) {
        s.x -= s.z * tempo * 0.3;
        if (s.x < 0) s.x += cv.width;
        const a = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.001 * tempo + s.twinkle));
        ctx.globalAlpha = a * s.z;
        ctx.fillStyle = s.color;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.z * 1.6 * devicePixelRatio, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [bg, accents, tempo, seed]);
  return (
    <div className="relative h-full w-full overflow-hidden" style={{ backgroundColor: bg }}>
      <canvas ref={ref} className="absolute inset-0 h-full w-full" />
      <style>{`@keyframes pgn-fadein { from { opacity: 0; transform: translateY(0.4em); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div className="absolute inset-0 grid place-items-center px-6 text-center">
        <div className="flex max-w-[90%] flex-col items-center gap-4">
          <h1 style={{ color: palette[1] ?? "#fff", fontFamily: '"Instrument Serif", serif', fontSize: "clamp(2.25rem, 7vw, 4.5rem)", lineHeight: 1.05, letterSpacing: "-0.02em", animation: "pgn-fadein 1.6s ease-out both" }}>
            {phrase}
          </h1>
          {message ? (
            <p style={{ color: palette[1] ?? "#fff", opacity: 0.75, fontFamily: '"Instrument Serif", serif', fontSize: "clamp(0.95rem, 1.6vw, 1.25rem)", lineHeight: 1.4, maxWidth: "36ch", animation: "pgn-fadein 2s ease-out 0.5s both" }}>
              {message}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
