# Pigeon Vibe Coding Platform Plan

## Product Direction

Pigeon should feel like a focused vibe-coding environment for e-cards: the sender describes a feeling and occasion, Pigeon turns that into a visible build plan, generates a polished card, checks the result, and lets the sender refine it conversationally without losing good work.

The core loop is:

```text
Prompt -> structured brief -> card spec -> deterministic render -> quality check -> repair/version -> publish
```

The product is not a general website builder. Its advantage is a narrow, high-quality card runtime with strong defaults for typography, motion, mobile layout, recipient interaction, and delivery.

## Why the Current Cards Feel Janky

The current code has several concrete causes:

1. **Builds race each other.** In `editorBuild`, code generation starts before message generation and then starts again after the message returns. `commitPlan` can do the same. Whichever request finishes last overwrites `draft.codeSpec`, so the preview may not match the latest intent.
2. **The output contract is too loose.** `CodeSpec` stores an arbitrary JavaScript function body. The model owns DOM structure, CSS, animation, responsiveness, interactions, and accessibility in one untyped string.
3. **Validation is textual, not visual.** The self-check detects tokens and rough regex signatures. It cannot see clipped text, bad hierarchy, broken mobile composition, low contrast, awkward motion, or an empty frame.
4. **A failed retry is still accepted.** `generateWithSelfCheck` checks the second output but returns it regardless of whether it passes.
5. **The prompt is doing too many jobs.** One very large system prompt attempts to be product brief, design system, renderer contract, safety policy, variation engine, and QA rubric.
6. **The generated card and recipient page overlap.** Generated code is asked to create reveal, message, and local actions while the public card page separately adds an opening gate, message, reactions, RSVP, and keepsake actions. This creates duplicated beats and inconsistent layouts.
7. **Preview and delivery are not one renderer.** The iframe preview, public card page, named React templates, and standalone HTML export have different wrappers and constraints. A card that looks acceptable in one surface can break in another.
8. **Variation is random but not durable.** Recent design moves live in server memory and the seed is regenerated during edits. Results are difficult to reproduce, compare, or restore.
9. **There is no visual regression corpus.** The current tests cover utility logic, not whether representative cards look polished at phone and desktop sizes.

## Target Architecture

### One build transaction

Every user action creates one build ID and moves through an explicit state machine:

```text
idle -> planning -> generating-copy -> generating-spec -> rendering -> evaluating
     -> ready
     -> repairing -> evaluating -> ready
     -> failed
```

Only the active build ID may update the preview. Starting a new build cancels or ignores older work. Copy and design generation happen in a defined order, not as competing background calls.

### Structured CardSpec v2

Replace free-form generated JavaScript as the default output with a versioned, validated specification:

```ts
type CardSpecV2 = {
  version: 2;
  id: string;
  seed: number;
  format: "portrait" | "square" | "story";
  occasion: string;
  theme: {
    background: string;
    ink: string;
    accent: string;
    fontPair: "editorial" | "modern" | "playful" | "mono";
  };
  content: {
    eyebrow?: string;
    headline: string;
    message: string;
    recipient?: string;
    sender?: string;
    event?: { date?: string; time?: string; location?: string };
  };
  composition: {
    layout: "poster" | "split" | "wordmark" | "letterbox" | "ticket" | "timeline";
    alignment: "left" | "center" | "right" | "off-axis";
    density: "quiet" | "balanced" | "expressive";
  };
  motif: {
    kind: "ribbon" | "bloom" | "spark" | "orbit" | "light" | "confetti" | "none";
    intensity: number;
  };
  motion: {
    entrance: string;
    idle: string;
    durationMs: number;
    reducedMotion: boolean;
  };
  interaction?: {
    kind: "reveal" | "reaction" | "rsvp" | "keepsake";
    labels?: string[];
  };
};
```

The model chooses values and content. The app owns rendering. Custom code remains an advanced experimental mode after the structured runtime consistently produces good cards.

### One renderer everywhere

Use the same `CardRenderer` for creator preview, device preview, public recipient page, dashboard thumbnail, and export. Surface-specific shells may add controls, but the visual card itself must be identical.

### Quality as a build step

Every generated spec is rendered at 390x844 and 1200x900, then evaluated for:

- visible headline and complete message
- overflow and clipped elements
- contrast and minimum text size
- empty or broken render
- safe margins and touch targets
- reduced-motion behavior
- occasion/content fit
- visual balance and duplicate patterns

Hard failures trigger one targeted repair. A second failure falls back to a proven template and tells the sender what happened instead of publishing a broken card.

## Phase 0: Establish the Quality Baseline

**Goal:** Make “janky” measurable before changing the generation architecture.

### Build

