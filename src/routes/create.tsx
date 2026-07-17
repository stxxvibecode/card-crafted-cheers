import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SiteNav } from "@/components/site-nav";
import { streamImage } from "@/lib/streamImage";
import { generateMessage, saveCard } from "@/lib/cards.functions";
import { chatCard } from "@/lib/chatCard.functions";
import { generateCodedCard } from "@/lib/codedCards.functions";
import { CodedCard } from "@/lib/codedCards/CodedCard";
import { PreviewCanvas } from "@/components/PreviewCanvas";
import { TEMPLATES, type CodeSpec, type TemplateId } from "@/lib/codedCards/registry";
import { phraseFor } from "@/lib/occasion";
import { ModelPicker } from "@/components/ModelPicker";
import { useModelPrefs } from "@/lib/modelStore";
import { useCardBuild } from "@/hooks/use-card-build";
import type { BuildLease } from "@/lib/build-lifecycle";

import {
  Loader2,
  RefreshCw,
  Send,
  Share2,
  Copy,
  Mail,
  QrCode,
  ExternalLink,
  X,
  MessageCircle,
  Pencil,
  ArrowUp,
  Bird,
  Palette,
  Code2,
  Sparkles,
  Shuffle,
  Hammer,
  Eye,
  FileCode2,
  Download,
  Check,
} from "lucide-react";
import { z } from "zod";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";

const CodeViewer = lazy(() =>
  import("@/lib/codedCards/CodeViewer").then((mod) => ({ default: mod.CodeViewer })),
);

const search = z.object({ prompt: z.string().optional() });

export const Route = createFileRoute("/create")({
  validateSearch: (raw) => search.parse(raw),
  component: Create,
});

const OCCASIONS = [
  "Birthday",
  "Thank you",
  "Congrats",
  "Get well",
  "Holiday",
  "Anniversary",
  "Invitation",
  "RSVP",
  "Wedding",
  "Baby shower",
  "Graduation",
  "Just because",
];

function wantsFreshCodeDesign(instruction?: string) {
  if (!instruction) return false;
  return /\b(different|vary|variation|fresh|new|another|again|redo|redesign|rebuild|not the same|same design|switch it up)\b/i.test(
    instruction,
  );
}

function ChatBubble({ role, children }: { role: "user" | "assistant"; children: ReactNode }) {
  return (
    <div
      className={`flex w-full max-w-[95%] flex-col gap-2 ${role === "user" ? "ml-auto items-end" : "items-start"}`}
    >
      {children}
    </div>
  );
}

function UserBubble({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-[85%] rounded-lg bg-foreground px-4 py-3 text-sm text-background">
      {children}
    </div>
  );
}

