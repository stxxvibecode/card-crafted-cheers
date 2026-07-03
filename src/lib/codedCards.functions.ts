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


const CODE_SYSTEM = `PIGEON CARD BUILDER — PRODUCT SPEC
You are the AI card builder inside Pigeon, an e-card creation platform. Think like a product designer, front-end engineer, motion designer, and copywriter at the same time. Turn the sender's short idea into a beautiful, interactive, coded e-card. If details are missing, infer tasteful defaults — do not make the experience feel complicated.

Every card must land:
- a clear occasion cue in the composition
- the sender's personalized message rendered legibly
- a strong visual direction (one committed idea, not a hedge)
- a mobile-first, responsive layout that reads on a phone
- lightweight animation used for delight, not distraction
- clean, semantic DOM
- a still, legible FINAL FRAME the recipient can screenshot or share (the animation MUST resolve to a calm, readable end state; a seamless loop is fine only if the loop itself reads as a keepsake)

Design principles: personal, modern, emotionally intentional. Avoid generic greeting-card clichés unless the sender asked for them. Readability > cleverness. Prioritize spacing, hierarchy, and a strong emotional payoff on reveal. WCAG-legible contrast against palette[0].

RUNTIME NOTE
The Pigeon runtime already wraps your card in a tap-to-open gate for the recipient. DO NOT build your own splash / envelope / "click here" step — assume your animation starts on mount and the recipient has already opted in. Ease in over 600-1200ms, then land the composition.

ROLE (design layer)
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

FORCED VARIATION PROFILE
You may receive a server-selected variation profile. Treat it as a creative director's hard constraint: use that exact design move in the first-line // MOVE comment, follow the specified alignment, type pairing, motion motif, and density, and do not collapse back to a generic centered card.

HARD ANTI-PATTERNS (the model reflexively produces these — DO NOT)
- Centered flex column with serif headline + smaller italic message + drifting circles/particles behind. This is the house default. Refuse it.
- Rainbow confetti dumps or "50 particles bouncing" as a stand-in for design.
- Generic sans headlines. Symmetric mirrored layouts with no focal point.
- Motion that has no relationship to the occasion (starfield on a birthday, confetti on a condolence).
- Two competing motion ideas hedged together. Pick one.
- Building your own "tap to open" / envelope splash — the runtime already provides that.

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
- If a FORCED VARIATION PROFILE is provided, it overrides your default move selection. Obey it exactly unless it would make the card illegible.
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

const EDIT_SYSTEM = `You are editing an existing Pigeon coded greeting-card function body. The sender has a specific change in mind.

