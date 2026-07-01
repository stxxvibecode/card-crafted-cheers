import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SiteNav } from "@/components/site-nav";
import { streamImage } from "@/lib/streamImage";
import { generateMessage, saveCard, sendCard } from "@/lib/cards.functions";
import { chatCard } from "@/lib/chatCard.functions";
import {
  Loader2,
  RefreshCw,
  Send,
  MessageCircle,
  Pencil,
  ArrowUp,
  Bird,
} from "lucide-react";
import { z } from "zod";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";

const search = z.object({ prompt: z.string().optional() });

export const Route = createFileRoute("/create")({
  validateSearch: (raw) => search.parse(raw),
  component: Create,
});

const OCCASIONS = ["Birthday", "Thank you", "Congrats", "Get well", "Holiday", "Anniversary", "Just because"];

type ChatMsg = { id: string; role: "user" | "assistant"; content: string; pending?: boolean };

type Draft = {
  prompt: string;
  occasion?: string;
  message: string;
  recipientName: string;
  recipientEmail: string;
  senderName: string;
};

function Create() {
  const { prompt: initialPrompt } = Route.useSearch();
  const navigate = useNavigate();

  const [draft, setDraft] = useState<Draft>({
    prompt: initialPrompt ?? "",
    occasion: undefined,
    message: "",
    recipientName: "",
    recipientEmail: "",
    senderName: "",
  });

  const [image, setImage] = useState<string | null>(null);
  const [isFinalImage, setIsFinalImage] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);
  const [msgLoading, setMsgLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const [mode, setMode] = useState<"chat" | "editor">("chat");
  const [messages, setMessages] = useState<ChatMsg[]>(() => [
    {
      id: "seed",
      role: "assistant",
      content:
        initialPrompt
          ? "Lovely — I'll start with that. Want me to lean warm and whimsical, or quieter and elegant?"
          : "Hi, I'm Pigeon. Tell me who this card is for and what you'd like it to feel like.",
    },
  ]);
  const [chatBusy, setChatBusy] = useState(false);

  const msgFn = useServerFn(generateMessage);
  const saveFn = useServerFn(saveCard);
  const sendFn = useServerFn(sendCard);
  const chatFn = useServerFn(chatCard);

  const regenerateImage = useCallback(async (imagePrompt: string, occasion?: string) => {
    setImage(null); setIsFinalImage(false); setImgLoading(true);
    try {
      await streamImage("/api/generate-image", { prompt: imagePrompt, occasion }, (url, final) => {
        setImage(url);
        if (final) setIsFinalImage(true);
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Image generation failed");
    } finally {
      setImgLoading(false);
    }
  }, []);

  // Auto-kick generation if arriving with a prompt in the URL
  const kickedRef = useRef(false);
  useEffect(() => {
    if (kickedRef.current) return;
    if (initialPrompt && initialPrompt.trim()) {
      kickedRef.current = true;
      void handleSend(initialPrompt.trim(), { seedUser: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSend(text: string, opts: { seedUser?: boolean } = { seedUser: true }) {
    const t = text.trim();
    if (!t || chatBusy) return;
    const userMsg: ChatMsg = { id: crypto.randomUUID(), role: "user", content: t };
    const nextMessages = opts.seedUser ? [...messages, userMsg] : messages;
    if (opts.seedUser) setMessages(nextMessages);
    setChatBusy(true);
    try {
      const currentDraft = draftRef.current;
      const res = await chatFn({
        data: {
          messages: (opts.seedUser ? nextMessages : [...nextMessages, userMsg]).map((m) => ({ role: m.role, content: m.content })),
          draft: {
            prompt: currentDraft.prompt || undefined,
            occasion: currentDraft.occasion,
            message: currentDraft.message || undefined,
            recipientName: currentDraft.recipientName || undefined,
            senderName: currentDraft.senderName || undefined,
          },
        },
      });

      // Apply updates
      const u = res.updates;
      setDraft((d) => ({
        ...d,
        prompt: u.prompt ?? d.prompt,
        occasion: u.occasion ?? d.occasion,
        message: u.message ?? d.message,
        recipientName: u.recipientName ?? d.recipientName,
        senderName: u.senderName ?? d.senderName,
      }));

      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: res.reply }]);

      const newPrompt = u.prompt ?? draftRef.current.prompt;
      const newOccasion = u.occasion ?? draftRef.current.occasion;
      if (u.regenerateImage && newPrompt?.trim()) {
        void regenerateImage(newPrompt, newOccasion ?? undefined);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Chat failed");
    } finally {
      setChatBusy(false);
    }
  }

  // Keep a ref to draft so async callbacks see the latest.
  const draftRef = useRef(draft);
  useEffect(() => { draftRef.current = draft; }, [draft]);

  async function editorGenerateAll() {
    const p = draft.prompt.trim();
    if (!p) { toast.error("Describe the card you want first."); return; }
    setMsgLoading(true);
    void regenerateImage(p, draft.occasion);
    try {
      const r = await msgFn({ data: {
        prompt: p, occasion: draft.occasion,
        recipientName: draft.recipientName || undefined,
        senderName: draft.senderName || undefined,
      }});
      setDraft((d) => ({ ...d, message: r.message }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Message generation failed");
    } finally {
      setMsgLoading(false);
    }
  }

  async function rewriteMessage() {
    const p = draft.prompt.trim(); if (!p) return;
    setMsgLoading(true);
    try {
      const r = await msgFn({ data: {
        prompt: p, occasion: draft.occasion,
        recipientName: draft.recipientName || undefined,
        senderName: draft.senderName || undefined,
      }});
      setDraft((d) => ({ ...d, message: r.message }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setMsgLoading(false); }
  }

  async function send() {
    if (!image || !isFinalImage) { toast.error("Wait for the image to finish rendering."); return; }
    if (!draft.message.trim()) { toast.error("The card has no message yet."); return; }
    if (!draft.recipientName.trim() || !draft.recipientEmail.trim()) { toast.error("Add recipient name and email."); return; }
    setSending(true);
    try {
      const { id } = await saveFn({ data: {
        prompt: draft.prompt.trim() || "custom",
        occasion: draft.occasion,
        message: draft.message.trim(),
        imageDataUrl: image,
        senderName: draft.senderName.trim() || undefined,
        recipientName: draft.recipientName.trim(),
        recipientEmail: draft.recipientEmail.trim(),
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
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:h-[calc(100vh-8rem)]">
          {/* Left: Chat / Editor panel */}
          <div className="flex min-h-[600px] flex-col overflow-hidden rounded-2xl border border-border bg-card/60">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Bird className="h-4 w-4 text-primary" />
                <span className="font-display text-lg">Pigeon</span>
              </div>
              <div className="inline-flex rounded-full border border-border bg-background p-0.5 text-xs">
                <button
                  onClick={() => setMode("chat")}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition ${mode === "chat" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <MessageCircle className="h-3 w-3" /> Chat
                </button>
                <button
                  onClick={() => setMode("editor")}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition ${mode === "editor" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Pencil className="h-3 w-3" /> Editor
                </button>
              </div>
            </div>

            {mode === "chat" ? (
              <ChatPanel
                messages={messages}
                busy={chatBusy}
                onSend={(t) => handleSend(t)}
              />
            ) : (
              <EditorPanel
                draft={draft}
                setDraft={setDraft}
                onGenerateAll={editorGenerateAll}
                onRewriteMessage={rewriteMessage}
                imgLoading={imgLoading}
                msgLoading={msgLoading}
              />
            )}
          </div>

          {/* Right: Preview + Send */}
          <div className="flex min-h-[600px] flex-col gap-4">
            <div className="flex-1 overflow-hidden rounded-3xl border border-border bg-card/60 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.15)]">
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
                {draft.message ? (
                  <div className="space-y-2">
                    <p className="whitespace-pre-wrap font-display text-xl italic leading-snug text-foreground">
                      {draft.message}
                    </p>
                    {chatBusy && mode === "chat" && (
                      <Shimmer className="text-xs">Pigeon is thinking…</Shimmer>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {msgLoading || chatBusy ? "Writing the message…" : "Message will appear here."}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card/60 p-4">
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <input
                  value={draft.recipientName}
                  onChange={(e) => setDraft((d) => ({ ...d, recipientName: e.target.value }))}
                  placeholder="Recipient name"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
                />
                <input
                  value={draft.recipientEmail}
                  onChange={(e) => setDraft((d) => ({ ...d, recipientEmail: e.target.value }))}
                  type="email"
                  placeholder="Recipient email"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
                />
                <button
                  onClick={send}
                  disabled={sending || !image || !isFinalImage || !draft.message}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-40"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatPanel({
  messages,
  busy,
  onSend,
}: {
  messages: ChatMsg[];
  busy: boolean;
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    textareaRef.current = document.querySelector<HTMLTextAreaElement>('textarea[data-slot="prompt-input-textarea"]') ?? null;
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!busy) textareaRef.current?.focus();
  }, [busy, messages.length]);


  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="space-y-1">
          {messages.map((m) => (
            <Message key={m.id} from={m.role}>
              {m.role === "assistant" ? (
                <div className="max-w-[85%] text-sm leading-relaxed text-foreground">
                  {m.content}
                </div>
              ) : (
                <MessageContent className="max-w-[85%] bg-foreground text-background">
                  {m.content}
                </MessageContent>
              )}
            </Message>
          ))}
          {busy && (
            <Message from="assistant">
              <Shimmer className="text-sm">Pigeon is thinking…</Shimmer>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-border p-3">
        <PromptInput
          onSubmit={(msg) => {
            const t = msg.text.trim();
            if (!t) return;
            setText("");
            onSend(t);
          }}
        >
          <PromptInputTextarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Tell Pigeon what to change…"
            disabled={busy}
          />

          <PromptInputFooter className="justify-end">
            <PromptInputSubmit
              status={busy ? "streaming" : undefined}
              disabled={busy || !text.trim()}
            >
              <ArrowUp className="h-4 w-4" />
            </PromptInputSubmit>
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}

function EditorPanel({
  draft,
  setDraft,
  onGenerateAll,
  onRewriteMessage,
  imgLoading,
  msgLoading,
}: {
  draft: Draft;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
  onGenerateAll: () => void;
  onRewriteMessage: () => void;
  imgLoading: boolean;
  msgLoading: boolean;
}) {
  const busy = imgLoading || msgLoading;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
      <div>
        <label className="text-xs uppercase tracking-wide text-muted-foreground">Prompt</label>
        <textarea
          value={draft.prompt}
          onChange={(e) => setDraft((d) => ({ ...d, prompt: e.target.value }))}
          rows={3}
          maxLength={500}
          placeholder="A birthday card for my sister who loves cats and rainy mornings…"
          className="mt-2 w-full resize-none rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-primary/50"
        />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {OCCASIONS.map((o) => (
            <button
              key={o}
              onClick={() => setDraft((d) => ({ ...d, occasion: d.occasion === o ? undefined : o }))}
              className={`rounded-full border px-2.5 py-1 text-xs transition ${draft.occasion === o ? "border-primary bg-primary/20 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {o}
            </button>
          ))}
        </div>
        <button
          onClick={onGenerateAll}
          disabled={busy}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Regenerate art & message
        </button>
      </div>

      <div>
        <label className="text-xs uppercase tracking-wide text-muted-foreground">Message</label>
        <textarea
          value={draft.message}
          onChange={(e) => setDraft((d) => ({ ...d, message: e.target.value }))}
          rows={6}
          maxLength={4000}
          placeholder="Write, or let Pigeon draft it for you…"
          className="mt-2 w-full resize-none rounded-lg border border-border bg-background p-3 font-display text-base italic leading-snug outline-none focus:border-primary/50"
        />
        <button
          onClick={onRewriteMessage}
          disabled={msgLoading || !draft.prompt.trim()}
          className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
        >
          {msgLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Rewrite message only
        </button>
      </div>

      <div>
        <label className="text-xs uppercase tracking-wide text-muted-foreground">Your name (optional)</label>
        <input
          value={draft.senderName}
          onChange={(e) => setDraft((d) => ({ ...d, senderName: e.target.value }))}
          placeholder="Signed by…"
          className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
        />
      </div>
    </div>
  );
}
