import { useEffect, useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, Cpu, Image as ImageIcon, MessageSquare, Search, Check, Loader2 } from "lucide-react";
import { useModelPrefs } from "@/lib/modelStore";

type Model = { id: string; owned_by: string; bucket: "chat" | "image" };
type ApiResp = { chat: Model[]; image: Model[] };

let cache: Promise<ApiResp> | null = null;
function loadModels(): Promise<ApiResp> {
  if (!cache) {
    cache = fetch("/api/models")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Model list ${r.status}`))))
      .catch((e) => { cache = null; throw e; });
  }
  return cache;
}

export function ModelPicker() {
  const { prefs, setChat, setImage } = useModelPrefs();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"chat" | "image">("chat");
  const [data, setData] = useState<ApiResp | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open || data) return;
    loadModels().then(setData).catch((e) => setErr(e.message));
  }, [open, data]);

  const list = data?.[tab] ?? [];
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return list;
    return list.filter((m) => m.id.toLowerCase().includes(term) || m.owned_by.toLowerCase().includes(term));
  }, [list, q]);

  const grouped = useMemo(() => {
    const map = new Map<string, Model[]>();
    for (const m of filtered) {
      const arr = map.get(m.owned_by) ?? [];
      arr.push(m);
      map.set(m.owned_by, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const selected = tab === "chat" ? prefs.chat : prefs.image;
  const pick = (id: string) => {
    if (tab === "chat") setChat(id); else setImage(id);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex max-w-[10rem] items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs text-foreground outline-none hover:border-foreground/40"
          title={`Chat: ${prefs.chat}  •  Image: ${prefs.image}`}
        >
          <Cpu className="h-3 w-3 shrink-0" />
          <span className="truncate">{prefs.chat}</span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[320px] p-0">
        <div className="flex items-center gap-1 border-b border-border p-1.5">
          <button
            onClick={() => setTab("chat")}
            className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition ${tab === "chat" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
          >
            <MessageSquare className="h-3 w-3" /> Chat model
          </button>
          <button
            onClick={() => setTab("image")}
            className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition ${tab === "image" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
          >
            <ImageIcon className="h-3 w-3" /> Image model
          </button>
        </div>
        <div className="flex items-center gap-2 border-b border-border px-2 py-1.5">
          <Search className="h-3 w-3 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${tab} models`}
            className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
            autoFocus
          />
        </div>
        <div className="max-h-72 overflow-y-auto py-1 text-xs">
          {err ? (
            <div className="px-3 py-4 text-muted-foreground">Couldn't load models: {err}</div>
          ) : !data ? (
            <div className="flex items-center gap-2 px-3 py-4 text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Fetching models from lava.so…
            </div>
          ) : grouped.length === 0 ? (
            <div className="px-3 py-4 text-muted-foreground">No matches.</div>
          ) : (
            grouped.map(([provider, models]) => (
              <div key={provider} className="pb-1">
                <div className="px-3 pb-0.5 pt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {provider}
                </div>
                {models.map((m) => {
                  const active = m.id === selected;
                  return (
                    <button
                      key={m.id}
                      onClick={() => { pick(m.id); setOpen(false); }}
                      className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left transition hover:bg-muted ${active ? "bg-muted" : ""}`}
                    >
                      <span className="truncate font-mono text-[11px] text-foreground">{m.id}</span>
                      {active && <Check className="h-3 w-3 shrink-0 text-primary" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground">
          Routed through <span className="font-medium text-foreground">lava.so</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
