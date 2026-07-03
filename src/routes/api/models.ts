import { createFileRoute } from "@tanstack/react-router";

// Proxy https://api.lava.so/v1/models with a small in-memory cache and split
// each model into "chat" vs "image" buckets so the picker can group them.

type LavaModel = { id: string; owned_by?: string };
type Bucket = "chat" | "image";
type Categorised = { id: string; owned_by: string; bucket: Bucket };

// Real generative model families. We match on well-known LLM/image slugs so the
// picker stays focused instead of showing tool-use endpoints (affinity-*, brave-*, etc.).
const CHAT_HINTS = [
  "gpt", "o1", "o3", "o4", "claude", "gemini", "grok", "llama", "mistral",
  "mixtral", "qwen", "deepseek", "command", "sonar", "phi-", "yi-", "nova",
  "cohere", "kimi", "hermes",
];
const IMAGE_HINTS = [
  "gpt-image", "dall-e", "flux", "imagen", "stable-diffusion", "sdxl", "sd3",
  "playground-v", "kandinsky", "recraft", "ideogram", "photon",
];
const CHAT_EXCLUDE = ["embed", "whisper", "tts", "moderation", "rerank", "guard", "vision-encoder"];

function categorise(id: string): "chat" | "image" | null {
  const s = id.toLowerCase();
  if (IMAGE_HINTS.some((h) => s.includes(h))) return "image";
  if (CHAT_EXCLUDE.some((h) => s.includes(h))) return null;
  if (CHAT_HINTS.some((h) => s.includes(h))) return "chat";
  return null;
}


let cache: { at: number; body: string } | null = null;
const TTL = 5 * 60 * 1000;

export const Route = createFileRoute("/api/models")({
  server: {
    handlers: {
      GET: async () => {
        if (cache && Date.now() - cache.at < TTL) {
          return new Response(cache.body, {
            headers: { "Content-Type": "application/json", "Cache-Control": "max-age=300" },
          });
        }
        const key = process.env.LAVA_SECRET_KEY;
        if (!key) {
          const body = JSON.stringify({
            error: "missing_env_var",
            variable: "LAVA_SECRET_KEY",
            message:
              "The /api/models endpoint requires the LAVA_SECRET_KEY environment variable to authenticate with https://api.lava.so. Add it in Project Settings → Secrets, then reload.",
            docs: "https://lava.so",
          });
          return new Response(body, {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const upstream = await fetch("https://api.lava.so/v1/models", {
          headers: { Authorization: `Bearer ${key}` },
        });
        if (!upstream.ok) {
          const t = await upstream.text().catch(() => "");
          return new Response(t || "lava error", { status: upstream.status });
        }
        const json = (await upstream.json()) as { data?: LavaModel[] };
        const list = Array.isArray(json.data) ? json.data : [];

        const chat: Categorised[] = [];
        const image: Categorised[] = [];
        for (const m of list) {
          if (!m?.id) continue;
          const bucket = categorise(m.id);
          if (!bucket) continue;
          const entry: Categorised = {
            id: m.id,
            owned_by: m.owned_by || "other",
            bucket,
          };
          (bucket === "image" ? image : chat).push(entry);
        }

        // Sort within each bucket by provider then id.
        const sort = (a: Categorised, b: Categorised) =>
          a.owned_by.localeCompare(b.owned_by) || a.id.localeCompare(b.id);
        chat.sort(sort);
        image.sort(sort);

        const body = JSON.stringify({ chat, image });
        cache = { at: Date.now(), body };
        return new Response(body, {
          headers: { "Content-Type": "application/json", "Cache-Control": "max-age=300" },
        });
      },
    },
  },
});
