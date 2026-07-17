import { describe, expect, test } from "bun:test";
import { phraseFor, rng } from "./occasion";

describe("occasion helpers", () => {
  test("normalizes occasion labels", () => {
    expect(phraseFor("  THANK YOU ")).toBe("Thank You");
    expect(phraseFor("unknown")).toBeUndefined();
    expect(phraseFor()).toBeUndefined();
  });

  test("produces reproducible seeded values", () => {
    const first = rng(42);
    const second = rng(42);

    expect([first(), first(), first()]).toEqual([second(), second(), second()]);
  });
});
