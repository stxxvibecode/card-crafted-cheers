import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SiteNav } from "@/components/site-nav";
import { ArrowUp, Mail, Palette, Code2 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

const ROTATING = [
  "a birthday card for my dad who loves fishing at dawn…",
  "a thank-you note for the neighbor who fed my cat…",
  "an anniversary card — jazz records and late dinners…",
  "a get-well card with a sleepy golden retriever…",
  "a congrats card for my best friend's first marathon…",
];

const HEADLINE_A = "Words that linger,";
const HEADLINE_B = "delivered by Pigeon.";

function useTypewriter(lines: string[], active: boolean) {
  const [text, setText] = useState("");
  const state = useRef({ line: 0, char: 0, deleting: false });

  useEffect(() => {
    if (!active) return;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      const s = state.current;
      const full = lines[s.line];
      if (!s.deleting) {
        s.char++;
        setText(full.slice(0, s.char));
        if (s.char >= full.length) {
          s.deleting = true;
          t = setTimeout(tick, 2400);
          return;
        }
        t = setTimeout(tick, 34 + Math.random() * 40);
      } else {
        s.char -= 3;
        if (s.char <= 0) {
          s.char = 0;
          s.deleting = false;
          s.line = (s.line + 1) % lines.length;
          setText("");
          t = setTimeout(tick, 400);
          return;
        }
        setText(full.slice(0, s.char));
        t = setTimeout(tick, 14);
      }
    };
    t = setTimeout(tick, 600);
    return () => clearTimeout(t);
  }, [lines, active]);

  return text;
}

