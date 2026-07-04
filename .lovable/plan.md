# Landing revamp — Paper & Ink, cinematic

Rebuild `src/routes/index.tsx` to match the selected "Cinematic — Centered with drifting cards" direction. Locked palette: `#F5F3EE` bg, `#E8E4DD` surface, `#2D2D2D` ink, `#C4654A` coral accent (used sparingly). Locked type: EB Garamond (italic for emotional beats) + Inter for UI/body.

## What changes

**Only `src/routes/index.tsx`** (plus fonts + one token addition). No backend, no routes, no data changes. Existing `/create` flow, SiteNav, footer, and site colors elsewhere are untouched.

## Sections (top → bottom)

1. **Hero (min-h-screen, centered)**
   - Soft coral + cream blurred blobs, top-left and bottom-right, at ~20% opacity, slow pulse (respects `prefers-reduced-motion`).
   - Small uppercase eyebrow — "The unhurried e-card".
   - Display headline (EB Garamond italic, ~5xl→7xl): "Words that linger, / delivered by Pigeon." — animates in word-by-word on load.
   - Inline composer pill (surface `#E8E4DD` outer, cream inner, ink send button that flips to coral on hover). Keeps the existing behavior: textarea with rotating placeholder from `ROTATING`, Enter submits to `/create` with the prompt. Small "Art · Code · Enter to send" caption below.
   - Below the composer, the **drifting card stack** (3 cards, slow float loops, staggered rotation): back card ghosted, middle card with a coral hairline + quiet line "The light between the pines…", front card with coral dot + "Pigeon 002" and an italic sample message.

2. **Three-step "How it works" band** (bg `#E8E4DD`, generous py)
   - 3-column grid: `01. Compose / 02. Curate / 03. Deliver` — coral italic eyebrows, italic serif titles, muted body copy. Scroll-triggered fade+rise (`IntersectionObserver`, once, 24px, 0.7s, cubic-bezier(.22,1,.36,1)).

3. **"Designed for depth" feature block**
   - Centered italic serif heading + coral hairline underline. Single wide card: cream surface, coral-tinted icon, headline + support copy. Reads like an editorial pull-quote panel.

4. **Final CTA** (bg ink `#2D2D2D`, cream text — the one dark band on the page)
   - Big italic serif line: "Send something lovely." Coral pill button → `<Link to="/create">Compose your first Pigeon</Link>`. Small uppercase caption underneath.

5. **Footer** — unchanged from current.

## Technical notes

- Import EB Garamond + Inter via `<link>` in `src/routes/__root.tsx` (Tailwind v4 rule — no CSS `@import` of remote URLs).
- Add a `--font-serif-display` token in `src/styles.css` `@theme` mapped to EB Garamond so we don't inline `style={{ fontFamily }}` everywhere.
- Colors: use existing semantic tokens where they already match Paper & Ink; only add a coral token if the current accent doesn't match `#C4654A`. Never hardcode hex in components — read a quick check of `src/styles.css` first and reuse existing tokens.
- Motion: two small keyframes (`pgn-float-a/b/c` for card drift, headline word-reveal via CSS delay). No new dependencies. `motion/react` not required for this scope.
- Reuse `SiteNav` and keep the `useTypewriter` + `ROTATING` composer behavior verbatim.
- Head: keep existing route head; nothing to change unless it still has placeholder metadata.

## Out of scope

- No changes to `/create`, chat flow, auth, cards data, or any other route.
- No new components/files split out yet; keep it in `index.tsx` since the section is self-contained (< ~350 lines).
- Follow-up (from earlier open question about "Art medium should auto-generate image") is **not** included here — separate task.

Ready to build on approval.
