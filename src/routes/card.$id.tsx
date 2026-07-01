import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav } from "@/components/site-nav";
import { Copy, Check, ArrowRight } from "lucide-react";

type Card = {
  id: string;
  message: string;
  image_url: string;
  sender_name: string | null;
  recipient_name: string;
  occasion: string | null;
};

export const Route = createFileRoute("/card/$id")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("cards")
      .select("id, message, image_url, sender_name, recipient_name, occasion")
      .eq("id", params.id)
      .maybeSingle();
    if (error || !data) throw notFound();
    return { card: data as Card };
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [
      { title: `A card for ${loaderData.card.recipient_name} — Pigeon` },
      { name: "description", content: loaderData.card.message.slice(0, 160) },
      { property: "og:title", content: `A card for ${loaderData.card.recipient_name}` },
      { property: "og:description", content: loaderData.card.message.slice(0, 160) },
      { property: "og:image", content: loaderData.card.image_url.startsWith("http") ? loaderData.card.image_url : "" },
    ] : [],
  }),
  component: CardPage,
  errorComponent: () => (
    <div className="min-h-screen bg-background"><SiteNav />
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="font-display text-4xl text-gradient">Card not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">This card may have been removed.</p>
      </div>
    </div>
  ),
});

function CardPage() {
  const { card } = Route.useLoaderData();
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (typeof window === "undefined") return;
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
        <p className="text-center text-sm text-muted-foreground">
          {card.occasion ? `A ${card.occasion.toLowerCase()} card` : "A card"} for{" "}
          <span className="text-foreground">{card.recipient_name}</span>
        </p>
        <article className="mt-6 overflow-hidden rounded-3xl border border-border bg-card shadow-[0_40px_100px_-40px_rgba(0,0,0,0.7)]">
          <img src={card.image_url} alt="" className="aspect-square w-full object-cover" />
          <div className="space-y-4 p-8 sm:p-10">
            <p className="whitespace-pre-line font-display text-2xl leading-snug italic sm:text-3xl">
              {card.message}
            </p>
            {card.sender_name && (
              <p className="text-right text-sm text-muted-foreground">— {card.sender_name}</p>
            )}
          </div>
        </article>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button onClick={copy} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm hover:border-primary/40">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy link"}
          </button>
          <Link to="/create" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blush to-amber px-4 py-2 text-sm font-medium text-background hover:opacity-90">
            Make your own <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