RULES
- Return the FULL rewritten function body only. No markdown, no explanations.
- Preserve the invocation contract: (container, phrase, message, palette, tempo, seed).
- The runtime supplies the tap-to-open gate — never add your own splash / envelope / "click to reveal" step.
- Both phrase and message must render when message is non-empty (phrase large, message smaller, wrapped underneath or beside per the composition).
- The animation MUST resolve to a still, legible final frame (or a calm keepsake-worthy loop).
- Change ONLY what the sender asked for. Preserve the design move (line 1 comment), composition, motion identity, palette, and tempo unless the request implies otherwise.
- If the request is vague ("make it nicer"), improve hierarchy, typography, and negative space — do NOT drift toward the centered-serif-with-particles default.
- Never regress an editorial / wordmark / split / diagonal composition back to a centered flex column with background particles.
- Mobile-first: use %, vmin, clamp() — no fixed pixel layout. Browser-only APIs (no fetch/XHR/eval/imports). Under 5500 chars. No strobing (>4Hz).
- Contrast check after any palette change: phrase must stay legible on palette[0].`;


async function callChat(
  model: string | undefined,
  system: string,
  user: string,
  opts?: { json?: boolean; maxTokens?: number },
): Promise<string> {
  const messages = [
    { role: "system" as const, content: system },
    { role: "user" as const, content: user },
  ];
  const maxTokens = opts?.maxTokens ?? 8192;
  try {
    return await lavaChat(model, messages, { json: opts?.json, maxTokens });
  } catch (e) {
    // If the chosen model returned nothing (empty response / cap / refusal)
    // OR the upstream provider had a transient failure (502/503/504/parse),
    // retry once on a known-good default so the user still gets a card.
    const msg = e instanceof Error ? e.message : String(e);
    const empty = /empty response|hit its output cap|refused this prompt/i.test(msg);
    const transient = /Lava (5\d\d|429)|provider_response_error|Failed to parse provider response/i.test(msg);
    if ((empty || transient) && model && model !== "gemini-2.5-flash") {
      return await lavaChat("gemini-2.5-flash", messages, { json: opts?.json, maxTokens });
    }
    if (transient) {
      // Same model, one retry after a short backoff.
      await new Promise((r) => setTimeout(r, 800));
      return await lavaChat(model, messages, { json: opts?.json, maxTokens });
    }
    throw e;
  }
}



function stripFences(s: string): string {
  return s.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim();
}

function cleanPalette(input: string[] | undefined, fallback: string[]): string[] {
  const cleaned = (input ?? []).filter((c) => /^#[0-9a-fA-F]{3,8}$/.test(c));
  return cleaned.length >= 3 ? cleaned.slice(0, 5) : fallback;
}

// ---------------- Self-check: detect repeats & anti-patterns ----------------

const KNOWN_MOVES = [
  "poster-grid", "editorial-split", "wordmark-as-hero", "cinema-letterbox",
  "ticker", "marquee", "constellation", "ink-bloom", "watercolor-bloom",
  "ribbon-sweep", "silk-sweep", "particle-burst", "monospace-grid",
  "full-bleed-type", "diagonal-band",
] as const;

type KnownMove = typeof KNOWN_MOVES[number];

type VariationProfile = {
  move: KnownMove;
  alignment: string;
  anchor: string;
  typePair: string;
  motion: string;
  density: string;
  messagePlacement: string;
};

// Module-scoped LRU of recent moves per bucket (occasion). Survives across
// requests in the same worker instance so repeated generations force variety.
const recentMoves = new Map<string, string[]>();
const recentSignatures = new Map<string, string[]>();
const RECENT_LIMIT = 4;

const ALIGNMENTS = [
  "top-left with a strong right-side visual field",
  "bottom-left with generous quiet space above",
  "right-aligned type with left-side motion anchor",
  "off-axis diagonal alignment, never centered",
  "split composition with asymmetric 60/40 weight",
  "full-bleed edge typography with message tucked into a quiet corner",
  "letterbox composition with horizontal tension",
  "low horizon line with headline floating above it",
] as const;

const ANCHORS = [
  "one oversized glyph or numeral",
  "a single organic bloom shape",
  "a kinetic type band crossing the frame",
  "a sparse constellation diagram",
  "a sweeping silk/ribbon form",
  "a cropped typographic wordmark",
  "a geometric editorial grid",
  "one luminous candle/sun/halo motif",
] as const;

const TYPE_PAIRS = [
  "Cormorant Garamond headline + uppercase mono caption",
  "Instrument Serif italic headline + system sans message",
  "Fraunces/Georgia display headline + SF Mono micro-labels",
  "large edge-to-edge serif wordmark + restrained sans note",
  "mono grid texture + elegant serif phrase breaking out",
  "upright editorial serif + small-caps geometric sans metadata",
] as const;

const MOTIONS = [
  "one bloom that expands then settles into a still frame",
  "a single diagonal sweep that reveals the typography",
  "letters arriving in staggered waves, then holding still",
  "two or three lines connecting slowly like a keepsake diagram",
  "a quiet ticker band moving behind a static headline",
  "a candle/sun/halo breathing at a calm low amplitude",
  "one burst that resolves quickly into a composed final poster",
  "subtle parallax between foreground type and one abstract form",
] as const;

const DENSITIES = [
  "minimal: 70% quiet space, one accent only",
  "editorial: structured grid, two visual zones, sparse detail",
  "lush but controlled: one hero form, a few supporting marks",
  "typographic: phrase carries most of the visual weight",
  "diagrammatic: thin lines, labels, and one emotional focal point",
] as const;

const MESSAGE_PLACEMENTS = [
  "message in a lower-left column, max 36ch",
  "message in a right-side quiet zone, max 34ch",
  "message as a small footer band, not centered under the headline",
  "message aligned to the same diagonal axis as the headline",
  "message in an editorial caption block with a fine rule",
  "message tucked into negative space inside/near the hero form",
] as const;

function pickFrom<T>(items: readonly T[], seed: number, salt: number): T {
  const n = Math.abs(Math.imul(seed ^ (salt * 2654435761), 1597334677));
  return items[n % items.length];
}

function buildVariationProfile(seed: number, occasion: string | undefined, extraAvoid: string[] = []): VariationProfile {
  const recent = recentMoves.get(bucketKey(occasion)) ?? [];
  const avoid = new Set([...recent, ...extraAvoid]);
  const available = KNOWN_MOVES.filter((m) => !avoid.has(m));
  const movePool = available.length ? available : KNOWN_MOVES;
  return {
    move: pickFrom(movePool, seed, 3),
    alignment: pickFrom(ALIGNMENTS, seed, 5),
    anchor: pickFrom(ANCHORS, seed, 7),
    typePair: pickFrom(TYPE_PAIRS, seed, 11),
    motion: pickFrom(MOTIONS, seed, 13),
    density: pickFrom(DENSITIES, seed, 17),
    messagePlacement: pickFrom(MESSAGE_PLACEMENTS, seed, 19),
  };
}

function variationBrief(profile: VariationProfile, occasion: string | undefined) {
  const recent = recentMoves.get(bucketKey(occasion)) ?? [];
  const signatures = recentSignatures.get(bucketKey(occasion)) ?? [];
  return [
    "FORCED VARIATION PROFILE — obey these constraints exactly:",
    `- First line must be exactly: // MOVE: ${profile.move}`,
    `- Composition / alignment: ${profile.alignment}`,
    `- Visual anchor: ${profile.anchor}`,
    `- Type pairing: ${profile.typePair}`,
    `- Motion motif: ${profile.motion}`,
    `- Density: ${profile.density}`,
    `- Message placement: ${profile.messagePlacement}`,
    recent.length ? `- Recently used moves to avoid: ${recent.join(", ")}` : null,
    signatures.length ? `- Recent layout signatures to avoid: ${signatures.join(" | ")}` : null,
    "This card must look visibly different from recent cards for the same occasion.",
  ].filter(Boolean).join("\n");
}

