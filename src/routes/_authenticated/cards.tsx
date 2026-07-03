import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav } from "@/components/site-nav";
import { Sparkles } from "lucide-react";
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
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <h1 className="font-display text-4xl text-gradient">My cards</h1>
          <Link
            to="/create"
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blush to-amber px-4 py-2 text-sm font-medium text-background hover:opacity-90"
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
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((r) => (
              <Link
                key={r.id}
                to="/card/$id"
                params={{ id: r.id }}
                className="group overflow-hidden rounded-2xl border border-border bg-card transition hover:border-primary/40"
              >
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
                <div className="p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {r.occasion ?? "Card"} · for {r.recipient_name}
                  </p>
                  <p className="mt-1 line-clamp-2 font-display italic">{r.message}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
