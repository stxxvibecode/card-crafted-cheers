import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/generate-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { prompt, occasion } = (await request.json()) as { prompt: string; occasion?: string };
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });
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

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "openai/gpt-image-2",
            prompt: styled,
            quality: "low",
            size: "1024x1024",
            n: 1,
            stream: true,
            partial_images: 1,
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => "");
          return new Response(text || "Upstream error", { status: upstream.status });
        }

        return new Response(upstream.body, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
        });
      },
    },
  },
});
