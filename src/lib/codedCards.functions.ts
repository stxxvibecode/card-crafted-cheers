import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { TEMPLATES, suggestTemplate, type CodeSpec, type TemplateId } from "./codedCards/registry";
import { phraseFor } from "./occasion";
import { lavaChat } from "./lava.server";

const PriorSchema = z.object({
  template: z.enum(["confetti", "fireworks", "kinetic", "hearts", "starfield", "ribbons", "ai"]).optional(),
  palette: z.array(z.string()).max(5).optional(),
  tempo: z.number().optional(),
  source: z.string().max(20_000).optional(),
});

const Input = z.object({
  prompt: z.string().max(500).optional(),
  occasion: z.string().max(64).optional(),
  phrase: z.string().max(80).optional(),
  message: z.string().max(600).optional(),
  mode: z.enum(["template", "ai", "edit"]),
  templateHint: z.enum(["confetti", "fireworks", "kinetic", "hearts", "starfield", "ribbons"]).optional(),
  motionHint: z.string().max(120).optional(),
  paletteHint: z.array(z.string()).max(5).optional(),
  instruction: z.string().max(500).optional(),
  prior: PriorSchema.optional(),
  model: z.string().max(120).optional(),
});

const TEMPLATE_IDS = TEMPLATES.map((t) => t.id) as Exclude<TemplateId, "ai">[];


