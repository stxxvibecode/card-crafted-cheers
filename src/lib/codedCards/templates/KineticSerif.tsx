export function KineticSerif({
  phrase,
  message,
  palette,
  tempo,
  seed,
}: {
  phrase: string;
  message?: string;
  palette: string[];
  tempo: number;
  seed: number;
}) {
  const [bg, ink, a1, a2] = palette;
  const words = phrase.split(" ");
  const dur = 0.9 / tempo;
  const variant = Math.abs(Math.floor(seed)) % 4;
  const split = variant === 1 || variant === 2;
  const textAlign = variant === 2 ? "right" : "left";
  const justify = variant === 3 ? "flex-end" : variant === 2 ? "flex-end" : "flex-start";
  const align =
    variant === 0
      ? "center"
      : variant === 1
        ? "flex-start"
        : variant === 2
          ? "flex-end"
          : "flex-start";
  const textWidth = split ? "48%" : "min(38rem, 88%)";
  const textPad =
    variant === 0
      ? "10%"
      : variant === 1
        ? "10% 8% 10% 10%"
        : variant === 2
          ? "10% 10% 10% 8%"
          : "12% 8% 14% 8%";
  const accentStyle =
    variant === 1
      ? { right: "6%", top: "50%", transform: "translateY(-50%)" }
      : variant === 2
        ? { left: "6%", top: "50%", transform: "translateY(-50%)" }
        : variant === 3
          ? { left: "50%", bottom: "10%", transform: "translateX(-50%)" }
          : { right: "12%", top: "14%" };

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ backgroundColor: bg }}>
      <style>{`
        @keyframes pgn-wash { 0%,100% { transform: translate(-10%, -10%) rotate(0deg); } 50% { transform: translate(10%, 10%) rotate(180deg); } }
        @keyframes pgn-rise { from { opacity: 0; transform: translateY(0.6em); filter: blur(6px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
        @keyframes pgn-hold { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
      <div
        aria-hidden
        className="absolute -inset-1/2 opacity-40"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${a1 ?? ink}66, transparent 60%), radial-gradient(circle at 70% 70%, ${a2 ?? ink}55, transparent 60%)`,
          animation: `pgn-wash ${16 / tempo}s ease-in-out infinite`,
          filter: "blur(40px)",
        }}
      />
      <div
        aria-hidden
        className="absolute rounded-full blur-3xl"
        style={{
          ...accentStyle,
          width: variant === 3 ? "28vmin" : "24vmin",
          height: variant === 3 ? "28vmin" : "24vmin",
          background: `radial-gradient(circle, ${a2 ?? a1 ?? ink}55 0%, transparent 70%)`,
          animation: `pgn-hold ${6 / tempo}s ease-in-out infinite alternate`,
        }}
      />
      <div
        className="absolute inset-0 flex"
        style={{
          alignItems: align,
          justifyContent: justify,
          padding: textPad,
        }}
      >
        <div
          className="flex flex-col gap-5"
          style={{
            width: textWidth,
            textAlign: split ? textAlign : "center",
            color: ink,
            fontFamily: '"Instrument Serif", serif',
          }}
        >
          <div
            style={{
              fontFamily: "ui-monospace,Menlo,monospace",
              fontSize: "11px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              opacity: 0.6,
            }}
          >
            № 001 — for you
          </div>
          <h1
            style={{
              fontSize: "clamp(2.5rem, 8vw, 5rem)",
              lineHeight: 1.02,
              letterSpacing: "-0.02em",
              fontStyle: "italic",
            }}
          >
            {words.map((w, i) => (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  marginRight: "0.25em",
                  opacity: 0,
                  animation: `pgn-rise ${dur}s cubic-bezier(0.2,0.7,0.2,1) ${0.15 * i}s forwards`,
                }}
              >
                {w}
              </span>
            ))}
          </h1>
          {message ? (
            <p
              style={{
                fontSize: "clamp(0.95rem, 1.6vw, 1.25rem)",
                lineHeight: 1.42,
                maxWidth: split ? "34ch" : "36ch",
                opacity: 0.82,
                alignSelf: split ? (variant === 2 ? "flex-end" : "flex-start") : "center",
                animation: `pgn-rise ${dur}s cubic-bezier(0.2,0.7,0.2,1) ${0.15 * words.length + 0.1}s both`,
              }}
            >
              {message}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
