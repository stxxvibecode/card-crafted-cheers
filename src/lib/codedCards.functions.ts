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
You are a generative designer shipping ONE hand-crafted animated greeting card as a self-contained JavaScript function body. Treat every card as a bespoke motion poster authored for THIS specific message — never a generic screensaver.

INVOCATION CONTRACT
Your function body is invoked with:
  container: HTMLElement — square element you must fill (position:relative already set)
  phrase:    string      — SHORT headline (2-4 words); the visual anchor
  message:   string      — sender's personal note (0-4 sentences); may be empty
  palette:   string[]    — 3-5 hex colors; palette[0] is the background
  tempo:     number      — 0.5 (slow, meditative) → 2 (fast, energetic); master speed multiplier
  seed:      number      — deterministic randomness input
Read the concept, occasion and message carefully before writing a single line.

DESIGN DIRECTIVES
- Commit to ONE focal composition (centered, lower-third, offset diagonal, framed, split). Do not hedge.
- Hierarchy: phrase (serif, clamp(2.5rem, 7vw, 5rem), tight -0.02em tracking) → message (clamp(0.95rem, 1.6vw, 1.25rem), max-width ~36ch, italic, opacity 0.75-0.9) → motion behind or around text, never over it.
- Use the palette intentionally. palette[0] = full-bleed background. Pick ONE accent as dominant; the rest support. No rainbow soup.
- Negative space is a feature. A few large, considered elements beat 200 particles.
- Motion must MEAN something for the occasion. Ease in on mount (600-1200ms), then settle into a seamless loop. Scale every duration/frequency by tempo.
- Contrast check: light background → dark phrase; dark background → light phrase.

