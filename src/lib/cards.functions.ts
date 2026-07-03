import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function serverClient(bearer?: string) {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    global: bearer ? { headers: { Authorization: `Bearer ${bearer}` } } : undefined,
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

// ---- Message generation ------------------------------------------------

const MessageInput = z.object({
  prompt: z.string().min(1).max(500),
  occasion: z.string().max(64).optional(),
  recipientName: z.string().max(80).optional(),
  senderName: z.string().max(80).optional(),
  model: z.string().max(120).optional(),
});

export const generateMessage = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => MessageInput.parse(raw))
  .handler(async ({ data }) => {
    const { lavaChat } = await import("./lava.server");
    const system = `You write short, warm, personal card copy. 2–4 sentences. Sincere, specific, never generic. No hashtags, no emojis unless the prompt clearly calls for them. Do not sign the card. Do not include "Dear ___" salutations — start with the message itself.

If the occasion or prompt is RSVP, invitation, wedding, baby shower, graduation, launch, dinner, party, save-the-date, or event-related, write invitation copy instead of a greeting-card note. Include known date/time/location/host details from the prompt, make the recipient feel invited, and make the response action clear.`;
    const user = [
      data.occasion ? `Occasion: ${data.occasion}` : null,
      data.recipientName ? `Recipient: ${data.recipientName}` : null,
      data.senderName ? `From: ${data.senderName}` : null,
      `Prompt from sender: ${data.prompt}`,
    ]
      .filter(Boolean)
      .join("\n");

    const message = await lavaChat(data.model, [
      { role: "system", content: system },
      { role: "user", content: user },
    ]);
    return { message };
  });

// ---- Save card ---------------------------------------------------------

const SaveInput = z
  .object({
    prompt: z.string().min(1).max(500),
    occasion: z.string().max(64).optional(),
    message: z.string().min(1).max(4000),
    medium: z.enum(["art", "code"]).default("art"),
    imageDataUrl: z.string().min(20).max(8_000_000).optional(),
    codeSpec: z
      .object({
        template: z.enum([
          "confetti",
          "fireworks",
          "kinetic",
          "hearts",
          "starfield",
          "ribbons",
          "ai",
        ]),
        palette: z.array(z.string()).min(3).max(5),
        phrase: z.string().min(1).max(80),
        tempo: z.number().min(0.4).max(2),
        seed: z.number(),
        source: z.string().max(12000).optional(),
      })
      .optional(),
    senderName: z.string().max(80).optional(),
    recipientName: z.string().min(1).max(80),
    recipientEmail: z.string().email().max(200).optional(),
  })
  .refine((v) => (v.medium === "art" ? !!v.imageDataUrl : !!v.codeSpec), {
    message: "Art cards need an image; code cards need a codeSpec.",
  });

export const saveCard = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => SaveInput.parse(raw))
  .handler(async ({ data }) => {
    // Read optional bearer to associate to a user; otherwise anonymous card.
    const { getRequest } = await import("@tanstack/react-start/server");
    const req = getRequest();
    const auth = req?.headers.get("authorization") ?? undefined;
    const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;

    const sb = serverClient(bearer);
    let userId: string | null = null;
    if (bearer) {
      const { data: userData } = await sb.auth.getUser(bearer);
      userId = userData?.user?.id ?? null;
    }

    const insert: Database["public"]["Tables"]["cards"]["Insert"] = {
      user_id: userId,
      prompt: data.prompt,
      occasion: data.occasion ?? null,
      message: data.message,
      medium: data.medium,
      image_url: data.imageDataUrl ?? null,
      code_spec: data.codeSpec ?? null,
      sender_name: data.senderName ?? null,
      recipient_name: data.recipientName,
      recipient_email: data.recipientEmail ?? "",
    };

    const { data: row, error } = await sb.from("cards").insert(insert).select("id").single();

    if (error || !row) throw new Error(error?.message ?? "Failed to save card");
    return { id: row.id as string };
  });

// ---- Send card (email) -------------------------------------------------

const SendInput = z.object({ cardId: z.string().uuid() });

export const sendCard = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => SendInput.parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: card, error } = await supabaseAdmin
      .from("cards")
      .select("id, message, image_url, sender_name, recipient_name, recipient_email, occasion")
      .eq("id", data.cardId)
      .maybeSingle();
    if (error || !card) throw new Error("Card not found");

    // Delivery is not wired yet. Keep this function for future email support,
    // but do not mark the card as sent until a provider confirms delivery.

    return { ok: true, id: card.id };
  });
