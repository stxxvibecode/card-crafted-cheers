import { useEffect, useMemo, useRef, useState } from "react";
import { safeSnippetOrFallback } from "./sanitize";

// Runs untrusted AI-authored JS inside a sandboxed iframe.
// The snippet is a function body that receives:
//   { container, phrase, message, palette, tempo, seed }
// and sets up DOM/canvas animations inside `container`.
export function AISnippet({
  source,
  phrase,
  message,
  palette,
  tempo,
  seed,
}: {
  source: string;
  phrase: string;
  message?: string;
  palette: string[];
  tempo: number;
  seed: number;
}) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [contentH, setContentH] = useState<number | null>(null);
  const html = useMemo(
    () => buildSrcDoc(source, phrase, message ?? "", palette, tempo, seed),
    [source, phrase, message, palette, tempo, seed],
  );

  // Listen for height reports from the sandboxed document. If the card's
  // content is taller than the stage, grow the wrapper so nothing is cut off
  // (the surrounding canvas scrolls instead of clipping).
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.source !== frameRef.current?.contentWindow) return;
      const d = e.data as { type?: string; height?: number };
      if (d?.type === "pigeon:card-height" && typeof d.height === "number") {
        setContentH(d.height > 0 ? d.height : null);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <iframe
      ref={frameRef}
      title="Coded card"
      sandbox="allow-scripts"
      className="w-full border-0"
      style={{
        height: "100%",
        minHeight: contentH ? `${contentH}px` : undefined,
        display: "block",
      }}
      srcDoc={html}
    />
  );
}

function buildSrcDoc(
  source: string,
  phrase: string,
  message: string,
  palette: string[],
  tempo: number,
  seed: number,
): string {
  const safe = safeSnippetOrFallback(source);
  const bg = palette[0] ?? "#000";
  const data = JSON.stringify({ phrase, message, palette, tempo, seed });
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;min-height:100%;background:${bg};overflow:visible;font-family:'Instrument Serif',serif;color:#fff;}
    #card{position:relative;width:100%;height:100vh;min-height:100vh;overflow:visible;}
  </style></head><body><div id="card"></div><script>
    (function(){
      const container = document.getElementById('card');
      const { phrase, message, palette, tempo, seed } = ${data};
      try {
        (new Function('container','phrase','message','palette','tempo','seed',${JSON.stringify(safe)}))(container, phrase, message, palette, tempo, seed);
        container.style.overflow = 'visible';
      } catch (e) {
        container.innerHTML = '<div style="display:grid;place-items:center;height:100%;padding:2rem;text-align:center;"><div style="font-size:2rem;margin-bottom:1rem;">' + phrase + '</div><div style="font-size:1rem;opacity:0.8;max-width:80%;line-height:1.4;">' + (message||'') + '</div></div>';
      }
      // Report content height to the parent so the preview wrapper can
      // resize and never clip the card.
      function report(){
        try {
          const rects = Array.from(container.children).map((el) => el.getBoundingClientRect());
          const maxBottom = rects.reduce((m, r) => Math.max(m, r.bottom), container.getBoundingClientRect().bottom);
          const h = Math.ceil(Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, container.scrollHeight, maxBottom));
          parent.postMessage({ type: 'pigeon:card-height', height: h }, '*');
        } catch (e) { /* sandboxed, ignore */ }
      }
      report();
      setTimeout(report, 400);
      setTimeout(report, 1500);
      if (typeof ResizeObserver !== 'undefined') {
        new ResizeObserver(report).observe(container);
      }
    })();
  </script></body></html>`;
}
