---
name: premium-site-project
description: Build premium, motion-driven marketing sites with an agency feel — Next.js + Tailwind + Motion defaults, editorial typography, video/image hero patterns, Nano Banana 2 image prompts, Kling motion prompts, and a 6-phase build workflow. Trigger when the user is designing or building a landing page, hero section, agency-style site, or asks for premium visual/motion direction.
---

# Premium Site Project

## What this project builds

Modern, motion-driven websites with a premium agency feel. Editorial typography, scroll-triggered animations, video-first or image-first heroes, restraint over decoration. The output should look like a $2k+ client site — not a template.

## Tone for explaining things to the user

The person you're helping may be brand new to web design. Talk to them like a smart friend, not a tutorial.

- **Plain English first.** No jargon dropped without a one-line explanation.
- **Concrete over abstract.** Show what something does with a real example, not a definition.
- **One step at a time.** If a task has multiple parts, walk through them in order. Don't dump everything in one paragraph.
- **Reassure on errors.** If something goes wrong, say what's likely happening before listing fixes.
- **Skip the filler.** Get to the action.

When you must use a technical word (registry, dependency, build, deploy), explain it in the same line, in parentheses.

## Default stack

- **Next.js (App Router)** for new projects, plain HTML+CSS+JS for one-pagers
- **Tailwind CSS** for styling
- **Motion** library for all animations (`npm install motion`)
- **TypeScript** when the project has more than 3 files
- **Vercel** for deployment (free tier covers personal projects)

If the user asks for a different stack, follow them. Otherwise default to the above.

## Skills to use proactively

When relevant, use the skills the user installed (official ones from the "+" inside Claude Code; community ones like `ui-ux-pro-max` by pasting their GitHub link in the chat):

- `frontend-design` — sharpens the actual look: spacing, type, polish
- `ui-ux-pro-max` — a real range of layouts and palettes, so sites don't look templated
- `superpowers` — a disciplined way of working
- `skill-creator` — for building a new skill when the project needs one

If a skill isn't installed, suggest the user install it. Don't refuse the task without it.

## Visual generation prompts (Nano Banana 2 / Google AI Studio)

When the user wants a hero image, an illustration, or any visual asset, **don't ask them to write the prompt themselves**. Write it for them.

The user gives a casual brief in one line ("a perfume bottle floating mid-air, soft blurred background"). Take that and expand it into a complete prompt with:

- **Subject** — what's the focal object
- **Lighting** — direction, hardness, color temperature
- **Mood** — cinematic, editorial, gritty, soft
- **Composition** — rule of thirds, centered, off-center, depth of field
- **Aspect ratio** — 16:9 for hero, 1:1 for square, 9:16 for mobile-vertical
- **Style cues** — "cinematic film still", "editorial photography", "matte 3D render"

Hand the user the full prompt. They paste it into Google AI Studio with Nano Banana 2 selected and generate 3–4 variations.

**Settings vs prompt** — important. Aspect ratio and resolution are controlled by the **right-side panel** in Google AI Studio, not by the prompt. Always remind the user to:

1. Set the **aspect ratio** in the right-side panel (16:9 hero, 1:1 square, 9:16 vertical) to match the prompt
2. Bump **resolution to 4K** for premium output (the default is lower)

Keep the aspect ratio in the prompt too — it's a hint the model honors better when reinforced — but the selector is what actually controls the output dimensions.

## Motion / video prompts (Kling AI)

Same pattern for animating a still into a video.

The user uploads an image to Kling. You write the **motion prompt** with:

- **One motion only** per prompt (multiple motions confuse the model)
- Duration: 5 seconds, looped
- Camera move described in plain words (slow push-in, gentle pan-right, subtle parallax)
- "Make it loop" explicitly stated

For more ambitious shots (scene morph, start frame + end frame), tell the user about Kling's "Image-to-Video with End Frame" feature and have them generate a second image to use as the end frame. Then you stitch the clips together inside the project — no external editor needed.

## Hero section guidelines

The hero is the first 100% of the viewport. It carries the entire feel of the site.

**Default approach:**

1. Use a video background (looped, muted, autoplay) when one is provided
2. If no video, use an animated gradient or a single high-quality image with subtle motion
3. Always add a 25–35% dark overlay between the background and the foreground text for readability
4. Headline: 5–9 words max, large display font, tight letter spacing
5. One CTA button only. Never two competing ones.

**Video hero pattern (preferred):**

```jsx
<section className="relative h-screen w-full overflow-hidden">
  <video autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover">
    <source src="/hero.mp4" type="video/mp4" />
  </video>
  <div className="absolute inset-0 bg-black/30" />
  <div className="relative z-10 flex h-full items-center justify-center">
    {/* headline + CTA */}
  </div>
</section>
```

If the user supplies a `.gif` instead of `.mp4`, use an `<img>` or `<picture>` tag and apply the same overlay.

## Motion guidelines

Use the **Motion** library (modern successor to Framer Motion). Import as `import { motion } from "motion/react"`.

**Default scroll-triggered fade-in:**

```jsx
<motion.div
  initial={{ opacity: 0, y: 24 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: "-100px" }}
  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
>
  {/* section content */}
</motion.div>
```

**Rules:**