function ThinkingText({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-block animate-pulse text-muted-foreground ${className ?? ""}`}
      aria-live="polite"
    >
      {children}
    </span>
  );
}

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
  codeTemplate:
    "confetti" | "fireworks" | "kinetic" | "hearts" | "starfield" | "ribbons" | "ai" | null;
  codeMotion: string | null;
  codePalette: string[] | null;
  regenerateImage: boolean;
  instruction?: string; // last user message that produced the plan (used for edit mode)
  built?: boolean;
};

type CodeBuildOptions = {
  mode: "template" | "ai" | "edit";
  templateHint?: Exclude<TemplateId, "ai">;
  motionHint?: string;
  paletteHint?: string[];
  instruction?: string;
  phrase?: string;
  message?: string;
};

function Create() {
  const { prompt: initialPrompt } = Route.useSearch();
  const navigate = useNavigate();
  const { prefs } = useModelPrefs();
  const prefsRef = useRef(prefs);
  useEffect(() => {
    prefsRef.current = prefs;
  }, [prefs]);
  const mediumPickerRef = useRef<HTMLDivElement | null>(null);

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
  const [shareCard, setShareCard] = useState<{ id: string; url: string } | null>(null);

  const [mode, setMode] = useState<"chat" | "editor">("chat");
  const [previewTab, setPreviewTab] = useState<"preview" | "code">("preview");
  const [messages, setMessages] = useState<ChatMsg[]>(() => [
    {
      id: "seed",
      role: "assistant",
      content:
        "Hi, I'm Pigeon. Pick Art or Code above, then tell me who this card is for and how you'd like it to feel. I'll draft the card — nothing gets built until you approve it.",
    },
  ]);
  const [chatBusy, setChatBusy] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<PlanUpdates | null>(null);
  const cardBuild = useCardBuild();

  const msgFn = useServerFn(generateMessage);
  const saveFn = useServerFn(saveCard);
  const chatFn = useServerFn(chatCard);
  const codeFn = useServerFn(generateCodedCard);

  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const regenerateImage = useCallback(
    async (imagePrompt: string, occasion: string | undefined, lease: BuildLease) => {
      setImgLoading(true);
      try {
        await streamImage(
          "/api/generate-image",
          { prompt: imagePrompt, occasion, model: prefsRef.current.image },
          (url, final) => {
            if (!cardBuild.isCurrent(lease)) return;
            setImage(url);
            setIsFinalImage(final);
          },
          lease.signal,
        );
        return true;
      } catch (e) {
        if (cardBuild.isCurrent(lease) && e instanceof Error && e.name !== "AbortError") {
          toast.error(e.message || "Image generation failed");
        }
        return false;
      } finally {
        if (cardBuild.isCurrent(lease)) setImgLoading(false);
      }
    },
    [cardBuild],
  );

  const regenerateCode = useCallback(
    async (opts: CodeBuildOptions, d: Draft, lease: BuildLease, seed?: number) => {
      setCodeLoading(true);
      try {
        const spec = await codeFn({
          data: {
            prompt: d.prompt || undefined,
            occasion: d.occasion,
            phrase: opts.phrase ?? phraseFor(d.occasion),
            message: (opts.message ?? d.message) || undefined,
            mode: opts.mode,
            templateHint: opts.templateHint,
            motionHint: opts.motionHint,
            paletteHint: opts.paletteHint,
            instruction: opts.instruction,
            prior:
              opts.mode === "edit" && d.codeSpec
                ? {
                    template: d.codeSpec.template,
                    palette: d.codeSpec.palette,
                    tempo: d.codeSpec.tempo,
                    source: d.codeSpec.source,
                  }
                : undefined,
            seed,
            model: prefsRef.current.chat,
          },
        });
        if (cardBuild.isCurrent(lease)) {
          setDraft((cur) => ({ ...cur, medium: "code", codeSpec: spec }));
        }
        return true;
      } catch (e) {
        if (cardBuild.isCurrent(lease)) {
          toast.error(e instanceof Error ? e.message : "Coded card failed");
        }
        return false;
      } finally {
        if (cardBuild.isCurrent(lease)) setCodeLoading(false);
      }
    },
    [cardBuild, codeFn],
  );

  const buildCard = useCallback(
    async ({
      target,
      code,
      forceMessage = false,
      newSeed = false,
    }: {
      target: Draft;
      code?: CodeBuildOptions;
      forceMessage?: boolean;
      newSeed?: boolean;
    }) => {
      const lease = cardBuild.start();
      setDraft(target);
      let finalDraft = target;

      if ((forceMessage || !target.message.trim()) && target.prompt.trim()) {
        cardBuild.setBuildStatus(lease, "writing");
        setMsgLoading(true);
        try {
          const result = await msgFn({
            data: {
              prompt: target.prompt,
              occasion: target.occasion,
              recipientName: target.recipientName || undefined,
              senderName: target.senderName || undefined,
              model: prefsRef.current.chat,
            },
          });
          if (!cardBuild.isCurrent(lease)) return;
          finalDraft = { ...target, message: result.message };
          setDraft(finalDraft);
        } catch (e) {
          if (cardBuild.isCurrent(lease)) {
            toast.error(e instanceof Error ? e.message : "Message generation failed");
            cardBuild.setBuildStatus(lease, "failed");
          }
          return;
        } finally {
          if (cardBuild.isCurrent(lease)) setMsgLoading(false);
        }
      }

      if (!cardBuild.isCurrent(lease)) return;
      let completed = false;
      if (finalDraft.medium === "art") {
        if (!finalDraft.prompt.trim()) {
          toast.error("Add a description of the card before building.");
          cardBuild.setBuildStatus(lease, "failed");
          return;
        }
        cardBuild.setBuildStatus(lease, "rendering");
        completed = await regenerateImage(finalDraft.prompt, finalDraft.occasion, lease);
      } else if (finalDraft.medium === "code") {
        cardBuild.setBuildStatus(lease, "designing");
        const resolvedCode = code ?? { mode: finalDraft.codeSpec ? "edit" : "ai" };
        const preservedSeed = newSeed ? undefined : finalDraft.codeSpec?.seed;
        completed = await regenerateCode(resolvedCode, finalDraft, lease, preservedSeed);
      }

      if (cardBuild.isCurrent(lease)) {
        cardBuild.setBuildStatus(lease, completed ? "ready" : "failed");
      }
    },
    [cardBuild, msgFn, regenerateCode, regenerateImage],
  );

  const requestCodeBuild = useCallback(
    async (code: CodeBuildOptions) => {
      await buildCard({
        target: draftRef.current,
        code,
        newSeed: code.mode === "ai",
      });
    },
    [buildCard],
  );

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
          model: prefsRef.current.chat,
        },
      });

      const u = res.updates;
      const hasProposals =
        !!u.prompt ||
        !!u.occasion ||
        !!u.message ||
        !!u.recipientName ||
        !!u.senderName ||
        !!u.medium ||
        !!u.codeTemplate ||
        !!u.codeMotion ||
        (u.codePalette && u.codePalette.length > 0) ||
        u.regenerateImage;

      const planId = crypto.randomUUID();
      const planForBuild: PlanUpdates = { ...u, id: planId, built: false, instruction: t };
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: res.reply,
          planId: hasProposals ? planId : undefined,
        },
      ]);
      if (hasProposals) {
        setPendingPlan(planForBuild);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Chat failed");
    } finally {
      setChatBusy(false);
    }
  }

  const commitPlanRef = useRef<((p: PlanUpdates) => void) | null>(null);

  const commitPlan = useCallback(
    async (plan: PlanUpdates) => {
      const currentDraft = draftRef.current;
      const targetMedium = (plan.medium ?? currentDraft.medium) as Medium | undefined;
      if (!targetMedium) {
        toast.error("Pick Art or Code above first.");
        return;
      }

      setPendingPlan((p) => (p && p.id === plan.id ? { ...p, built: true } : p));

      const target: Draft = {
        ...currentDraft,
        prompt: plan.prompt ?? currentDraft.prompt,
        occasion: plan.occasion ?? currentDraft.occasion,
        message: plan.message ?? currentDraft.message,
        recipientName: plan.recipientName ?? currentDraft.recipientName,
        senderName: plan.senderName ?? currentDraft.senderName,
        medium: targetMedium,
      };
      const freshDesign = wantsFreshCodeDesign(plan.instruction);
      const templateHint =
        plan.codeTemplate && plan.codeTemplate !== "ai" ? plan.codeTemplate : undefined;
      await buildCard({
        target,
        newSeed: freshDesign,
        code:
          target.medium === "code"
            ? {
                mode: target.codeSpec && !freshDesign ? "edit" : "ai",
                templateHint,
                motionHint: plan.codeMotion ?? undefined,
                paletteHint: plan.codePalette ?? undefined,
                instruction: plan.instruction,
              }
            : undefined,
      });
    },
    [buildCard],
  );

  useEffect(() => {
    commitPlanRef.current = commitPlan;
  }, [commitPlan]);

  async function editorBuild() {
    if (!draft.medium) {
      toast.error("Pick Art or Code first.");
      return;
    }
    const p = draft.prompt.trim();
    if (!p) {
      toast.error("Describe the card you want first.");
      return;
    }
    await buildCard({
      target: { ...draftRef.current, prompt: p },
      forceMessage: true,
      code: { mode: draftRef.current.codeSpec ? "edit" : "ai" },
    });
  }

  async function rewriteMessage() {
    const p = draft.prompt.trim();
    if (!p) return;
    await buildCard({
      target: { ...draftRef.current, prompt: p },
      forceMessage: true,
      code: draftRef.current.codeSpec
        ? { mode: "edit", instruction: "Refresh with the updated message." }
        : undefined,
    });
  }

  function setMedium(m: Medium) {
    if (draft.medium === m) return;
    cardBuild.cancel();
    // Switching (or first pick) — clear any preview so the user rebuilds.
    setImage(null);
    setIsFinalImage(false);
    setImgLoading(false);
    setCodeLoading(false);
    setPreviewTab("preview");
    setDraft((d) => ({ ...d, medium: m, codeSpec: undefined }));
  }

  function applyHandEditedSource(source: string) {
    const spec = draft.codeSpec;
    if (!spec) return;
    setDraft((d) => ({
      ...d,
      codeSpec: { ...spec, template: "ai", source },
    }));
    toast.success("Running your edited code");
  }

  function shufflePalette() {
    const spec = draft.codeSpec;
    if (!spec) return;
    const others = TEMPLATES.flatMap((t) => t.palette);
    const shuffled = [...spec.palette].sort(() => Math.random() - 0.5);
    shuffled[1] = others[Math.floor(Math.random() * others.length)];
    shuffled[shuffled.length - 1] = others[Math.floor(Math.random() * others.length)];
    setDraft((d) => ({
      ...d,
      codeSpec: { ...spec, palette: shuffled },
    }));
  }

  async function send() {
    if (!draft.medium) {
      toast.error("Pick Art or Code first.");
      return;
    }
    if (draft.medium === "art" && (!image || !isFinalImage)) {
      toast.error("Wait for the image to finish rendering.");
      return;
    }
    if (draft.medium === "code" && !draft.codeSpec) {
      toast.error("Build the coded card first.");
      return;
    }
    if (!draft.message.trim()) {
      toast.error("The card has no message yet.");
      return;
    }
    if (!draft.recipientName.trim()) {
      toast.error("Add recipient name.");
      return;
    }
    setSending(true);
    try {
      const { id } = await saveFn({
        data: {
          prompt: draft.prompt.trim() || "custom",
          occasion: draft.occasion,
          message: draft.message.trim(),
          medium: draft.medium,
          imageDataUrl: draft.medium === "art" ? (image ?? undefined) : undefined,
          codeSpec: draft.medium === "code" ? draft.codeSpec : undefined,
          senderName: draft.senderName.trim() || undefined,
          recipientName: draft.recipientName.trim(),
          recipientEmail: draft.recipientEmail.trim() || undefined,
        },
      });
      toast.success("Card link created");
      const url = `${window.location.origin}/card/${id}`;
      setShareCard({ id, url });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  const previewBusy = draft.medium === "art" ? imgLoading : codeLoading;
  const hasOutput = draft.medium === "art" ? !!image : !!draft.codeSpec;
  const buildStatusText =
    cardBuild.status === "writing"
      ? "Writing your message"
      : cardBuild.status === "designing"
        ? "Designing your card"
        : cardBuild.status === "rendering"
          ? "Rendering your card"
          : null;

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6">
        <div className="grid gap-4 lg:h-[calc(100vh-8rem)] lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:gap-6">
          {/* Left: Chat / Editor panel */}
          <div className="flex h-[min(58svh,540px)] min-h-[400px] min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card/60 sm:min-h-[480px] lg:h-auto lg:min-h-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-3 sm:px-4">
              <div className="flex items-center gap-2">
                <Bird className="h-4 w-4 text-primary" />
                <span className="font-display text-lg">Pigeon</span>
              </div>
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                {mode === "chat" && (
                  <div
                    ref={mediumPickerRef}
                    tabIndex={-1}
                    className={`inline-flex shrink-0 rounded-full border bg-background p-0.5 text-xs outline-none transition ${!draft.medium && !!initialPrompt?.trim() ? "animate-pulse border-foreground/40 ring-2 ring-foreground/20" : "border-border"}`}
                  >
                    <button
                      type="button"
                      onClick={() => setMedium("art")}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 transition ${draft.medium === "art" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <Palette className="h-3 w-3" /> Art
                    </button>
                    <button
                      type="button"
                      onClick={() => setMedium("code")}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 transition ${draft.medium === "code" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <Code2 className="h-3 w-3" /> Code
                    </button>
                  </div>
                )}
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
            </div>

            {mode === "chat" ? (
              <ChatPanel
                messages={messages}
                busy={chatBusy}
                onSend={(t) => handleSend(t)}
                pendingPlan={pendingPlan}
                medium={draft.medium}
                mediumPickerRef={mediumPickerRef}
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
                onRegenerateCode={requestCodeBuild}
                imgLoading={imgLoading}
                msgLoading={msgLoading}
                codeLoading={codeLoading}
              />
            )}
          </div>

          {/* Right: Preview + Send */}
          <div className="flex min-h-[520px] min-w-0 flex-col gap-3 lg:min-h-0 lg:gap-4">
            {buildStatusText && (
              <div className="text-xs text-muted-foreground" aria-live="polite">
                {buildStatusText}…
              </div>
            )}
            {draft.medium === "code" && draft.codeSpec && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex rounded-full border border-border bg-card/60 p-0.5 text-xs">
                  <button
                    onClick={() => setPreviewTab("preview")}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 transition ${previewTab === "preview" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Eye className="h-3 w-3" /> Preview
                  </button>
                  <button
                    onClick={() => setPreviewTab("code")}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 transition ${previewTab === "code" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <FileCode2 className="h-3 w-3" /> Code
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={shufflePalette}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Shuffle className="h-3 w-3" /> Shuffle
                  </button>
                  <button
                    onClick={() => requestCodeBuild({ mode: "ai" })}
                    disabled={codeLoading}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
                  >
                    <Sparkles className="h-3 w-3" /> Surprise me
                  </button>
                  {draft.codeSpec?.template === "ai" && draft.codeSpec.source && (
                    <button
                      onClick={async () => {
                        const { downloadStandaloneHtml } =
                          await import("@/lib/codedCards/exportHtml");
                        const ok = downloadStandaloneHtml(draft.codeSpec!, {
                          recipientName: draft.recipientName,
                          senderName: draft.senderName,
                          message: draft.message,
                          occasion: draft.occasion,
                        });
                        if (ok) toast.success("Downloaded standalone HTML");
                        else toast.error("Export not available for this card.");
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Download className="h-3 w-3" /> Download
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="flex min-h-[460px] flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card/60 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.15)] sm:rounded-3xl">
              {draft.medium === "code" && draft.codeSpec && previewTab === "code" ? (
                <div className="aspect-square w-full">
                  <Suspense
                    fallback={
                      <div className="grid h-full place-items-center text-sm text-muted-foreground">
                        Loading code viewer…
                      </div>
                    }
                  >
                    <CodeViewer spec={draft.codeSpec} onEdit={applyHandEditedSource} />
                  </Suspense>
                </div>
              ) : (
                <PreviewCanvas
                  aspectRatio={1}
                  busyBadge={
                    previewBusy && hasOutput ? (
                      <div className="absolute right-3 top-3 rounded-full bg-background/80 px-2.5 py-1 text-[10px] text-muted-foreground backdrop-blur">
                        updating…
                      </div>
                    ) : undefined
                  }
                  fullscreenContent={
                    draft.medium === "code" && draft.codeSpec ? (
                      <CodedCard
                        spec={draft.codeSpec}
                        awaitTap
                        recipientName={draft.recipientName || undefined}
                      />
                    ) : draft.medium === "art" && image ? (
                      <img src={image} alt="Card preview" className="h-full w-full object-cover" />
                    ) : undefined
                  }
                >
                  {!draft.medium ? (
                    <div className="grid h-full place-items-center px-8 text-center text-sm text-muted-foreground">
                      <div className="space-y-2">
                        <div className="mx-auto inline-flex gap-2">
                          <Palette className="h-5 w-5" />
                          <Code2 className="h-5 w-5" />
                        </div>
                        <p>Pick a medium above to begin.</p>
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
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" /> Painting…
                          </span>
                        ) : (
                          "Approve the draft in the chat to paint your card."
                        )}
                      </div>
                    )
                  ) : draft.codeSpec ? (
                    <CodedCard spec={draft.codeSpec} />
                  ) : (
                    <div className="grid h-full place-items-center text-sm text-muted-foreground">
                      {codeLoading ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" /> Writing the code…
                        </span>
                      ) : (
                        "Approve the draft in the chat to code your card."
                      )}
                    </div>
                  )}
                </PreviewCanvas>
              )}
              <div className="border-t border-border p-4 sm:p-6">
                {draft.message ? (
                  <div className="space-y-2">
                    <p className="whitespace-pre-wrap font-display text-xl italic leading-snug text-foreground">
                      {draft.message}
                    </p>
                    {chatBusy && mode === "chat" && (
                      <ThinkingText className="text-xs">Pigeon is thinking…</ThinkingText>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {msgLoading || chatBusy ? "Writing the message…" : "Message will appear here."}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card/60 p-3 sm:p-4">
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
                  placeholder="Recipient email (optional)"
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
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-40"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Create link
                </button>
              </div>
              {shareCard && (
                <SharePanel
                  url={shareCard.url}
                  recipientName={draft.recipientName}
                  senderName={draft.senderName}
                  occasion={draft.occasion}
                  onClose={() => setShareCard(null)}
                  onView={() => navigate({ to: "/card/$id", params: { id: shareCard.id } })}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SharePanel({
  url,
  recipientName,
  senderName,
  occasion,
  onClose,
  onView,
}: {
  url: string;
  recipientName: string;
  senderName: string;
  occasion?: string;
  onClose: () => void;
  onView: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const sender = senderName.trim() || "Someone";
  const recipient = recipientName.trim() || "you";
  const title = `${sender} made ${recipient} a card`;
  const shareText = `${title}${occasion ? ` for ${occasion.toLowerCase()}` : ""}. Open it here: ${url}`;
  const encodedUrl = encodeURIComponent(url);
  const emailSubject = encodeURIComponent(title);
  const emailBody = encodeURIComponent(`${shareText}\n\nMade with Pigeon.`);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodedUrl}`;

  async function writeClipboard(text: string) {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    if (!ok) throw new Error("Clipboard unavailable");
  }

  async function copyLink() {
    try {
      await writeClipboard(url);
      setCopied(true);
      toast.success("Card link copied");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy automatically. Select the link and copy it manually.");
    }
  }

  async function nativeShare() {
    if (!navigator.share) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({ title, text: shareText, url });
    } catch {
      // User cancelled the share sheet.
    }
  }

  return (
    <div className="mt-3 rounded-2xl border border-primary/25 bg-background p-3 shadow-[0_20px_60px_-36px_rgba(0,0,0,0.45)] sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-primary">
            <Share2 className="h-3 w-3" /> Ready to share
          </div>
          <h3 className="mt-1 font-display text-xl leading-tight">Your card link is ready.</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Copy the link, send it by email, open your device's share sheet, or let someone scan the
            QR code.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close share panel"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto]">
        <div className="min-w-0 space-y-3">
          <div className="flex min-w-0 items-center gap-2 rounded-xl border border-border bg-card/60 p-2">
            <input
              readOnly
              value={url}
              className="min-w-0 flex-1 bg-transparent px-2 text-xs text-muted-foreground outline-none"
              aria-label="Card share link"
              onFocus={(event) => event.currentTarget.select()}
            />
            <button
              type="button"
              onClick={copyLink}
              aria-label="Copy card link to clipboard"
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-foreground px-3 text-xs font-medium text-background hover:opacity-90"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={nativeShare}
              aria-label="Open device share sheet for this card link"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card/70 px-3 text-xs font-medium hover:border-primary/40"
            >
              <Share2 className="h-4 w-4" /> Share
            </button>
            <a
              href={`mailto:?subject=${emailSubject}&body=${emailBody}`}
              aria-label="Create an email with this card link"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card/70 px-3 text-xs font-medium hover:border-primary/40"
            >
              <Mail className="h-4 w-4" /> Email
            </a>
            <button
              type="button"
              onClick={onView}
              aria-label="Open the recipient card page"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card/70 px-3 text-xs font-medium hover:border-primary/40"
            >
              <ExternalLink className="h-4 w-4" /> Open
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-border bg-card/60 p-3 lg:w-[170px] lg:flex-col">
          <img
            src={qrUrl}
            alt={`QR code for ${title}`}
            className="h-24 w-24 rounded-lg bg-white p-1 lg:h-32 lg:w-32"
          />
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 text-xs font-medium">
              <QrCode className="h-3.5 w-3.5" /> QR code
            </div>
            <p className="mt-1 text-xs leading-snug text-muted-foreground">
              Best for events, printed cards, or in-person sharing.
            </p>
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
  if (plan.occasion && isRsvpOccasion(plan.occasion)) rows.push(["Type", "RSVP collection"]);
  if (proposedMedium)
    rows.push(["Medium", proposedMedium === "art" ? "Painted art" : "Coded animation"]);
  if (proposedMedium === "code" && plan.codeTemplate) rows.push(["Template", plan.codeTemplate]);
  if (proposedMedium === "code" && plan.codeMotion) rows.push(["Motion", plan.codeMotion]);
  if (plan.prompt)
    rows.push(["Vibe", plan.prompt.length > 90 ? plan.prompt.slice(0, 87) + "…" : plan.prompt]);
  if (plan.recipientName) rows.push(["For", plan.recipientName]);
  if (plan.senderName) rows.push(["From", plan.senderName]);
  if (plan.message)
    rows.push([
      "Message",
      plan.message.length > 90 ? plan.message.slice(0, 87) + "…" : plan.message,
    ]);

  const disabled = plan.built || building;
  const paletteSwatches =
    proposedMedium === "code" && plan.codePalette && plan.codePalette.length > 0
      ? plan.codePalette
      : null;

  return (
    <div className="mt-2 max-w-full overflow-hidden rounded-xl border border-primary/25 bg-card shadow-[0_16px_40px_-24px_rgba(0,0,0,0.3)] sm:ml-2 sm:max-w-[90%]">
      <div className="flex items-center justify-between border-b border-border/60 bg-primary/[0.06] px-3.5 py-2">
        <div className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-primary">
          <Sparkles className="h-3 w-3" /> Draft
        </div>
        <span className="text-[10px] text-muted-foreground">
          {plan.built ? "Approved" : "Waiting for your approval"}
        </span>
      </div>
      <div className="p-3.5 text-xs">
        {rows.length > 0 ? (
          <dl className="space-y-1.5">
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
        {paletteSwatches && (
          <div className="mt-2 grid grid-cols-[70px_1fr] gap-2">
            <span className="text-muted-foreground">Palette</span>
            <div className="flex flex-wrap gap-1.5">
              {paletteSwatches.map((c, i) => (
                <span
                  key={i}
                  title={c}
                  className="h-4 w-4 rounded-full border border-border shadow-sm"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        )}
        <button
          onClick={() => onBuild(plan)}
          disabled={disabled}
          className="mt-3.5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
        >
          {building ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          {plan.built ? "Approved & built" : building ? "Building…" : "Approve & build"}
        </button>
        {!plan.built && (
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            Not quite right? Just keep chatting — I'll revise the draft.
          </p>
        )}
      </div>
    </div>
  );
}

function isRsvpOccasion(occasion?: string | null) {
  return /(rsvp|invitation|invite|wedding|shower|graduation|save the date|event)/i.test(
    occasion ?? "",
  );
}

function ChatPanel({
  messages,
  busy,
  onSend,
  pendingPlan,
  medium,
  mediumPickerRef,
  onBuild,
  building,
  initialText,
}: {
  messages: ChatMsg[];
  busy: boolean;
  onSend: (text: string) => void;
  pendingPlan: PlanUpdates | null;
  medium?: Medium;
  mediumPickerRef: React.RefObject<HTMLDivElement | null>;
  onBuild: (p: PlanUpdates) => void;
  building: boolean;
  initialText: string;
}) {
  const [text, setText] = useState(initialText);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const hadPrefill = useRef(!!initialText.trim());

  useEffect(() => {
    textareaRef.current =
      document.querySelector<HTMLTextAreaElement>('textarea[data-slot="prompt-input-textarea"]') ??
      null;
    if (hadPrefill.current && !medium) {
      // Draw the eye to the medium picker first when arriving with a prefilled prompt.
      mediumPickerRef.current?.focus();
    } else {
      textareaRef.current?.focus();
    }
  }, [medium, mediumPickerRef]);

  useEffect(() => {
    if (!busy) textareaRef.current?.focus();
  }, [busy, messages.length]);

  const canSubmit = !!medium && !!text.trim() && !busy;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="space-y-1">
          {messages.map((m) => (
            <div key={m.id}>
              <ChatBubble role={m.role}>
                {m.role === "assistant" ? (
                  <div className="max-w-[85%] text-sm leading-relaxed text-foreground">
                    {m.content}
                  </div>
                ) : (
                  <UserBubble>{m.content}</UserBubble>
                )}
              </ChatBubble>
              {m.planId && pendingPlan && pendingPlan.id === m.planId && (
                <PlanCard
                  plan={pendingPlan}
                  medium={medium}
                  onBuild={onBuild}
                  building={building}
                />
              )}
            </div>
          ))}
          {busy && (
            <ChatBubble role="assistant">
              <ThinkingText className="text-sm">Pigeon is thinking…</ThinkingText>
            </ChatBubble>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-border p-3">
        <PromptInput
          onSubmit={(msg) => {
            const t = msg.text.trim();
            if (!t) return;
            if (!medium) {
              toast.error("Pick Art or Code above first.");
              return;
            }
            setText("");
            onSend(t);
          }}
        >
          <PromptInputTextarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              medium
                ? "Describe your card, or ask for changes…"
                : "Pick Art or Code above, then describe your card…"
            }
            disabled={busy}
          />

          <PromptInputFooter className="flex-wrap justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <ModelPicker />
            </div>
            <PromptInputSubmit
              className="shrink-0"
              status={busy ? "streaming" : undefined}
              disabled={!canSubmit}
              title={!medium ? "Pick Art or Code first" : undefined}
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
  onRegenerateCode: (opts: {
    mode: "template" | "ai";
    templateHint?: Exclude<TemplateId, "ai">;
  }) => void;
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
              onClick={() =>
                setDraft((d) => ({ ...d, occasion: d.occasion === o ? undefined : o }))
              }
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
          <label className="text-xs uppercase tracking-wide text-muted-foreground">
            Coded template
          </label>
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
          {msgLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          Rewrite message only
        </button>
      </div>

      <div>
        <label className="text-xs uppercase tracking-wide text-muted-foreground">
          Your name (optional)
        </label>
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
