import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SiteNav } from "@/components/site-nav";
import { ArrowUp, Bird, Feather, Wand2, Mail, Heart, Code2, Palette, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

const EXAMPLES = [
  "Birthday card for my sister who loves horses and mountains",
  "Thank you card for my kid's teacher — playful, floral",
  "Congrats on the new baby — soft pastels, moon and stars",
  "Get well soon — cozy tea, warm blanket, cat on a windowsill",
  "Anniversary card — sunlit picnic, two teacups, wildflowers",
];

const ROTATING = [
  "a birthday card for my dad who loves fishing at dawn…",
  "a thank-you note for the neighbor who fed my cat…",
  "an anniversary card — jazz records and late dinners…",
  "a get-well card with a sleepy golden retriever…",
  "a congrats card for my best friend's first marathon…",
];

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
          t = setTimeout(tick, 2200);
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

function Index() {
  const [prompt, setPrompt] = useState("");
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();
  const ghost = useTypewriter(ROTATING, !focused && !prompt);

  function start(p: string) {
    navigate({ to: "/create", search: { prompt: p } as never });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-glow" aria-hidden />
        <div className="absolute inset-0 bg-grid opacity-40" aria-hidden />

        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pt-16 pb-20 sm:px-6 sm:pt-24 sm:pb-28 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          {/* Left: copy + chat */}
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3.5 py-1.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground backdrop-blur">
              <Feather className="h-3.5 w-3.5" strokeWidth={1.5} />
              The unhurried e-card
            </div>

            <h1 className="font-display text-5xl leading-[0.98] tracking-tight sm:text-7xl">
              <span className="block">Tell Pigeon</span>
              <span className="block italic text-gradient">who it&apos;s for.</span>
            </h1>

            <p className="mt-5 max-w-md text-base text-muted-foreground sm:text-lg">
              Chat with Pigeon like you&apos;d text a friend. It writes the message,
              paints the art — or codes a live animated card — and delivers it.
            </p>

            {/* Chat window */}
            <div className="mt-9 max-w-xl overflow-hidden rounded-3xl border border-border bg-card shadow-[0_40px_100px_-40px_oklch(0.22_0.015_60_/_0.3)]">
              {/* Chat header */}
              <div className="flex items-center gap-2.5 border-b border-border/60 bg-background/40 px-4 py-3">
                <span className="grid h-7 w-7 place-items-center rounded-full border border-border bg-card">
                  <Bird className="h-3.5 w-3.5" strokeWidth={1.5} />
                </span>
                <div className="leading-tight">
                  <div className="text-sm font-medium">Pigeon</div>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    ready to build your card
                  </div>
                </div>
              </div>

              {/* Seed message */}
              <div className="space-y-3 px-4 py-4">
                <div className="flex items-end gap-2">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-border bg-background">
                    <Bird className="h-3 w-3" strokeWidth={1.5} />
                  </span>
                  <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-border/60 bg-background/60 px-3.5 py-2.5 text-sm leading-relaxed text-foreground">
                    Hi! Who&apos;s the card for, and what&apos;s the occasion? I&apos;ll take it from there.
                  </div>
                </div>
              </div>

              {/* Composer */}
              <form
                onSubmit={(e) => { e.preventDefault(); if (prompt.trim()) start(prompt.trim()); }}
                className="border-t border-border/60 p-3"
              >
                <div className="relative flex items-end gap-2 rounded-2xl border border-border bg-background px-3 py-2 focus-within:border-foreground/30">
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
                    className="w-full resize-none bg-transparent py-1.5 text-[15px] outline-none placeholder:text-muted-foreground/60"
                  />
                  <button
                    type="submit"
                    disabled={!prompt.trim()}
                    aria-label="Start your card"
                    className="mb-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-foreground text-background transition hover:opacity-90 disabled:opacity-30"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between px-1 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-3">
                    <span className="inline-flex items-center gap-1"><Palette className="h-3 w-3" /> Art</span>
                    <span className="inline-flex items-center gap-1"><Code2 className="h-3 w-3" /> Code</span>
                  </span>
                  <span>Enter to start</span>
                </div>
              </form>
            </div>

          </div>

          {/* Right: card stack */}
          <div className="relative hidden select-none lg:block" aria-hidden>
            <style>{`
              @keyframes pgn-float-a { 0%,100% { transform: rotate(-5deg) translateY(0); } 50% { transform: rotate(-5deg) translateY(-10px); } }
              @keyframes pgn-float-b { 0%,100% { transform: rotate(3.5deg) translateY(0); } 50% { transform: rotate(3.5deg) translateY(-14px); } }
              @keyframes pgn-float-c { 0%,100% { transform: rotate(-1deg) translateY(0); } 50% { transform: rotate(-1deg) translateY(-7px); } }
              @keyframes pgn-shimmer { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
            `}</style>

            <div className="relative mx-auto h-[520px] w-[420px]">
              {/* Card 1 — painted art */}
              <div
                className="absolute left-0 top-6 w-64 overflow-hidden rounded-2xl border border-border bg-card shadow-[0_30px_70px_-30px_oklch(0.22_0.015_60_/_0.4)]"
                style={{ animation: "pgn-float-a 7s ease-in-out infinite" }}
              >
                <div className="aspect-square w-full bg-[radial-gradient(circle_at_30%_25%,oklch(0.85_0.09_60),transparent_55%),radial-gradient(circle_at_75%_70%,oklch(0.78_0.1_320),transparent_50%),linear-gradient(160deg,oklch(0.93_0.04_80),oklch(0.82_0.06_250))]" />
                <div className="px-4 py-3">
                  <div className="font-display text-lg italic leading-tight">Happy birthday, Maya</div>
                  <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Palette className="h-3 w-3" /> Painted art
                  </div>
                </div>
              </div>

              {/* Card 2 — coded card */}
              <div
                className="absolute right-0 top-0 w-60 overflow-hidden rounded-2xl border border-border bg-[oklch(0.2_0.02_270)] text-white shadow-[0_30px_70px_-30px_oklch(0.22_0.015_60_/_0.5)]"
                style={{ animation: "pgn-float-b 8s ease-in-out 0.8s infinite" }}
              >
                <div className="relative aspect-square w-full overflow-hidden">
                  <div
                    className="absolute inset-0 opacity-90"
                    style={{
                      background: "linear-gradient(120deg, oklch(0.55 0.2 300), oklch(0.65 0.18 200), oklch(0.7 0.16 140), oklch(0.55 0.2 300))",
                      backgroundSize: "200% 200%",
                      animation: "pgn-shimmer 6s linear infinite",
                    }}
                  />
                  <div className="absolute inset-0 grid place-items-center px-5 text-center">
                    <div>
                      <div className="font-display text-2xl italic leading-tight">Congrats, Leo!</div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.2em] opacity-70">№ 001 — for you</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 px-4 py-3 text-[11px] text-white/70">
                  <Code2 className="h-3 w-3" /> Live coded card
                </div>
              </div>

              {/* Card 3 — quiet note */}
              <div
                className="absolute bottom-0 left-16 w-72 overflow-hidden rounded-2xl border border-border bg-card shadow-[0_30px_70px_-30px_oklch(0.22_0.015_60_/_0.4)]"
                style={{ animation: "pgn-float-c 9s ease-in-out 1.6s infinite" }}
              >
                <div className="px-5 py-5">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Thank you</div>
                  <div className="mt-2 font-display text-xl italic leading-snug">
                    "You showed up when it mattered — and it mattered a lot."
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Sparkles className="h-3 w-3" /> Message drafted by You!&nbsp;
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border/60 bg-card/30">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { n: "01", title: "Say who it's for", desc: "One sentence is plenty. Pigeon asks a follow-up if it helps." },
              { n: "02", title: "Pick art or code", desc: "A painted illustration, or a live animated card written in code." },
              { n: "03", title: "Send it on", desc: "They get a beautiful link that opens anywhere. No account needed." },
            ].map(({ n, title, desc }) => (
              <div key={n} className="flex gap-4">
                <span className="font-display text-3xl italic text-muted-foreground/50">{n}</span>
                <div>
                  <h3 className="font-display text-xl leading-tight">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: Wand2, title: "One-of-a-kind art", desc: "Every card is painted fresh from your prompt. No stock photos, no repeats." },
            { icon: Heart, title: "Words that land", desc: "AI drafts a warm, personal note. Edit it, or send it as-is." },
            { icon: Mail, title: "Delivered by email", desc: "Enter a name and email. They get a beautiful link they can open anywhere." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-7">
              <span className="mb-5 inline-grid h-10 w-10 place-items-center rounded-full border border-border bg-background text-foreground">
                <Icon className="h-4 w-4" strokeWidth={1.5} />
              </span>
              <h3 className="font-display text-2xl leading-tight">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-4 pb-24 text-center sm:px-6">
        <div className="rounded-3xl border border-border bg-card p-12 sm:p-16">
          <h2 className="font-display text-5xl italic sm:text-6xl">
            <span className="text-gradient">Send something lovely.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground sm:text-base">
            A minute of your afternoon. A moment of someone else&apos;s week.
          </p>
          <Link
            to="/create"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-foreground px-7 py-3 text-sm font-medium text-background transition hover:opacity-90"
          >
            Compose a card <ArrowUp className="h-4 w-4 rotate-45" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-xs tracking-wide text-muted-foreground">
        © {new Date().getFullYear()} Pigeon · Delivered by hand, or something like it.
      </footer>
    </div>
  );
}