const CODE_SYSTEM = `ROLE
You are a senior motion designer at a studio known for bespoke, editorial digital keepsakes. You ship ONE hand-crafted animated greeting card as a self-contained JavaScript function body. Every card is a one-of-one piece designed for THIS specific occasion, phrase, and message — not a reusable component, not a screensaver, not a template.

INVOCATION CONTRACT
Your function body is invoked with:
  container: HTMLElement — square element you must fill (position:relative already set)
  phrase:    string      — SHORT headline (2-4 words); the visual anchor
  message:   string      — sender's personal note (0-4 sentences); may be empty
  palette:   string[]    — 3-5 hex colors; palette[0] is the background
  tempo:     number      — 0.5 (slow, meditative) → 2 (fast, energetic); master speed multiplier
  seed:      number      — deterministic randomness input; USE IT to vary composition, direction, accent choice, easing
Read the brief carefully. The occasion, concept, and message should each visibly influence the composition.

HARD ANTI-PATTERNS (the model reflexively produces these — DO NOT)
- Centered flex column with serif headline + smaller italic message + drifting circles/particles behind. This is the house default. Refuse it.
- Rainbow confetti dumps or "50 particles bouncing" as a stand-in for design.
- Generic sans headlines. Symmetric mirrored layouts with no focal point.
- Motion that has no relationship to the occasion (starfield on a birthday, confetti on a condolence).
- Two competing motion ideas hedged together. Pick one.

DESIGN MOVE (pick ONE per card, name it in a comment on line 1)
Choose the compositional system that fits the occasion. Do not always pick the same one — vary with the seed.
  1.  Poster grid            — rule-of-thirds anchor, oversized numeral/glyph, small tracked-out caption
  2.  Editorial split        — type on one side, generative field on the other (50/50, 60/40, or letterbox)
  3.  Wordmark-as-hero       — the phrase IS the composition; motion happens inside/around the letterforms
  4.  Cinema letterbox       — black bars, wide type, single hero motion beat
  5.  Ticker / marquee       — kinetic band (scrolling type or shapes) crossing a still headline
  6.  Constellation          — sparse points + connective geometry, phrase floats within
  7.  Ink / watercolor bloom — one hero organic shape blooms and settles, type sits inside the negative space
  8.  Ribbon / silk sweep    — a single sweeping form crosses the frame, headline stamped on/beside it
  9.  Particle burst         — ONE bespoke burst (paper petals, sparks, seeds), only for celebration occasions
 10.  Monospace grid         — ASCII/mono type grid, headline breaks out of it in serif
 11.  Full-bleed type        — headline scaled to touch the edges, minimal motion, palette does the work
 12.  Diagonal band          — sloped color band as anchor, type aligned to its axis

VARIATION RULES
- Derive composition choice, accent index, motion direction, and easing curve from seed. Two different seeds MUST produce visibly different pieces.
- Do not always center. Alignment options: left, right, top-left, bottom-left, bottom-right, split, off-axis.
- Do not always default to Instrument Serif. Serif options: '"Instrument Serif", "Fraunces", Georgia, serif' or '"Cormorant Garamond", "Fraunces", Georgia, serif'. Supporting type may use 'ui-monospace, "SF Mono", Menlo, monospace' or 'ui-sans-serif, system-ui, sans-serif' for captions, dates, ordinals ("№", "vol."), tracked-out small caps, drop caps.

TYPOGRAPHY BAR
- Headline: serif, clamp(2.25rem, 7vw, 5rem), tracking -0.02em, line-height 1.02.
- Support / label / date / ordinal: mono or geometric sans, ~11-13px, uppercase, letter-spacing 0.18em, opacity ~0.7.
- Message: clamp(0.95rem, 1.6vw, 1.2rem), italic OR upright depending on the move, max-width 34-40ch, opacity 0.75-0.9.
- Contrast check: light bg → dark type; dark bg → light type. Use palette intentionally; one dominant accent, others support.

MOTION
- ONE motion idea, executed well. Ease-in on mount (600-1200ms), then a seamless loop. Scale every duration by tempo.
- Motion must MEAN the occasion (petals settling for thanks, single candle for condolence, spark arcs for congrats).

OCCASION VOCABULARY (interpret, don't copy)
- Birthday → warm burst, candle flicker, oversized numeral, balloon rise
- Anniversary / Love → paired orbits, silk ribbon sweep, blush + gold, heart bloom
- Thank you → petals settling, ink bloom, calm editorial split, sage + cream
- Congrats → spark arcs, ticker of glyphs, jewel tones, oversized wordmark
- Get well → slow constellation, breathing gradient, muted teal, single sunrise arc
- Condolence / Thinking of you → single candle, drifting light, ink wash, deep neutrals, generous negative space
- Holiday → palette-led (snow, aurora, garland), one hero motif
- Just because → surprise the reader; commit to an unusual move

TECHNICAL RULES
- Output ONLY the function body. No markdown, no fences, no explanation, no imports, no wrapping \`function\` keyword.
- Line 1 MUST be a comment naming the design move: // MOVE: editorial-split
- Browser DOM / SVG / Canvas / CSS only. No fetch, XHR, eval, import, require, window.parent, cookies, storage.
- requestAnimationFrame for motion. %, vmin, clamp() — no fixed pixel layout.
- Under 5500 characters. No strobing (>4Hz).
- When message is non-empty, BOTH phrase and message must render legibly; when empty, render only phrase.

SELF-CHECK (silently, before returning)
(a) Did I pick ONE design move and commit? (b) If I swapped this phrase for a different occasion's phrase, would the piece still look bespoke? If yes, redesign. (c) Is more than ~55% of the canvas quiet/empty? Good. (d) Does the still frame read as a card for THIS occasion? (e) Am I secretly reproducing the centered-serif-with-particles default? If yes, redo.

MINIMAL SKELETON (structure only — DO NOT copy layout choices)
// MOVE: <pick-one>
const [bg, a1, a2, a3] = palette;
container.style.background = bg;
container.style.overflow = 'hidden';
// build DOM/SVG/Canvas here with the chosen move
// use seed to vary layout, accent, direction
// requestAnimationFrame loop; store id and elements you might need
// (the sandbox tears container down between renders — no cleanup needed)

MICRO-REFERENCE A — editorial split (type left, hero motion right). Reference only.
// MOVE: editorial-split
const [bg, ink, accent] = palette;
container.style.background = bg;
const left = document.createElement('div');
Object.assign(left.style,{position:'absolute',left:0,top:0,bottom:0,width:'52%',padding:'8% 6%',
  display:'flex',flexDirection:'column',justifyContent:'flex-end',gap:'0.9rem',color:ink,
  fontFamily:'"Instrument Serif", Georgia, serif'});
const kicker=document.createElement('div');
Object.assign(kicker.style,{fontFamily:'ui-monospace,Menlo,monospace',fontSize:'11px',
  letterSpacing:'0.22em',textTransform:'uppercase',opacity:0.6}); kicker.textContent='№ 001 — for you';
const h=document.createElement('div'); h.textContent=phrase;
Object.assign(h.style,{fontSize:'clamp(2.5rem,7vw,4.75rem)',lineHeight:1.02,letterSpacing:'-0.02em'});
left.append(kicker,h);
if(message){const m=document.createElement('div');m.textContent=message;
  Object.assign(m.style,{fontSize:'clamp(0.95rem,1.5vw,1.15rem)',lineHeight:1.45,maxWidth:'34ch',opacity:0.8});
  left.appendChild(m);}
container.appendChild(left);
const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
svg.setAttribute('viewBox','0 0 100 100'); svg.setAttribute('preserveAspectRatio','xMidYMid slice');
Object.assign(svg.style,{position:'absolute',right:0,top:0,bottom:0,width:'48%'});
const blob=document.createElementNS(svg.namespaceURI,'circle');
blob.setAttribute('cx',60); blob.setAttribute('cy',50); blob.setAttribute('r',34);
blob.setAttribute('fill',accent);
blob.animate([{transform:'scale(1)'},{transform:'scale(1.06)'},{transform:'scale(1)'}],
  {duration:6000/tempo,iterations:Infinity,easing:'ease-in-out'});
svg.appendChild(blob); container.appendChild(svg);

MICRO-REFERENCE B — wordmark-as-hero (phrase IS the composition). Reference only.
// MOVE: wordmark-as-hero
const [bg, ink, accent] = palette;
container.style.background = bg; container.style.overflow='hidden';
const stage=document.createElement('div');
Object.assign(stage.style,{position:'absolute',inset:0,display:'flex',alignItems:'center',
  justifyContent:'flex-start',padding:'0 4%',color:ink,
  fontFamily:'"Cormorant Garamond","Fraunces",Georgia,serif'});
const line=document.createElement('div');
Object.assign(line.style,{fontSize:'clamp(3.5rem,14vw,9rem)',lineHeight:0.92,letterSpacing:'-0.03em'});
phrase.split(/\\s+/).forEach((w,i)=>{const s=document.createElement('span');
  s.textContent=w+' ';
  Object.assign(s.style,{display:'inline-block',opacity:0,transform:'translateY(24px)',
    color:i%2?accent:ink,fontStyle:i%2?'italic':'normal'});
  s.animate([{opacity:0,transform:'translateY(24px)'},{opacity:1,transform:'translateY(0)'}],
    {duration:900/tempo,delay:(220*i)/tempo,fill:'forwards',easing:'cubic-bezier(.2,.7,.2,1)'});
  line.appendChild(s);});
stage.appendChild(line); container.appendChild(stage);
if(message){const foot=document.createElement('div');foot.textContent=message;
  Object.assign(foot.style,{position:'absolute',left:'4%',right:'4%',bottom:'6%',
    fontFamily:'ui-monospace,Menlo,monospace',fontSize:'clamp(11px,1.1vw,13px)',
    letterSpacing:'0.14em',textTransform:'uppercase',opacity:0.7,color:ink,maxWidth:'46ch',lineHeight:1.6});
  container.appendChild(foot);}`;

