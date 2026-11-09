import { FUZZBALL_STRANDS, type Strand, furReach } from "@fz/phaser/fuzzball";
import { BALL_KIND_IDS } from "../../rules/catalog/balls";
import { FUR, REACH } from "./fuzzball_art";

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
