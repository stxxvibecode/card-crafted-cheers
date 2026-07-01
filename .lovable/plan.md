## Problem

On code cards, the animation only displays the short occasion phrase ("Happy Birthday" — the "two words" you're seeing). Your actual card message never makes it into the coded visual. Root cause in `src/lib/codedCards.functions.ts`:

```
const finalPhrase = data.phrase?.trim() || phraseFor(data.occasion) || "With Love";
```

…and in `src/routes/create.tsx` (`regenerateCode`) we pass `d.codeSpec?.phrase ?? phraseFor(d.occasion)` — the message is never sent.

The message *does* appear as a caption under the preview, but the animation itself never renders it.

## Fix

Treat the coded card like the art card: it should render both the occasion headline **and** the full personal message, and regenerate whenever either changes.

### 1. `src/lib/codedCards/registry.ts` — extend CodeSpec

Add an optional `message: string` alongside `phrase` so templates and AI code can render both.

### 2. `src/lib/codedCards.functions.ts`

- Input schema: add `message: z.string().max(600).optional()`.
- Thread `finalMessage = data.message?.trim() ?? ""` through every return (template, ai, edit-tweak, edit-rewrite).
- Update `CODE_SYSTEM` so the invocation contract includes `message: string` (may be empty), with rules:
  - `phrase` is the big headline (top of card, large serif).
  - `message` is the personal note (smaller, wrapped, secondary weight) rendered below/beside phrase when non-empty.
  - Both must fit the square; wrap long messages and auto-size.
- Update `EDIT_SYSTEM` invocation contract the same way, and pass current message in the edit user prompt.
- Update the two REFERENCE snippets to show phrase + message layout (headline + wrapped subtitle).

### 3. Templates — accept and render `message`

Update the six templates in `src/lib/codedCards/templates/` (Confetti, Fireworks, KineticSerif, Hearts, Starfield, Ribbons) plus `CodedCard.tsx` to accept a `message` prop and render it as a wrapped secondary caption under the phrase when present. Keep layout unchanged when `message` is empty (backwards compatible with existing cards).

### 4. `src/routes/create.tsx`

- In `regenerateCode`, pass `message: d.message` and default `phrase` to `phraseFor(d.occasion)` (drop the message-as-phrase confusion).
- In the chat "apply plan" and "message updated" flows, trigger `regenerateCode({ mode: "edit" })` (or template rebuild) whenever `draft.message` changes while `medium === "code"`, so the card stays in sync — same behavior we already have for occasion → art.

### 5. `src/lib/chatCard.functions.ts`

Update the system prompt to note that for code cards, changing the message also warrants a code refresh (mirrors the existing art rule for occasion changes).

## Result

Code cards will show your full message ("Happy Birthday, Sarah! Hope your day is filled with…") animated into the design, with the short occasion phrase as the headline — matching how art cards hand-letter both.
