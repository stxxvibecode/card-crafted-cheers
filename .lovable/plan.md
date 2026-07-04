## Plan: create a `premium-site-project` skill from the pasted CLAUDE.md

The pasted content is a full skill body (tone, stack defaults, hero/motion/typography/color rules, Nano Banana + Kling prompt patterns, 6-phase build workflow, anti-patterns). It's situational — only relevant when building premium marketing/agency sites — so a skill is the right shape (not always-on knowledge).

### Files to create

1. **`.agents/skills/premium-site-project/SKILL.md`**
   - YAML frontmatter:
     - `name: premium-site-project`
     - `description: Build premium, motion-driven marketing sites with an agency feel — Next.js + Tailwind + Motion defaults, editorial typography, video/image hero patterns, Nano Banana 2 image prompts, Kling motion prompts, and a 6-phase build workflow. Trigger when the user is designing or building a landing page, hero section, agency-style site, or asks for premium visual/motion direction.`
   - Body: the full pasted CLAUDE.md content, lightly cleaned:
     - Drop the top "Drop this file in the same folder…" meta paragraph (it's install instructions for the human, not skill content).
     - Keep everything else verbatim: tone rules, default stack, hero patterns, Motion snippets, typography table, color palette, 21st.dev workflow, 6-phase build, reference-site handling, deploy steps, anti-patterns, file structure, comment tone.
     - Preserve all code blocks exactly.

### Activation

2. Call `skills--apply_draft` with `.agents/skills/premium-site-project` so the skill becomes active and surfaces automatically on relevant tasks.

### Not doing

- No changes to the current app (Pigeon card project) — this is skill authoring only.
- Not creating references/, scripts/, or assets/ subfolders; the content fits comfortably in one SKILL.md.
- Not fixing the earlier open question about Art medium auto-generating an image — happy to revisit that in a follow-up.
