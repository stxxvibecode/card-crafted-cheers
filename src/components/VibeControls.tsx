import { useEffect, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  GitCommit,
  GitCompare,
  Palette,
  Type,
} from "lucide-react";
import type { CardSpecV2 } from "@/lib/codedCards/registry";
import type { CardPart } from "@/lib/codedCards/CardRenderer";
import type { CardSpecPatch } from "@/lib/codedCards/spec-patch";
import type { VersionHistory } from "@/lib/codedCards/version-history";

type Props = {
  spec: CardSpecV2;
  history: VersionHistory;
  busy: boolean;
  compareVersionId: string | null;
  onCompare: (id: string | null) => void;
  onMove: (direction: -1 | 1) => void;
  onSelectVersion: (id: string) => void;
  onPatch: (patches: CardSpecPatch[], name: string) => void;
  onCommand: (instruction: string) => void;
  selectedPart: CardPart | null;
};

const QUICK_COMMANDS = [
  ["Make it calmer", "Make it calmer. Keep the copy and layout."],
  ["More editorial", "Make it more editorial. Keep the copy."],
  ["Fix spacing", "Fix the spacing only. Keep the copy and palette."],
  ["Try another layout", "Try another layout. Keep the copy, palette, and motion."],
] as const;

export function VibeControls({
  spec,
  history,
  busy,
  compareVersionId,
  onCompare,
  onMove,
  onSelectVersion,
  onPatch,
  onCommand,
  selectedPart,
}: Props) {
  const [section, setSection] = useState<"copy" | "palette" | "motion">("copy");
  const [intensity, setIntensity] = useState(spec.motif.intensity);
  useEffect(() => setIntensity(spec.motif.intensity), [spec.motif.intensity]);
  useEffect(() => {
    if (selectedPart === "headline" || selectedPart === "message" || selectedPart === "event")
      setSection("copy");
    if (selectedPart === "background") setSection("palette");
    if (selectedPart === "action") setSection("motion");
  }, [selectedPart]);
  const current = history.versions[history.index];
  const previous = history.versions[history.index - 1];

  return (
    <div className="border-b border-border bg-card/70">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={history.index === 0 || busy}
          title="Undo"
          aria-label="Undo"
          className="grid h-8 w-8 place-items-center rounded-md border border-border disabled:opacity-35"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
          disabled={history.index >= history.versions.length - 1 || busy}
          title="Redo"
          aria-label="Redo"
          className="grid h-8 w-8 place-items-center rounded-md border border-border disabled:opacity-35"
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
        <div className="min-w-[150px] flex-1">
          <select
            value={current?.id}
            onChange={(event) => onSelectVersion(event.target.value)}
            className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
          >
            {history.versions.map((version, index) => (
              <option key={version.id} value={version.id}>
                v{index + 1} · {version.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={!previous}
          onClick={() => onCompare(compareVersionId ? null : (previous?.id ?? null))}
          className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs ${compareVersionId ? "border-primary bg-primary/10" : "border-border"}`}
        >
          <GitCompare className="h-3.5 w-3.5" /> Compare
        </button>
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
          <GitCommit className="h-3 w-3" /> {current?.changed.join(", ")}
        </span>
      </div>

      <div className="flex gap-1 overflow-x-auto border-t border-border/60 px-3 py-2">
        {QUICK_COMMANDS.map(([label, instruction]) => (
          <button
            key={label}
            type="button"
            disabled={busy}
            onClick={() => onCommand(instruction)}
            className="shrink-0 rounded-md border border-border bg-background px-2.5 py-1.5 text-[11px] hover:border-primary/50 disabled:opacity-40"
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border/60 px-3 py-2 text-[10px]">
        <span>
          <b className="font-medium text-muted-foreground">Copy</b> {spec.content.headline}
        </span>
        <span>
          <b className="font-medium text-muted-foreground">Layout</b> {spec.composition.layout}
        </span>
        <span className="inline-flex items-center gap-1">
          <b className="font-medium text-muted-foreground">Palette</b>
          <i
            className="h-3 w-3 rounded-full border"
            style={{ backgroundColor: spec.theme.accent }}
          />
        </span>
        <span>
          <b className="font-medium text-muted-foreground">Motion</b> {spec.motion.idle}
        </span>
        <span>
          <b className="font-medium text-muted-foreground">Action</b>{" "}
          {spec.interaction?.kind ?? "none"}
        </span>
      </div>

      <div className="grid border-t border-border/60 sm:grid-cols-[108px_1fr]">
        <div className="flex border-b border-border/60 sm:flex-col sm:border-b-0 sm:border-r">
          {(
            [
              ["copy", Type],
              ["palette", Palette],
              ["motion", Activity],
            ] as const
          ).map(([id, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              className={`flex flex-1 items-center gap-1.5 px-3 py-2 text-xs capitalize sm:flex-none ${section === id ? "bg-primary/10 text-foreground" : "text-muted-foreground"}`}
            >
              <Icon className="h-3.5 w-3.5" /> {id}
            </button>
          ))}
        </div>
        <div className="grid gap-2 p-3 sm:grid-cols-2">
          {section === "copy" && (
            <>
              <label className="text-[10px] uppercase text-muted-foreground">
                Headline
                <input
                  key={`${current?.id}-headline`}
                  defaultValue={spec.content.headline}
                  onBlur={(event) =>
                    event.target.value !== spec.content.headline &&
                    onPatch(
                      [{ path: "content.headline", value: event.target.value }],
                      "Headline edit",
                    )
                  }
                  className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-sm normal-case"
                />
              </label>
              <label className="text-[10px] uppercase text-muted-foreground">
                Message
                <input
                  key={`${current?.id}-message`}
                  defaultValue={spec.content.message}
                  onBlur={(event) =>
                    event.target.value !== spec.content.message &&
                    onPatch(
                      [{ path: "content.message", value: event.target.value }],
                      "Message edit",
                    )
                  }
                  className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-sm normal-case"
                />
              </label>
              {(spec.content.event || spec.composition.layout === "ticket") && (
                <>
                  {(
                    [
                      ["Date", "content.event.date", spec.content.event?.date],
                      ["Time", "content.event.time", spec.content.event?.time],
                      ["Location", "content.event.location", spec.content.event?.location],
                    ] as const
                  ).map(([label, path, value]) => (
                    <label key={path} className="text-[10px] uppercase text-muted-foreground">
                      {label}
                      <input
                        key={`${current?.id}-${path}`}
                        defaultValue={value ?? ""}
                        onBlur={(event) =>
                          event.target.value !== (value ?? "") &&
                          onPatch([{ path, value: event.target.value }], `${label} edit`)
                        }
                        className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-sm normal-case"
                      />
                    </label>
                  ))}
                </>
              )}
            </>
          )}
          {section === "palette" && (
            <>
              {(
                [
                  ["Background", "theme.background"],
                  ["Ink", "theme.ink"],
                  ["Accent", "theme.accent"],
                ] as const
              ).map(([label, path]) => (
                <label key={path} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="color"
                    value={
                      path === "theme.background"
                        ? spec.theme.background
                        : path === "theme.ink"
                          ? spec.theme.ink
                          : spec.theme.accent
                    }
                    onChange={(event) =>
                      onPatch([{ path, value: event.target.value }], `${label} color`)
                    }
                    className="h-9 w-12 cursor-pointer rounded-md border border-border bg-background p-1"
                  />{" "}
                  {label}
                </label>
              ))}
            </>
          )}
          {section === "motion" && (
            <>
              <label className="text-xs text-muted-foreground">
                Intensity
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={intensity}
                  onChange={(event) => setIntensity(Number(event.target.value))}
                  onPointerUp={() =>
                    intensity !== spec.motif.intensity &&
                    onPatch([{ path: "motif.intensity", value: intensity }], "Motion intensity")
                  }
                  onKeyUp={() =>
                    intensity !== spec.motif.intensity &&
                    onPatch([{ path: "motif.intensity", value: intensity }], "Motion intensity")
                  }
                  className="mt-2 w-full"
                />
              </label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={spec.motion.reducedMotion}
                  onChange={(event) =>
                    onPatch(
                      [{ path: "motion.reducedMotion", value: event.target.checked }],
                      "Reduced motion",
                    )
                  }
                />{" "}
                Reduced motion
              </label>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
