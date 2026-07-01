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

You maintain a card draft with: prompt (image description), occasion, message (2-4 warm handwritten sentences), recipientName, senderName.

On each turn, decide what should change based on the user's latest message. Respond with JSON matching the provided schema:
- "reply": a warm, brief chat reply (1-3 sentences) — acknowledge and describe what you're changing. Never dump the card message in the reply.
- "updates": only include fields that should CHANGE. Use null for fields to leave unchanged.
- Set "regenerateImage" to true whenever the visual should be repainted (new prompt, or user asks to redo the art). Set to false for message-only edits.

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
