export function KineticSerif({ phrase, palette, tempo }: { phrase: string; palette: string[]; tempo: number; seed: number }) {
  const [bg, ink, a1, a2] = palette;
  const words = phrase.split(" ");
  const dur = 0.9 / tempo;
  return (
    <div className="relative h-full w-full overflow-hidden" style={{ backgroundColor: bg }}>
      <style>{`
        @keyframes pgn-wash { 0%,100% { transform: translate(-10%, -10%) rotate(0deg); } 50% { transform: translate(10%, 10%) rotate(180deg); } }
        @keyframes pgn-rise { from { opacity: 0; transform: translateY(0.6em); filter: blur(6px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
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
      <div className="absolute inset-0 grid place-items-center px-8 text-center">
        <h1
          style={{
            color: ink,
            fontFamily: '"Instrument Serif", serif',
            fontSize: "clamp(2.75rem, 9vw, 5.5rem)",
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
      </div>
    </div>
  );
}
