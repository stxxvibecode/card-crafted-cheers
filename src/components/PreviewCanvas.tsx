import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Monitor, Smartphone, Tablet, Maximize2, X } from "lucide-react";

export type DeviceMode = "mobile" | "tablet" | "desktop";
export type ZoomMode = "fit" | 0.75 | 1 | 1.25;

const DEVICE_WIDTHS: Record<DeviceMode, number> = {
  mobile: 375,
  tablet: 640,
  desktop: 900,
};

const SAFE_PADDING = 24;

/**
 * A polished, Lovable-style preview canvas.
 *
 * - Fit-to-screen scaling by default: the card is always fully visible.
 * - Centered horizontally + vertically when it fits, with safe padding.
 * - No overflow-hidden: when zoomed past the viewport the canvas scrolls.
 * - Zoom controls (Fit / 75% / 100% / 125%), device modes, and a
 *   full-screen recipient preview.
 * - The card keeps a square aspect ratio at every zoom level.
 */
export function PreviewCanvas({
  children,
  fullscreenContent,
  aspectRatio = 1,
  busyBadge,
}: {
  /** Card content — rendered inside a square (or aspectRatio) stage that it should fill. */
  children: React.ReactNode;
  /** Optional distinct content for the full-screen recipient preview (e.g. with the tap-to-open gate). */
  fullscreenContent?: React.ReactNode;
  /** Height / width ratio of the card stage. Defaults to square. */
  aspectRatio?: number;
  /** Optional floating badge (e.g. "updating…"). */
  busyBadge?: React.ReactNode;
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [avail, setAvail] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [zoom, setZoom] = useState<ZoomMode>("fit");
  const [device, setDevice] = useState<DeviceMode>("desktop");
  const [fullscreen, setFullscreen] = useState(false);

  const measure = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    setAvail({ w: el.clientWidth, h: el.clientHeight });
  }, []);

  useLayoutEffect(() => {
    measure();
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [fullscreen]);

  const baseW = DEVICE_WIDTHS[device];
  const baseH = Math.round(baseW * aspectRatio);

  const scale = useMemo(() => {
    if (zoom !== "fit") return zoom;
    const w = avail.w - SAFE_PADDING * 2;
    const h = avail.h - SAFE_PADDING * 2;
    if (w <= 0 || h <= 0) return 1;
    return Math.min(w / baseW, h / baseH, 1.5);
  }, [zoom, avail, baseW, baseH]);

  const scaledW = Math.round(baseW * scale);
  const scaledH = Math.round(baseH * scale);

  const stage = (
    <div className="relative" style={{ width: scaledW, height: scaledH, flex: "none" }}>
      <div
        className="absolute left-0 top-0 overflow-visible rounded-2xl border border-border bg-background shadow-[0_30px_80px_-30px_rgba(0,0,0,0.35)]"
        style={{
          width: baseW,
          height: baseH,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
      {busyBadge}
    </div>
  );

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* Canvas viewport — scrolls when the card is larger than the space. */}
      <div
        ref={viewportRef}
        className="relative min-h-0 flex-1 overflow-auto rounded-t-3xl bg-[radial-gradient(circle_at_50%_30%,oklch(0.97_0.005_80),transparent_70%)] bg-muted/40 [background-size:22px_22px] [background-image:radial-gradient(oklch(0.85_0.01_80_/_0.5)_1px,transparent_1px)]"
      >
        <div
          className="flex min-h-full min-w-full items-center justify-center"
          style={{ padding: SAFE_PADDING }}
        >
          {stage}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-card/80 px-3 py-2 backdrop-blur">
        <div className="inline-flex rounded-full border border-border bg-background p-0.5 text-[11px]">
          {(["fit", 0.75, 1, 1.25] as ZoomMode[]).map((z) => (
            <button
              key={String(z)}
              onClick={() => setZoom(z)}
              className={`rounded-full px-2.5 py-1 transition ${zoom === z ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
            >
              {z === "fit" ? "Fit" : `${Math.round((z as number) * 100)}%`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-full border border-border bg-background p-0.5">
            {(
              [
                ["mobile", Smartphone],
                ["tablet", Tablet],
                ["desktop", Monitor],
              ] as [DeviceMode, typeof Smartphone][]
            ).map(([d, Icon]) => (
              <button
                key={d}
                onClick={() => setDevice(d)}
                title={d[0].toUpperCase() + d.slice(1)}
                aria-label={`${d} preview`}
                className={`grid h-7 w-8 place-items-center rounded-full transition ${device === d ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
          <button
            onClick={() => setFullscreen(true)}
            title="Full-screen recipient preview"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-[11px] text-muted-foreground transition hover:text-foreground"
          >
            <Maximize2 className="h-3.5 w-3.5" /> Preview
          </button>
        </div>
      </div>

      {/* Full-screen recipient preview */}
      {fullscreen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex flex-col bg-background/95 backdrop-blur-xl">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Recipient preview
              </span>
              <button
                onClick={() => setFullscreen(false)}
                aria-label="Close preview"
                className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-muted-foreground transition hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto p-4 sm:items-center sm:p-8">
              <div
                className="w-full overflow-visible rounded-3xl border border-border shadow-[0_60px_140px_-50px_rgba(0,0,0,0.6)]"
                style={{
                  maxWidth: `min(92vw, calc((100dvh - 140px) / ${aspectRatio}))`,
                  aspectRatio: `1 / ${aspectRatio}`,
                }}
              >
                {fullscreenContent ?? children}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
