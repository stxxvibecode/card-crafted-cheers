
## Goal
When the card's occasion is "Thank You" (or Birthday, Congrats, etc.), the generated artwork itself should include the phrase rendered as part of the design — hand-lettered, embossed, floral typography, etc. — not just show it as separate text below the image.

## Approach
Enrich the image prompt sent to `openai/gpt-image-2` so it always includes an explicit typography instruction tied to the occasion.

### 1. Prompt composition helper (`src/lib/cards.functions.ts`)
Add a small `buildImagePrompt({ prompt, occasion })` that:
- Maps occasion → display phrase (`thank-you` → "Thank You", `birthday` → "Happy Birthday", `congrats` → "Congratulations", `thinking-of-you` → "Thinking of You", `love` → "With Love", fallback → none).
- Appends a typography clause to the user's art prompt, e.g.:
  > "Incorporate the phrase **"Thank You"** as the focal typographic element — elegant hand-lettered serif integrated into the composition, legible, correctly spelled, no extra words, no watermark, no signature."
- Adds guardrails gpt-image-2 responds well to: "spell the phrase exactly", "single instance of the text", "no gibberish letters elsewhere".

Use this helper in both places that currently build the image prompt:
- The `/api/generate-image` server route call site (wherever the prompt is assembled before `streamImage`).
- The chat editor's regenerate path in `src/lib/chatCard.functions.ts` when it returns `regenerateImage: true`.

### 2. Chat agent awareness (`src/lib/chatCard.functions.ts`)
Update the system prompt so Pigeon knows: when the user says "make it a thank you card", it should set `occasion: "thank-you"` AND flip `regenerateImage: true` so the new artwork picks up the typographic phrase. No schema change — just prompt guidance.

### 3. Editor mode (`src/routes/create.tsx`)
No structural change. When occasion changes in the editor, trigger the existing regenerate flow (already wired) so the on-image text updates.

### 4. Model note
Keep `openai/gpt-image-2` — it renders short phrases reliably. No model swap, no new deps, no DB change.

## Out of scope
- Custom fonts / user-typed on-image text (only occasion-driven phrases).
- Multi-line messages inside the art (message stays below the image).
