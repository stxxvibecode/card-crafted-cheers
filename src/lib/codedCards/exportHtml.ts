import type { CodeSpec } from "./registry";
import { safeSnippetOrFallback } from "./sanitize";

type ExportMeta = {
  recipientName?: string | null;
  senderName?: string | null;
  message?: string | null;
  occasion?: string | null;
};

/**
 * Builds a single self-contained HTML document that renders the same tap-to-open
 * gate + animation the recipient sees on the share page. Works offline and can
 * be dropped into email, a static host, or downloaded to disk.
 *
 * Supported today for AI-generated cards (spec.template === "ai"); returns null
 * for the built-in named templates.
 */
export function buildStandaloneHtml(spec: CodeSpec, meta: ExportMeta = {}): string | null {
  if (spec.template !== "ai" || !spec.source) return null;

  const safe = safeSnippetOrFallback(spec.source);
  const bg = spec.palette[0] ?? "#0f0f14";
  const accent = spec.palette[2] ?? spec.palette[1] ?? "#c9a961";
  const ink = isLight(bg) ? "#1a1a1a" : "#f8f5ef";

  const recipient = escapeHtml(meta.recipientName?.trim() || "");
  const sender = escapeHtml(meta.senderName?.trim() || "");
  const message = escapeHtml((meta.message ?? spec.message ?? "").trim());
  const occasion = escapeHtml(meta.occasion?.trim() || "");
  const title = recipient ? `A card for ${recipient}` : "A card from Pigeon";

  const data = JSON.stringify({
    phrase: spec.phrase,
    message: spec.message ?? meta.message ?? "",
    palette: spec.palette,
    tempo: spec.tempo,
    seed: spec.seed,
  });

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
<title>${title}</title>
<style>
  :root { color-scheme: dark light; }
  *,*::before,*::after{box-sizing:border-box;}
  html,body{margin:0;padding:0;height:100%;background:${bg};color:${ink};font-family:"Instrument Serif","Georgia",serif;overscroll-behavior:none;}
  #stage{position:relative;width:100vw;height:100vh;overflow:hidden;}
  #card{position:absolute;inset:0;opacity:0;transition:opacity 400ms ease;}
  #card.open{opacity:1;}
  #gate{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.5rem;padding:2rem;text-align:center;cursor:pointer;background:${bg};color:${ink};border:0;font:inherit;transition:opacity 400ms ease,transform 400ms ease;}
  #gate.closing{opacity:0;transform:scale(.98);pointer-events:none;}
  #seal{width:4rem;height:4rem;border-radius:9999px;display:grid;place-items:center;background:${accent};color:${bg};box-shadow:0 20px 50px -20px ${accent}80;}
  #seal svg{width:1.6rem;height:1.6rem;}
  #kicker{font-family:ui-monospace,Menlo,monospace;font-size:10px;letter-spacing:.28em;text-transform:uppercase;opacity:.7;}
  #cta{font-size:clamp(2rem,6vw,3rem);line-height:1.05;letter-spacing:-.01em;}
  #for{font-style:italic;opacity:.7;font-size:1rem;padding-top:.5rem;}
  #note{position:absolute;left:0;right:0;bottom:0;padding:1.25rem 1.5rem 1.75rem;background:linear-gradient(to top,rgba(0,0,0,.35),transparent);color:${ink};font-family:"Instrument Serif",Georgia,serif;font-size:clamp(1rem,2.2vw,1.35rem);line-height:1.5;font-style:italic;text-align:center;opacity:0;transition:opacity 600ms ease 400ms;pointer-events:none;}
  #card.open ~ #note{opacity:1;}
  #sig{display:block;margin-top:.5rem;font-size:.8rem;letter-spacing:.14em;text-transform:uppercase;font-style:normal;opacity:.7;}
  @media (prefers-reduced-motion:reduce){
    #card,#gate,#note{transition:none;}
  }
</style>
</head>
<body>
<main id="stage" aria-label="${title}">
  <button id="gate" type="button" aria-label="Tap to open card">
    <div id="seal" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
    </div>
    <div>
      <div id="kicker">${occasion ? `A ${occasion.toLowerCase()} card is waiting` : "A card is waiting"}</div>
      <div id="cta">Tap to open</div>
      ${recipient ? `<div id="for">for ${recipient}</div>` : ""}
    </div>
  </button>
  <div id="card" role="img" aria-label="${title}"></div>
  ${message ? `<figcaption id="note">“${message}”${sender ? `<span id="sig">— ${sender}</span>` : ""}</figcaption>` : ""}
</main>
<script>
(function(){
  var gate = document.getElementById('gate');
  var card = document.getElementById('card');
  var started = false;
  function start(){
    if (started) return; started = true;
    gate.classList.add('closing');
    setTimeout(function(){ gate.remove(); }, 420);
    requestAnimationFrame(function(){ card.classList.add('open'); play(); });
  }
  function play(){
    var payload = ${data};
    try {
      var fn = new Function('container','phrase','message','palette','tempo','seed', ${JSON.stringify(safe)});
      fn(card, payload.phrase, payload.message, payload.palette, payload.tempo, payload.seed);
    } catch (e) {
      card.innerHTML = '<div style="display:grid;place-items:center;height:100%;padding:2rem;text-align:center;font-family:Instrument Serif,serif;">' +
        '<div><div style="font-size:2.25rem;line-height:1.05;">' + payload.phrase + '</div>' +
        (payload.message ? '<div style="margin-top:1rem;font-size:1rem;opacity:.8;max-width:36ch;line-height:1.5;">' + payload.message + '</div>' : '') +
        '</div></div>';
    }
  }
  gate.addEventListener('click', start);
  gate.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); start(); } });
})();
</script>
</body>
</html>`;
}

/** Triggers a client-side download of the standalone card HTML. */
export function downloadStandaloneHtml(
  spec: CodeSpec,
  meta: ExportMeta = {},
  filename?: string,
): boolean {
  if (typeof window === "undefined") return false;
  const html = buildStandaloneHtml(spec, meta);
  if (!html) return false;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? `pigeon-card-${(spec.seed || Date.now()).toString(36).slice(-6)}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

function isLight(hex: string): boolean {
  const m = hex.replace("#", "");
  const full =
    m.length === 3
      ? m
          .split("")
          .map((c) => c + c)
          .join("")
      : m.slice(0, 6);
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return false;
  const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return l > 0.6;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
