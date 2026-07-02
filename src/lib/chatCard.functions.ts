import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { lavaChat } from "./lava.server";

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
  model: z.string().max(120).optional(),
});

const SCHEMA_HINT = `Respond with ONLY a single JSON object matching this TypeScript shape (no markdown, no code fences):
{
  "reply": string,           // 1-3 warm sentences describing your plan. Never dump the card message here.
  "updates": {
    "prompt": string | null,           // updated image description if it should change; else null
    "occasion": string | null,         // one of: Birthday, Thank you, Congrats, Get well, Holiday, Anniversary, Just because; else null
    "message": string | null,          // updated 2-4 sentence card message if it should change; else null
    "recipientName": string | null,
    "senderName": string | null,
    "medium": "art" | "code" | null,   // only if the sender explicitly asks to switch
    "codeTemplate": "confetti" | "fireworks" | "kinetic" | "hearts" | "starfield" | "ribbons" | "ai" | null,
    "codeMotion": string | null,       // 2-6 words describing motion feel
    "codePalette": string[] | null,    // 3-5 hex strings, background first
    "regenerateImage": boolean          // true if the art should be repainted
  }
}`;

type ParsedResponse = {
  reply: string;
  updates: {
    prompt: string | null;
    occasion: string | null;
    message: string | null;
    recipientName: string | null;
    senderName: string | null;
    medium: "art" | "code" | null;
    codeTemplate: "confetti" | "fireworks" | "kinetic" | "hearts" | "starfield" | "ribbons" | "ai" | null;
    codeMotion: string | null;
    codePalette: string[] | null;
    regenerateImage: boolean;
  };
};

function extractJson(raw: string): ParsedResponse {
  const trimmed = raw.trim().replace(/^```json\n?/, "").replace(/^```\n?/, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(trimmed) as ParsedResponse;
  } catch {
    // Try to find the first { ... last } block
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as ParsedResponse;
    }
    throw new Error("Malformed AI response");
  }
}

export const chatCard = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => ChatInput.parse(raw))
  .handler(async ({ data }) => {
    const mediumChosen = data.draft.medium === "art" || data.draft.medium === "code";
    const system = `You are Pigeon, a gentle assistant helping someone craft a personal e-card. You work in a plan-then-build flow: you PROPOSE updates in a plan; the sender clicks Build to commit and generate. Nothing is generated until they hit Build.

Draft fields: prompt (image description), occasion, message (2-4 warm handwritten sentences), recipientName, senderName, medium ("art" = painted illustration, "code" = live animated coded card).

Medium: ${mediumChosen ? `chosen — "${data.draft.medium}".` : "not yet chosen — but the composer forces the sender to pick Art or Code before they can send a message, so assume one will be set by the time you build."}

${SCHEMA_HINT}

Rules:
- "reply" is warm and brief. Describe the plan you're proposing.
- Use null for any field that should NOT change.
- "regenerateImage" is true whenever the ART visual should be repainted. False for text-only edits or when medium is code.
- Whenever occasion changes AND medium is "art", set regenerateImage: true.
- Leave "medium" null unless the user explicitly asks to switch.
- When medium is "code", set codeTemplate to "ai" for bespoke Lovable-grade coded cards, then propose codeMotion (2-6 words) and codePalette (3-5 hex, background first) whenever you have a vision.
- For follow-up edits on a code card, only set the specific fields that should change.
- If the sender hasn't described the card yet, ask a single warm question and leave all updates null.
- The card message never starts with "Dear ___" and never signs a name. 2-4 sincere, specific sentences.

Current draft:
${JSON.stringify(data.draft, null, 2)}`;

    // Some providers (e.g. Anthropic via lava) reject conversations ending
    // with an assistant turn. Trim trailing assistant messages so the last
    // turn is always a user message.
    const trimmed = [...data.messages];
    while (trimmed.length && trimmed[trimmed.length - 1].role === "assistant") {
      trimmed.pop();
    }
    if (trimmed.length === 0) {
      trimmed.push({ role: "user", content: "Let's begin." });
    }

    const raw = await lavaChat(
      data.model,
      [
        { role: "system", content: system },
        ...trimmed,
      ],
      { json: true },
    );

    return extractJson(raw);
  });
