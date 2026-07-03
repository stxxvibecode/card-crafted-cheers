import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav } from "@/components/site-nav";
import { Copy, Mail, MessageCircle, Share2, Sparkles } from "lucide-react";
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

type ResponseKind = "reply" | "reaction" | "rsvp" | "guestbook";

type ResponseRow = {
  id: string;
  card_id: string;
  kind: ResponseKind;
  content: string;
  author_name: string | null;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/cards")({
  component: MyCards,
});

function MyCards() {
  const { user } = Route.useRouteContext();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [responsesByCard, setResponsesByCard] = useState<Record<string, ResponseRow[]>>({});
  const [responsesError, setResponsesError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("cards")
      .select("id, recipient_name, occasion, message, image_url, medium, code_spec, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(async ({ data }) => {
        const cards = (data ?? []) as Row[];
        setRows(cards);

        const ids = cards.map((card) => card.id);
        if (!ids.length) {
          setResponsesByCard({});
          setResponsesError(null);
          return;
        }

        const { data: responses, error } = await supabase
          .from("card_responses")
          .select("id, card_id, kind, content, author_name, created_at")
          .in("card_id", ids)
          .order("created_at", { ascending: false });

        if (error) {
          setResponsesByCard({});
          setResponsesError(error.message);
          return;
        }

        setResponsesError(null);
        setResponsesByCard(
          ((responses ?? []) as ResponseRow[]).reduce<Record<string, ResponseRow[]>>(
            (acc, response) => {
              acc[response.card_id] = [...(acc[response.card_id] ?? []), response];
              return acc;
            },
            {},
          ),
        );
      });
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
                  <ResponseSummary
                    responses={responsesByCard[r.id] ?? []}
                    responsesError={responsesError}
                  />
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

function ResponseSummary({
  responses,
  responsesError,
}: {
  responses: ResponseRow[];
  responsesError: string | null;
}) {
  if (responsesError) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-border bg-background/50 p-3 text-xs text-muted-foreground">
        Responses unavailable: {responsesError}
      </div>
    );
  }

  if (!responses.length) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-border bg-background/50 p-3 text-xs text-muted-foreground">
        No recipient responses yet.
      </div>
    );
  }

  const counts = responses.reduce<Record<ResponseKind, number>>(
    (acc, response) => {
      acc[response.kind] += 1;
      return acc;
    },
    { reply: 0, reaction: 0, rsvp: 0, guestbook: 0 },
  );

  const countLabel = [
    counts.reply ? `${counts.reply} ${counts.reply === 1 ? "reply" : "replies"}` : null,
    counts.reaction
      ? `${counts.reaction} ${counts.reaction === 1 ? "reaction" : "reactions"}`
      : null,
    counts.rsvp ? `${counts.rsvp} RSVP` : null,
    counts.guestbook ? `${counts.guestbook} guestbook` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mt-4 rounded-xl border border-border bg-background/60 p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
        <MessageCircle className="h-3.5 w-3.5" />
        {countLabel}
      </div>
      <div className="mt-2 space-y-2">
        {responses.slice(0, 3).map((response) => (
          <div key={response.id} className="rounded-lg bg-card/70 p-2">
            <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
              <span>{response.kind}</span>
              <time dateTime={response.created_at}>{formatShortDate(response.created_at)}</time>
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-foreground">
              {response.author_name ? `${response.author_name}: ` : ""}
              {response.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
    new Date(value),
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
    <div className="mt-4 grid grid-cols-3 gap-1.5">
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
    </div>
  );
}