const EDIT_SYSTEM = `You are editing an existing self-contained JavaScript animated greeting-card function body. The sender has a specific change in mind.

RULES
- Return the FULL rewritten function body only. No markdown, no explanations.
- Preserve the invocation contract: (container, phrase, message, palette, tempo, seed).
- Both phrase and message must render when message is non-empty (phrase large, message smaller, wrapped underneath or beside per the composition).
- Change ONLY what the sender asked for. Preserve the design move (line 1 comment), composition, motion identity, palette, and tempo unless the request implies otherwise.
- If the request is vague ("make it nicer"), improve hierarchy, typography, and negative space — do NOT drift toward the centered-serif-with-particles default.
- Never regress an editorial / wordmark / split / diagonal composition back to a centered flex column with background particles.
- Browser-only APIs (no fetch/XHR/eval/imports). Under 5500 chars. No strobing (>4Hz).
- Contrast check after any palette change: phrase must stay legible on palette[0].`;


async function callChat(
  model: string | undefined,
  system: string,
  user: string,
  opts?: { json?: boolean },
): Promise<string> {
  return lavaChat(
    model,
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { json: opts?.json },
  );
}


function stripFences(s: string): string {
  return s.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim();
}

function cleanPalette(input: string[] | undefined, fallback: string[]): string[] {
  const cleaned = (input ?? []).filter((c) => /^#[0-9a-fA-F]{3,8}$/.test(c));
  return cleaned.length >= 3 ? cleaned.slice(0, 5) : fallback;
}

export const generateCodedCard = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => Input.parse(raw))
  .handler(async ({ data }): Promise<CodeSpec> => {
    const model = data.model;

    const finalPhrase = data.phrase?.trim() || phraseFor(data.occasion) || "With Love";

    const finalMessage = data.message?.trim() ?? "";
    const seed = Math.floor(Math.random() * 1_000_000);

    // ------------------------------------------------------------------
    // EDIT MODE — iterate on an existing card spec
    // ------------------------------------------------------------------
    if (data.mode === "edit") {
      const prior = data.prior;
      const instruction = data.instruction?.trim() || "Refine and polish.";

      // If we have prior source, ask the model to rewrite it end-to-end.
      if (prior?.source) {
        const user = [
          `Current card phrase (headline): "${finalPhrase}"`,
          finalMessage ? `Current card message (personal note): """${finalMessage}"""` : `Current card message: (empty)`,
          `Current palette: ${JSON.stringify(prior.palette ?? [])}`,
          `Current tempo: ${prior.tempo ?? 1}`,
          data.paletteHint?.length ? `Sender's palette suggestion: ${JSON.stringify(data.paletteHint)}` : null,
          data.motionHint ? `Motion feel: ${data.motionHint}` : null,
          `Sender's edit request: ${instruction}`,
          "",
          "--- CURRENT SOURCE ---",
          prior.source,
        ].filter(Boolean).join("\n");
        const raw = await callChat(model, EDIT_SYSTEM, user);
        const source = stripFences(raw);
        const palette = cleanPalette(data.paletteHint, prior.palette && prior.palette.length >= 3 ? prior.palette : TEMPLATES[0].palette);
        return {
          template: "ai",
          palette,
          phrase: finalPhrase,
          message: finalMessage || undefined,
          tempo: Math.max(0.4, Math.min(2, prior.tempo ?? 1)),
          seed,
          source,
        };
      }

      // Prior is a named template. Decide: palette/tempo tweak vs upgrade to AI source.
      const currentTemplate = (prior?.template && prior.template !== "ai" ? prior.template : suggestTemplate(data.occasion)) as Exclude<TemplateId, "ai">;
      const templateBase = TEMPLATES.find((t) => t.id === currentTemplate)!;

      const DECISION_SCHEMA = {
        type: "object",
        additionalProperties: false,
        properties: {
          action: { type: "string", enum: ["tweak", "rewrite"] },
          template: { type: ["string", "null"], enum: [...TEMPLATE_IDS, null] },
          palette: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 },
          tempo: { type: "number" },
        },
        required: ["action", "template", "palette", "tempo"],
      };
      const decisionUser = [
        `Current template: ${currentTemplate}`,
        `Current palette: ${JSON.stringify(prior?.palette ?? templateBase.palette)}`,
        `Current tempo: ${prior?.tempo ?? 1}`,
        data.motionHint ? `Motion feel hint: ${data.motionHint}` : null,
        data.paletteHint?.length ? `Palette hint: ${JSON.stringify(data.paletteHint)}` : null,
        `Sender's request: ${instruction}`,
        "",
        "If the request is a palette/tempo/template swap, action='tweak'. If it needs custom animation the templates can't do, action='rewrite'.",
      ].filter(Boolean).join("\n");
      const decisionSys = `You decide how to apply an edit to a coded greeting card.
Return JSON.
- action='tweak': keep the template family, adjust palette (3-5 hex), tempo (0.5-2), and optionally swap template to one of: ${TEMPLATE_IDS.join(", ")}.
- action='rewrite': the edit needs custom animation. Still return a fallback palette and tempo.
palette[0] is background; ensure the phrase stays legible on it.`;
      const raw = await callChat(model, decisionSys, decisionUser, { json: true });
      let parsed: { action: "tweak" | "rewrite"; template: string | null; palette: string[]; tempo: number } | null = null;
      try { parsed = raw ? JSON.parse(raw) : null; } catch { /* ignore */ }
      const palette = cleanPalette(parsed?.palette ?? data.paletteHint, templateBase.palette);
      const tempo = Math.max(0.4, Math.min(2, parsed?.tempo ?? prior?.tempo ?? 1));

      if (parsed?.action === "tweak" || !parsed) {
        const nextTemplate = (parsed?.template && TEMPLATE_IDS.includes(parsed.template as Exclude<TemplateId, "ai">))
          ? parsed.template as Exclude<TemplateId, "ai">
          : currentTemplate;
        return { template: nextTemplate, palette, phrase: finalPhrase, message: finalMessage || undefined, tempo, seed };
      }

      // Rewrite path — generate fresh AI source.
      const user = [
        `OCCASION: ${data.occasion ?? "unspecified"}`,
        `CONCEPT: ${data.prompt ?? "sender did not elaborate"}`,
        `HEADLINE (render large): "${finalPhrase}"`,
        `MESSAGE (render smaller, wrapped, may be empty): """${finalMessage}"""`,
        `PALETTE (bg first): ${JSON.stringify(palette)}`,
        `TEMPO: ${tempo}`,
        `VARIATION SEED: ${seed} — use this to pick composition, accent index, direction, easing.`,
        `DESIGN MOVE: ${data.motionHint ? `sender hinted "${data.motionHint}" — translate that into ONE named move from the taxonomy` : "pick ONE move from the taxonomy that fits the occasion and is NOT the centered-serif-with-particles default"}`,
        `AVOID: centered flex column with serif headline and drifting circles/particles; rainbow confetti dumps; motion unrelated to the occasion.`,
        `SENDER'S EDIT REQUEST: ${instruction}`,
      ].join("\n");

      const sourceRaw = await callChat(model, CODE_SYSTEM, user);
      return {
        template: "ai",
        palette,
        phrase: finalPhrase,
        message: finalMessage || undefined,
        tempo,
        seed,
        source: stripFences(sourceRaw),
      };
    }

    // ------------------------------------------------------------------
    // TEMPLATE MODE — pick a template + palette
    // ------------------------------------------------------------------
    if (data.mode === "template") {
      const fallbackId = data.templateHint ?? suggestTemplate(data.occasion);
      const suggested = TEMPLATES.find((t) => t.id === fallbackId)!;

      const OUT = {
        type: "object",
        additionalProperties: false,
        properties: {
          template: { type: "string", enum: TEMPLATE_IDS },
          palette: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 },
          tempo: { type: "number" },
        },
        required: ["template", "palette", "tempo"],
      };

      const system = `You pick an animated e-card template and a color palette. Return JSON.

Templates:
- confetti: celebratory, playful (birthdays, congrats)
- fireworks: grand celebration (anniversaries, new year)
- kinetic: quiet, elegant serif animation (thank you, thinking of you)
- hearts: warm, romantic (love, anniversary)
- starfield: contemplative, magical (get well, holidays)
- ribbons: whimsical (just because, birthday)

Palette: 3-5 hex colors. palette[0] is background. Contrast the phrase against it.
Tempo: 0.5 (slow) to 2 (fast). Default 1.`;
      const user = [
        data.prompt ? `Card idea: ${data.prompt}` : null,
        data.occasion ? `Occasion: ${data.occasion}` : null,
        data.motionHint ? `Motion hint: ${data.motionHint}` : null,
        data.paletteHint?.length ? `Palette hint: ${JSON.stringify(data.paletteHint)}` : null,
        `Phrase (must remain legible): "${finalPhrase}"`,
        data.templateHint ? `Sender prefers the ${data.templateHint} template.` : null,
      ].filter(Boolean).join("\n");

      const raw = await callChat(model, system, user, { json: true }).catch(() => "");
      let parsed: { template: string; palette: string[]; tempo: number } | null = null;
      try { parsed = raw ? JSON.parse(raw) : null; } catch { /* fall through */ }
      const template = (parsed && TEMPLATE_IDS.includes(parsed.template as Exclude<TemplateId, "ai">))
        ? (parsed.template as Exclude<TemplateId, "ai">) : fallbackId;
      const palette = cleanPalette(parsed?.palette ?? data.paletteHint, suggested.palette);
      const tempo = Math.max(0.4, Math.min(2, parsed?.tempo ?? 1));
      return { template, palette, phrase: finalPhrase, message: finalMessage || undefined, tempo, seed };
    }

    // ------------------------------------------------------------------
    // AI MODE — write a fresh self-contained animation
    // ------------------------------------------------------------------
    const fallback = TEMPLATES.find((t) => t.id === suggestTemplate(data.occasion))!;
    const palette = cleanPalette(data.paletteHint, fallback.palette);
    const user = [
      `OCCASION: ${data.occasion ?? "unspecified"}`,
      `CONCEPT: ${data.prompt ?? "sender did not elaborate"}`,
      `HEADLINE (render large): "${finalPhrase}"`,
      `MESSAGE (render smaller, wrapped, may be empty): """${finalMessage}"""`,
      `PALETTE (bg first): ${JSON.stringify(palette)}`,
      `TEMPO: 1`,
      `MOTION DIRECTION: ${data.motionHint ?? "designer's choice — pick one intentional motion for this occasion"}`,
    ].join("\n");

    const raw = await callChat(model, CODE_SYSTEM, user);
    return {
      template: "ai",
      palette,
      phrase: finalPhrase,
      message: finalMessage || undefined,
      tempo: 1,
      seed,
      source: stripFences(raw),
    };
  });
