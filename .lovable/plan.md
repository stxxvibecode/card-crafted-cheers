## Goal

Landing composer stays a single prompt box (your call). The Art/Code + Plan/Build controls live only on `/create`, so make sure they're impossible to miss the moment the user lands there from the homepage.

## Changes

### 1. `src/routes/index.tsx` — leave the composer as-is
No new controls. Only tweak: change the submit button label from "Send with Pigeon" to **"Continue →"** and the helper caption under the box to *"Pick Art or Code on the next step."* This sets expectations so the user isn't hunting for a picker here.

### 2. `src/routes/create.tsx` — highlight the footer picker
The controls exist but blend into the composer. Make them the first thing the eye lands on when arriving with a prefilled prompt:

- **Pulse/attention state**: when `draft.medium` is `undefined` and `prompt` is prefilled from the landing search param, wrap the Art/Code segmented control in a soft ring (`ring-2 ring-primary/40`) and animate a one-shot fade-in.
- **Inline hint above composer**: small line *"Choose Art or Code, then hit Build"* — shown only until a medium is picked.
- **Disabled Send tooltip**: when Send is disabled because no medium is picked, add a `title`/tooltip *"Pick Art or Code first"* so the reason is discoverable.
- **Auto-focus the medium picker** (not the textarea) on mount when arriving with a prefilled prompt, so keyboard/Tab users see it first.

### 3. No backend, schema, or generation-logic changes
Purely presentational. `chatCard.functions.ts`, `codedCards.functions.ts`, and the API routes are untouched.

## Out of scope
- Adding the picker to the landing page (explicitly declined).
- Changing the Plan/Build dropdown behavior.
