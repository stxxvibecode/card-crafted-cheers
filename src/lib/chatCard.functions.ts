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

    const system = `You are Pigeon, a gentle assistant helping someone craft a personal e-card. You collaborate through short conversation.

You maintain a card draft with: prompt (image description), occasion, message (2-4 warm handwritten sentences), recipientName, senderName, and medium ("art" for AI painted illustration or "code" for a live animated coded card).

On each turn, decide what should change based on the user's latest message. Respond with JSON matching the provided schema:
- "reply": a warm, brief chat reply (1-3 sentences) — acknowledge and describe what you're changing. Never dump the card message in the reply.
- "updates": only include fields that should CHANGE. Use null for fields to leave unchanged.
- Set "regenerateImage" to true whenever the ART visual should be repainted (new prompt, or user asks to redo the art). Set to false for message-only edits or when the medium is code.
- IMPORTANT (art only): The artwork itself contains the occasion phrase as hand-lettered typography (e.g. a "Thank you" card literally shows the words "Thank You" painted into the illustration). Whenever the occasion is set OR changed AND medium is "art", set regenerateImage: true so the on-image lettering updates.
- MEDIUM: If the user asks for something animated/playful/interactive/coded/kinetic/"a coded card"/"surprise me with code", set medium: "code" and pick a codeTemplate that fits. If they ask for a painted/illustrated/hand-drawn look, set medium: "art". Otherwise leave medium null.
- When you set medium to "code", also set codeTemplate (confetti/fireworks for celebrations, kinetic for elegance, hearts for love, starfield for contemplative, ribbons for whimsical, or "ai" if the user explicitly wants a surprise generative one). Do NOT set regenerateImage for code cards — the client repaints the coded card itself.

If the sender hasn't described the card yet, ask a single warm question — do not invent updates.
The card message should never start with "Dear ___" and should never sign a name. 2-4 sentences, sincere, specific.

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
