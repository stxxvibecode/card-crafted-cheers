# Conversational card editor

Make `/create` feel like Lovable: a chat panel on the left where you converse with Pigeon to build the card, and a live preview on the right. A pill toggle at the top of the left panel switches between **Chat** and **Editor** — same underlying card state, two ways to shape it.

## UX

```text
┌──────────────────────────────────────────────────────────────┐
│  Pigeon                                     [ Chat | Editor ]│
├───────────────────────────┬──────────────────────────────────┤
│  ● Pigeon                 │                                  │
│  Hi! Who's this card for? │       ┌────────────────────┐     │
│                           │       │                    │     │
│  ○ You                    │       │   card image       │     │
│  A birthday card for my   │       │                    │     │
│  sister — she loves cats  │       └────────────────────┘     │
│                           │       "handwritten message…"     │
│  ● Pigeon                 │                                  │
│  Painting it now ✎        │                                  │
│                           │                                  │
│  [ Type a message… ] [→]  │       To: ____  Email: ____ [Send]│
└───────────────────────────┴──────────────────────────────────┘
```

- **Chat mode (default):** AI Elements composer + transcript. User types things like "make it more whimsical", "shorter message", "add a cat wearing a party hat". The assistant streams a reply and, when the request implies an edit, triggers image/message regeneration. Preview updates live on the right.
- **Editor mode:** the existing form (prompt textarea, occasion chips, message textarea with Rewrite, recipient fields, Send). Same state — anything the chat produced is editable here, and any edits here show up when you flip back to chat.
- **Recipient + Send** stay pinned under the preview in both modes so sending never requires switching.
- Toggle is a segmented control top-right of the left panel; state persists per session.

## Implementation

- New `src/routes/create.tsx` layout: two-column, left column has the mode toggle + either `<ChatPanel />` or `<EditorPanel />`, right column is the shared `<CardPreview />` + `<SendBar />`.
- Lift card state (`prompt`, `occasion`, `image`, `isFinalImage`, `message`, recipient fields, loading flags) into `useCardDraft()` hook so chat and editor mutate the same store. Regenerate helpers (`regenerateImage`, `regenerateMessage`) live here and reuse `streamImage` + `generateMessage` unchanged.
- New `src/routes/api/chat.ts` streaming server route using AI SDK + Lovable AI Gateway (`google/gemini-3-flash-preview`) via the existing gateway helper pattern. System prompt: "You are Pigeon, helping the sender craft an e-card. Ask 1 short question at a time. When the user's intent implies changing the art or the written message, respond with a tool call." Tools:
  - `updateBrief({ prompt?, occasion?, recipientName?, senderName? })`
  - `regenerateImage({ prompt })` — server just echoes the new prompt; client-side `onToolCall` runs `streamImage` and updates preview.
  - `rewriteMessage({ tone?, length?, notes? })` — client runs `generateMessage` with merged brief.
- Client uses `useChat` from `@ai-sdk/react` with `DefaultChatTransport({ api: "/api/chat" })`, keyed to session (no persistence — matches current app; can add later). Handle `onToolCall` to mutate the draft store and trigger regeneration; render tool parts inline (small "Repainting…" / "Rewriting…" chips).
- Install AI Elements primitives: `bunx ai-elements@latest add conversation message prompt-input shimmer tool`. Compose `<Conversation>/<Message>/<MessageResponse>` for the transcript, `<PromptInput>` for the composer, `<Tool defaultOpen={false}>` for tool cards, `<Shimmer>` for the submitted state. Assistant messages have no background; user bubble uses `bg-foreground text-background`.
- Toggle: shadcn-style segmented control (two buttons) styled to match the off-white/ink theme; keyboard-accessible.
- Preserve current visual language (Instrument Serif, ink CTA, champagne accents). No dark mode.

## Technical notes

- Route: keep `/create` with `validateSearch` for `?prompt=`. If a prompt is present on load, seed the draft and auto-send the first user message in chat mode so the conversation starts already in motion.
- Server route uses `createFileRoute("/api/chat")({ server: { handlers: { POST } } })`, `streamText` with `tools`, `toUIMessageStreamResponse({ originalMessages })`. `LOVABLE_API_KEY` read inside the handler.
- No DB changes; `saveCard`/`sendCard` continue as-is when the user hits Send.
- Textarea/composer autofocus on mount, after send, and after mode switches to Chat.
- Errors (429 / 402 / network) surface via `toast` and inline in the transcript.

## Out of scope

- Persisting chat history across reloads (add later if wanted).
- Multi-turn image editing (each regen is a fresh generation from the merged prompt).
- Email delivery changes.
