// Shared safety guard for AI-authored card snippets.
// Used both by the in-app iframe runner (AISnippet) and the standalone HTML
// export, so both surfaces enforce the same rules.

export const FORBIDDEN_TOKENS = /\b(import|require|fetch|XMLHttpRequest|window\.parent|top\.|document\.cookie|localStorage|indexedDB|navigator\.sendBeacon|<script)\b/i;

export const MAX_SNIPPET_CHARS = 12_000;

export type SanitizeResult =
  | { ok: true; source: string }
  | { ok: false; reason: "too_large" | "forbidden_token" };

export function sanitizeSnippet(src: string): SanitizeResult {
  if (src.length > MAX_SNIPPET_CHARS) return { ok: false, reason: "too_large" };
  if (FORBIDDEN_TOKENS.test(src)) return { ok: false, reason: "forbidden_token" };
  return { ok: true, source: src };
}

// Legacy convenience: returns a safe replacement snippet when sanitization
// fails, so callers that want an always-string result can drop it in.
export function safeSnippetOrFallback(src: string): string {
  const r = sanitizeSnippet(src);
  if (r.ok) return r.source;
  if (r.reason === "too_large") return `container.innerText = 'Snippet too large';`;
  return `container.innerText = 'Snippet rejected';`;
}
