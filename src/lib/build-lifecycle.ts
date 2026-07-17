export type BuildStatus =
  "idle" | "planning" | "writing" | "designing" | "rendering" | "ready" | "failed";

export type BuildLease = {
  id: number;
  signal: AbortSignal;
};

export class BuildLifecycle {
  private activeId = 0;
  private controller: AbortController | null = null;

  start(): BuildLease {
    this.controller?.abort();
    this.controller = new AbortController();
    this.activeId += 1;
    return { id: this.activeId, signal: this.controller.signal };
  }

  isCurrent(lease: BuildLease): boolean {
    return this.activeId === lease.id && !lease.signal.aborted;
  }

  cancel(): void {
    this.controller?.abort();
  }
}
