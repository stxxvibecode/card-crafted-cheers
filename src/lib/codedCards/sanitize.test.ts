import { describe, expect, test } from "bun:test";
import { MAX_SNIPPET_CHARS, safeSnippetOrFallback, sanitizeSnippet } from "./sanitize";

describe("sanitizeSnippet", () => {
  test("allows a small local card animation", () => {
    const source = "container.textContent = phrase;";

    expect(sanitizeSnippet(source)).toEqual({ ok: true, source });
  });

  test.each([
    "fetch('https://example.com')",
    "window.parent.postMessage('hello', '*')",
    "document.cookie",
    "localStorage.getItem('session')",
    "<script>alert(1)</script>",
  ])("rejects forbidden browser capability: %s", (source) => {
    expect(sanitizeSnippet(source)).toEqual({ ok: false, reason: "forbidden_token" });
  });

  test("rejects oversized snippets", () => {
    expect(sanitizeSnippet("x".repeat(MAX_SNIPPET_CHARS + 1))).toEqual({
      ok: false,
      reason: "too_large",
    });
  });

  test("returns a harmless fallback for rejected snippets", () => {
    expect(safeSnippetOrFallback("fetch('/private')")).toContain("Snippet rejected");
  });
});