/** Fade + rise on scroll, once. */
function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -80px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 700ms cubic-bezier(.22,1,.36,1) ${delay}ms, transform 700ms cubic-bezier(.22,1,.36,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function Index() {
  const [prompt, setPrompt] = useState("");
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();
  const ghost = useTypewriter(ROTATING, !focused && !prompt);

  function start(p: string) {
    navigate({ to: "/create", search: { prompt: p } as never });
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-coral/20">
      <style>{`
        @keyframes pgn-word-in { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        @keyframes pgn-float-a { 0%,100% { transform: rotate(-6deg) translateY(0); } 50% { transform: rotate(-6deg) translateY(-10px); } }
        @keyframes pgn-float-b { 0%,100% { transform: rotate(3deg) translateX(8px) translateY(0); } 50% { transform: rotate(3deg) translateX(8px) translateY(-14px); } }
        @keyframes pgn-float-c { 0%,100% { transform: rotate(-1deg) translateX(-8px) translateY(0); } 50% { transform: rotate(-1deg) translateX(-8px) translateY(-6px); } }
        @keyframes pgn-blob { 0%,100% { transform: scale(1) translate(0,0); opacity: .18; } 50% { transform: scale(1.08) translate(2%, -1%); opacity: .28; } }
        .pgn-word { display:inline-block; opacity:0; animation: pgn-word-in .9s cubic-bezier(.22,1,.36,1) forwards; }
        @media (prefers-reduced-motion: reduce) {
          .pgn-word, [data-pgn-float], [data-pgn-blob] { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>

      <SiteNav />

      {/* ============ HERO ============ */}
      <section className="relative flex min-h-[92vh] flex-col items-center justify-center overflow-hidden px-4 pb-24 pt-16 sm:px-6 sm:pt-24">
        {/* Ambient blobs */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div
            data-pgn-blob
            className="absolute -left-[10%] -top-[12%] h-[46%] w-[46%] rounded-full bg-coral/40 blur-[130px]"
            style={{ animation: "pgn-blob 11s ease-in-out infinite" }}
          />
          <div
            data-pgn-blob
            className="absolute -bottom-[14%] -right-[10%] h-[52%] w-[52%] rounded-full bg-[oklch(0.88_0.03_75)] blur-[140px] opacity-70"
            style={{ animation: "pgn-blob 14s ease-in-out 2s infinite" }}
          />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.32em] text-coral sm:text-[11px]">
            <span className="h-px w-6 bg-coral/60" />
            The unhurried e-card
            <span className="h-px w-6 bg-coral/60" />
          </div>

          <h1 className="font-serif text-[44px] italic leading-[1.02] tracking-tight text-foreground sm:text-6xl md:text-7xl">
            <span className="block">
              {HEADLINE_A.split(" ").map((w, i) => (
                <span
                  key={`a-${i}`}
                  className="pgn-word mr-[0.22em]"
                  style={{ animationDelay: `${140 + i * 110}ms` }}
                >
                  {w}
                </span>
              ))}
            </span>
            <span className="block">
              {HEADLINE_B.split(" ").map((w, i) => (
                <span
                  key={`b-${i}`}
                  className="pgn-word mr-[0.22em]"
                  style={{ animationDelay: `${520 + i * 110}ms` }}
                >
                  {w}
                </span>
              ))}
            </span>
          </h1>

          <p
            className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg"
            style={{ opacity: 0, animation: "pgn-word-in .9s cubic-bezier(.22,1,.36,1) 980ms forwards" }}
          >
            Tell Pigeon who it's for. It writes the note, paints the art — or codes a live
            animated card — and carries it over.
          </p>

          {/* Composer */}
          <div
            className="mx-auto mt-10 max-w-2xl rounded-2xl border border-border/60 bg-secondary/60 p-1 shadow-[0_40px_100px_-50px_oklch(0.22_0.015_60_/_0.35)] backdrop-blur"
            style={{ opacity: 0, animation: "pgn-word-in .9s cubic-bezier(.22,1,.36,1) 1180ms forwards" }}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (prompt.trim()) start(prompt.trim());
              }}
              className="flex items-end gap-2 rounded-xl bg-background px-3.5 py-3 text-left sm:gap-3"
            >
              <span className="mb-1 hidden h-9 w-9 shrink-0 place-items-center rounded-full bg-foreground text-background sm:grid">
                <Mail className="h-4 w-4" strokeWidth={1.5} />
              </span>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (prompt.trim()) start(prompt.trim());
                  }
                }}
                placeholder={ghost || "Describe your card…"}
                rows={2}
                maxLength={500}
                className="min-h-[44px] w-full resize-none bg-transparent py-1.5 font-serif text-lg italic leading-snug outline-none placeholder:text-muted-foreground/50"
              />
              <button
                type="submit"
                disabled={!prompt.trim()}
                aria-label="Send to Pigeon"
                className="mb-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-foreground text-background transition hover:bg-coral disabled:opacity-30"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            </form>
            <div className="flex items-center justify-between px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground/70">
              <span className="inline-flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5">
                  <Palette className="h-3 w-3" /> Art
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Code2 className="h-3 w-3" /> Code
                </span>
              </span>
              <span>Enter to send</span>
            </div>
          </div>

          {/* Drifting card stack */}
          <div
            className="relative mx-auto mt-16 h-[280px] w-full max-w-lg sm:mt-24 sm:h-[300px]"
            style={{ opacity: 0, animation: "pgn-word-in .9s cubic-bezier(.22,1,.36,1) 1380ms forwards" }}
            aria-hidden
          >
            {/* Back ghost */}
            <div
              data-pgn-float
              className="absolute inset-0 scale-95 rounded-sm border border-border bg-secondary opacity-40 shadow-sm"
              style={{ animation: "pgn-float-a 9s ease-in-out infinite" }}
            />
            {/* Middle: quiet line */}
            <div
              data-pgn-float
              className="absolute inset-0 rounded-sm border border-border bg-secondary p-7 text-left shadow-md"
              style={{ animation: "pgn-float-b 8s ease-in-out .8s infinite" }}
            >
              <div className="mb-5 h-[2px] w-12 bg-coral/40" />
              <p className="font-serif text-base italic leading-relaxed text-muted-foreground sm:text-lg">
                &ldquo;The light between the pines reminds me of that summer…&rdquo;
              </p>
            </div>
            {/* Front: signed card */}
            <div
              data-pgn-float
              className="absolute inset-0 rounded-sm border border-border bg-card p-7 text-left shadow-2xl"
              style={{ animation: "pgn-float-c 10s ease-in-out 1.6s infinite" }}
            >
              <div className="mb-6 flex items-start justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-coral/10">
                  <span className="h-3.5 w-3.5 rounded-full bg-coral" />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/60">
                  Pigeon № 002
                </span>
              </div>
              <p className="font-serif text-xl italic leading-relaxed text-foreground sm:text-2xl">
                May your coffee be hot and your heart light. Thinking of you, always.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="border-y border-border/60 bg-secondary/50">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
          <div className="grid gap-14 sm:grid-cols-3 sm:gap-12">
            {[
              {
                n: "01",
                eyebrow: "Compose",
                title: "Say who it's for",
                desc: "One sentence is plenty — a name, an occasion, a private joke. Pigeon asks a follow-up if it helps.",
              },
              {
                n: "02",
                eyebrow: "Curate",
                title: "Choose art or code",
                desc: "A hand-painted illustration, or a live animated card written in code just for them.",
              },
              {
                n: "03",
                eyebrow: "Deliver",
                title: "Send it on its way",
                desc: "They receive a quiet link that opens anywhere — no account, no ads, no clutter.",
              },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 120} className="space-y-3">
                <div className="flex items-baseline gap-3">
                  <span className="font-serif text-2xl italic text-coral">{s.n}.</span>
                  <span className="text-[11px] font-medium uppercase tracking-[0.28em] text-coral">
                    {s.eyebrow}
                  </span>
                </div>
                <h3 className="font-serif text-2xl italic leading-tight text-foreground sm:text-3xl">
                  {s.title}
                </h3>
                <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
                  {s.desc}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ DESIGNED FOR DEPTH ============ */}
      <section className="mx-auto max-w-4xl px-4 py-24 sm:px-6 sm:py-32">
        <Reveal className="mb-14 flex flex-col items-center text-center">
          <h2 className="font-serif text-4xl italic text-foreground sm:text-5xl">
            Designed for depth.
          </h2>
          <div className="mt-5 h-[2px] w-12 bg-coral" />
        </Reveal>

        <Reveal delay={140}>
          <div className="overflow-hidden rounded-2xl border border-border bg-card p-10 shadow-[0_30px_80px_-40px_oklch(0.22_0.015_60_/_0.35)] sm:p-16">
            <div className="mx-auto max-w-xl text-center">
              <span className="mx-auto mb-6 grid h-12 w-12 place-items-center rounded-full bg-coral/10">
                <Palette className="h-5 w-5 text-coral" strokeWidth={1.5} />
              </span>
              <h3 className="font-serif text-2xl italic leading-snug text-foreground sm:text-3xl">
                Every card, painted fresh from your words.
              </h3>
              <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                No stock photos, no repeats. Pigeon reads the room, drafts a warm note, and
                composes the art — or the code — around it.
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="bg-[oklch(0.2_0.015_60)] px-4 py-28 text-center sm:px-6 sm:py-36">
        <Reveal>
          <h2 className="mx-auto max-w-3xl font-serif text-4xl italic leading-[1.05] text-[#F5F3EE] sm:text-6xl">
            Send something lovely.
          </h2>
          <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-[#F5F3EE]/60 sm:text-base">
            A minute of your afternoon. A moment of someone else&apos;s week.
          </p>
          <div className="mt-10">
            <Link
              to="/create"
              className="inline-flex items-center gap-2 rounded-full bg-coral px-8 py-4 text-sm font-medium uppercase tracking-[0.16em] text-[#F5F3EE] transition hover:opacity-90"
            >
              Compose your first Pigeon <ArrowUp className="h-4 w-4 rotate-45" />
            </Link>
          </div>
          <p className="mt-8 text-[10px] uppercase tracking-[0.32em] text-[#F5F3EE]/40">
            Delivered by hand — or something like it
          </p>
        </Reveal>
      </section>

      <footer className="border-t border-border/60 bg-background py-8 text-center text-xs tracking-wide text-muted-foreground">
        © {new Date().getFullYear()} Pigeon · Delivered by hand, or something like it.
      </footer>
    </div>
  );
}
