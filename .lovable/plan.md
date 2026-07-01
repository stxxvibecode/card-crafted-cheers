## Goal

Route every AI call in Pigeon (chat planner, message writer, coded-card generator, image generator) through the **lava.so gateway** and let the user pick the model from a dropdown next to the Plan/Build control.

## How lava.so fits

- Lava is an OpenAI-compatible gateway. We authenticate with a single `LAVA_SECRET_KEY` (Bearer header) and hit `https://api.lava.so/v1/...` — same request shape as OpenAI.
- Model catalog is discoverable at `GET /v1/models` — we fetch it once at runtime and cache it, so "all LLMs" show up automatically without hard-coding.
- Same secret works for chat, images, and model listing.

## Setup

1. Add `LAVA_SECRET_KEY` via the secure secret form (user pastes their key from lava.so dashboard → Gateway → Secrets).
2. No other keys or connectors needed.

## Backend

New server route `src/routes/api/models.ts` — `GET` proxies `https://api.lava.so/v1/models`, returns `{ chat: Model[], image: Model[] }` split by capability (heuristic: id contains `image`, `dall`, `flux`, `gemini-*-image` → image; else chat). Cached in-memory for 5 min.

Rewrite existing AI callers to use lava:
- `src/lib/chatCard.functions.ts` (planner) — swap the Lovable AI gateway helper for a small `lavaChat(model, messages, { json? })` helper that POSTs `https://api.lava.so/v1/chat/completions` with `Bearer $LAVA_SECRET_KEY`.
- `src/lib/codedCards.functions.ts` (code generator + edit) — same helper.
- Message rewriter (wherever `rewriteMessage` lives) — same helper.
- `src/routes/api/generate-image.ts` — repoint to `https://api.lava.so/v1/images/generations`, keep `stream: true` passthrough, model comes from request body instead of hard-coded `openai/gpt-image-2`.

Each caller accepts a `model` field from the client and forwards it verbatim to lava. Fallback when the client sends none: env-driven defaults — `LAVA_CHAT_MODEL` (default `gemini-2.5-flash`) and `LAVA_IMAGE_MODEL` (default `openai/gpt-image-1`). We drop the Lovable AI Gateway usage in these paths.

## Frontend

New store `src/lib/modelStore.ts` — Zustand (or plain React context) persisting `{ chatModel, imageModel }` to `localStorage`. Loaded on `/create` mount.

New component `src/components/ModelPicker.tsx`:
- Fetches `/api/models` once, splits into Chat / Image groups.
- Compact popover dropdown with search, grouped by `owned_by` (openai, anthropic, google, xai, mistral, …).
- Two-tab selector inside: **Chat model** and **Image model** — so one control covers both.
- Trigger button shows current chat model name + chevron; sits **left of the Plan/Build dropdown** in the composer footer of `src/routes/create.tsx`.

Wire selections into every generate call:
- `commitPlan`, `editorBuild`, `rewriteMessage`, and the chat planner request all include `model: chatModel`.
- `regenerateCode` / coded-card generation includes `model: chatModel` (code generation is chat-completion).
- Streaming image request in `create.tsx` includes `model: imageModel`.

Landing hero `/` stays as-is; the picker only appears on `/create` where generation happens.

## Error handling

Surface lava gateway errors verbatim in the chat as a system message ("Lava: 402 insufficient credits", "Lava: model not found") so the user knows to top up or pick another model. 429 shows a "rate limited" toast; other 4xx/5xx surface the response body.

## Out of scope

- No billing UI, no forward tokens (single-wallet setup — costs hit the user's own lava wallet via their secret key).
- No changes to auth, DB schema, or share/email flow.
- Lovable AI Gateway is fully removed from the runtime path once lava is wired; the secret can stay but is unused.

## Files touched

- New: `src/routes/api/models.ts`, `src/components/ModelPicker.tsx`, `src/lib/modelStore.ts`, `src/lib/lava.server.ts` (shared fetch helper).
- Edited: `src/routes/api/generate-image.ts`, `src/lib/chatCard.functions.ts`, `src/lib/codedCards.functions.ts`, `src/routes/create.tsx`.
- Secret: `LAVA_SECRET_KEY` added via secure form.