- Create 24 canonical prompts across birthday, thanks, congratulations, love, get well, invitation, RSVP, wedding, and just-because use cases.
- Include short and long messages, missing details, long names, emoji, and awkward edge cases.
- Add browser capture at phone and desktop sizes for creator preview and public card view.
- Define a five-part score: legibility, composition, occasion fit, motion, and recipient experience.
- Save the prompt, model, seed, spec/source, screenshots, build duration, and score for every run.

### Code impact

- Add `src/quality/fixtures.ts`.
- Add `src/quality/cardQuality.ts`.
- Add browser tests under `tests/card-visual/`.
- Add a local `quality:cards` command that never publishes cards.

### Exit gate

- All 24 prompts have reproducible before screenshots and scores.
- The team can identify whether a change improved or regressed output quality.

## Phase 1: Fix Build Orchestration

**Goal:** One instruction produces one coherent result.

### Build

- Extract all generation state from `src/routes/create.tsx` into `useCardBuild` or a reducer-backed build controller.
- Generate or confirm the message first, then generate the card spec with the final message.
- Add a build ID and `AbortController`; stale results cannot update `draft`.
- Merge `commitPlan`, `editorBuild`, `rewriteMessage`, and `regenerateCode` behind one command interface.
- Preserve seed during edits. Create a new seed only for “surprise me” or explicit redesign requests.
- Keep the last successful preview visible while a new version builds.
- Separate statuses: planning, writing, designing, checking, repairing, and ready.

### Command contract

```ts
type BuildCommand =
  | { type: "create"; brief: CardBrief }
  | { type: "edit"; instruction: string; baseVersionId: string }
  | { type: "regenerate"; preserve: Array<"copy" | "palette" | "layout" | "motion"> }
  | { type: "undo" }
  | { type: "redo" };
```

### Exit gate

- One click creates one server build.
- Stale responses never overwrite newer work.
- Copy in the preview always matches copy in the editor and saved card.
- Retry, cancel, undo, and failure behavior are deterministic.

## Phase 2: Introduce CardSpec v2 and the Card Runtime

**Goal:** Move quality-critical decisions from generated JavaScript into tested product code.

### Build

- Add a Zod schema for `CardSpecV2` with strict enums, bounds, color validation, and content limits.
- Build reusable runtime primitives: `CardStage`, `TypeBlock`, `MessageBlock`, `MotifLayer`, `MotionSequence`, `EventDetails`, and `CardAction`.
- Implement six high-quality composition families: poster, editorial split, wordmark, letterbox, ticket/invitation, and timeline/memory.
- Implement a small motif library with deterministic seed-based variation.
- Add built-in responsive rules and safe zones to every composition.
- Render reduced-motion and static final-frame modes from the same spec.
- Store `spec_version` and the full validated spec in Supabase.
- Keep a v1 adapter so existing cards still render.

### Logic split

- Planner model: sender prompt -> `CardBrief`.
- Copy model: `CardBrief` -> final card copy.
- Design model: `CardBrief` + copy + available runtime options -> `CardSpecV2`.
- Renderer: `CardSpecV2` -> React UI.
- No model-generated DOM or CSS in the default path.

### Exit gate

- Every schema-valid spec renders without runtime exceptions.
- All six layouts pass phone and desktop overflow tests.
- Existing v1 cards continue to open.
- The same spec produces the same card on preview, public page, dashboard, and export.

## Phase 3: Add the Visual Quality and Repair Loop

**Goal:** Never show an obviously broken first result as “ready.”

### Build

- Render screenshots after every initial generation.
- Run deterministic DOM checks first: overflow, text clipping, contrast, missing content, invalid bounds, excessive animation, and empty elements.
- Run a visual evaluator only after deterministic checks pass.
- Return structured issues such as `message_clipped`, `weak_hierarchy`, `occasion_mismatch`, or `low_contrast`.
- Repair only the failing spec fields instead of asking the model to rewrite everything.
- Cap repair at one attempt, then use the closest proven composition fallback.
- Display “Checking your card” and “Polishing spacing” states honestly in the UI.

### Quality contract

```ts
type QualityResult = {
  passed: boolean;
  score: number;
  issues: Array<{
    code: string;
    severity: "blocker" | "warning";
    path?: string;
    repairHint: string;
  }>;
};
```

### Exit gate

- No blocker-level card reaches the ready state.
- At least 90% of the canonical corpus passes without manual intervention.
- Repair improves the score without changing approved copy or unrelated design choices.

## Phase 4: Make the Creator Feel Like Vibe Coding

**Goal:** Give senders the feeling of directing a build, not filling out a form.

### Creator experience

