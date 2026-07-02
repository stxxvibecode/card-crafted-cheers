## Goal
Rebuild the coded-card generator around your new product spec: think product designer + front-end engineer + motion designer + copywriter. Keep the live-editing function-body contract, add a required tap-to-open opening beat, and add a one-click "Export as HTML" that produces a real standalone `.html` file.

## 1. New AI card-builder prompt
File: `src/lib/codedCards.functions.ts`

Rewrite `CODE_SYSTEM` and `EDIT_SYSTEM` around your spec, but keep the existing runtime contract `(container, phrase, message, palette, tempo, seed)` so previews, edits, and share URLs keep working.

New prompt sections:
- **Role**: product designer + front-end engineer + motion designer + copywriter.
- **Job**: turn a short user idea into a polished, coded e-card; infer missing details with tasteful defaults; do not over-ask.
- **Every card includes**: clear occasion, personalized message, strong visual direction, mobile-first layout, meaningful opening beat, lightweight animation, clean semantic DOM, shareable final state (persistent end frame).
- **Design principles**: personal, modern, emotionally intentional; no generic clichés unless requested; animation for delight not distraction; readability and spacing first; strong emotional payoff on reveal.
- **Technical rules (adapted to runtime)**: browser-only DOM/SVG/Canvas/CSS; responsive via `%`, `vmin`, `clamp()`; WCAG-legible contrast against `palette[0]`; semantic elements; ≤ 5500 chars; ease into a seamless loop, then land on a legible still frame.
- **Keep** the existing Design Move taxonomy + anti-pattern clause + seed-driven variation (recent work already there).

Also update the user-brief the handler assembles so every request passes: OCCASION, PERSONAL MESSAGE, HEADLINE, PALETTE, TEMPO, MOBILE-FIRST reminder, and the tap-to-open note.

## 2. Tap-to-open opening beat
The recipient always sees a "tap to open" gate on the share page; creator preview autoplays so iteration stays fast.

- New `src/lib/codedCards/OpeningGate.tsx`: renders a sealed-envelope / wax-seal panel with a large tap target ("Tap to open") and calls `onOpen` on click/keydown. Uses palette accent, `Instrument Serif`, respects `prefers-reduced-motion`.
- `src/lib/codedCards/CodedCard.tsx`: add `awaitTap?: boolean` prop. When `awaitTap && !opened`, render `<OpeningGate palette={spec.palette} />` above the animation; only mount the template/`AISnippet` after tap. This gives all templates (named + AI) a consistent opening beat without touching each template.
- `src/routes/card.$id.tsx`: pass `awaitTap` for `medium === "code"`.
- `src/routes/create.tsx`: leave the editor preview autoplaying (`awaitTap={false}`).

## 3. Export as HTML
Function-body stays the live-edit format; export wraps it into a full self-contained document.

- New `src/lib/codedCards/exportHtml.ts`: `buildStandaloneHtml(spec, { recipientName, senderName })` returns a `<!doctype html>` string with:
  - `<meta viewport>`, title = `A card for {recipient}`, dark-safe background from `palette[0]`.
  - Inlined CSS: full-viewport `#card`, `@font-face`-free system serif fallback, `prefers-reduced-motion` guard.
  - Inlined tap-to-open overlay (same copy as `OpeningGate`) that reveals `#card` on click, then executes the animation script — mirrors the recipient experience exactly.
  - For `template: "ai"`: wraps `spec.source` in `new Function(...)` with the same 6-arg contract, plus the same forbidden-token sanitizer used by `AISnippet`.
  - For the six built-in templates: embed the raw template source that `registry.ts` already exposes via `?raw`, wrapped in the same runner.
- New route action on `src/routes/card.$id.tsx`: "Download HTML" button next to the copy-link button. Creates a `Blob([html], { type: "text/html" })`, `URL.createObjectURL`, triggers download as `pigeon-card-{shortId}.html`. Client-only guard (`typeof window`).
- Also expose the same button on `/create` in the right-rail Code toggle so senders can grab the file mid-iteration.

## 4. Small polish
- Prompt now explicitly requires the animation to end on a still, legible frame (the "shareable/reusable final state" line).
- Add a one-line hint under the tap-to-open panel: "For {recipient}" when a name is known.
- Toast on successful download: "Saved as pigeon-card-{shortId}.html".

## Out of scope
- No backend/DB changes; `code_spec` already carries everything needed for export.
- No changes to the model-routing (already flowing through the ModelPicker).
- No changes to art-mode cards.

## Technical details
- The forbidden-token sanitizer lives in `AISnippet.tsx`; extract to `src/lib/codedCards/sanitize.ts` and share with the export helper so the exported HTML enforces the same safety rules.
- `OpeningGate` and the export overlay share copy + palette logic via a tiny helper (`gateCopy(recipient?)`).
- Keep bundle small: no new deps.
- Verify: build passes; open a share URL and confirm the gate appears; click, animation plays; click "Download HTML"; open the downloaded file locally and confirm the gate + animation both work offline.
