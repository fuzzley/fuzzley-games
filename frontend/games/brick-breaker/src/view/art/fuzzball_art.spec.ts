import {
  FUZZBALL_STRANDS,
  type Strand,
  combedStrands,
  furReach,
} from "@fz/phaser/fuzzball";
import { BALL_KIND_IDS } from "../../rules/catalog/balls";
import { STREAK } from "../../rules/tuning";
import { FUR, REACH, STREAK_FUR, streakStep } from "./fuzzball_art";

/** Returns how far a strand's tip lies from the body's middle. */
function reachOf({ to }: Strand): number {
  return Math.hypot(to.x, to.y);
}

/** Returns the strand of a fur whose tip lies lowest, the furthest below the body's middle. */
function lowest(fur: readonly Strand[]): Strand | undefined {
  return fur.reduce<Strand | undefined>(
    (low, strand) => (!low || strand.to.y > low.to.y ? strand : low),
    undefined,
  );
}

describe("FUR", () => {
  it.each(BALL_KIND_IDS)(
    "gives a %s ball a strand for each of the fuzzball's",
    (kind) => {
      expect(FUR[kind]).toHaveLength(FUZZBALL_STRANDS.length);
    },
  );

  it("gives a normal ball the fuzzball's own fur", () => {
    expect(FUR.normal).toBe(FUZZBALL_STRANDS);
  });

  it("raises a fire ball's crown into a flame", () => {
    const top = (fur: readonly Strand[]): number =>
      Math.min(...fur.map(({ to }) => to.y));

    expect(top(FUR.fire)).toBeLessThan(top(FUR.normal) - 5);
  });

  it("leaves a fire ball's underside all but as it was", () => {
    const under = lowest(FUR.fire)?.to ?? { x: NaN, y: NaN };
    const was = lowest(FUR.normal)?.to ?? { x: NaN, y: NaN };

    expect(Math.hypot(under.x - was.x, under.y - was.y)).toBeLessThan(0.01);
  });

  it("stands a blast ball's fur on end, each strand straight out from the middle and longer", () => {
    const straight = FUR.blast.every(({ from, control, to }) => {
      const cross = (a: { x: number; y: number }): number =>
        a.x * to.y - a.y * to.x;
      return Math.abs(cross(from)) < 1e-9 && Math.abs(cross(control)) < 1e-9;
    });
    const longer = FUR.blast.every(
      (strand, i) => reachOf(strand) > reachOf(FUR.normal[i] ?? strand),
    );

    expect({ straight, longer }).toEqual({ straight: true, longer: true });
  });
});

describe("REACH", () => {
  it("reaches as far as the fuzzball's own fur, which a normal ball wears", () => {
    expect(REACH).toBe(furReach());
  });
});

describe("STREAK_FUR", () => {
  it("holds a step for each of the streak's multipliers, ×1 and each tier's", () => {
    expect(STREAK_FUR).toHaveLength(STREAK.length + 1);
  });

  it("combs a normal ball's fur flat, half way, then on end twice, sparking only at the last, as the kit's `ball()` does", () => {
    expect(STREAK_FUR).toEqual([
      { fur: FUZZBALL_STRANDS, sparks: false },
      { fur: combedStrands(0.5), sparks: false },
      { fur: combedStrands(1), sparks: false },
      { fur: combedStrands(1), sparks: true },
    ]);
  });
});

describe("streakStep", () => {
  it.each([
    [0, 0],
    [4, 0],
    [5, 1],
    [9, 1],
    [10, 2],
    [19, 2],
    [20, 3],
    [200, 3],
  ])("steps a streak of %i to %i", (streak, step) => {
    expect(streakStep(streak)).toBe(step);
  });
});
