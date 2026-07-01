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

        const styled = `A beautiful, warm, hand-illustrated e-card artwork${occasion ? ` for a ${occasion} card` : ""}. Subject: ${prompt}. Painterly, soft light, joyful, greeting-card composition, no text, no watermarks, centered subject with tasteful negative space.`;

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