OCCASION VOCABULARY (pattern-match, then interpret — don't copy literally)
- Birthday → confetti bursts, candle flicker, balloon rise, warm accents
- Anniversary / Love → paired orbits, heart bloom, silk ribbon, blush + gold
- Thank you → petals settling, soft ink bloom, calm serif fade, sage + cream
- Congrats → firework arcs, rising sparks, ticker-tape, saturated jewel tones
- Get well → slow starfield, breathing gradient, sunrise wash, muted teal
- Condolence / Thinking of you → drifting light, single candle, gentle rain, ink wash, muted neutrals
- Holiday → snow, garland, aurora — palette-led
- Just because → surprise the reader; abstract generative

TECHNICAL RULES
- Output ONLY the function body. No markdown, no fences, no explanation, no imports, no wrapping \`function\` keyword.
- Browser DOM / SVG / Canvas / CSS only. No fetch, XHR, eval, import, require, window.parent, cookies, storage.
- Use requestAnimationFrame for motion. Use %, vmin, clamp() — never fixed pixels for layout.
- Serif family for phrase: '"Instrument Serif", "Cormorant Garamond", Georgia, serif'.
- Under 5500 characters. No strobing (nothing >4Hz).
- When message is non-empty, BOTH phrase and message must render legibly; when empty, render only phrase.

SELF-CHECK (silently, before returning)
(a) phrase and message are both legible against the background; (b) the loop reconnects without popping; (c) if you paused the motion, the still frame would read as a card FOR THIS OCCASION.

REFERENCE 1 — composition-first poster (motion is background). Reference only — calibrate quality, do not copy.
const [bg, accent, ink] = palette;
container.style.background = bg;
const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
svg.setAttribute('viewBox','0 0 400 400');
Object.assign(svg.style,{position:'absolute',inset:0,width:'100%',height:'100%'});
container.appendChild(svg);
const g = document.createElementNS(svg.namespaceURI,'g');
svg.appendChild(g);
let rs = seed; const rand = () => (rs = (rs*1664525+1013904223)>>>0, rs/4294967296);
for (let i=0;i<6;i++){
  const c = document.createElementNS(svg.namespaceURI,'circle');
  c.setAttribute('cx', 60+rand()*280); c.setAttribute('cy', 60+rand()*280);
  c.setAttribute('r', 40+rand()*80); c.setAttribute('fill', accent);
  c.setAttribute('opacity', 0.06+rand()*0.08);
  c.animate([{transform:'translateY(0)'},{transform:'translateY(-8px)'},{transform:'translateY(0)'}],
    { duration: (6000+rand()*4000)/tempo, iterations: Infinity, easing:'ease-in-out' });
  g.appendChild(c);
}
const wrap = document.createElement('div');
Object.assign(wrap.style,{position:'absolute',inset:0,display:'flex',flexDirection:'column',
  alignItems:'center',justifyContent:'center',gap:'1rem',padding:'0 8%',textAlign:'center',
  color: ink, fontFamily:'"Instrument Serif", Georgia, serif'});
const h = document.createElement('div'); h.textContent = phrase;
Object.assign(h.style,{fontSize:'clamp(2.5rem,7vw,5rem)',letterSpacing:'-0.02em',lineHeight:'1.02'});
h.animate([{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],
  {duration: 900/tempo, fill:'forwards', easing:'cubic-bezier(.2,.7,.2,1)'});
wrap.appendChild(h);
if (message){ const m = document.createElement('div'); m.textContent = message;
  Object.assign(m.style,{fontSize:'clamp(0.95rem,1.6vw,1.25rem)',maxWidth:'34ch',
    fontStyle:'italic',opacity:'0',lineHeight:'1.45'});
  m.animate([{opacity:0},{opacity:0.85}],{duration:900/tempo, delay: 500/tempo, fill:'forwards'});
  wrap.appendChild(m);
}
container.appendChild(wrap);

REFERENCE 2 — kinetic type (phrase itself is the motion). Reference only.
const [bg, fg, accent] = palette;
container.style.background = bg;
const stage = document.createElement('div');
Object.assign(stage.style,{position:'absolute',inset:0,display:'flex',flexDirection:'column',
  alignItems:'center',justifyContent:'center',gap:'1.25rem',padding:'0 6%',textAlign:'center',
  fontFamily:'"Instrument Serif", Georgia, serif',color:fg});
container.appendChild(stage);
const line = document.createElement('div');
Object.assign(line.style,{fontSize:'clamp(2.5rem,7vw,5rem)',letterSpacing:'-0.02em',lineHeight:'1.02'});
phrase.split(/\\s+/).forEach((w,i)=>{
  const s = document.createElement('span');
  s.textContent = w + ' ';
  Object.assign(s.style,{display:'inline-block',opacity:'0',transform:'translateY(14px)',
    color: i===1 ? accent : fg, fontStyle: i===1 ? 'italic':'normal'});
  s.animate([{opacity:0,transform:'translateY(14px)'},{opacity:1,transform:'translateY(0)'}],
    {duration:700/tempo, delay:(180*i)/tempo, fill:'forwards', easing:'cubic-bezier(.2,.7,.2,1)'});
  line.appendChild(s);
});
stage.appendChild(line);
if (message){ const m=document.createElement('div'); m.textContent=message;
  Object.assign(m.style,{fontSize:'clamp(0.95rem,1.6vw,1.25rem)',maxWidth:'36ch',
    fontStyle:'italic',opacity:'0',lineHeight:'1.45'});
  m.animate([{opacity:0},{opacity:0.8}],{duration:900/tempo, delay:900/tempo, fill:'forwards'});
  stage.appendChild(m);
}

REFERENCE 3 — one hero generative accent behind text. Reference only.
const c = document.createElement('canvas');
Object.assign(c.style,{position:'absolute',inset:0,width:'100%',height:'100%'});
container.appendChild(c);
const ctx = c.getContext('2d');
function size(){ const r=container.getBoundingClientRect(); c.width=r.width; c.height=r.height; }
size(); new ResizeObserver(size).observe(container);
const [bg, hero, soft] = palette;
let t = 0;
function frame(){
  ctx.fillStyle = bg; ctx.fillRect(0,0,c.width,c.height);
  const cx = c.width/2, cy = c.height*0.55;
  for (let i=8;i>0;i--){
    const r = (Math.min(c.width,c.height)*0.18) + i*14 + Math.sin(t/40 + i)*4;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2);
    ctx.fillStyle = i%2 ? hero : soft; ctx.globalAlpha = 0.05 + i*0.01; ctx.fill();
  }
  ctx.globalAlpha = 1;
  t += tempo; requestAnimationFrame(frame);
}
frame();
const wrap = document.createElement('div');
Object.assign(wrap.style,{position:'absolute',inset:0,display:'flex',flexDirection:'column',
  alignItems:'center',justifyContent:'center',gap:'1rem',padding:'0 8%',textAlign:'center',
  fontFamily:'"Instrument Serif", Georgia, serif',color: soft});
const h=document.createElement('div'); h.textContent=phrase;
Object.assign(h.style,{fontSize:'clamp(2.5rem,7vw,5rem)',letterSpacing:'-0.02em',lineHeight:'1.02'});
wrap.appendChild(h);
if (message){ const m=document.createElement('div'); m.textContent=message;
  Object.assign(m.style,{fontSize:'clamp(0.95rem,1.6vw,1.25rem)',maxWidth:'34ch',
    fontStyle:'italic',opacity:'0.8',lineHeight:'1.45'});
  wrap.appendChild(m);
}
container.appendChild(wrap);`;

const EDIT_SYSTEM = `You are editing an existing self-contained JavaScript animated greeting-card function body. The sender has a specific change in mind.

RULES
- Return the FULL rewritten function body only. No markdown, no explanations.
- Preserve the invocation contract: (container, phrase, message, palette, tempo, seed).
- Both phrase and message must render when message is non-empty (phrase large serif, message smaller / italic / wrapped underneath).
- Change ONLY what the sender asked for. Preserve composition, motion identity, palette, and tempo unless the request implies otherwise.
- If the request is vague ("make it nicer"), improve hierarchy, typography, and negative space — do NOT rebuild from scratch.
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
        `MOTION DIRECTION: ${data.motionHint ?? "designer's choice — pick one intentional motion for this occasion"}`,
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
      data.prompt ? `Card concept: ${data.prompt}` : null,
      data.occasion ? `Occasion: ${data.occasion}` : null,
      `Phrase to feature (headline, large): "${finalPhrase}"`,
      finalMessage ? `Message to include (personal note, secondary): """${finalMessage}"""` : null,
      `Palette (background first): ${JSON.stringify(palette)}`,
      data.motionHint ? `Motion feel: ${data.motionHint}` : "Surprise me — kinetic type, generative shapes, particles, gradients, or something poetic.",
    ].filter(Boolean).join("\n");
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
