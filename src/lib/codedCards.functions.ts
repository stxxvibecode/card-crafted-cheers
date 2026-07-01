import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { TEMPLATES, suggestTemplate, type CodeSpec, type TemplateId } from "./codedCards/registry";
import { phraseFor } from "./occasion";

const Input = z.object({
  prompt: z.string().max(500).optional(),
  occasion: z.string().max(64).optional(),
  phrase: z.string().max(80).optional(),
  mode: z.enum(["template", "ai"]),
  templateHint: z.enum(["confetti", "fireworks", "kinetic", "hearts", "starfield", "ribbons"]).optional(),
});

const TEMPLATE_IDS = TEMPLATES.map((t) => t.id) as Exclude<TemplateId, "ai">[];

export const generateCodedCard = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => Input.parse(raw))
  .handler(async ({ data }): Promise<CodeSpec> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const phrase =
      data.phrase?.trim() ||
      phraseFor(data.occasion) ||
      "With Love";
    const seed = Math.floor(Math.random() * 1_000_000);

    if (data.mode === "template") {
      // Ask the model for a template id + palette + tempo. Cheap + reliable.
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

      const system = `You pick an animated e-card template and a color palette. Return JSON matching the schema.

Available templates and their vibe:
- confetti: celebratory, playful (birthdays, congrats)
- fireworks: grand celebration (anniversaries, new year)
- kinetic: quiet, elegant serif animation (thank you, thinking of you)
- hearts: warm, romantic (love, anniversary)
- starfield: contemplative, magical (get well, holidays)
- ribbons: whimsical (just because, birthday)

Palette: 3-5 hex colors. First color is the background. Remaining colors are used as accents/text. Contrast the phrase against the background.
Tempo: 0.5 (slow, meditative) to 2 (fast, energetic). Default 1.`;
      const user = [
        data.prompt ? `Card idea: ${data.prompt}` : null,
        data.occasion ? `Occasion: ${data.occasion}` : null,
        `The phrase that must remain legible: "${phrase}"`,
        data.templateHint ? `The sender prefers the ${data.templateHint} template.` : null,
      ].filter(Boolean).join("\n");

      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "system", content: system }, { role: "user", content: user }],
          response_format: { type: "json_schema", json_schema: { name: "card_spec", strict: true, schema: OUT } },
        }),
      });
      if (!res.ok) {
        // Fallback to hard-coded suggestion so the user always sees something.
        return { template: fallbackId, palette: suggested.palette, phrase, tempo: 1, seed };
      }
      const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const raw = json.choices?.[0]?.message?.content;
      let parsed: { template: string; palette: string[]; tempo: number } | null = null;
      try { parsed = raw ? JSON.parse(raw) : null; } catch { /* fall through */ }
      const template = (parsed && TEMPLATE_IDS.includes(parsed.template as Exclude<TemplateId, "ai">))
        ? (parsed.template as Exclude<TemplateId, "ai">) : fallbackId;
      const palette = (parsed?.palette ?? []).filter((c) => /^#[0-9a-fA-F]{3,8}$/.test(c));
      const finalPalette = palette.length >= 3 ? palette.slice(0, 5) : suggested.palette;
      const tempo = Math.max(0.4, Math.min(2, parsed?.tempo ?? 1));
      return { template, palette: finalPalette, phrase, tempo, seed };
    }

    // mode === "ai": ask model to write a self-contained function body.
    const system = `You write ONE self-contained JavaScript function body that renders a beautiful animated greeting-card visual into a provided container element. The function will be invoked with these parameters: container (HTMLElement), phrase (string), palette (string[] of hex colors, first is background), tempo (number, 0.5=slow, 2=fast), seed (number).

STRICT RULES:
- Output ONLY the function body. No markdown, no code fences, no explanation, no imports.
- Use only browser DOM/CSS/SVG/Canvas APIs. No fetch, no XHR, no eval, no import, no require, no window.parent, no cookies/storage.
- The container fills a square. Make it look intentional at any size.
- Render the phrase prominently. Use serif typography ("Instrument Serif", serif).
- Use requestAnimationFrame for animations. Clean up is not required (single-mount).
- Keep it under 3000 characters. Prefer elegant simplicity over feature stuffing.`;
    const user = [
      data.prompt ? `Card concept: ${data.prompt}` : null,
      data.occasion ? `Occasion: ${data.occasion}` : null,
      `Phrase to feature: "${phrase}"`,
      "Surprise me with the visual — kinetic type, generative shapes, particles, gradients, or something poetic.",
    ].filter(Boolean).join("\n");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("Rate limit — try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted.");
      throw new Error(`AI error: ${res.status} ${t}`);
    }
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    let source = json.choices?.[0]?.message?.content?.trim() ?? "";
    // Strip accidental code fences.
    source = source.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim();
    const fallback = TEMPLATES.find((t) => t.id === suggestTemplate(data.occasion))!;
    return {
      template: "ai",
      palette: fallback.palette,
      phrase,
      tempo: 1,
      seed,
      source,
    };
  });
