import { useEffect, useState } from "react";
import { Confetti } from "./templates/Confetti";
import { Fireworks } from "./templates/Fireworks";
import { KineticSerif } from "./templates/KineticSerif";
import { Hearts } from "./templates/Hearts";
import { Starfield } from "./templates/Starfield";
import { Ribbons } from "./templates/Ribbons";
import { AISnippet } from "./AISnippet";
import { OpeningGate } from "./OpeningGate";
import { isCardSpecV2, type CodeSpec } from "./registry";
import { CardRenderer } from "./CardRenderer";

export function CodedCard({
  spec,
  awaitTap = false,
  recipientName,
}: {
  spec: CodeSpec;
  /** When true, show the tap-to-open gate before playing the animation. */
  awaitTap?: boolean;
  recipientName?: string | null;
}) {
  const [opened, setOpened] = useState(!awaitTap);

  // Reset the gate whenever the spec identity changes (e.g. share pages
  // that hot-swap between cards in preview).
  useEffect(() => {
    setOpened(!awaitTap);
  }, [spec.seed, spec.template, awaitTap]);

  if (awaitTap && !opened) {
    return (
      <OpeningGate
        palette={
          isCardSpecV2(spec)
            ? [spec.theme.background, spec.theme.ink, spec.theme.accent]
            : spec.palette
        }
        recipientName={recipientName}
        onOpen={() => setOpened(true)}
      />
    );
  }

  if (isCardSpecV2(spec)) return <CardRenderer spec={spec} />;

  const props = {
    phrase: spec.phrase,
    message: spec.message ?? "",
    palette: spec.palette,
    tempo: spec.tempo,
    seed: spec.seed,
  };
  switch (spec.template) {
    case "confetti":
      return <Confetti {...props} />;
    case "fireworks":
      return <Fireworks {...props} />;
    case "kinetic":
      return <KineticSerif {...props} />;
    case "hearts":
      return <Hearts {...props} />;
    case "starfield":
      return <Starfield {...props} />;
    case "ribbons":
      return <Ribbons {...props} />;
    case "ai":
      return spec.source ? (
        <AISnippet source={spec.source} {...props} />
      ) : (
        <KineticSerif {...props} />
      );
    default:
      return <KineticSerif {...props} />;
  }
}
