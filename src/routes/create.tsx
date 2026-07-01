import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SiteNav } from "@/components/site-nav";
import { streamImage } from "@/lib/streamImage";
import { generateMessage, saveCard, sendCard } from "@/lib/cards.functions";
import { chatCard } from "@/lib/chatCard.functions";
import { generateCodedCard } from "@/lib/codedCards.functions";
import { CodedCard } from "@/lib/codedCards/CodedCard";
import { TEMPLATES, type CodeSpec, type TemplateId } from "@/lib/codedCards/registry";
import { phraseFor } from "@/lib/occasion";
import {
  Loader2,
  RefreshCw,
  Send,
  MessageCircle,
  Pencil,
  ArrowUp,
  Bird,
  Palette,
  Code2,
  Sparkles,
  Shuffle,
  Hammer,
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

type ChatMsg = { id: string; role: "user" | "assistant"; content: string; planId?: string };

type Medium = "art" | "code";

type Draft = {
  prompt: string;
  occasion?: string;
  message: string;
  recipientName: string;
  recipientEmail: string;
  senderName: string;
  medium?: Medium;
  codeSpec?: CodeSpec;
};

type PlanUpdates = {
  id: string;
  prompt: string | null;
  occasion: string | null;
  message: string | null;
  recipientName: string | null;
  senderName: string | null;
  medium: Medium | null;
  codeTemplate: "confetti" | "fireworks" | "kinetic" | "hearts" | "starfield" | "ribbons" | "ai" | null;
  codeMotion: string | null;
  codePalette: string[] | null;
  regenerateImage: boolean;
  instruction?: string; // last user message that produced the plan (used for edit mode)
  built?: boolean;
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
    medium: undefined,
  });

  const [image, setImage] = useState<string | null>(null);
  const [isFinalImage, setIsFinalImage] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);
  const [msgLoading, setMsgLoading] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const [mode, setMode] = useState<"chat" | "editor">("chat");
  const [actionMode, setActionMode] = useState<"plan" | "build">("plan");
  const [messages, setMessages] = useState<ChatMsg[]>(() => [
    {
      id: "seed",
      role: "assistant",
      content:
        "Hi, I'm Pigeon. Pick your medium and Plan or Build below, then tell me who this card is for and how you'd like it to feel.",
    },
  ]);
  const [chatBusy, setChatBusy] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<PlanUpdates | null>(null);

  const msgFn = useServerFn(generateMessage);
  const saveFn = useServerFn(saveCard);
  const sendFn = useServerFn(sendCard);
  const chatFn = useServerFn(chatCard);
  const codeFn = useServerFn(generateCodedCard);

  const draftRef = useRef(draft);
  useEffect(() => { draftRef.current = draft; }, [draft]);

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

  const regenerateCode = useCallback(async (opts: {
    mode: "template" | "ai" | "edit";
    templateHint?: Exclude<TemplateId, "ai">;
    motionHint?: string;
    paletteHint?: string[];
    instruction?: string;
    phrase?: string;
  }) => {
    const d = draftRef.current;
    setCodeLoading(true);
    try {
      const spec = await codeFn({
        data: {
          prompt: d.prompt || undefined,
          occasion: d.occasion,
          phrase: opts.phrase ?? d.codeSpec?.phrase ?? phraseFor(d.occasion),
          mode: opts.mode,
          templateHint: opts.templateHint,
          motionHint: opts.motionHint,
          paletteHint: opts.paletteHint,
          instruction: opts.instruction,
          prior: opts.mode === "edit" && d.codeSpec ? {
            template: d.codeSpec.template,
            palette: d.codeSpec.palette,
            tempo: d.codeSpec.tempo,
            source: d.codeSpec.source,
          } : undefined,
        },
      });
      setDraft((cur) => ({ ...cur, medium: "code", codeSpec: spec }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Coded card failed");
    } finally {
      setCodeLoading(false);
    }
  }, [codeFn]);

  async function handleSend(text: string) {
    const t = text.trim();
    if (!t || chatBusy) return;
    const userMsg: ChatMsg = { id: crypto.randomUUID(), role: "user", content: t };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setChatBusy(true);
    try {
      const currentDraft = draftRef.current;
      const res = await chatFn({
        data: {
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          draft: {
            prompt: currentDraft.prompt || undefined,
            occasion: currentDraft.occasion,
            message: currentDraft.message || undefined,
            recipientName: currentDraft.recipientName || undefined,
            senderName: currentDraft.senderName || undefined,
            medium: currentDraft.medium,
          },
        },
      });

      const u = res.updates;
      const hasProposals =
        !!u.prompt || !!u.occasion || !!u.message ||
        !!u.recipientName || !!u.senderName || !!u.medium ||
        !!u.codeTemplate || u.regenerateImage;

      const planId = crypto.randomUUID();
      const planForBuild: PlanUpdates = { ...u, id: planId, built: false };
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: res.reply, planId: hasProposals ? planId : undefined },
      ]);
      if (hasProposals) {
        setPendingPlan(planForBuild);
        if (actionMode === "build" && (planForBuild.medium ?? draftRef.current.medium)) {
          // Auto-execute build right away.
          setTimeout(() => commitPlanRef.current?.(planForBuild), 0);
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Chat failed");
    } finally {
      setChatBusy(false);
    }
  }

  const commitPlanRef = useRef<((p: PlanUpdates) => void) | null>(null);

  const commitPlan = useCallback(async (plan: PlanUpdates) => {
    const currentDraft = draftRef.current;
    const targetMedium = (plan.medium ?? currentDraft.medium) as Medium | undefined;
    if (!targetMedium) {
      toast.error("Pick Art or Code above first.");
      return;
    }

    const newPrompt = plan.prompt ?? currentDraft.prompt;
    const newOccasion = plan.occasion ?? currentDraft.occasion;
    const nextMessage = plan.message ?? currentDraft.message;

    setDraft((d) => ({
      ...d,
      prompt: plan.prompt ?? d.prompt,
      occasion: plan.occasion ?? d.occasion,
      message: plan.message ?? d.message,
      recipientName: plan.recipientName ?? d.recipientName,
      senderName: plan.senderName ?? d.senderName,
      medium: targetMedium,
    }));
    setPendingPlan((p) => (p && p.id === plan.id ? { ...p, built: true } : p));

    // Draft a message if the plan didn't include one and we still don't have one
    if (!nextMessage.trim() && newPrompt.trim()) {
      setMsgLoading(true);
      msgFn({
        data: {
          prompt: newPrompt,
          occasion: newOccasion,
          recipientName: currentDraft.recipientName || undefined,
          senderName: currentDraft.senderName || undefined,
        },
      })
        .then((r) => setDraft((d) => ({ ...d, message: r.message })))
        .catch((e) => toast.error(e instanceof Error ? e.message : "Message failed"))
        .finally(() => setMsgLoading(false));
    }

    if (targetMedium === "art") {
      if (!newPrompt.trim()) {
        toast.error("Add a description of the card before building.");
        return;
      }
      void regenerateImage(newPrompt, newOccasion ?? undefined);
    } else {
      const hint = plan.codeTemplate;
      const isAi = hint === "ai";
      const templateHint = (hint && hint !== "ai" ? hint : undefined) as Exclude<TemplateId, "ai"> | undefined;
      void regenerateCode({ mode: isAi ? "ai" : "template", templateHint });
    }
  }, [msgFn, regenerateImage, regenerateCode]);

  useEffect(() => { commitPlanRef.current = commitPlan; }, [commitPlan]);

  async function editorBuild() {
    if (!draft.medium) { toast.error("Pick Art or Code first."); return; }
    const p = draft.prompt.trim();
    if (!p) { toast.error("Describe the card you want first."); return; }
    setMsgLoading(true);
    if (draft.medium === "art") {
      void regenerateImage(p, draft.occasion);
    } else {
      void regenerateCode({ mode: "template" });
    }
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

  function setMedium(m: Medium) {
    if (draft.medium === m) return;
    // Switching (or first pick) — clear any preview so the user rebuilds.
    setImage(null);
    setIsFinalImage(false);
    setImgLoading(false);
    setCodeLoading(false);
    setDraft((d) => ({ ...d, medium: m, codeSpec: undefined }));
  }

  function shufflePalette() {
    const spec = draft.codeSpec; if (!spec) return;
    const others = TEMPLATES.flatMap((t) => t.palette);
    const shuffled = [...spec.palette].sort(() => Math.random() - 0.5);
    shuffled[1] = others[Math.floor(Math.random() * others.length)];
    shuffled[shuffled.length - 1] = others[Math.floor(Math.random() * others.length)];
    setDraft((d) => ({ ...d, codeSpec: { ...spec, palette: shuffled, seed: Math.floor(Math.random() * 1e6) } }));
  }

  async function send() {
    if (!draft.medium) { toast.error("Pick Art or Code first."); return; }
    if (draft.medium === "art" && (!image || !isFinalImage)) {
      toast.error("Wait for the image to finish rendering."); return;
    }
    if (draft.medium === "code" && !draft.codeSpec) {
      toast.error("Build the coded card first."); return;
    }
    if (!draft.message.trim()) { toast.error("The card has no message yet."); return; }
    if (!draft.recipientName.trim() || !draft.recipientEmail.trim()) { toast.error("Add recipient name and email."); return; }
    setSending(true);
    try {
      const { id } = await saveFn({ data: {
        prompt: draft.prompt.trim() || "custom",
        occasion: draft.occasion,
        message: draft.message.trim(),
        medium: draft.medium,
        imageDataUrl: draft.medium === "art" ? image ?? undefined : undefined,
        codeSpec: draft.medium === "code" ? draft.codeSpec : undefined,
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

  const previewBusy = draft.medium === "art" ? imgLoading : codeLoading;
  const hasOutput = draft.medium === "art" ? !!image : !!draft.codeSpec;

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
                pendingPlan={pendingPlan}
                medium={draft.medium}
                setMedium={setMedium}
                actionMode={actionMode}
                setActionMode={setActionMode}
                onBuild={commitPlan}
                building={imgLoading || codeLoading || msgLoading}
                initialText={initialPrompt ?? ""}
              />
            ) : (
              <EditorPanel
                draft={draft}
                setDraft={setDraft}
                setMedium={setMedium}
                onBuild={editorBuild}
                onRewriteMessage={rewriteMessage}
                onRegenerateCode={regenerateCode}
                imgLoading={imgLoading}
                msgLoading={msgLoading}
                codeLoading={codeLoading}
              />
            )}
          </div>

          {/* Right: Preview + Send */}
          <div className="flex min-h-[600px] flex-col gap-4">
            {draft.medium === "code" && draft.codeSpec && (
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={shufflePalette}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Shuffle className="h-3 w-3" /> Shuffle
                </button>
                <button
                  onClick={() => regenerateCode({ mode: "ai" })}
                  disabled={codeLoading}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
                >
                  <Sparkles className="h-3 w-3" /> Surprise me
                </button>
              </div>
            )}

            <div className="flex-1 overflow-hidden rounded-3xl border border-border bg-card/60 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.15)]">
              <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-br from-muted to-background">
                {!draft.medium ? (
                  <div className="grid h-full place-items-center px-8 text-center text-sm text-muted-foreground">
                    <div className="space-y-2">
                      <div className="mx-auto inline-flex gap-2">
                        <Palette className="h-5 w-5" />
                        <Code2 className="h-5 w-5" />
                      </div>
                      <p>Pick a medium in the composer to begin.</p>
                    </div>
                  </div>
                ) : draft.medium === "art" ? (
                  image ? (
                    <img
                      src={image}
                      alt="Card preview"
                      className={`h-full w-full object-cover transition-[filter] duration-500 ${isFinalImage ? "blur-0" : "blur-2xl"}`}
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-sm text-muted-foreground">
                      {imgLoading ? (
                        <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Painting…</span>
                      ) : "Hit Build in the chat to paint your card."}
                    </div>
                  )
                ) : draft.codeSpec ? (
                  <CodedCard spec={draft.codeSpec} />
                ) : (
                  <div className="grid h-full place-items-center text-sm text-muted-foreground">
                    {codeLoading ? (
                      <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Composing…</span>
                    ) : "Hit Build in the chat to compose your coded card."}
                  </div>
                )}
                {previewBusy && hasOutput && (
                  <div className="absolute right-3 top-3 rounded-full bg-background/80 px-2.5 py-1 text-[10px] text-muted-foreground backdrop-blur">
                    updating…
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
                  disabled={
                    sending ||
                    !draft.medium ||
                    !draft.message ||
                    (draft.medium === "art" ? !image || !isFinalImage : !draft.codeSpec)
                  }
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

function PlanCard({
  plan,
  medium,
  onBuild,
  building,
}: {
  plan: PlanUpdates;
  medium?: Medium;
  onBuild: (p: PlanUpdates) => void;
  building: boolean;
}) {
  const proposedMedium = plan.medium ?? medium;
  const rows: Array<[string, string]> = [];
  if (plan.occasion) rows.push(["Occasion", plan.occasion]);
  if (proposedMedium) rows.push(["Medium", proposedMedium === "art" ? "Painted art" : "Coded animation"]);
  if (proposedMedium === "code" && plan.codeTemplate) rows.push(["Template", plan.codeTemplate]);
  if (plan.prompt) rows.push(["Vibe", plan.prompt.length > 90 ? plan.prompt.slice(0, 87) + "…" : plan.prompt]);
  if (plan.recipientName) rows.push(["For", plan.recipientName]);
  if (plan.senderName) rows.push(["From", plan.senderName]);
  if (plan.message) rows.push(["Message", plan.message.length > 90 ? plan.message.slice(0, 87) + "…" : plan.message]);

  const disabled = plan.built || building;

  return (
    <div className="ml-2 mt-1 max-w-[85%] rounded-xl border border-border bg-background/70 p-3 text-xs">
      <div className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Hammer className="h-3 w-3" /> Plan
      </div>
      {rows.length > 0 ? (
        <dl className="space-y-1">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[70px_1fr] gap-2">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="text-foreground">{v}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-muted-foreground">Ready when you are.</p>
      )}
      <button
        onClick={() => onBuild(plan)}
        disabled={disabled}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-foreground px-3 py-2 text-xs font-medium text-background transition hover:opacity-90 disabled:opacity-40"
      >
        {building ? <Loader2 className="h-3 w-3 animate-spin" /> : <Hammer className="h-3 w-3" />}
        {plan.built ? "Built" : "Build card"}
      </button>
    </div>
  );
}

function ChatPanel({
  messages,
  busy,
  onSend,
  pendingPlan,
  medium,
  setMedium,
  actionMode,
  setActionMode,
  onBuild,
  building,
  initialText,
}: {
  messages: ChatMsg[];
  busy: boolean;
  onSend: (text: string) => void;
  pendingPlan: PlanUpdates | null;
  medium?: Medium;
  setMedium: (m: Medium) => void;
  actionMode: "plan" | "build";
  setActionMode: (m: "plan" | "build") => void;
  onBuild: (p: PlanUpdates) => void;
  building: boolean;
  initialText: string;
}) {
  const [text, setText] = useState(initialText);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const mediumPickerRef = useRef<HTMLDivElement | null>(null);
  const hadPrefill = useRef(!!initialText.trim());

  useEffect(() => {
    textareaRef.current = document.querySelector<HTMLTextAreaElement>('textarea[data-slot="prompt-input-textarea"]') ?? null;
    if (hadPrefill.current && !medium) {
      // Draw the eye to the medium picker first when arriving with a prefilled prompt.
      mediumPickerRef.current?.focus();
    } else {
      textareaRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    if (!busy) textareaRef.current?.focus();
  }, [busy, messages.length]);

  const needsMedium = !medium;
  const attention = needsMedium && hadPrefill.current;

  const canSubmit = !!medium && !!text.trim() && !busy;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="space-y-1">
          {messages.map((m) => (
            <div key={m.id}>
              <Message from={m.role}>
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
              {m.planId && pendingPlan && pendingPlan.id === m.planId && (
                <PlanCard plan={pendingPlan} medium={medium} onBuild={onBuild} building={building} />
              )}
            </div>
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
        {needsMedium && (
          <p className="mb-2 text-center text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Choose <span className="text-foreground">Art</span> or <span className="text-foreground">Code</span>, then hit Build
          </p>
        )}
        <PromptInput
          onSubmit={(msg) => {
            const t = msg.text.trim();
            if (!t) return;
            if (!medium) { toast.error("Pick Art or Code below first."); return; }
            setText("");
            onSend(t);
          }}
        >
          <PromptInputTextarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={medium ? "Describe your card, or ask for changes…" : "Pick a medium below, then describe your card…"}
            disabled={busy}
          />

          <PromptInputFooter className="justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <div
                ref={mediumPickerRef}
                tabIndex={-1}
                className={`inline-flex rounded-full border bg-background p-0.5 text-xs outline-none transition ${attention ? "border-foreground/40 ring-2 ring-foreground/20 animate-pulse" : "border-border"}`}
              >
                <button
                  type="button"
                  onClick={() => setMedium("art")}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 transition ${medium === "art" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Palette className="h-3 w-3" /> Art
                </button>
                <button
                  type="button"
                  onClick={() => setMedium("code")}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 transition ${medium === "code" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Code2 className="h-3 w-3" /> Code
                </button>
              </div>
              <select
                value={actionMode}
                onChange={(e) => setActionMode(e.target.value as "plan" | "build")}
                className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-foreground outline-none hover:border-foreground/40"
                aria-label="Action mode"
              >
                <option value="plan">Plan</option>
                <option value="build">Build</option>
              </select>
            </div>
            <PromptInputSubmit
              status={busy ? "streaming" : undefined}
              disabled={!canSubmit}
              title={needsMedium ? "Pick Art or Code first" : undefined}
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
  setMedium,
  onBuild,
  onRewriteMessage,
  onRegenerateCode,
  imgLoading,
  msgLoading,
  codeLoading,
}: {
  draft: Draft;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
  setMedium: (m: Medium) => void;
  onBuild: () => void;
  onRewriteMessage: () => void;
  onRegenerateCode: (opts: { mode: "template" | "ai"; templateHint?: Exclude<TemplateId, "ai"> }) => void;
  imgLoading: boolean;
  msgLoading: boolean;
  codeLoading: boolean;
}) {
  const busy = imgLoading || msgLoading || codeLoading;
  const canBuild = !!draft.medium && !!draft.prompt.trim();
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
      <div>
        <label className="text-xs uppercase tracking-wide text-muted-foreground">Medium</label>
        <div className="mt-2 inline-flex rounded-full border border-border bg-background p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setMedium("art")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition ${draft.medium === "art" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Palette className="h-3 w-3" /> Art
          </button>
          <button
            type="button"
            onClick={() => setMedium("code")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition ${draft.medium === "code" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Code2 className="h-3 w-3" /> Code
          </button>
        </div>
      </div>
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
          onClick={onBuild}
          disabled={busy || !canBuild}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Hammer className="h-4 w-4" />}
          Build {draft.medium === "code" ? "coded card" : draft.medium === "art" ? "card" : "card"}
        </button>
      </div>

      {draft.medium === "code" && (
        <div>
          <label className="text-xs uppercase tracking-wide text-muted-foreground">Coded template</label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => onRegenerateCode({ mode: "template", templateHint: t.id })}
                disabled={codeLoading}
                className={`rounded-full border px-2.5 py-1 text-xs transition ${draft.codeSpec?.template === t.id ? "border-primary bg-primary/20 text-foreground" : "border-border text-muted-foreground hover:text-foreground"} disabled:opacity-40`}
              >
                {t.name}
              </button>
            ))}
            <button
              onClick={() => onRegenerateCode({ mode: "ai" })}
              disabled={codeLoading}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition ${draft.codeSpec?.template === "ai" ? "border-primary bg-primary/20 text-foreground" : "border-border text-muted-foreground hover:text-foreground"} disabled:opacity-40`}
            >
              <Sparkles className="h-3 w-3" /> Surprise me
            </button>
          </div>
          {draft.codeSpec && (
            <div className="mt-3">
              <label className="text-xs uppercase tracking-wide text-muted-foreground">Tempo</label>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={draft.codeSpec.tempo}
                onChange={(e) => {
                  const tempo = parseFloat(e.target.value);
                  setDraft((d) => (d.codeSpec ? { ...d, codeSpec: { ...d.codeSpec, tempo } } : d));
                }}
                className="mt-2 w-full"
              />
            </div>
          )}
        </div>
      )}

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
