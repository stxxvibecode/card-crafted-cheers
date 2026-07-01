## Goal
Turn Code mode into a real Lovable-style coding loop: plan → build → iterate → view/edit — with a smarter model and richer output. All four upgrades ship together.

## 1. Iterative edits via chat
Today `generateCodedCard` regenerates from scratch every turn. Make it edit-aware.

- Extend `codedCards.functions.ts` input with optional `prior: { source?: string; template?: TemplateId; palette?: string[]; tempo?: number }` and `instruction: string` (the user's follow-up like "make it slower / add snow / warmer palette").
- New handler branch `mode === "edit"`:
  - If `prior.source` exists → prompt model with the full prior source and the instruction, ask for a **complete rewritten function body** (simpler than diffs, keeps sandbox contract stable). Return a new `CodeSpec` with the rewritten `source`.
  - If prior is a template (no source) → ask model whether the instruction is a palette/tempo tweak (return updated `palette`/`tempo` only, keep template) or a structural change (upgrade to `ai` mode and generate fresh source). Single structured-output call decides.
- In `create.tsx`, when `draft.medium === "code"` and there's already a `codeSpec`, subsequent chat messages route to `regenerateCode({ mode: "edit", instruction, prior: draft.codeSpec })` instead of a full re-plan. First message still goes through plan → build.

## 2. Smarter model & richer output
- Switch coded-card generation to **`google/gemini-3.5-flash`** (per `ai-models-chat`, this is the "fast coding, reasoning, agentic" model). Keep the template-picker call on the current cheap model.
- Migrate `codedCards.functions.ts` off raw `fetch` to the AI SDK + Lovable AI Gateway helper (`ai-sdk-lovable-gateway`) so we get proper error handling, retries-on-transient, and consistent headers.
- Expand system prompt with:
  - Concrete "good example" snippets (2 short reference bodies inline: a canvas particle system, an SVG kinetic-type piece) to raise the ceiling.
  - Explicit design guardrails: fill the square, respect palette, phrase always legible, easing/rhythm tied to `tempo`, tasteful motion (no seizure-y strobes).
  - Bump max output to ~6000 chars (from 3000) so the model can afford one non-trivial system.
- Keep the iframe sandbox + FORBIDDEN regex in `AISnippet.tsx` unchanged (security boundary stays put).

## 3. Multi-step plan → build
Already exists at the composer level; make it real for Code mode specifically.

- When a Code plan is proposed, the `PlanCard` now shows: **concept**, **palette swatches**, **motion** (e.g. "slow drifting particles"), **phrase**. These fields come from a new lightweight structured call in `chatCard.functions.ts` when `medium === "code"`.
- "Build" then triggers the actual code generation (existing wiring), not a separate model round-trip in the UI. The plan's palette/tempo/motion are passed as hints to `generateCodedCard`.

## 4. Show + edit the code
New right-rail toggle **Preview / Code** on `/create` when `draft.medium === "code"`.

- **Preview** tab: current `<CodedCard>` iframe.
- **Code** tab: read-only syntax-highlighted view of `draft.codeSpec.source` (for `template: "ai"`) or the resolved template file contents (for named templates, loaded from the registry as a string constant). Use `shiki` or `prismjs` — pick `prismjs` since it's ~2kb and ships CSS themes; run highlighting client-side only.
- **Edit button** flips the panel into a `<textarea>` with the source; **Run** button commits it: `setDraft({...draft, codeSpec: {...spec, template: "ai", source: edited}})` and the iframe re-mounts.
- Copy button to copy source to clipboard.
- No file writes, no persistence beyond the current draft; the sandbox contract (`container, phrase, palette, tempo, seed`) is unchanged so hand-edits keep working.

## Files touched
- `src/lib/codedCards.functions.ts` — add `edit` mode, switch model, use AI SDK, richer prompts.
- `src/lib/chatCard.functions.ts` — when medium=code, plan includes motion/palette fields.
- `src/routes/create.tsx` — route follow-up chat to edit mode; add Preview/Code toggle; wire edit textarea.
- `src/lib/codedCards/CodeViewer.tsx` **(new)** — Prism-based read/edit component.
- `src/lib/codedCards/registry.ts` — expose each template's source string so the Code viewer can show it.
- `package.json` — add `prismjs` + `@types/prismjs`.

## Out of scope
- Multi-file projects (still one function body).
- Persisting hand-edited source to the DB `code_spec` on send — actually included, since `code_spec.source` already exists in the schema; just make sure `sendCard` writes it.
- Changing the sandbox security model.
- Streaming code generation token-by-token (nice-to-have, skip for now — build is fast enough with 3.5-flash).