function bucketKey(occasion?: string) {
  return (occasion ?? "any").toLowerCase().trim();
}

function extractMove(source: string): string | null {
  const line1 = source.split("\n", 1)[0] ?? "";
  const m = line1.match(/\/\/\s*MOVE:\s*([a-z0-9-]+)/i);
  return m ? m[1].toLowerCase() : null;
}

function detectLayoutSignature(source: string): string {
  const s = source.toLowerCase();
  const move = extractMove(source) ?? "unknown";
  const centered = /alignitems\s*:\s*['"]center['"]/i.test(source) || /textalign\s*:\s*['"]center['"]/i.test(source);
  const split = /(width\s*:\s*['"](?:4[5-9]|5\d|6\d)%|gridtemplatecolumns|60\/40|50\/50)/i.test(source);
  const diagonal = /(rotate\(|skew|diagonal|clip-path|polygon)/i.test(source);
  const edgeType = /(14vw|12vw|full-bleed|edge-to-edge|lineheight\s*:\s*0\.9)/i.test(source);
  const bottomMessage = /(bottom\s*:\s*['"](?:4|5|6|7|8|9|10)%|footer|caption block)/i.test(source);
  const sideMessage = /(right\s*:\s*['"](?:4|5|6|7|8|9|10)%|left\s*:\s*['"](?:4|5|6|7|8|9|10)%)/i.test(source) && /maxwidth/i.test(source);
  const circles = (source.match(/createElementNS\([^)]*,\s*['"]circle['"]\)/g) ?? []).length;
  const paths = (source.match(/createElementNS\([^)]*,\s*['"]path['"]\)/g) ?? []).length;
  const rects = (source.match(/createElementNS\([^)]*,\s*['"]rect['"]\)/g) ?? []).length;
  const canvas = /canvas|getcontext\(['"]2d['"]\)/i.test(source);
  const font = s.includes("cormorant") ? "cormorant"
    : s.includes("instrument serif") ? "instrument"
      : s.includes("fraunces") ? "fraunces"
        : s.includes("georgia") ? "georgia" : "system";
  const layout = diagonal ? "diagonal" : split ? "split" : edgeType ? "edge-type" : centered ? "centered" : "asym";
  const message = bottomMessage ? "msg-bottom" : sideMessage ? "msg-side" : "msg-other";
  const motif = canvas ? "canvas" : circles >= 4 ? "circles" : paths >= 2 ? "paths" : rects >= 3 ? "rects" : "dom";
  return `${move}/${layout}/${message}/${font}/${motif}`;
}

function detectAntiPatterns(source: string): string[] {
  const issues: string[] = [];
  const s = source;
  // Centered flex column default
  const centeredFlex = /flexDirection\s*:\s*['"]column['"]/i.test(s)
    && /alignItems\s*:\s*['"]center['"]/i.test(s)
    && /justifyContent\s*:\s*['"]center['"]/i.test(s);
  if (centeredFlex) issues.push("uses the centered flex column default layout");
  // Background particles / drifting circles pattern
  const manyCircles = (s.match(/createElementNS\([^)]*,\s*['"]circle['"]\)/g) ?? []).length;
  if (manyCircles >= 6) issues.push(`renders ${manyCircles} SVG circles (looks like background particles)`);
  const particleLoop = /for\s*\(\s*let\s+i\s*=\s*0[^)]*i\s*<\s*(?:2\d|[3-9]\d|\d{3,})/.test(s)
    && /(circle|particle|dot|confetti)/i.test(s);
  if (particleLoop) issues.push("particle-swarm loop detected");
  // Missing MOVE comment
  if (!extractMove(s)) issues.push("missing `// MOVE: <name>` on line 1");
  return issues;
}

function selfCheck(source: string, occasion: string | undefined, profile?: VariationProfile): { ok: boolean; move: string | null; signature: string; issues: string[]; repeats: boolean; signatureRepeats: boolean; recent: string[] } {
  const move = extractMove(source);
  const issues = detectAntiPatterns(source);
  if (move && profile && move !== profile.move) {
    issues.push(`used design move "${move}" but required "${profile.move}"`);
  }
  const recent = recentMoves.get(bucketKey(occasion)) ?? [];
  const recentSigs = recentSignatures.get(bucketKey(occasion)) ?? [];
  const signature = detectLayoutSignature(source);
  const repeats = !!move && recent.includes(move);
  const signatureRepeats = recentSigs.includes(signature);
  return { ok: issues.length === 0 && !repeats && !signatureRepeats, move, signature, issues, repeats, signatureRepeats, recent };
}

function recordDesign(occasion: string | undefined, move: string | null, signature: string) {
  const key = bucketKey(occasion);
  if (move) {
    const list = recentMoves.get(key) ?? [];
    const next = [move, ...list.filter((m) => m !== move)].slice(0, RECENT_LIMIT);
    recentMoves.set(key, next);
  }
  const sigs = recentSignatures.get(key) ?? [];
  recentSignatures.set(key, [signature, ...sigs.filter((s) => s !== signature)].slice(0, RECENT_LIMIT));
}

async function generateWithSelfCheck(
  model: string | undefined,
  system: string,
  userPrompt: string,
  occasion: string | undefined,
  seed: number,
): Promise<string> {
  const firstProfile = buildVariationProfile(seed, occasion);
  const firstPrompt = [userPrompt, "", variationBrief(firstProfile, occasion)].join("\n");

  const first = stripFences(await callChat(model, system, firstPrompt));
  const check = selfCheck(first, occasion, firstProfile);
  if (check.ok) {
    recordDesign(occasion, check.move, check.signature);
    return first;
  }

  // Retry once with explicit forced-variety directive.
  const forbid = Array.from(new Set([...(check.recent), ...(check.move ? [check.move] : [])]));
  const retryProfile = buildVariationProfile(seed + 7919, occasion, forbid);
  const retryPrompt = [
    userPrompt,
    "",
    variationBrief(retryProfile, occasion),
    "",
    "SELF-CHECK FAILED on your previous attempt:",
    ...check.issues.map((i) => `- ${i}`),
    check.repeats && check.move ? `- design move "${check.move}" was used recently; do NOT reuse it` : null,
    check.signatureRepeats ? `- layout signature "${check.signature}" was used recently; change layout, typography, and message placement` : null,
    "",
    `Rewrite from scratch. You MUST use this exact first line: // MOVE: ${retryProfile.move}`,
    "Do NOT use a centered flex column. Do NOT dump background particles/circles. Commit to a distinct compositional anchor.",
  ].filter(Boolean).join("\n");

  const second = stripFences(await callChat(model, system, retryPrompt));
  const check2 = selfCheck(second, occasion, retryProfile);
  recordDesign(occasion, check2.move ?? check.move, check2.signature);
  return second;
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
        `MOBILE-FIRST: assume a phone-sized square; scale type with clamp/vmin; the still final frame must read at 320px wide.`,
        `FINAL FRAME: land on a legible, screenshot-worthy still (or a calm keepsake-worthy loop).`,
        `AVOID: centered flex column with serif headline and drifting circles/particles; rainbow confetti dumps; motion unrelated to the occasion; any tap-to-open / envelope splash (the runtime handles that).`,
        `SENDER'S EDIT REQUEST: ${instruction}`,
      ].join("\n");

      const source = await generateWithSelfCheck(model, CODE_SYSTEM, user, data.occasion, seed);
      return {
        template: "ai",
        palette,
        phrase: finalPhrase,
        message: finalMessage || undefined,
        tempo,
        seed,
        source,
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
      const template = data.templateHint
        ? data.templateHint
        : (parsed && TEMPLATE_IDS.includes(parsed.template as Exclude<TemplateId, "ai">))
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
      `VARIATION SEED: ${seed} — use this to pick composition, accent index, direction, easing.`,
      `DESIGN MOVE: ${data.motionHint ? `sender hinted "${data.motionHint}" — translate that into ONE named move from the taxonomy` : "pick ONE move from the taxonomy that fits the occasion and is NOT the centered-serif-with-particles default"}`,
      `MOBILE-FIRST: assume a phone-sized square; scale type with clamp/vmin; the still final frame must read at 320px wide.`,
      `FINAL FRAME: land on a legible, screenshot-worthy still (or a calm keepsake-worthy loop).`,
      `AVOID: centered flex column with serif headline and drifting circles/particles; rainbow confetti dumps; motion unrelated to the occasion; any tap-to-open / envelope splash (the runtime handles that).`,
    ].join("\n");

      const source = await generateWithSelfCheck(model, CODE_SYSTEM, user, data.occasion, seed);
    return {
      template: "ai",
      palette,
      phrase: finalPhrase,
      message: finalMessage || undefined,
      tempo: 1,
      seed,
      source,
    };
  });
