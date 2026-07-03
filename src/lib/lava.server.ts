// Server-only helpers for calling the lava.so gateway.
// lava.so is OpenAI-compatible: one Bearer key, model id in the body.

export const LAVA_BASE = "https://api.lava.so/v1";

export const DEFAULT_CHAT_MODEL = "gemini-2.5-flash";
export const DEFAULT_IMAGE_MODEL = "gpt-image-1";

export function lavaKey(): string {
  const k = process.env.LAVA_SECRET_KEY;
  if (!k) throw new Error("Missing LAVA_SECRET_KEY. Add it in project secrets.");
  return k;
}

type ChatOpts = {
  json?: boolean; // request response_format: json_object
  temperature?: number;
  maxTokens?: number;
};


export async function lavaChat(
  model: string | undefined,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  opts: ChatOpts = {},
): Promise<string> {
  const key = lavaKey();

  // Defensive: some providers (Anthropic, some OpenAI variants) reject
  // conversations that end with an assistant turn ("assistant prefill").
  // Trim trailing assistant messages so the last turn is always user.
  // System messages at the head are fine and are preserved.
  const safeMessages = [...messages];
  while (
    safeMessages.length &&
    safeMessages[safeMessages.length - 1].role === "assistant"
  ) {
    safeMessages.pop();
  }
  if (!safeMessages.some((m) => m.role === "user")) {
    safeMessages.push({ role: "user", content: "Continue." });
  }

  const resolvedModel = model?.trim() || DEFAULT_CHAT_MODEL;

  // Some providers (Anthropic/Claude, some Gemini variants) reject
  // response_format: json_object because lava implements it via assistant
  // prefill, which those models forbid. Detect and skip; the prompt already
  // instructs JSON-only output and extractJson tolerates stray prose.
  const forbidsJsonMode = /claude|anthropic|opus|sonnet|haiku/i.test(resolvedModel);

  const body: Record<string, unknown> = {
    model: resolvedModel,
    messages: safeMessages,
    max_tokens: opts.maxTokens ?? 8192,
  };
  if (opts.json && !forbidsJsonMode) body.response_format = { type: "json_object" };
  if (typeof opts.temperature === "number") body.temperature = opts.temperature;

  const res = await fetch(`${LAVA_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 429) throw new Error(`Lava: rate limited — try again in a moment.`);
    if (res.status === 402) throw new Error(`Lava: wallet out of credits. Top up at lava.so.`);
    if (res.status === 401) throw new Error(`Lava: invalid LAVA_SECRET_KEY.`);
    if (res.status === 404) throw new Error(`Lava: model "${body.model}" not available. Pick another in the model picker.`);
    if (res.status === 413) throw new Error(`Lava: "${resolvedModel}" is too small for this prompt (token/minute limit exceeded). Pick a larger-context model like gemini-2.5-flash or gemini-2.5-pro in the model picker.`);
    throw new Error(`Lava ${res.status}: ${text.slice(0, 300) || res.statusText}`);
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
  };
  const choice = json.choices?.[0];
  const content = choice?.message?.content?.trim();
  if (!content) {
    const reason = choice?.finish_reason;
    if (reason === "length" || reason === "max_tokens") {
      throw new Error(`Lava: "${resolvedModel}" hit its output cap before writing anything. Try a different model in the picker.`);
    }
    if (reason === "content_filter" || reason === "safety") {
      throw new Error(`Lava: "${resolvedModel}" refused this prompt (safety filter). Try rephrasing or switch model.`);
    }
    throw new Error(`Lava: "${resolvedModel}" returned an empty response${reason ? ` (finish_reason: ${reason})` : ""}. Try another model.`);
  }
  return content;
}

