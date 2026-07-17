import { describe, expect, test } from "bun:test";
import { BuildLifecycle } from "./build-lifecycle";

describe("BuildLifecycle", () => {
  test("marks prior builds stale when a new build starts", () => {
    const lifecycle = new BuildLifecycle();
    const first = lifecycle.start();
    const second = lifecycle.start();

    expect(first.signal.aborted).toBe(true);
    expect(lifecycle.isCurrent(first)).toBe(false);
    expect(lifecycle.isCurrent(second)).toBe(true);
  });

  test("marks a build stale when cancelled", () => {
    const lifecycle = new BuildLifecycle();
    const build = lifecycle.start();
    lifecycle.cancel();

    expect(lifecycle.isCurrent(build)).toBe(false);
  });
});
