import { createFileRoute } from "@tanstack/react-router";
import { DEFAULT_IMAGE_MODEL } from "@/lib/lava.server";

export const Route = createFileRoute("/api/generate-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { prompt, occasion, model } = (await request.json()) as {
          prompt: string;
          occasion?: string;
          model?: string;
        };
        const key = process.env.LAVA_SECRET_KEY;
        if (!key) return new Response("Missing LAVA_SECRET_KEY", { status: 500 });
        if (!prompt || typeof prompt !== "string" || prompt.length > 500) {
          return new Response("Invalid prompt", { status: 400 });
        }

        const phraseMap: Record<string, string> = {
          "birthday": "Happy Birthday",
          "thank you": "Thank You",
          "thank-you": "Thank You",
          "thanks": "Thank You",
          "congrats": "Congratulations",
          "congratulations": "Congratulations",
          "get well": "Get Well Soon",
          "holiday": "Happy Holidays",
          "anniversary": "Happy Anniversary",
          "love": "With Love",
          "thinking of you": "Thinking of You",
        };
        const phrase = occasion ? phraseMap[occasion.trim().toLowerCase()] : undefined;

        const typography = phrase
          ? ` Integrate the phrase "${phrase}" as the focal typographic element of the illustration — elegant hand-lettered or hand-painted script that feels part of the artwork (woven into florals, ribbons, clouds, or negative space). Spell it EXACTLY as "${phrase}", once only, no additional words, letters, numbers, watermarks, or signatures anywhere else in the image.`
          : " No text, letters, numbers, or watermarks anywhere in the image.";

        const styled = `A beautiful, warm, hand-illustrated greeting-card artwork${occasion ? ` for a ${occasion} card` : ""}. Subject: ${prompt}. Painterly, soft light, joyful, tasteful greeting-card composition with negative space for the typography.${typography}`;

        const chosenModel = (model?.trim() || DEFAULT_IMAGE_MODEL);

        // lava.so is OpenAI-compatible. gpt-image-1 supports streaming with
        // partial_images. For other providers/models the gateway falls back to
        // a normal response we translate below.
        const supportsStream = /gpt-image/i.test(chosenModel);
        const body: Record<string, unknown> = {
          model: chosenModel,
          prompt: styled,
          size: "1024x1024",
          n: 1,
        };
        if (supportsStream) {
          body.quality = "low";
          body.stream = true;
          body.partial_images = 1;
        }

        const upstream = await fetch("https://api.lava.so/v1/images/generations", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => "");
          return new Response(text || "Upstream error", { status: upstream.status });
        }

        if (supportsStream) {
          return new Response(upstream.body, {
            headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
          });
        }

        // Non-streaming: repackage the single response as a single "completed" SSE event
        // so the client's streamImage parser handles it uniformly.
        const json = (await upstream.json()) as {
          data?: Array<{ b64_json?: string; url?: string }>;
        };
        const first = json.data?.[0];
        let b64 = first?.b64_json;
        if (!b64 && first?.url) {
          const img = await fetch(first.url);
          const buf = new Uint8Array(await img.arrayBuffer());
          let bin = "";
          for (let i = 0; i < buf.byteLength; i++) bin += String.fromCharCode(buf[i]);
          b64 = btoa(bin);
        }
        if (!b64) return new Response("No image returned", { status: 502 });
        const evt = `event: image_generation.completed\ndata: ${JSON.stringify({ type: "image_generation.completed", b64_json: b64, created_at: Date.now() })}\n\n`;
        return new Response(evt, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
        });
      },
    },
  },
});
