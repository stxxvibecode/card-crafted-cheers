## Plan: make coded-card outputs visibly vary

1. **Always generate custom AI code for Code mode**
   - Stop defaulting to the small built-in template set when the user chooses Code.
   - Use AI mode as the default for new coded cards so the model can create unique layouts instead of repeating template families.

2. **Add a real variation brief to every code generation**
   - Generate a server-side `variationProfile` from the seed with explicit constraints: design move, alignment, type pairing, motion motif, density, and composition anchor.
   - Pass that profile into the AI prompt so each run has a concrete, different direction instead of a vague “vary it” instruction.

3. **Strengthen the self-check beyond the `// MOVE` line**
   - Detect repeated layout signatures, not just repeated move names.
   - Flag patterns like centered typography, same headline position, same message placement, same particle field, same font stack, and same SVG-circle motif.
   - If the output repeats, retry once with a forced new profile.

4. **Track recent coded-card signatures per occasion**
   - Keep recent design moves plus layout signatures in the existing server-side LRU cache.
   - Prevent the last few “Thank you” cards, for example, from reusing the same structure.

5. **Make “rebuild” feel like a fresh direction**
   - For new builds, request a fresh composition.
   - For edits, preserve the existing design only when the user asks for a small tweak; if they say “different,” “more variation,” or rebuild from chat/editor, allow a full redesign.

6. **Verify with generated samples**
   - Run a few coded-card generations for the same prompt and confirm their move/layout signatures differ.
   - Keep the fix focused on code-card variety only; no unrelated UI or database changes.