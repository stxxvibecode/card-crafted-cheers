import { CardSpecV2Schema, type CardSpecV2 } from "./registry";

export type CardVersion = {
  id: string;
  name: string;
  createdAt: number;
  spec: CardSpecV2;
  changed: string[];
};

export type VersionHistory = {
  versions: CardVersion[];
  index: number;
};

function cloneSpec(spec: CardSpecV2) {
  return CardSpecV2Schema.parse(structuredClone(spec));
}

export function createVersionHistory(spec: CardSpecV2, name = "First draft"): VersionHistory {
  return {
    versions: [
      {
        id: crypto.randomUUID(),
        name,
        createdAt: Date.now(),
        spec: cloneSpec(spec),
        changed: ["Initial card"],
      },
    ],
    index: 0,
  };
}

export function describeChanges(before: CardSpecV2, after: CardSpecV2): string[] {
  const changed: string[] = [];
  if (JSON.stringify(before.content) !== JSON.stringify(after.content)) changed.push("Copy");
  if (JSON.stringify(before.theme) !== JSON.stringify(after.theme)) changed.push("Palette");
  if (JSON.stringify(before.composition) !== JSON.stringify(after.composition))
    changed.push("Layout");
  if (JSON.stringify(before.motion) !== JSON.stringify(after.motion)) changed.push("Motion");
  if (JSON.stringify(before.motif) !== JSON.stringify(after.motif)) changed.push("Motif");
  if (JSON.stringify(before.interaction) !== JSON.stringify(after.interaction))
    changed.push("Interaction");
  return changed.length ? changed : ["Metadata"];
}

export function commitVersion(
  history: VersionHistory,
  spec: CardSpecV2,
  name: string,
): VersionHistory {
  const current = history.versions[history.index];
  if (current && JSON.stringify(current.spec) === JSON.stringify(spec)) return history;
  const versions = history.versions.slice(0, history.index + 1);
  versions.push({
    id: crypto.randomUUID(),
    name,
    createdAt: Date.now(),
    spec: cloneSpec(spec),
    changed: current ? describeChanges(current.spec, spec) : ["Initial card"],
  });
  return { versions, index: versions.length - 1 };
}

export function moveVersion(history: VersionHistory, direction: -1 | 1): VersionHistory {
  return {
    ...history,
    index: Math.max(0, Math.min(history.versions.length - 1, history.index + direction)),
  };
}

export function selectVersion(history: VersionHistory, id: string): VersionHistory {
  const index = history.versions.findIndex((version) => version.id === id);
  return index < 0 ? history : { ...history, index };
}
