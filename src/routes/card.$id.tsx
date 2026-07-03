import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Copy,
  Check,
  ArrowRight,
  Download,
  Heart,
  MessageCircle,
  Send,
  Loader2,
  Feather,
} from "lucide-react";
import { CodedCard } from "@/lib/codedCards/CodedCard";
import { downloadStandaloneHtml } from "@/lib/codedCards/exportHtml";
import type { CodeSpec } from "@/lib/codedCards/registry";

type Card = {
  id: string;
  message: string;
  image_url: string | null;
  sender_name: string | null;
  recipient_name: string;
  occasion: string | null;
  medium: "art" | "code";
  code_spec: CodeSpec | null;
};

export const Route = createFileRoute("/card/$id")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("cards")
      .select("id, message, image_url, sender_name, recipient_name, occasion, medium, code_spec")
      .eq("id", params.id)
      .maybeSingle();
    if (error || !data) throw notFound();
    return { card: data as Card };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `A card for ${loaderData.card.recipient_name} — Pigeon` },
          { name: "description", content: `${loaderData.card.sender_name ?? "Someone"} sent you a card. Tap to open it.` },
          { property: "og:title", content: `A card for ${loaderData.card.recipient_name}` },
          { property: "og:description", content: `${loaderData.card.sender_name ?? "Someone"} made this just for you.` },
          ...(loaderData.card.image_url?.startsWith("http")
            ? [{ property: "og:image", content: loaderData.card.image_url }]
            : []),
        ]
      : [],
  }),
  component: CardPage,
  errorComponent: UnavailableCard,
  notFoundComponent: UnavailableCard,
});

/* ---------------------------------------------------------------- */
/* Occasion → tone + actions                                         */
/* ---------------------------------------------------------------- */

type Tone = "celebratory" | "warm" | "romantic" | "gentle";

function toneFor(occasion?: string | null): Tone {
  const o = (occasion ?? "").toLowerCase();
  if (/(get well|sympathy|memorial|condolence|thinking)/.test(o)) return "gentle";
  if (/(anniversary|love|valentine)/.test(o)) return "romantic";
  if (/(thank)/.test(o)) return "warm";
  return "celebratory";
}

const REACTIONS: Record<Tone, string[]> = {
  celebratory: ["🎉", "😍", "🥳", "❤️", "👏"],
  warm: ["🥹", "❤️", "🙏", "😊"],
  romantic: ["❤️", "🥰", "😘"],
  gentle: ["❤️", "🕊️", "🤍"],
};

/* ---------------------------------------------------------------- */
/* Unavailable / invalid states                                      */
/* ---------------------------------------------------------------- */

