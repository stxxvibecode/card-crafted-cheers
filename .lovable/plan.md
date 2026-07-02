## Problem
In `/create`, the composer footer packs the medium toggle (Art/Code), ModelPicker, and Plan/Build dropdown into one row alongside the submit button. On mid-width viewports the row overflows and the submit (send) button gets clipped at the right edge — matching the annotation.

## Fix (frontend-only, `src/routes/create.tsx`, PromptInputFooter around L816–857)

1. Make the footer wrap gracefully:
   - Change `PromptInputFooter` classes to `flex-wrap justify-between gap-2` and add `w-full` on the left control group so it can wrap to its own row when space is tight.
   - Add `shrink-0` to `PromptInputSubmit` so it's never squeezed/clipped.
2. Tighten the left group so it fits on one row at typical widths:
   - Add `flex-wrap` to the left control container.
   - Truncate the ModelPicker label (already ellipsizes at ~12ch) and give the Plan/Build `<select>` a `min-w-0`.
3. Verify with Playwright at 1177px (current viewport) that Send is fully visible and clickable, and re-check at 768px that controls wrap cleanly without clipping.

No backend or logic changes.