- Subtle over loud. 24px translation max, 0.6–0.8s duration.
- Always `viewport={{ once: true }}` so animations don't replay on scroll-back.
- Respect `prefers-reduced-motion`.
- Animate `transform` and `opacity` only (never layout properties) for performance.

**Patterns to reach for:**

- Slow camera push-in on hero video (handled in the video file, not in CSS)
- Letter-by-letter or word-by-word headline reveal on first paint
- Parallax on hero background image (`useScroll` + `useTransform`)
- Cursor follower for premium feel (small accent dot, not loud)

If the user says the motion feels too fast or jerky, slow it down (raise duration to 1–1.2s) and soften the easing (`ease: [0.22, 1, 0.36, 1]` for a cinematic feel).

## Typography

Default pairings (ask the user if unsure):

| Vibe | Heading font | Body font |
|---|---|---|
| Modern tech | Geist | Inter |
| Editorial | GT Sectra / Tiempos | Söhne |
| Vintage / heritage | GT America Extended | Söhne |
| Minimalist Swiss | Helvetica Now | Inter |
| Playful brand | Migra / Migra Italic | Inter |

Load fonts via `next/font` (Next.js) or the official font CDN. Never load 6 weights when 2 will do.

**Default sizes:**

- Display headline: 72–96px desktop, 40–48px mobile
- Section heading: 40–56px desktop, 28–32px mobile
- Body: 16–18px desktop, 16px mobile, line-height 1.55–1.65

## Color palette

Default to **dark mode premium** unless the user asks otherwise:

- Background: `#0A0A0F` (near-black, never pure black)
- Surface: `#13131A`
- Text primary: `#F5F5F0` (warm white)
- Text muted: `#9C9CA8`
- Accent: ONE saturated accent (cyan, magenta, lime, amber). Never two competing accents.

**Light mode premium:**

- Background: `#F8F7F4` (warm off-white, never pure white)
- Surface: `#FFFFFF`
- Text primary: `#0A0A0F`
- Text muted: `#5A5A66`

## Components

Prefer importing over building from scratch. Default registry:

- **21st.dev** ([21st.dev](https://21st.dev)) — premium React/Tailwind components: contact forms, marquees, footers, pricing tables, animated buttons, hover effects.

**Workflow** when the user wants a form, a marquee, a footer, a pricing table:

1. Have them browse 21st.dev for the piece they like
2. Tell them to copy the component prompt (the block of text 21st.dev gives them via the copy button)
3. They paste it into Claude with a natural sentence ("use this card for the 'How we work' section")
4. Restyle the component to match the project's palette and font
5. Encourage **remix**: if they loved a button glow on one component, apply that glow to a button on another. Components are inspiration material, not locked-in templates.

## Build process (6 phases)

Walk the user through these phases when starting a new build:

1. **Reference** — collect 5–8 reference assets from Pinterest, Behance, MotionSites, Dribbble
2. **Setup** — install the Claude app + Claude Code, add the design skills
3. **Visuals + Motion** — generate the hero image with Nano Banana 2, animate it with Kling
4. **Build** — three focused rounds: structure → motion → polish. **The order is flexible.** If the hero visual is the centerpiece of the brand, anchor the whole structure around it from the start.
5. **Components** — import from 21st.dev, remix freely
6. **Deploy** — push to Vercel. Free tier, one conversation.

Don't try to do all phases in one prompt. Each one is a separate conversation. Inside Phase 4, the "three rounds" pattern (structure first, motion second, polish last) gives Claude a chance to get the bones right before fancy details.

## When the user shows you a reference site

If they paste a screenshot or URL of a site they like:

1. Identify 3 specific things you can replicate (the hero motion, the typography stack, the section spacing)
2. Confirm with the user which 3 they want copied
3. Build only those 3, not a 1:1 replica (legal + brand reasons)

## Deploying

When the user is ready to put the site online:

1. Tell them to sign up at [vercel.com](https://vercel.com) (free, no card needed)
2. Offer to deploy for them: *"I can connect this project to Vercel and put it online. You'll just need to click 'yes' on Vercel a couple of times when it asks for permission."*
3. After the first deploy, every change can be redeployed with a single *"redeploy"* in chat — no manual uploads.

## Anti-patterns (don't do these)

- ❌ Bootstrap, Material UI, jQuery
- ❌ Generic Tailwind starter templates copied wholesale
- ❌ Stock photo backgrounds (use AI-generated)
- ❌ Two competing CTAs in the hero
- ❌ Carousels with auto-play (kill conversion + accessibility)
- ❌ Pop-ups before the user has scrolled
- ❌ Loading spinners longer than 1 second
- ❌ Animations on every element
- ❌ More than 3 fonts on a single page
- ❌ Hero text smaller than 40px on desktop
- ❌ Pure black `#000000` or pure white `#FFFFFF` backgrounds

## File structure (Next.js App Router default)

```
project/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── hero.tsx
│   ├── about.tsx
│   ├── footer.tsx
│   └── ui/        ← imported from 21st.dev
├── public/
│   ├── hero.mp4
│   └── og-image.jpg
├── tailwind.config.ts
└── package.json
```

Keep components small. One file per section. If a section grows past 80 lines, split it.

## Tone for code comments

- Short. One line max per comment.
- Only when the WHY isn't obvious from the code itself.
- Never explain WHAT the code does (the code already does that).
