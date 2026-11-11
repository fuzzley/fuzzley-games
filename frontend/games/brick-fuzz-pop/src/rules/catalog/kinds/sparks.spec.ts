import { keysOf } from "@fz/core/records";
import { breakPoints } from "../../run/scoring";
import { COLUMNS, MOST_DEPTH } from "../../tuning";
import { SPARKS_KINDS } from "./sparks";

/** Counts from none to six in words, as the catalog's sentences spell them. */
const SPELLED = ["no", "one", "two", "three", "four", "five", "six"];

describe("SPARKS_KINDS", () => {
  it("are the bomb, the cross and X zappers, wool and the cage, in How to play's order", () => {
    expect(keysOf(SPARKS_KINDS)).toEqual([
      "bomb",
      "crossZapper",
      "xZapper",
      "wool",
      "cage",
    ]);
  });

  it.each([
    ["bomb", 1, 10, "zaps"],
    ["crossZapper", 1, 11, "zaps"],
    ["xZapper", 1, 13, "zaps"],
    ["wool", 1, 14, "recharges"],
    ["cage", 2, 15, "frees"],
  ] as const)(
    "catalog %s as plan.md's table of bricks has it: %i hits, needed, brought in at level %i, its trait %s",
    (id, hits, firstLevel, trait) => {
      expect(SPARKS_KINDS[id]).toMatchObject({
        hits,
        mostHits: hits,
        needed: true,
        solid: true,
        firstLevel,
        traits: [{ kind: trait }],
      });
    },
  );

  it.each([
    ["bomb", 30],
    ["crossZapper", 30],
    ["xZapper", 30],
    ["wool", 30],
    ["cage", 50],
  ] as const)(
    "score %s plan.md's %i as the first break of a round",
    (kind, points) => {
      expect(breakPoints({ kind, full: SPARKS_KINDS[kind].hits }, 1)).toBe(
        points,
      );
    },
  );

  it("say the bomb blasts the eight cells about it, a reach of one", () => {
    const [{ pattern, reach }] = SPARKS_KINDS.bomb.traits;

    expect([pattern, reach, SPARKS_KINDS.bomb.about]).toEqual([
      "blast",
      1,
      expect.stringContaining("the eight bricks around it"),
    ]);
  });

  it("let the cross zapper's zap cross the field and reach the deepest field's ceiling from its floor", () => {
    const [{ pattern, reach }] = SPARKS_KINDS.crossZapper.traits;

    expect([pattern, reach >= Math.max(COLUMNS, MOST_DEPTH) - 1]).toEqual([
      "cross",
      true,
    ]);
  });

  it("say how far the X zapper's zap runs as it does", () => {
    const [{ pattern, reach }] = SPARKS_KINDS.xZapper.traits;

    expect([pattern, SPARKS_KINDS.xZapper.about]).toEqual([
      "x",
      expect.stringContaining(
        `${SPELLED[reach] ?? String(reach)} cells each way`,
      ),
    ]);
  });

  it("say the cage takes two hits", () => {
    const { hits, about } = SPARKS_KINDS.cage;

    expect(about).toContain(`Takes ${SPELLED[hits] ?? String(hits)} hits`);
  });
});