- Keep chat and preview side by side, but replace hidden draft mutations with a visible build plan: copy, layout, palette, motion, and interaction.
- Stream plan and build-stage updates into an activity timeline.
- Make preview elements selectable. Selecting the headline, message, background, motif, or action gives chat context for targeted edits.
- Add quick commands: “make it calmer,” “more editorial,” “fix spacing,” “keep copy, redesign,” “try another layout,” and “revert.”
- Add version history with named checkpoints and side-by-side comparison.
- Add device tabs for phone, desktop, and final share frame.
- Allow direct editing of copy, colors, motion intensity, and event details through controls backed by the same spec.
- Show exactly what will change before a build: copy, design, or both.

### Editing logic

- Natural-language edits become JSON Patch operations against `CardSpecV2`.
- Validate every patch before applying it.
- Preserve fields the sender did not ask to change.
- Save each successful patch as a new immutable version.
- Undo/redo moves between versions rather than trying to reverse AI output.

### Exit gate

- A sender can create, refine, compare, undo, and publish without losing a good version.
- Targeted edits change only the selected or requested properties.
- The sender can understand why the preview changed.

## Phase 5: Unify Recipient Experience and Publishing

**Goal:** The built card should feel as intentional when opened as it did in the creator.

### Build

- Decide ownership of reveal and actions: the platform shell owns open, reactions, replies, RSVP persistence, sharing, and keepsake export; the card renderer owns only the visual story.
- Remove local fake RSVP/reaction actions from generated designs.
- Use the same renderer on `/create`, `/card/$id`, and `/cards`.
- Generate platform-owned share metadata and card thumbnails.
- Make publish create an immutable version; later edits create a new version and explicit republish action.
- Add delivery status, response counts, and open/response analytics with privacy-safe event names.
- Make export use the structured renderer or a server-generated static package, not a separate hand-built wrapper.

### Exit gate

- Preview and published output match at supported viewports.
- RSVP/reaction actions persist once and appear in the sender dashboard.
- Every published card has a stable thumbnail, version, share link, and fallback frame.

## Phase 6: Expand Creative Power Safely

**Goal:** Add breadth after the quality system is reliable.

### Build

- Add portrait, square, story, and invitation formats.
- Add curated design packs rather than uncontrolled layout proliferation.
- Add user-uploaded images, brand palettes, and reusable personal styles.
- Reintroduce custom code as an opt-in “Code Lab” with stronger parsing, resource budgets, screenshot checks, and no direct publish until it passes quality validation.
- Add remix-from-card and reusable prompt recipes.
- Use observed create-to-publish and recipient response data to decide which creative features deserve investment.

### Exit gate

- New formats reuse the same spec, renderer, evaluator, and publishing contracts.
- Custom code cannot bypass the normal safety and visual quality gates.

## Recommended Delivery Sequence

| Order | Work                                           | Expected impact                                     |
| ----- | ---------------------------------------------- | --------------------------------------------------- |
| 1     | Phase 0 corpus and screenshots                 | Makes quality measurable                            |
| 2     | Phase 1 build controller                       | Removes races and inconsistent previews immediately |
| 3     | Phase 2 CardSpec v2 plus three initial layouts | Largest quality improvement                         |
| 4     | Phase 3 evaluator and repair                   | Prevents visibly broken output                      |
| 5     | Phase 2 remaining layouts                      | Expands range without losing consistency            |
| 6     | Phase 4 versioned vibe-coding editor           | Creates the differentiated product experience       |
| 7     | Phase 5 publishing unification                 | Makes creator and recipient experiences match       |
| 8     | Phase 6 creative expansion                     | Adds breadth after reliability                      |

## First Release Cut

The first meaningful release should include Phases 0-3 with only three excellent compositions: poster, editorial split, and invitation/ticket. That is preferable to supporting many templates that generate unreliable results.

Success for this release:

- 90%+ canonical prompt pass rate
- zero clipped card copy in the test corpus
- one build request per user action
- deterministic undo and regeneration
- preview/public parity at phone and desktop sizes
- median time to a ready card under 20 seconds
- sender selects “publish” on at least 40% of completed builds

## Files to Refactor First

1. `src/routes/create.tsx` — extract build orchestration and remove duplicate generation paths.
2. `src/lib/codedCards/registry.ts` — introduce the versioned CardSpec schema and runtime registry.
3. `src/lib/codedCards.functions.ts` — split planner, copy, design-spec generation, and quality repair.
4. `src/lib/codedCards/CodedCard.tsx` — become the single version-aware `CardRenderer`.
5. `src/lib/codedCards/AISnippet.tsx` — keep only as the legacy/custom-code adapter.
6. `src/routes/card.$id.tsx` — use the shared renderer and own persistent recipient actions.
7. `src/lib/codedCards/exportHtml.ts` — replace divergent rendering with the shared spec pipeline.
8. Supabase migrations — add card spec version, immutable build versions, quality result, and publish status.

## Product Decision Rule

Do not add more generated templates until the canonical corpus proves the current runtime is improving publish rate and recipient response. The platform becomes valuable through reliable taste and iteration, not through the number of effects it can produce.
