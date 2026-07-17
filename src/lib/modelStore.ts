import { useCallback, useEffect, useState } from "react";

const KEY = "pigeon.models.v1";
const DEFAULT_CHAT = "gemini-2.5-flash";
const DEFAULT_IMAGE = "gpt-image-1";

export type ModelPrefs = { chat: string; image: string };

const listeners = new Set<(m: ModelPrefs) => void>();
let current: ModelPrefs = { chat: DEFAULT_CHAT, image: DEFAULT_IMAGE };
let hydrated = false;

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ModelPrefs>;
      current = {
        chat: parsed.chat || DEFAULT_CHAT,
        image: parsed.image || DEFAULT_IMAGE,
      };
    }
  } catch {
    /* ignore */
  }
}

export function useModelPrefs() {
  hydrate();
  const [state, setState] = useState<ModelPrefs>(current);
  useEffect(() => {
    const cb = (m: ModelPrefs) => setState(m);
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }, []);

  const update = useCallback((patch: Partial<ModelPrefs>) => {
    current = { ...current, ...patch };
    try {
      localStorage.setItem(KEY, JSON.stringify(current));
    } catch {
      /* ignore */
    }
    listeners.forEach((l) => l(current));
  }, []);

  return {
    prefs: state,
    setChat: (v: string) => update({ chat: v }),
    setImage: (v: string) => update({ image: v }),
  };
}
