import { useCallback, useRef, useState } from "react";
import { BuildLifecycle, type BuildLease, type BuildStatus } from "@/lib/build-lifecycle";

export function useCardBuild() {
  const lifecycle = useRef(new BuildLifecycle());
  const [status, setStatus] = useState<BuildStatus>("idle");

  const start = useCallback(() => {
    const lease = lifecycle.current.start();
    setStatus("planning");
    return lease;
  }, []);

  const isCurrent = useCallback((lease: BuildLease) => lifecycle.current.isCurrent(lease), []);

  const setBuildStatus = useCallback((lease: BuildLease, next: BuildStatus) => {
    if (lifecycle.current.isCurrent(lease)) setStatus(next);
  }, []);

  const cancel = useCallback(() => {
    lifecycle.current.cancel();
    setStatus("idle");
  }, []);

  return { status, start, isCurrent, setBuildStatus, cancel };
}
