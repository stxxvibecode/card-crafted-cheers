import { useEffect, useRef } from "react";
import { rng } from "@/lib/occasion";

export function Fireworks({ phrase, message, palette, tempo, seed }: { phrase: string; message?: string; palette: string[]; tempo: number; seed: number }) {
  const [bg, ...accents] = palette;
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const r = rng(seed);
    let raf = 0;
    let particles: { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number }[] = [];
    let last = 0;
    const resize = () => { cv.width = cv.clientWidth * devicePixelRatio; cv.height = cv.clientHeight * devicePixelRatio; };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(cv);

    const burst = () => {
      const cx = r() * cv.width;
      const cy = r() * cv.height * 0.6 + cv.height * 0.1;
      const color = accents[Math.floor(r() * accents.length)] ?? "#fff";
      const count = 40 + Math.floor(r() * 30);
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + r() * 0.2;
        const speed = (2 + r() * 3) * devicePixelRatio * tempo;
        particles.push({ x: cx, y: cy, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 0, max: 60 + r() * 30, color, size: 2 * devicePixelRatio });
      }
    };

    const tick = (t: number) => {
      if (t - last > 1000 / tempo) { burst(); last = t; }
      ctx.fillStyle = bg + "22";
      ctx.fillRect(0, 0, cv.width, cv.height);
      particles = particles.filter((p) => p.life < p.max);
      for (const p of particles) {
        p.life++;
        p.x += p.vx; p.y += p.vy; p.vy += 0.05 * devicePixelRatio;
        ctx.globalAlpha = 1 - p.life / p.max;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
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
      <div className="absolute inset-0 grid place-items-center px-6 text-center">
        <h1 style={{ color: palette[palette.length - 1] ?? "#fff", fontFamily: '"Instrument Serif", serif', fontSize: "clamp(2.5rem, 8vw, 5rem)", lineHeight: 1.05, letterSpacing: "-0.02em", mixBlendMode: "screen" }}>
          {phrase}
        </h1>
      </div>
    </div>
  );
}
