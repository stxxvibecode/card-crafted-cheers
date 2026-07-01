import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Msg = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const DraftSchema = z.object({
  prompt: z.string().max(500).optional(),
  occasion: z.string().max(64).optional(),
  message: z.string().max(4000).optional(),
  recipientName: z.string().max(80).optional(),
  senderName: z.string().max(80).optional(),
  medium: z.enum(["art", "code"]).optional(),
});

const ChatInput = z.object({
  messages: z.array(Msg).min(1).max(40),
  draft: DraftSchema,
});

const OUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    reply: {
      type: "string",
      description:
        "Warm, brief reply to the sender (1-3 sentences). Explain what you changed. Never include the full card message in the reply.",
    },
    updates: {
      type: "object",
      additionalProperties: false,
      properties: {
        prompt: {
          type: ["string", "null"],
          description:
            "Updated image description for the card art if it should change, else null. Include full descriptive prompt (subject, mood, style, palette).",
        },
        occasion: {
          type: ["string", "null"],
          description:
            "One of: Birthday, Thank you, Congrats, Get well, Holiday, Anniversary, Just because, or null.",
        },
        message: {
          type: ["string", "null"],
          description:
            "Updated card message (2-4 warm sentences, no salutation, no signature) if it should change, else null.",
        },
        recipientName: { type: ["string", "null"] },
        senderName: { type: ["string", "null"] },
        medium: {
          type: ["string", "null"],
          enum: ["art", "code", null],
          description:
            "Set to 'code' if the user asks for something animated / playful / interactive / coded / kinetic; set to 'art' if they ask for a painted / illustrated / hand-drawn look; null to keep current medium.",
        },
        codeTemplate: {
          type: ["string", "null"],
          enum: ["confetti", "fireworks", "kinetic", "hearts", "starfield", "ribbons", "ai", null],
          description:
            "Only when medium is 'code'. Suggest a template that fits: confetti/fireworks (celebration), kinetic (quiet elegance), hearts (love), starfield (contemplative), ribbons (whimsical), or 'ai' when the user asks to surprise them.",
        },
        regenerateImage: {
          type: "boolean",
          description:
            "True if the art should be repainted from the (new or existing) prompt. False if only text changed.",
        },
      },
      required: [
        "prompt",
        "occasion",
        "message",
        "recipientName",
        "senderName",
        "medium",
        "codeTemplate",
        "regenerateImage",
      ],
    },
  },
  required: ["reply", "updates"],
};

export const chatCard = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => ChatInput.parse(raw))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const mediumChosen = data.draft.medium === "art" || data.draft.medium === "code";
    const system = `You are Pigeon, a gentle assistant helping someone craft a personal e-card. You work in a plan-then-build flow: you PROPOSE updates in a plan; the sender clicks Build to commit and generate. Nothing is generated until they hit Build.

Draft fields: prompt (image description), occasion, message (2-4 warm handwritten sentences), recipientName, senderName, medium ("art" = painted illustration, "code" = live animated coded card).

Medium: ${mediumChosen ? `chosen — "${data.draft.medium}".` : "not yet chosen — but the composer forces the sender to pick Art or Code before they can send a message, so assume one will be set by the time you build."}

On each turn respond with JSON matching the schema:
- "reply": warm, brief (1-3 sentences). Describe the plan you're proposing. Never dump the card message text into the reply.
- "updates": propose the fields that should change. Use null to leave a field unchanged.
- "regenerateImage": true whenever the ART visual should be repainted from the (new or existing) prompt. False for text-only edits or when medium is code.
- Whenever occasion changes AND medium is "art", set regenerateImage: true — the artwork hand-letters the occasion phrase into the illustration.
- MEDIUM: leave medium null unless the user explicitly asks to switch. The composer selection is the source of truth.
- When medium is "code", propose codeTemplate (confetti/fireworks = celebration, kinetic = elegance, hearts = love, starfield = contemplative, ribbons = whimsical, "ai" = surprise generative). Do not set regenerateImage for code cards.

If the sender hasn't described the card yet, ask a single warm question and leave all updates null.
The card message never starts with "Dear ___" and never signs a name. 2-4 sincere, specific sentences.

Current draft:
${JSON.stringify(data.draft, null, 2)}`;

    const messages = [
      { role: "system", content: system },
      ...data.messages,
    ];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        response_format: {
          type: "json_schema",
          json_schema: { name: "card_update", strict: true, schema: OUT_SCHEMA },
        },
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("Rate limit — try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted.");
      throw new Error(`AI error: ${res.status} ${text}`);
    }
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = json.choices?.[0]?.message?.content;
    if (!raw) throw new Error("Empty response");
    let parsed: {
      reply: string;
      updates: {
        prompt: string | null;
        occasion: string | null;
        message: string | null;
        recipientName: string | null;
        senderName: string | null;
        medium: "art" | "code" | null;
        codeTemplate: "confetti" | "fireworks" | "kinetic" | "hearts" | "starfield" | "ribbons" | "ai" | null;
        regenerateImage: boolean;
      };
    };
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("Malformed AI response");
    }
    return parsed;
  });