function UnavailableCard() {
  return (
    <div className="grid min-h-dvh place-items-center bg-background px-6 text-center">
      <div className="max-w-sm space-y-4">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-border bg-card">
          <Feather className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
        </span>
        <h1 className="font-display text-3xl">We couldn't find this card</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          It may have been removed, or the link isn't quite right. Please check the link and try again.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm transition hover:border-foreground/30"
        >
          Go to Pigeon <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Main page                                                         */
/* ---------------------------------------------------------------- */

type Stage = "intro" | "opening" | "revealed";

function CardPage() {
  const { card } = Route.useLoaderData();
  const tone = toneFor(card.occasion);
  const [stage, setStage] = useState<Stage>("intro");
  const [showActions, setShowActions] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const messageRef = useRef<HTMLDivElement | null>(null);

  const palette = card.code_spec?.palette ?? [];
  const bg = palette[0] ?? (tone === "gentle" ? "#14141a" : "#101014");
  const light = isLight(bg);
  const ink = light ? "#1c1a17" : "#f7f4ee";

  function open() {
    if (stage !== "intro") return;
    setStage("opening");
    // Let the gate animate out, then reveal.
    window.setTimeout(() => setStage("revealed"), reducedMotion ? 50 : 650);
  }

  // After reveal, pace the message + actions so the moment breathes.
  useEffect(() => {
    if (stage !== "revealed") return;
    const t = window.setTimeout(() => setShowActions(true), reducedMotion ? 200 : 2600);
    return () => window.clearTimeout(t);
  }, [stage, reducedMotion]);

  return (
    <div
      className="min-h-dvh"
      style={{ background: bg, color: ink, transition: "background 800ms ease" }}
    >
      {stage !== "revealed" ? (
        <IntroGate card={card} tone={tone} ink={ink} bg={bg} light={light} opening={stage === "opening"} onOpen={open} />
      ) : (
        <RevealedCard
          card={card}
          tone={tone}
          ink={ink}
          bg={bg}
          light={light}
          showActions={showActions}
          reducedMotion={reducedMotion}
          messageRef={messageRef}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Intro gate                                                        */
/* ---------------------------------------------------------------- */

function IntroGate({
  card,
  tone,
  ink,
  bg,
  light,
  opening,
  onOpen,
}: {
  card: Card;
  tone: Tone;
  ink: string;
  bg: string;
  light: boolean;
  opening: boolean;
  onOpen: () => void;
}) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    btnRef.current?.focus();
  }, []);

  const accent = card.code_spec?.palette?.[2] ?? card.code_spec?.palette?.[1] ?? (light ? "#8a5a2b" : "#d8a657");
  const sender = card.sender_name?.trim();

  return (
    <div
      className={`flex min-h-dvh flex-col items-center justify-center gap-8 px-6 text-center transition-all duration-700 ${opening ? "scale-105 opacity-0" : "opacity-100"}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          background: `radial-gradient(circle at 50% 35%, ${accent}22, transparent 60%)`,
        }}
      />

      <div className="relative space-y-3">
        <p
          className="text-[11px] uppercase tracking-[0.3em] opacity-60"
          style={{ fontFamily: "ui-monospace, Menlo, monospace" }}
        >
          {card.occasion ? `A ${card.occasion.toLowerCase()} card` : "A card, hand-carried"}
        </p>
        <h1
          className="text-4xl leading-tight sm:text-5xl"
          style={{ fontFamily: '"Instrument Serif", Georgia, serif', letterSpacing: "-0.01em" }}
        >
          {sender ? `${sender} sent you a card` : "Someone sent you a card"}
        </h1>
        {card.recipient_name && (
          <p className="text-base italic opacity-70" style={{ fontFamily: '"Instrument Serif", Georgia, serif' }}>
            made just for {card.recipient_name}
          </p>
        )}
      </div>

      <button
        ref={btnRef}
        type="button"
        onClick={onOpen}
        aria-label="Open your card"
        className="group relative inline-flex min-h-14 items-center gap-3 rounded-full px-9 py-4 text-base font-medium outline-none transition focus-visible:ring-2"
        style={{ background: ink, color: bg }}
      >
        <span
          aria-hidden
          className={`absolute inset-0 rounded-full ${tone === "gentle" ? "" : "motion-safe:animate-ping"} opacity-10`}
          style={{ background: ink, animationDuration: "2.8s" }}
        />
        Open your card
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </button>

      <p className="text-xs opacity-40">No account needed — this takes a few seconds.</p>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Revealed card                                                     */
/* ---------------------------------------------------------------- */

function RevealedCard({
  card,
  tone,
  ink,
  bg,
  light,
  showActions,
  reducedMotion,
  messageRef,
}: {
  card: Card;
  tone: Tone;
  ink: string;
  bg: string;
  light: boolean;
  showActions: boolean;
  reducedMotion: boolean;
  messageRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 pb-16 pt-6 sm:px-6">
      {/* Card stage — fully visible, aspect preserved, never clipped */}
      <div
        className={`w-full overflow-hidden rounded-3xl shadow-[0_60px_140px_-50px_rgba(0,0,0,0.55)] ${reducedMotion ? "" : "animate-[pigeon-reveal_900ms_cubic-bezier(0.2,0.7,0.2,1)_both]"}`}
        style={{
          aspectRatio: "1 / 1",
          maxHeight: "min(calc(100dvh - 96px), 640px)",
          margin: "0 auto",
          width: "min(100%, calc(100dvh - 96px), 640px)",
          border: `1px solid ${light ? "#00000018" : "#ffffff1e"}`,
        }}
      >
        {card.medium === "code" && card.code_spec ? (
          <CodedCard spec={card.code_spec} recipientName={card.recipient_name} />
        ) : card.image_url ? (
          <img src={card.image_url} alt={`${card.occasion ?? "greeting"} card artwork`} className="h-full w-full object-cover" />
        ) : null}
      </div>

      <style>{`
        @keyframes pigeon-reveal { from { opacity: 0; transform: translateY(24px) scale(0.97); } to { opacity: 1; transform: none; } }
        @keyframes pigeon-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
      `}</style>

      {/* Message */}
      <div
        ref={messageRef}
        className={reducedMotion ? "" : "animate-[pigeon-rise_800ms_cubic-bezier(0.2,0.7,0.2,1)_600ms_both]"}
      >
        <div className="mx-auto mt-10 max-w-prose text-center">
          <p
            className="whitespace-pre-line text-2xl leading-snug sm:text-[1.7rem]"
            style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontStyle: "italic" }}
          >
            {card.message}
          </p>
          {card.sender_name && (
            <p className="mt-6 text-sm opacity-60">— {card.sender_name}</p>
          )}
        </div>
      </div>

      {/* Post-card actions — appear after the moment lands */}
      <div
        aria-hidden={!showActions}
        className={`transition-all duration-700 ${showActions ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"}`}
      >
        <ActionArea card={card} tone={tone} ink={ink} bg={bg} light={light} />
      </div>

      {/* Subtle platform credit — only after the moment */}
      <footer
        className={`mt-14 text-center text-[11px] tracking-wide transition-opacity duration-1000 ${showActions ? "opacity-40" : "opacity-0"}`}
      >
        <Link to="/" className="underline-offset-4 hover:underline">
          Made with Pigeon
        </Link>
      </footer>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Action area                                                       */
/* ---------------------------------------------------------------- */

function ActionArea({
  card,
  tone,
  ink,
  bg,
  light,
}: {
  card: Card;
  tone: Tone;
  ink: string;
  bg: string;
  light: boolean;
}) {
  const [reacted, setReacted] = useState<string | null>(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [replySent, setReplySent] = useState(false);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const surface = light ? "#00000008" : "#ffffff0d";
  const border = light ? "#00000015" : "#ffffff1e";

  async function sendReaction(emoji: string) {
    if (reacted) return;
    setReacted(emoji);
    const { error } = await supabase.from("card_responses").insert({
      card_id: card.id,
      kind: "reaction",
      content: emoji,
      author_name: card.recipient_name || null,
    });
    if (error) {
      setReacted(null);
      toast.error("Couldn't send your reaction. Try again?");
    } else {
      toast.success("Reaction sent");
    }
  }

  async function sendReply() {
    const text = reply.trim();
    if (!text || sending) return;
    setSending(true);
    const { error } = await supabase.from("card_responses").insert({
      card_id: card.id,
      kind: "reply",
      content: text,
      author_name: card.recipient_name || null,
    });
    setSending(false);
    if (error) {
      toast.error("Couldn't send your reply. Try again?");
    } else {
      setReplySent(true);
    }
  }

  async function copyLink() {
    if (typeof window === "undefined") return;
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Card link copied");
    setTimeout(() => setCopied(false), 1600);
  }

  function saveKeepsake() {
    if (card.medium === "code" && card.code_spec?.template === "ai" && card.code_spec.source) {
      const ok = downloadStandaloneHtml(card.code_spec, {
        recipientName: card.recipient_name,
        senderName: card.sender_name,
        message: card.message,
        occasion: card.occasion,
      });
      if (ok) toast.success("Card saved");
      else toast.error("Saving isn't available for this card.");
    } else if (card.image_url) {
      const a = document.createElement("a");
      a.href = card.image_url;
      a.download = "pigeon-card.jpg";
      a.target = "_blank";
      a.rel = "noopener";
      a.click();
      toast.success("Card saved");
    }
  }

  const canSave =
    (card.medium === "code" && card.code_spec?.template === "ai" && !!card.code_spec.source) ||
    (card.medium === "art" && !!card.image_url);

  const sender = card.sender_name?.trim() || "the sender";

  return (
    <div className="mx-auto mt-10 w-full max-w-md space-y-4">
      {/* Reactions */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {REACTIONS[tone].map((emoji) => (
          <button
            key={emoji}
            onClick={() => sendReaction(emoji)}
            disabled={!!reacted}
            aria-label={`React with ${emoji}`}
            className={`grid h-12 w-12 place-items-center rounded-full text-xl transition hover:scale-110 disabled:hover:scale-100 ${reacted === emoji ? "scale-110 ring-2" : reacted ? "opacity-30" : ""}`}
            style={{ background: surface, border: `1px solid ${border}` }}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Reply */}
      {!replyOpen ? (
        <button
          onClick={() => setReplyOpen(true)}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-medium transition hover:opacity-90"
          style={{ background: ink, color: bg }}
        >
          <MessageCircle className="h-4 w-4" />
          {tone === "romantic" ? "Reply privately" : `Reply to ${sender}`}
        </button>
      ) : replySent ? (
        <div
          className="flex items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm"
          style={{ background: surface, border: `1px solid ${border}` }}
        >
          <Check className="h-4 w-4" /> Your reply was sent to {sender}.
        </div>
      ) : (
        <div className="space-y-2 rounded-2xl p-3" style={{ background: surface, border: `1px solid ${border}` }}>
          <label htmlFor="card-reply" className="sr-only">
            Your reply
          </label>
          <textarea
            id="card-reply"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={3}
            maxLength={2000}
            autoFocus
            placeholder={`Write a note back to ${sender}…`}
            className="w-full resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:opacity-50"
            style={{ color: ink }}
          />
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] opacity-50">Only {sender} will see this.</span>
            <button
              onClick={sendReply}
              disabled={!reply.trim() || sending}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition hover:opacity-90 disabled:opacity-40"
              style={{ background: ink, color: bg }}
            >
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Send reply
            </button>
          </div>
        </div>
      )}

      {/* Secondary actions */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {canSave && (
          <button
            onClick={saveKeepsake}
            className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2.5 text-xs transition hover:opacity-80"
            style={{ background: surface, border: `1px solid ${border}` }}
          >
            <Download className="h-3.5 w-3.5" /> Save card
          </button>
        )}
        <button
          onClick={copyLink}
          className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2.5 text-xs transition hover:opacity-80"
          style={{ background: surface, border: `1px solid ${border}` }}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy link"}
        </button>
        {tone !== "gentle" && (
          <Link
            to="/create"
            className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2.5 text-xs transition hover:opacity-80"
            style={{ background: surface, border: `1px solid ${border}` }}
          >
            <Heart className="h-3.5 w-3.5" /> Send one back
          </Link>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Utilities                                                         */
/* ---------------------------------------------------------------- */

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function isLight(hex: string): boolean {
  const m = hex.replace("#", "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m.slice(0, 6);
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return false;
  const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return l > 0.6;
}
