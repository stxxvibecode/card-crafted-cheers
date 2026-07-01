import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteNav } from "@/components/site-nav";
import { ArrowRight, Sparkles, Wand2, Mail, Heart } from "lucide-react";

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
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            AI e-cards, ready in 20 seconds
          </div>
          <h1 className="font-display text-5xl leading-[1.02] tracking-tight sm:text-7xl">
            <span className="text-gradient">Send a card</span>
            <br />
            <span className="italic text-foreground/90">that feels like you.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
            Describe the card you want. Sendcard writes the message and paints the artwork,
            then delivers it to whoever needs it — no templates, no clip art.
          </p>

          {/* Prompt card */}
          <form
            onSubmit={(e) => { e.preventDefault(); if (prompt.trim()) start(prompt.trim()); }}
            className="mx-auto mt-10 max-w-2xl"
          >
            <div className="group rounded-2xl border border-border bg-card/80 p-2 shadow-[0_20px_80px_-20px_rgba(0,0,0,0.6)] backdrop-blur focus-within:border-primary/50 focus-within:shadow-[0_20px_80px_-10px_oklch(0.82_0.14_25_/_0.25)]">
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
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blush to-amber px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-40"
                >
                  Generate <ArrowRight className="h-4 w-4" />
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
            <div key={title} className="rounded-2xl border border-border bg-card/40 p-6">
              <span className="mb-4 inline-grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-blush/20 to-amber/20 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-4 pb-24 text-center sm:px-6">
        <div className="rounded-3xl border border-border bg-gradient-to-br from-blush/10 to-amber/10 p-10 sm:p-14">
          <h2 className="font-display text-4xl sm:text-5xl">
            <span className="text-gradient">Ready to send one?</span>
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground sm:text-base">
            Takes about 20 seconds. Free while we're in preview.
          </p>
          <Link
            to="/create"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition hover:opacity-90"
          >
            Create a card <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Sendcard. Made with warmth.
      </footer>
    </div>
  );
}
