import { useEffect, useMemo, useState } from "react";
import { Copy, Check, Play, Pencil, X } from "lucide-react";
import { isCardSpecV2, type CodeSpec } from "./registry";
import { getTemplateSource } from "./registry";

// Very small syntax highlighter — no external deps. Just enough for read-only display.
function highlight(src: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // Split tokens with a single pass over strings, comments, keywords, numbers.
  const parts: Array<{ kind: string; text: string }> = [];
  let i = 0;
  const keywords = new Set([
    "const",
    "let",
    "var",
    "function",
    "return",
    "if",
    "else",
    "for",
    "while",
    "new",
    "class",
    "extends",
    "of",
    "in",
    "typeof",
    "instanceof",
    "true",
    "false",
    "null",
    "undefined",
    "this",
    "try",
    "catch",
    "finally",
    "throw",
    "async",
    "await",
    "import",
    "export",
    "from",
    "default",
    "break",
    "continue",
  ]);
  while (i < src.length) {
    const c = src[i];
    // Comments
    if (c === "/" && src[i + 1] === "/") {
      const end = src.indexOf("\n", i);
      const to = end === -1 ? src.length : end;
      parts.push({ kind: "cm", text: src.slice(i, to) });
      i = to;
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      const to = end === -1 ? src.length : end + 2;
      parts.push({ kind: "cm", text: src.slice(i, to) });
      i = to;
      continue;
    }
    // Strings
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      let j = i + 1;
      while (j < src.length) {
        if (src[j] === "\\") {
          j += 2;
          continue;
        }
        if (src[j] === quote) {
          j++;
          break;
        }
        j++;
      }
      parts.push({ kind: "st", text: src.slice(i, j) });
      i = j;
      continue;
    }
    // Numbers
    if (/[0-9]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9._eE+-]/.test(src[j])) j++;
      parts.push({ kind: "nu", text: src.slice(i, j) });
      i = j;
      continue;
    }
    // Identifiers / keywords
    if (/[A-Za-z_$]/.test(c)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_$]/.test(src[j])) j++;
      const word = src.slice(i, j);
      parts.push({ kind: keywords.has(word) ? "kw" : "id", text: word });
      i = j;
      continue;
    }
    // Anything else
    parts.push({ kind: "pn", text: c });
    i++;
  }
  return parts
    .map((p) => {
      const t = escape(p.text);
      if (p.kind === "cm") return `<span class="text-muted-foreground/70 italic">${t}</span>`;
      if (p.kind === "st")
        return `<span class="text-emerald-700 dark:text-emerald-400">${t}</span>`;
      if (p.kind === "nu") return `<span class="text-amber-700 dark:text-amber-400">${t}</span>`;
      if (p.kind === "kw")
        return `<span class="text-fuchsia-700 dark:text-fuchsia-400 font-medium">${t}</span>`;
      return t;
    })
    .join("");
}

export function CodeViewer({
  spec,
  onEdit,
}: {
  spec: CodeSpec;
  onEdit?: (source: string) => void;
}) {
  const source = useMemo(() => {
    if (isCardSpecV2(spec)) return "// CardSpec v2 cards are rendered by Pigeon's shared runtime.";
    if (spec.template === "ai") return spec.source ?? "// no source";
    return getTemplateSource(spec.template) ?? "// template source unavailable";
  }, [spec]);

  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(source);

  useEffect(() => {
    setDraft(source);
  }, [source]);

  const isAi = spec.template === "ai";
  const html = useMemo(() => highlight(source), [source]);
  const lines = source.split("\n").length;

  async function copy() {
    try {
      await navigator.clipboard.writeText(source);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border bg-background/50 px-3 py-2 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
            {spec.template === "ai" ? "generated.js" : `${spec.template}.tsx`}
          </span>
          <span>{lines} lines</span>
          {!isAi && <span className="text-[10px]">(template — switch to AI to edit)</span>}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={copy}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
          {isAi && onEdit && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Pencil className="h-3 w-3" /> Edit
            </button>
          )}
          {editing && (
            <>
              <button
                onClick={() => {
                  setDraft(source);
                  setEditing(false);
                }}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-3 w-3" /> Cancel
              </button>
              <button
                onClick={() => {
                  onEdit?.(draft);
                  setEditing(false);
                }}
                className="inline-flex items-center gap-1 rounded-md bg-foreground px-2 py-1 text-background hover:opacity-90"
              >
                <Play className="h-3 w-3" /> Run
              </button>
            </>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-background">
        {editing ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
            className="h-full min-h-[400px] w-full resize-none bg-background p-3 font-mono text-[12px] leading-relaxed text-foreground outline-none"
          />
        ) : (
          <pre className="m-0 whitespace-pre p-3 font-mono text-[12px] leading-relaxed text-foreground">
            <code dangerouslySetInnerHTML={{ __html: html }} />
          </pre>
        )}
      </div>
    </div>
  );
}
