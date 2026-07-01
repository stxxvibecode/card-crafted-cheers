
## Goal
Give senders a choice between **Art** (current AI illustration) and **Code** (a live animated card that runs in the browser). Chat + editor both expose the toggle, and the recipient sees whichever medium was chosen playing live on the share page.

## Data
Add two columns to `public.cards`:
- `medium text not null default 'art'` — `'art' | 'code'`.
- `code_spec jsonb` — the parameters used to render a coded card (template + colors + phrase + tempo, or a raw AI snippet). `image_url` stays nullable for coded cards.

Migration also relaxes existing `image_url` to nullable. RLS/GRANTs unchanged.

## Coded card system (`src/lib/codedCards/`)
Hybrid = 6 hand-built templates + one AI "surprise me" path.

Templates (each a small React component taking `{ phrase, palette, tempo, seed }`):
1. `Confetti` — falling paper, phrase center.
2. `Fireworks` — canvas bursts on a night sky.
3. `KineticSerif` — Instrument Serif phrase animates in word-by-word with soft gradient wash.
4. `FloatingHearts` — SVG hearts drifting up.
5. `Starfield` — parallax stars, phrase fading in.
6. `RibbonsBloom` — animated SVG ribbons + florals wrapping the phrase.

Each template is pure, self-contained, uses `requestAnimationFrame` or CSS keyframes, and accepts a `seed` for reproducibility. Exported via a `TEMPLATES` registry with metadata (`id`, `name`, `defaultTempo`, `suggestedPalettes`, `bestFor: occasion[]`).

A `CodedCard` renderer component takes a `code_spec` and mounts the right template, or an `AISnippet` when `template === 'ai'`.

## AI-generated snippet path
New server fn `generateCodedCard` in `src/lib/codedCards.functions.ts`:
- Input: `{ prompt, occasion, phrase, mode: 'template' | 'ai' }`.
- `mode: 'template'`: Gemini (`google/gemini-3-flash-preview`) picks a template id + palette (3-5 hex) + tempo from the registry, using AI SDK `Output.object` with a tight schema (enum of template ids, hex regex removed to stay within Gemini's structured-output limits — validated in code instead).
- `mode: 'ai'`: Gemini returns a **self-contained JSX string** that renders a React component named `Card` using only React + inline styles + SVG/canvas + `requestAnimationFrame`. No imports, no network, no `eval`, no `dangerouslySetInnerHTML`. Prompt makes the constraints explicit.

Output shape stored in `code_spec`:
```
{ template: 'confetti' | ... | 'ai', palette: string[], phrase: string, tempo: number, seed: number, source?: string }
```

## Sandboxed AI snippet execution
`<AISnippet source={...} palette phrase tempo seed />`:
- Renders inside an `<iframe sandbox="allow-scripts">` with `srcDoc` containing a minimal HTML shell that loads React from a pinned CDN and mounts a `Card` compiled from the snippet via Babel standalone (also CDN). No same-origin, no parent access.
- Height fixed to the preview square; postMessage only used to signal render errors so the parent can fall back to a template.

This keeps arbitrary AI code off the app origin (no cookies, no `window.parent`, no fetch to our backend).

## Chat + editor UX (`src/routes/create.tsx`)
- Add `medium: 'art' | 'code'` to `Draft`, default `'art'`.
- Preview area swaps between `<img>` (art) and `<CodedCard />` (code). Message + recipient row unchanged.
- New segmented control above the preview: **Art · Code**. Flipping to Code triggers `generateCodedCard({ mode: 'template', ... })` if no spec yet.
- In Code mode, small chips: template picker (6 + Surprise me), palette shuffle, tempo slider. "Surprise me" calls `generateCodedCard({ mode: 'ai' })`.
- Chat: extend `chatCard` schema with `medium` and `codeSpec` in `updates`. System prompt teaches Pigeon to switch medium on intent ("make it playful/animated/coded/interactive" → code; "painted/illustrated" → art) and to describe changes conversationally. When Pigeon sets `medium: 'code'` and no spec, the client calls `generateCodedCard` with the chosen template hint from Pigeon.
- Occasion phrase reuse: the same phrase map already built for art (`Thank You`, `Happy Birthday`, …) becomes `phrase` for coded cards. Users can override in the editor.

## Save + share
- `saveCard` accepts `medium` + `codeSpec`; `imageDataUrl` optional when medium is `code`.
- `card.$id.tsx` renders `<CodedCard />` when `medium === 'code'`, else the existing image. Share page auto-plays.
- Email delivery unchanged (still returns share link; live animation lives at the URL).

## Out of scope
- Server-side video/gif capture of coded cards.
- Persisting AI-authored snippets across schema changes (kept per-card, no library).
- Sound/audio.

## Technical notes
- Templates live in `src/lib/codedCards/templates/*.tsx` — pure client components, no server imports.
- `generateCodedCard` uses AI SDK + existing `createLovableAiGatewayProvider`; template-mode uses `Output.object` with a small enum, AI-mode returns plain text.
- iframe shell uses pinned versions of `react@19`, `react-dom@19`, and `@babel/standalone` from a CDN; snippet size capped at 8 KB and stripped of `<script>`, `import`, `require`, `fetch`, `XMLHttpRequest`, `window.parent` before execution as defense in depth.
- No new dependencies in the main app bundle (Babel/React only load inside the sandbox iframe).
