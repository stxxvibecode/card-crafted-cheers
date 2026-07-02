import { useMemo } from "react";
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
  const html = useMemo(
    () => buildSrcDoc(source, phrase, message ?? "", palette, tempo, seed),
    [source, phrase, message, palette, tempo, seed],
  );
  return (
    <iframe
      title="Coded card"
      sandbox="allow-scripts"
      className="h-full w-full border-0"
      srcDoc={html}
    />
  );
}

function buildSrcDoc(source: string, phrase: string, message: string, palette: string[], tempo: number, seed: number): string {
  const safe = safeSnippetOrFallback(source);
  const bg = palette[0] ?? "#000";
  const data = JSON.stringify({ phrase, message, palette, tempo, seed });
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;height:100%;background:${bg};overflow:hidden;font-family:'Instrument Serif',serif;color:#fff;}
    #card{position:relative;width:100%;height:100%;}
  </style></head><body><div id="card"></div><script>
    (function(){
      const container = document.getElementById('card');
      const { phrase, message, palette, tempo, seed } = ${data};
      try {
        (new Function('container','phrase','message','palette','tempo','seed',${JSON.stringify(safe)}))(container, phrase, message, palette, tempo, seed);
      } catch (e) {
        container.innerHTML = '<div style="display:grid;place-items:center;height:100%;padding:2rem;text-align:center;"><div style="font-size:2rem;margin-bottom:1rem;">' + phrase + '</div><div style="font-size:1rem;opacity:0.8;max-width:80%;line-height:1.4;">' + (message||'') + '</div></div>';
      }
    })();
  <\/script></body></html>`;
}
