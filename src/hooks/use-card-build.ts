import { useCallback, useRef, useState } from "react";
import { BuildLifecycle, type BuildLease, type BuildStatus } from "@/lib/build-lifecycle";

export function useCardBuild() {
  const lifecycle = useRef(new BuildLifecycle());
  const [status, setStatus] = useState<BuildStatus>("idle");
  const [activity, setActivity] = useState<BuildStatus[]>([]);

  const start = useCallback(() => {
    const lease = lifecycle.current.start();
    setStatus("planning");
    setActivity(["planning"]);
    return lease;
  }, []);

  const isCurrent = useCallback((lease: BuildLease) => lifecycle.current.isCurrent(lease), []);

  const setBuildStatus = useCallback((lease: BuildLease, next: BuildStatus) => {
    if (lifecycle.current.isCurrent(lease)) {
      setStatus(next);
      setActivity((current) => (current.at(-1) === next ? current : [...current, next]));
    }
  }, []);

  const cancel = useCallback(() => {
    lifecycle.current.cancel();
    setStatus("idle");
    setActivity([]);
  }, []);

  return { status, activity, start, isCurrent, setBuildStatus, cancel };
}
