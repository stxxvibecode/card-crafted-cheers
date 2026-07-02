## Goal

Rewrite `CODE_SYSTEM` (and mirror in `EDIT_SYSTEM`) in `src/lib/codedCards.functions.ts` so the model reliably ships polished, on-brief animated cards instead of generic particle demos.

## Why the current prompt underperforms

- It describes the API and rules, but never tells the model *how to think* about a greeting card as a designed artifact.
- No compositional guidance (layout, hierarchy, focal point, negative space).
- No motion vocabulary — model defaults to "floating dots".
- No occasion-aware direction — a birthday and a condolence card come out the same.
- References are generic (drifting particles, kinetic words) so the model copies that ceiling.
- No self-check before returning.

## New prompt structure

The replacement `CODE_SYSTEM` has 6 short sections in this order:

1. **Role** — "You are a generative designer shipping a single hand-crafted animated greeting card. Treat every card as a bespoke poster with motion, not a screensaver."
2. **Invocation contract** — unchanged (`container, phrase, message, palette, tempo, seed`), plus one line: *"Read the concept, occasion and message carefully; the visual must feel authored for THIS message, not a generic template."*
3. **Design directives** (bulleted, concrete):
   - One clear focal composition: hero phrase locked to a deliberate anchor (centered, lower-third, offset diagonal, etc.). Pick one, commit.
   - Establish hierarchy: phrase (serif, clamp 2.5–5rem, tight tracking) → message (clamp 0.95–1.25rem, 36ch, italic, 70–85% opacity) → motion layer behind/around, never on top of text.
   - Use the palette intentionally: `palette[0]` = full-bleed background; pick ONE accent as dominant, others as support. No rainbow soup.
   - Negative space is a feature. Fewer, larger, more considered elements beat 200 particles.
   - Motion must *mean* something for the occasion (see occasion vocabulary below). Loop seamlessly; ease in on mount (600–1200ms) then settle.
   - Respect `tempo` as the master speed multiplier for every animation.
4. **Occasion vocabulary** (short table the model can pattern-match):
   - Birthday → confetti bursts, candle flicker, balloon rise, warm accents
   - Anniversary / Love → paired orbits, heart bloom, silk ribbon, blush/gold
   - Thank you → petals settling, soft ink bloom, calm serif fade, sage/cream
   - Congrats → firework arcs, rising sparks, ticker-tape, saturated jewel tones
   - Get well → slow starfield, breathing gradient, sunrise wash, muted teal
   - Condolence / Thinking of you → drifting light, single candle, gentle rain, ink wash, muted neutrals
   - Holiday → snow, garland, aurora — match the palette
   - Just because → surprise the reader; abstract generative
5. **Technical rules** (kept from current prompt, tightened):
   - Function body ONLY. No fences, no imports, no `eval`, no network, no storage.
   - Browser DOM/SVG/Canvas/CSS only. Use `requestAnimationFrame`; clean up on next frame naturally.
   - Fill the square container; use `%`, `vmin`, `clamp()` — never fixed pixels for layout.
   - Serif family for phrase: `'"Instrument Serif", "Cormorant Garamond", Georgia, serif'`.
   - Contrast check: if `palette[0]` is light, phrase must be dark, and vice versa.
   - Under 5500 chars. No strobe / >4Hz flashes.
6. **Self-check before returning** (one line):
   > Before finishing, silently verify: (a) phrase and message are both legible, (b) motion loops without popping, (c) the composition would read as a *card for this specific occasion* if the motion were paused.

## References

Replace the two current reference bodies with **three** shorter, higher-quality references that show:
- A **composition-first** layout (poster-style, motion is background) instead of "canvas full of dots".
- A **kinetic type** example where the phrase itself animates in with staggered word reveals and a settled resting state.
- A **generative accent** example (e.g. a single expanding ink bloom or ribbon curl behind the text) — one hero motion, not many.

Each reference stays ≤40 lines and is prefaced with: *"Reference only — calibrate quality, do not copy."*

## `EDIT_SYSTEM` mirror

Update `EDIT_SYSTEM` with the same design directives (condensed) and add:
- "Change ONLY what the sender asked for. Preserve composition, motion identity, and palette unless the request implies otherwise."
- "If the request is ambiguous (‘make it nicer’), improve hierarchy and negative space; do not rebuild from scratch."

## User-prompt template (the `user` string sent alongside the system prompt)

Currently we pass a bag of key/value lines. Restructure to a short brief:

```
OCCASION: <occasion or "unspecified">
CONCEPT: <prompt or "sender did not elaborate">
HEADLINE (render large): "<phrase>"
MESSAGE (render smaller, wrapped, may be empty): """<message>"""
PALETTE (bg first): <json>
TEMPO: <n>
MOTION DIRECTION: <motionHint or "designer's choice — pick one intentional motion for this occasion">
```

This mirrors how a designer receives a brief and measurably improves adherence to occasion + message.

## Scope

Single-file edit: `src/lib/codedCards.functions.ts` (rewrite `CODE_SYSTEM`, `EDIT_SYSTEM`, and the two `user` string builders in AI-mode and rewrite-path). No schema changes, no UI changes, no new dependencies.

## Out of scope

- Model selection (already user-controlled via ModelPicker).
- Template registry changes.
- Adding a second AI pass / critique loop (possible follow-up if quality still lags).
