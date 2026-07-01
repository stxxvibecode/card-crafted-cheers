import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteNav } from "@/components/site-nav";
import { ArrowRight, Feather, Wand2, Mail, Heart } from "lucide-react";

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

function Index() {
  const [prompt, setPrompt] = useState("");
  const navigate = useNavigate();

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
        <div className="relative mx-auto max-w-4xl px-4 pt-20 pb-24 text-center sm:px-6 sm:pt-28 sm:pb-32">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3.5 py-1.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground backdrop-blur">
            <Feather className="h-3.5 w-3.5" strokeWidth={1.5} />
            The unhurried e-card
          </div>
          <h1 className="font-display text-6xl leading-[0.98] tracking-tight sm:text-8xl">
            <span className="block">A card,</span>
            <span className="block italic text-gradient">carried by Pigeon.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
            Describe the card you want. Pigeon writes the message and paints the artwork,
            then delivers it to whoever needs it — no templates, no clip art.
          </p>

          {/* Prompt card */}
          <form
            onSubmit={(e) => { e.preventDefault(); if (prompt.trim()) start(prompt.trim()); }}
            className="mx-auto mt-10 max-w-2xl"
          >
            <div className="group rounded-2xl border border-border bg-card p-2 shadow-[0_30px_80px_-40px_oklch(0.22_0.015_60_/_0.25)] focus-within:border-foreground/30 focus-within:shadow-[0_30px_80px_-30px_oklch(0.22_0.015_60_/_0.35)]">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A birthday card for my dad who loves fishing at dawn…"
                rows={3}
                maxLength={500}
                className="w-full resize-none bg-transparent px-4 py-3 text-base outline-none placeholder:text-muted-foreground/70"
              />
              <div className="flex items-center justify-between gap-2 px-2 pb-1">
                <span className="text-xs text-muted-foreground">{prompt.length}/500</span>
                <button
                  type="submit"
                  disabled={!prompt.trim()}
                  className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-40"
                >
                  Send with Pigeon <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </form>

          {/* Example chips */}
          <div className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => start(ex)}
                className="rounded-full border border-border bg-card/50 px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              >
                {ex}
              </button>
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
            A minute of your afternoon. A moment of someone else's week.
          </p>
          <Link
            to="/create"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-foreground px-7 py-3 text-sm font-medium text-background transition hover:opacity-90"
          >
            Compose a card <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-xs tracking-wide text-muted-foreground">
        © {new Date().getFullYear()} Pigeon · Delivered by hand, or something like it.
      </footer>
    </div>
  );
}
