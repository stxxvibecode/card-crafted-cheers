import type { CSSProperties } from "react";
import type { CardSpecV2 } from "./registry";

export type CardPart = "background" | "headline" | "message" | "event" | "action";
type Props = { spec: CardSpecV2; staticFrame?: boolean; onSelect?: (part: CardPart) => void };

function seeded(seed: number, index: number) {
  const value = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function motionStyle(spec: CardSpecV2, staticFrame: boolean): CSSProperties {
  if (staticFrame || spec.motion.reducedMotion || spec.motion.idle === "none") return {};
  const duration = `${Math.max(spec.motion.durationMs, 1800)}ms`;
  return {
    animation:
      spec.motion.idle === "pulse"
        ? `pigeon-pulse ${duration} ease-in-out infinite`
        : `pigeon-drift ${duration} ease-in-out infinite alternate`,
  };
}

function MotifLayer({ spec, staticFrame }: Props) {
  if (spec.motif.kind === "none") return null;
  const dots = Array.from({ length: spec.motif.kind === "confetti" ? 14 : 6 });
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {dots.map((_, index) => {
        const left = 8 + seeded(spec.seed, index) * 84;
        const top = 7 + seeded(spec.seed, index + 25) * 82;
        const size = 8 + seeded(spec.seed, index + 50) * 34 * (0.5 + spec.motif.intensity);
        const rotate = Math.round(seeded(spec.seed, index + 80) * 180);
        const base: CSSProperties = {
          left: `${left}%`,
          top: `${top}%`,
          width: `${size}%`,
          aspectRatio: "1",
          opacity: 0.15 + spec.motif.intensity * 0.28,
          background: spec.theme.accent,
          transform: `rotate(${rotate}deg)`,
          ...motionStyle(spec, staticFrame ?? false),
          animationDelay: `${-index * 330}ms`,
        };
        if (spec.motif.kind === "ribbon")
          return (
            <span
              key={index}
              className="absolute rounded-full"
              style={{ ...base, width: `${size * 3}%`, aspectRatio: "4", borderRadius: "999px" }}
            />
          );
        if (spec.motif.kind === "orbit")
          return (
            <span
              key={index}
              className="absolute rounded-full border"
              style={{ ...base, background: "transparent", borderColor: spec.theme.accent }}
            />
          );
        if (spec.motif.kind === "light")
          return (
            <span
              key={index}
              className="absolute rounded-full blur-2xl"
              style={{ ...base, width: `${size * 3}%`, background: spec.theme.accent }}
            />
          );
        return (
          <span
            key={index}
            className="absolute rounded-full"
            style={{ ...base, borderRadius: spec.motif.kind === "confetti" ? "2px" : "999px" }}
          />
        );
      })}
    </div>
  );
}

function Copy({
  spec,
  className = "",
  onSelect,
}: {
  spec: CardSpecV2;
  className?: string;
  onSelect?: (part: CardPart) => void;
}) {
  const { content, theme } = spec;
  return (
    <div className={`relative z-10 flex min-w-0 flex-col ${className}`}>
      {content.eyebrow && (
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] opacity-65 sm:text-xs">
          {content.eyebrow}
        </p>
      )}
      <h2
        data-card-part="headline"
        onClick={(event) => {
          event.stopPropagation();
          onSelect?.("headline");
        }}
        className="mt-3 text-balance text-[clamp(2.15rem,7.5vw,5.8rem)] leading-[0.94]"
        style={{
          fontFamily:
            theme.fontPair === "mono"
              ? "ui-monospace, Menlo, monospace"
              : '"Instrument Serif", Georgia, serif',
          letterSpacing: "0",
        }}
      >
        {content.headline}
      </h2>
      {content.message && (
        <p
          data-card-part="message"
          onClick={(event) => {
            event.stopPropagation();
            onSelect?.("message");
          }}
          className="mt-5 max-w-[37ch] whitespace-pre-wrap text-[clamp(0.92rem,2vw,1.16rem)] leading-relaxed opacity-85"
        >
          {content.message}
        </p>
      )}
      {content.sender && (
        <p className="mt-5 text-xs uppercase tracking-[0.16em] opacity-60">{content.sender}</p>
      )}
    </div>
  );
}

