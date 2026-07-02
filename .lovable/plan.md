## Problem

Lava returns `400: This model does not support assistant message prefill. The conversation must end with a user message.` when certain providers (e.g. Anthropic Claude models) receive a history whose last turn is from the assistant.

The `chatCard` server function already trims trailing assistant messages, but other lava callers (coded-card generator, coded-card edit, message rewriter) don't — and any future caller would hit the same wall.

## Fix

Centralize the guard inside the shared `lavaChat` helper (`src/lib/lava.server.ts`) so every path is protected.

Inside `lavaChat`, before building the request body:

1. Copy the incoming `messages` array.
2. Pop trailing entries whose `role === "assistant"` until the last turn is `user` (or the array is empty). Preserve any leading `system` message.
3. If no `user` message remains, append `{ role: "user", content: "Continue." }` as a minimal valid turn.
4. Send the sanitized array to Lava.

Optional cleanup: remove the now-redundant trim block in `src/lib/chatCard.functions.ts` (lines 99–108) since the helper handles it.

## Files touched

- `src/lib/lava.server.ts` — add the trim guard in `lavaChat`.
- `src/lib/chatCard.functions.ts` — optional: delete the duplicate local trim.

## Out of scope

Model picker UI, provider selection, prompt content, and every other AI path stay unchanged.
