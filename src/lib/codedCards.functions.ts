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


const CODE_SYSTEM = `You write ONE self-contained JavaScript function body that renders a beautiful animated greeting-card visual into a provided container element.

The function is invoked with these parameters:
  container: HTMLElement — square element you must fill
  phrase:    string      — SHORT headline (2-4 words, e.g. "Happy Birthday"); render LARGE and prominent
  message:   string      — the sender's personal note (1-4 sentences, may be empty); render SMALLER, wrapped, secondary
  palette:   string[]    — 3-5 hex colors; palette[0] is background, the rest are accents/text
  tempo:     number      — 0.5 (slow, meditative) to 2 (fast, energetic)
  seed:      number      — deterministic randomness input

STRICT RULES:
- Output ONLY the function body. No markdown, no code fences, no explanation, no imports, no wrapping function keyword.
- Use only browser DOM/CSS/SVG/Canvas APIs. No fetch, no XHR, no eval, no import, no require, no window.parent, no cookies/storage.
- The container fills a square. Design must look intentional at any size (use % / vmin / relative units).
- ALWAYS render both phrase and message when message is non-empty: phrase is the visual anchor (clamp(2.25rem, 7vw, 4.5rem) serif); message is the personal note beneath it (clamp(0.95rem, 1.6vw, 1.25rem), wrapped, max-width around 36ch, slightly lower opacity). If message is empty, render only phrase.
- Use serif typography, e.g. font-family: '"Instrument Serif", Georgia, serif'.
- Use requestAnimationFrame for motion. Tie easing/frequency to the tempo variable.
- Keep it under 5500 characters. Prefer elegant simplicity to feature stuffing.
- No seizure-y strobes, no jarring flashes. Respect the palette. Contrast text against the background.

Below are two short reference bodies. Do not copy them — use them to calibrate quality and style.

--- REFERENCE 1: canvas particle drift ---
const c = document.createElement('canvas');
container.appendChild(c);
Object.assign(c.style, { position:'absolute', inset:0, width:'100%', height:'100%' });
const ctx = c.getContext('2d');
function size(){ const r = container.getBoundingClientRect(); c.width = r.width; c.height = r.height; }
size(); new ResizeObserver(size).observe(container);
const [bg, ...cs] = palette;
let rs = seed;
const rand = () => (rs = (rs * 1664525 + 1013904223) >>> 0, rs / 4294967296);
const pts = Array.from({length: 90}, () => ({
  x: rand()*c.width, y: rand()*c.height, r: 1+rand()*3,
  vx: (rand()-.5)*.2*tempo, vy: (rand()-.5)*.2*tempo,
  color: cs[Math.floor(rand()*cs.length)] || '#fff', a: .3+rand()*.5
}));
function frame(){
  ctx.fillStyle = bg; ctx.fillRect(0,0,c.width,c.height);
  for(const p of pts){ p.x+=p.vx; p.y+=p.vy;
    if(p.x<0||p.x>c.width) p.vx*=-1; if(p.y<0||p.y>c.height) p.vy*=-1;
    ctx.globalAlpha = p.a; ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  requestAnimationFrame(frame);
}
frame();
const wrap = document.createElement('div');
Object.assign(wrap.style, { position:'absolute', inset:0, display:'flex', flexDirection:'column', gap:'1rem',
  alignItems:'center', justifyContent:'center', textAlign:'center', padding:'0 6%', color: cs[0]||'#fff',
  fontFamily:'"Instrument Serif", Georgia, serif' });
const h = document.createElement('div');
h.textContent = phrase;
Object.assign(h.style, { fontSize:'clamp(2.25rem, 7vw, 4.5rem)', lineHeight:'1.05',
  letterSpacing:'-0.02em', textShadow:'0 2px 30px '+bg });
wrap.appendChild(h);
if (message) {
  const m = document.createElement('div');
  m.textContent = message;
  Object.assign(m.style, { fontSize:'clamp(0.95rem, 1.6vw, 1.25rem)', lineHeight:'1.4',
    maxWidth:'36ch', opacity:'0.85', fontStyle:'italic' });
  wrap.appendChild(m);
}
container.appendChild(wrap);

--- REFERENCE 2: kinetic svg words ---
const [bg, fg, accent] = palette;
container.style.background = bg;
const words = phrase.split(/\\s+/);
const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
svg.setAttribute('viewBox','0 0 400 400');
svg.setAttribute('preserveAspectRatio','xMidYMid meet');
Object.assign(svg.style,{position:'absolute',inset:0,width:'100%',height:'100%'});
container.appendChild(svg);
words.forEach((w,i)=>{
  const t = document.createElementNS(svg.namespaceURI,'text');
  t.textContent = w;
  t.setAttribute('x','200'); t.setAttribute('y', 130 + i*70);
  t.setAttribute('text-anchor','middle');
  t.setAttribute('fill', i%2 ? accent||fg : fg);
  t.setAttribute('font-family','Instrument Serif, Georgia, serif');
  t.setAttribute('font-size','64');
  t.setAttribute('font-style', i%2 ? 'italic':'normal');
  t.setAttribute('opacity','0');
  svg.appendChild(t);
  const delay = i * 400 / tempo;
  setTimeout(() => t.animate(
    [{opacity:0, transform:'translateY(12px)'},{opacity:1, transform:'translateY(0)'}],
    { duration: 600/tempo, fill:'forwards', easing:'cubic-bezier(.2,.7,.2,1)' }
  ), delay);
});
if (message) {
  const fo = document.createElementNS(svg.namespaceURI, 'foreignObject');
  fo.setAttribute('x','40'); fo.setAttribute('y', 260); fo.setAttribute('width','320'); fo.setAttribute('height','120');
  const p = document.createElement('div');
  p.textContent = message;
  Object.assign(p.style, { font: 'italic 18px "Instrument Serif", Georgia, serif', color: fg, opacity:'0.8',
    textAlign:'center', lineHeight:'1.4' });
  fo.appendChild(p); svg.appendChild(fo);
}`;

const EDIT_SYSTEM = `You are editing an existing self-contained JavaScript animated greeting-card function body. The sender wants a specific change.

Rules:
- Return the FULL rewritten function body only. No markdown, no explanations.
- Preserve the same invocation contract: (container, phrase, message, palette, tempo, seed). phrase = short headline, message = longer personal note (may be empty).
- Both phrase AND message must render when message is non-empty (phrase large, message smaller / wrapped underneath).
- Keep browser-only APIs (no fetch/XHR/eval/imports). Under 5500 chars.
- Apply the sender's requested change; keep the rest of the visual coherent.`;

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
        `Card concept: ${data.prompt ?? "a heartfelt greeting"}`,
        data.occasion ? `Occasion: ${data.occasion}` : null,
        `Phrase to feature (headline, large): "${finalPhrase}"`,
        finalMessage ? `Message to include (personal note, secondary): """${finalMessage}"""` : null,
        `Palette (background first): ${JSON.stringify(palette)}`,
        `Tempo: ${tempo}`,
        data.motionHint ? `Motion feel: ${data.motionHint}` : null,
        `Sender's request: ${instruction}`,
      ].filter(Boolean).join("\n");
      const sourceRaw = await callChat(key, CODE_MODEL, CODE_SYSTEM, user);
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

      const raw = await callChat(key, PICKER_MODEL, system, user, { schema: OUT, schemaName: "card_spec" }).catch(() => "");
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
    const raw = await callChat(key, CODE_MODEL, CODE_SYSTEM, user);
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
