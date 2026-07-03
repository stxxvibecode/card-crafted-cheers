import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav } from "@/components/site-nav";
import { Copy, Mail, MessageSquare, Share2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { CodedCard } from "@/lib/codedCards/CodedCard";
import type { CodeSpec } from "@/lib/codedCards/registry";

type Row = {
  id: string;
  recipient_name: string;
  occasion: string | null;
  message: string;
  image_url: string | null;
  medium: string;
  code_spec: CodeSpec | null;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/cards")({
  component: MyCards,
});

function MyCards() {
  const { user } = Route.useRouteContext();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    supabase
      .from("cards")
      .select("id, recipient_name, occasion, message, image_url, medium, code_spec, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows((data ?? []) as Row[]));
  }, [user.id]);

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <div className="mx-auto max-w-6xl px-3 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-display text-3xl text-gradient sm:text-4xl">My cards</h1>
          <Link
            to="/create"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-gradient-to-r from-blush to-amber px-4 py-2 text-sm font-medium text-background hover:opacity-90"
          >
            <Sparkles className="h-4 w-4" /> New card
          </Link>
        </div>

        {rows === null ? (
          <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-border bg-card/40 p-10 text-center">
            <p className="text-muted-foreground">You haven't sent any cards yet.</p>
            <Link
              to="/create"
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              Create your first card
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {rows.map((r) => (
              <article
                key={r.id}
                className="group overflow-hidden rounded-2xl border border-border bg-card transition hover:border-primary/40"
              >
                <Link to="/card/$id" params={{ id: r.id }} className="block">
                  <div className="aspect-square w-full overflow-hidden bg-muted">
                    {r.medium === "code" && r.code_spec ? (
                      <CodedCard spec={r.code_spec} />
                    ) : r.image_url ? (
                      <img src={r.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center text-sm text-muted-foreground">
                        No preview
                      </div>
                    )}
                  </div>
                </Link>
                <div className="p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {r.occasion ?? "Card"} · for {r.recipient_name}
                  </p>
                  <p className="mt-1 line-clamp-2 font-display italic">{r.message}</p>
                  <CardShareActions
                    id={r.id}
                    recipientName={r.recipient_name}
                    occasion={r.occasion}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CardShareActions({
  id,
  recipientName,
  occasion,
}: {
  id: string;
  recipientName: string;
  occasion: string | null;
}) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    setUrl(`${window.location.origin}/card/${id}`);
  }, [id]);

  if (!url) return null;

  const title = `A card for ${recipientName}`;
  const text = `${title}${occasion ? ` for ${occasion.toLowerCase()}` : ""}: ${url}`;
  const encodedText = encodeURIComponent(text);
  const encodedSubject = encodeURIComponent(title);
  const encodedBody = encodeURIComponent(`${text}\n\nMade with Pigeon.`);

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  }

  async function nativeShare() {
    if (!navigator.share) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({ title, text, url });
    } catch {
      // Share sheet cancelled.
    }
  }

  return (
    <div className="mt-4 grid grid-cols-4 gap-1.5">
      <button
        type="button"
        onClick={nativeShare}
        className="grid min-h-9 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground"
        aria-label="Share card"
        title="Share"
      >
        <Share2 className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={copyLink}
        className="grid min-h-9 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground"
        aria-label="Copy card link"
        title="Copy link"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
      <a
        href={`mailto:?subject=${encodedSubject}&body=${encodedBody}`}
        className="grid min-h-9 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground"
        aria-label="Email card"
        title="Email"
      >
        <Mail className="h-3.5 w-3.5" />
      </a>
      <a
        href={`sms:?&body=${encodedText}`}
        className="grid min-h-9 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground"
        aria-label="Text card"
        title="Text"
      >
        <MessageSquare className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
