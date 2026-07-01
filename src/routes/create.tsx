import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SiteNav } from "@/components/site-nav";
import { streamImage } from "@/lib/streamImage";
import { generateMessage, saveCard, sendCard } from "@/lib/cards.functions";
import { Loader2, Sparkles, RefreshCw, Send } from "lucide-react";
import { z } from "zod";

const search = z.object({ prompt: z.string().optional() });

export const Route = createFileRoute("/create")({
  validateSearch: (raw) => search.parse(raw),
  component: Create,
});

const OCCASIONS = ["Birthday", "Thank you", "Congrats", "Get well", "Holiday", "Anniversary", "Just because"];

function Create() {
  const { prompt: initialPrompt } = Route.useSearch();
  const [prompt, setPrompt] = useState(initialPrompt ?? "");
  const [occasion, setOccasion] = useState<string | undefined>();
  const [image, setImage] = useState<string | null>(null);
  const [isFinalImage, setIsFinalImage] = useState(false);
  const [message, setMessage] = useState("");
  const [imgLoading, setImgLoading] = useState(false);
  const [msgLoading, setMsgLoading] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [senderName, setSenderName] = useState("");
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();

  const msgFn = useServerFn(generateMessage);
  const saveFn = useServerFn(saveCard);
  const sendFn = useServerFn(sendCard);

  async function generate() {
    const p = prompt.trim();
    if (!p) { toast.error("Describe the card you want first."); return; }
    setImage(null); setIsFinalImage(false); setMessage("");
    setImgLoading(true); setMsgLoading(true);

    await Promise.all([
      (async () => {
        try {
          await streamImage("/api/generate-image", { prompt: p, occasion }, (url, final) => {
            setImage(url);
            if (final) setIsFinalImage(true);
          });
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Image generation failed");
        } finally {
          setImgLoading(false);
        }
      })(),
      (async () => {
        try {
          const r = await msgFn({ data: { prompt: p, occasion, recipientName: recipientName || undefined, senderName: senderName || undefined } });
          setMessage(r.message);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Message generation failed");
        } finally {
          setMsgLoading(false);
        }
      })(),
    ]);
  }

  async function regenMessage() {
    const p = prompt.trim(); if (!p) return;
    setMsgLoading(true);
    try {
      const r = await msgFn({ data: { prompt: p, occasion, recipientName: recipientName || undefined, senderName: senderName || undefined } });
      setMessage(r.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setMsgLoading(false); }
  }

  async function send() {
    if (!image || !isFinalImage) { toast.error("Wait for the image to finish rendering."); return; }
    if (!message.trim()) { toast.error("Add a message."); return; }
    if (!recipientName.trim() || !recipientEmail.trim()) { toast.error("Add recipient name and email."); return; }
    setSending(true);
    try {
      const { id } = await saveFn({ data: {
        prompt: prompt.trim(),
        occasion,
        message: message.trim(),
        imageDataUrl: image,
        senderName: senderName.trim() || undefined,
        recipientName: recipientName.trim(),
        recipientEmail: recipientEmail.trim(),
      }});
      await sendFn({ data: { cardId: id } });
      toast.success("Card sent!");
      navigate({ to: "/card/$id", params: { id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-4xl sm:text-5xl"><span className="text-gradient">Create a card</span></h1>
        <p className="mt-2 text-sm text-muted-foreground">Describe what you want. We'll paint it and write it for you.</p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
          {/* Left: inputs */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card/60 p-5">
              <label className="text-xs uppercase tracking-wide text-muted-foreground">Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="A birthday card for my sister who loves cats and rainy mornings…"
                className="mt-2 w-full resize-none rounded-lg bg-transparent text-base outline-none placeholder:text-muted-foreground/60"
              />
              <div className="mt-3 flex flex-wrap gap-1.5">
                {OCCASIONS.map((o) => (
                  <button key={o}
                    onClick={() => setOccasion(occasion === o ? undefined : o)}
                    className={`rounded-full border px-2.5 py-1 text-xs transition ${occasion === o ? "border-primary bg-primary/20 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
                  >{o}</button>
                ))}
              </div>
              <button
                onClick={generate}
                disabled={imgLoading || msgLoading}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blush to-amber px-4 py-2.5 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
              >
                {(imgLoading || msgLoading) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {image ? "Regenerate" : "Generate card"}
              </button>
            </div>

            <div className="rounded-2xl border border-border bg-card/60 p-5">
              <label className="text-xs uppercase tracking-wide text-muted-foreground">Send to</label>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Recipient name" className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50" />
                <input value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} type="email" placeholder="Recipient email" className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50" />
                <input value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="Your name (optional)" className="sm:col-span-2 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50" />
              </div>
              <button
                onClick={send}
                disabled={sending || !image || !isFinalImage || !message}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-40"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send card
              </button>
            </div>
          </div>

          {/* Right: preview */}
          <div className="space-y-4">
            <div className="overflow-hidden rounded-3xl border border-border bg-card/60 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]">
              <div className="relative aspect-square w-full bg-gradient-to-br from-muted to-background">
                {image ? (
                  <img
                    src={image}
                    alt="Card preview"
                    className={`h-full w-full object-cover transition-[filter] duration-500 ${isFinalImage ? "blur-0" : "blur-2xl"}`}
                  />
                ) : (
                  <div className="grid h-full place-items-center text-sm text-muted-foreground">
                    {imgLoading ? (
                      <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Painting…</span>
                    ) : "Your card will appear here"}
                  </div>
                )}
              </div>
              <div className="border-t border-border p-6">
                {message ? (
                  <div className="space-y-3">
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={5}
                      maxLength={4000}
                      className="w-full resize-none bg-transparent font-display text-xl leading-snug italic outline-none"
                    />
                    <button onClick={regenMessage} disabled={msgLoading} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40">
                      {msgLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Rewrite
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {msgLoading ? "Writing the message…" : "Message will appear here."}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
