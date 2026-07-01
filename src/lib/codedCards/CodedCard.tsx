import { Confetti } from "./templates/Confetti";
import { Fireworks } from "./templates/Fireworks";
import { KineticSerif } from "./templates/KineticSerif";
import { Hearts } from "./templates/Hearts";
import { Starfield } from "./templates/Starfield";
import { Ribbons } from "./templates/Ribbons";
import { AISnippet } from "./AISnippet";
import type { CodeSpec } from "./registry";

export function CodedCard({ spec }: { spec: CodeSpec }) {
  const props = {
    phrase: spec.phrase,
    message: spec.message ?? "",
    palette: spec.palette,
    tempo: spec.tempo,
    seed: spec.seed,
  };
  switch (spec.template) {
    case "confetti":  return <Confetti {...props} />;
    case "fireworks": return <Fireworks {...props} />;
    case "kinetic":   return <KineticSerif {...props} />;
    case "hearts":    return <Hearts {...props} />;
    case "starfield": return <Starfield {...props} />;
    case "ribbons":   return <Ribbons {...props} />;
    case "ai":        return spec.source ? <AISnippet source={spec.source} {...props} /> : <KineticSerif {...props} />;
    default:          return <KineticSerif {...props} />;
  }
}
