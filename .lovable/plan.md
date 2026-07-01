
## Goal

Nothing renders or generates on `/create` until the user (1) picks a medium chip — **Art** or **Code** — and (2) confirms a plan for their prompt. Mirrors Lovable's plan-then-build flow: chat proposes, user hits **Build** to commit.

## Behavior changes

### 1. Medium starts unselected
- `draft.medium` becomes `"art" | "code" | undefined`, defaulting to `undefined`.
- Preview pane shows an empty "Pick Art or Code to begin" state instead of the art placeholder.
- Art/Code chips act as a required first choice; once chosen, chip stays sticky but can be swapped (swapping clears any pending plan + preview).

### 2. No auto-kick from URL prompt
- Remove the `useEffect` that auto-calls `handleSend(initialPrompt)`.
- If `?prompt=` is present, seed it into the chat input (and the editor prompt field) but do NOT send. The assistant's seed message asks the user to pick Art or Code first.

### 3. Plan mode in chat
- Introduce a `phase: "plan" | "build"` state (per draft).
- While in `plan`: `chatCard` server fn is called with a flag that tells the model to **propose** updates (prompt, occasion, message, template hint) and reply conversationally, but the client does **NOT** call `regenerateImage` / `regenerateCode` / `generateMessage`. Proposed updates are stored in a `pendingPlan` object and shown as a compact "Plan" card in the chat (occasion, vibe, medium-specific hint, draft message preview).
- A prominent **Build card** button appears under the plan card. Clicking it:
  - Requires `draft.medium` to be set (button disabled otherwise, with helper text "Pick Art or Code above").
  - Commits `pendingPlan` into `draft`.
  - Runs the appropriate generator exactly once: `regenerateImage` for Art, `regenerateCode` for Code, plus `generateMessage` if the plan didn't already include one.
  - Flips `phase` to `build`. Further chat turns can update the plan again and re-show the Build button for the next commit.

### 4. Editor mode mirrors this
- "Generate all" button is disabled until a medium is picked.
- Button label becomes **Build card** (Art) or **Build coded card** (Code) so it matches the chat action.
- Switching medium in editor clears the current preview (image or codeSpec) and requires a rebuild.

### 5. `setMedium` no longer auto-generates
- Picking Code no longer immediately calls `regenerateCode`. It only sets the chip. Generation waits for **Build**.
- Same for Art — picking the chip never triggers image generation on its own.

### 6. Send guards
- `send()` continues to require a finished image (Art) or a `codeSpec` (Code) and a message — unchanged, but now naturally enforced by the plan-then-build flow.

## Technical notes

- `src/routes/create.tsx`
  - `Draft.medium?: "art" | "code"`; initial `undefined`.
  - Remove `kickedRef` auto-send effect.
  - Add `pendingPlan` + `phase` state; render a `<PlanCard />` inside chat when `pendingPlan` exists.
  - Add `commitPlan()` that validates medium, merges `pendingPlan` into `draft`, and dispatches the single correct generator.
  - `setMedium(m)`: only sets chip; if swapping mediums, clear `image`, `isFinalImage`, `codeSpec`, and any in-flight loading flags.
  - Preview pane: three states — no medium picked, medium picked but no output yet ("Hit Build to generate"), and output present.
- `src/lib/chatCard.functions.ts`
  - Accept a `phase: "plan" | "build"` (or `dryRun: true`) input. In plan phase, system prompt instructs the model to *propose* fields, never assume medium if not set, and to explicitly ask the user to pick Art or Code when `draft.medium` is undefined.
  - Return shape unchanged (`reply`, `updates`), but the client uses `updates` as `pendingPlan` rather than applying immediately.
- No DB/schema changes. No changes to `generate-image.ts`, `codedCards.functions.ts`, `cards.functions.ts` server logic — only their call sites move behind the Build button.

## Out of scope

- No changes to templates, image prompt phrasing, or share/view route.
- No new dependencies.