function EventDetails({
  spec,
  onSelect,
}: {
  spec: CardSpecV2;
  onSelect?: (part: CardPart) => void;
}) {
  const event = spec.content.event;
  if (!event || !Object.values(event).some(Boolean)) return null;
  return (
    <dl
      data-card-part="event"
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.("event");
      }}
      className="relative z-10 mt-7 grid gap-2 border-t border-current/20 pt-4 text-xs uppercase tracking-[0.14em] opacity-80 sm:grid-cols-3"
    >
      {event.date && (
        <div>
          <dt className="opacity-60">Date</dt>
          <dd className="mt-1 normal-case tracking-normal">{event.date}</dd>
        </div>
      )}
      {event.time && (
        <div>
          <dt className="opacity-60">Time</dt>
          <dd className="mt-1 normal-case tracking-normal">{event.time}</dd>
        </div>
      )}
      {event.location && (
        <div>
          <dt className="opacity-60">Place</dt>
          <dd className="mt-1 normal-case tracking-normal">{event.location}</dd>
        </div>
      )}
    </dl>
  );
}

function CardAction({ spec, onSelect }: { spec: CardSpecV2; onSelect?: (part: CardPart) => void }) {
  if (!spec.interaction?.labels?.length) return null;
  return (
    <div
      data-card-part="action"
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.("action");
      }}
      className="relative z-10 mt-6 flex flex-wrap gap-2"
    >
      {spec.interaction.labels.map((label) => (
        <span key={label} className="rounded-full border border-current/30 px-3 py-1.5 text-xs">
          {label}
        </span>
      ))}
    </div>
  );
}

export function CardRenderer({ spec, staticFrame = false, onSelect }: Props) {
  const base = {
    background: spec.theme.background,
    color: spec.theme.ink,
    fontFamily:
      spec.theme.fontPair === "modern"
        ? "ui-sans-serif, system-ui, sans-serif"
        : "ui-sans-serif, system-ui, sans-serif",
  };
  const entrance =
    staticFrame || spec.motion.reducedMotion || spec.motion.entrance === "none"
      ? ""
      : `animate-[pigeon-enter_${Math.max(spec.motion.durationMs, 400)}ms_cubic-bezier(.2,.7,.2,1)_both]`;
  const shared = (
    <>
      <MotifLayer spec={spec} staticFrame={staticFrame} />
      <Copy spec={spec} onSelect={onSelect} />
      <EventDetails spec={spec} onSelect={onSelect} />
      <CardAction spec={spec} onSelect={onSelect} />
    </>
  );
  if (spec.composition.layout === "split")
    return (
      <section
        data-card-spec="v2"
        onClick={() => onSelect?.("background")}
        className={`relative grid h-full min-h-0 w-full overflow-hidden sm:grid-cols-[1.1fr_.9fr] ${entrance}`}
        style={base}
      >
        <div className="relative flex min-h-0 flex-col justify-end p-[9%]">
          <Copy spec={spec} onSelect={onSelect} />
        </div>
        <div className="relative min-h-[34%] overflow-hidden border-t border-current/15 sm:border-l sm:border-t-0">
          <MotifLayer spec={spec} staticFrame={staticFrame} />
          <div
            className="absolute inset-[15%] rounded-full border border-current/30"
            style={motionStyle(spec, staticFrame)}
          />
        </div>
        <div className="absolute bottom-[9%] left-[9%] right-[9%]">
          <EventDetails spec={spec} onSelect={onSelect} />
          <CardAction spec={spec} onSelect={onSelect} />
        </div>
      </section>
    );
  if (spec.composition.layout === "ticket")
    return (
      <section
        data-card-spec="v2"
        onClick={() => onSelect?.("background")}
        className={`relative grid h-full min-h-0 w-full place-items-center overflow-hidden p-[6%] ${entrance}`}
        style={base}
      >
        <MotifLayer spec={spec} staticFrame={staticFrame} />
        <div className="relative w-full max-w-2xl border border-current/35 p-[8%] shadow-2xl">
          <div className="absolute left-0 right-0 top-[58%] border-t border-dashed border-current/40" />
          <Copy spec={spec} onSelect={onSelect} />
          <EventDetails spec={spec} onSelect={onSelect} />
          <CardAction spec={spec} onSelect={onSelect} />
        </div>
      </section>
    );
  return (
    <section
      data-card-spec="v2"
      onClick={() => onSelect?.("background")}
      className={`relative flex h-full min-h-0 w-full flex-col justify-between overflow-hidden p-[9%] ${entrance}`}
      style={base}
    >
      {shared}
    </section>
  );
}
