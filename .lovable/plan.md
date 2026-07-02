# Enhance the coded-card generation prompt

The current `CODE_SYSTEM` prompt in `src/lib/codedCards.functions.ts` gives the model three concrete references that all share the same layout (centered stack, serif headline, subtle background motion). The model pattern-matches those references and returns look-alikes regardless of occasion. We need to force real compositional variety and raise the craft bar.

## What to change (single file: `src/lib/codedCards.functions.ts`)

### 1. Reframe the role
Rewrite the ROLE section to position the model as a senior motion designer building a one-of-one piece, with an explicit anti-pattern list: "no generic centered serif + drifting particles, no rainbow confetti dump, no default sans stacks, no lorem-ipsum motion."

### 2. Add a required "design move" taxonomy
Introduce ~10 named compositional systems the model must pick from and commit to, e.g.:
- Poster grid (rule-of-thirds anchor, oversized numeral/glyph)
- Editorial split (left type / right generative field)
- Wordmark-as-hero (phrase IS the composition, motion inside letters)
- Cinema letterbox (bars, wide type, single hero motion)
- Ticker / marquee (kinetic band + still headline)
- Constellation (sparse points + connective geometry)
- Ink / watercolor bloom
- Ribbon / silk sweep
- Confetti/particle burst (only for celebration occasions, and only if it feels bespoke)
- Type-only ASCII/monospace grid

Instruct the model to select ONE at random-but-appropriate for the occasion, name it in a comment on line 1, and design to it.

### 3. Add a variation seed rule
Use the `seed` input to deterministically pick composition, accent choice, direction, and easing. Explicitly forbid always defaulting to centered flex layout.

### 4. Raise typography rules
- Allow (and encourage) mixing serif headline with a mono or geometric-sans supporting label.
- Encourage numerals, dates, ordinal markers ("№", "vol."), tracked-out small caps, drop caps.
- Discourage always using Instrument Serif; add fallbacks like Fraunces, Canela-ish "Cormorant Garamond", and system-ui for mono where appropriate.

### 5. Replace the three references
The current references leak into every output. Replace with:
- ONE minimal skeleton (mount + cleanup + resize pattern only, no styling opinions).
- A short "anti-examples" list in prose ("do NOT return this shape…") to steer away from the current sameness.
- 2 short *contrasting* micro-references (≤15 lines each) that use very different layouts (e.g. one editorial split, one wordmark-as-hero) so the model sees range instead of a template.

### 6. Tighten the self-check
Add explicit checks:
- "If I swapped the phrase for another occasion's phrase, would this still look bespoke? If yes, redesign."
- "Am I using more than 60% of the canvas as empty background? Good."
- "Did I commit to ONE motion idea, or did I hedge with two?"

### 7. Mirror the changes into `EDIT_SYSTEM`
Same anti-sameness clause, same taxonomy vocabulary, so edits don't regress to the default centered layout.

### 8. Enrich the user brief
In `generateCodedCard`, extend the user message sent to the model with:
- A `DESIGN MOVE` slot (blank → model picks; or derived from motionHint)
- A `VARIATION SEED: <seed>` line
- A `AVOID` line listing patterns already common ("centered serif with drifting circles behind")

## Out of scope
- No changes to templates, registry, sandbox, or UI.
- No new server functions or schema changes.
- Model selection and Lava plumbing untouched.

## Verification
- Typecheck.
- Manually generate 3 cards on `/create` in Code mode with different occasions (birthday, thank you, condolence) and confirm the outputs use visibly different compositions rather than the same centered-serif-with-background-motion shape.
