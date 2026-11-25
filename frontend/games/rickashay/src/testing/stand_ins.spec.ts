import { FLOORWARD, LEFT, RIGHT } from "@fz/brick-wall/rules/grid";
import { TRAIT_RULES } from "../rules/bricks/trait_rules";
import type { Brick, KindId } from "../rules/catalog/kinds";
import type { Hooks, Struck } from "../rules/flight/hooks";
import { STAND_INS } from "./stand_ins";

/** Returns a whole brick of a kind, with the plates, the tint and the twin given. */
function brickOf(
  kind: KindId,
  { plates = 0, tint = 0, twin = null }: Partial<Brick> = {},
): Brick {
  return { kind, hits: 2, full: 2, plates, tint, twin };
}

/** Returns hooks that note each call made of them, by name and what it was handed. */
function notingHooks(calls: string[]): Hooks {
  return {
    earn: () => {
      calls.push("earn");
    },
    hold: () => {
      calls.push("hold");
    },
    teleport: (to) => {
      calls.push(`teleport to ${String(to)}`);
    },
  };
}

/** Returns what a strike on a plated brick with its lower face plated comes to, met on the sides given. */
function strikePlated(sides: number): Struck {
  const struck: Struck = {
    cell: 0,
    brick: brickOf("plated", { plates: FLOORWARD }),
    sides,
    shield: null,
  };
  STAND_INS.plated.struck?.(struck);
  return struck;
}

describe("STAND_INS", () => {
  it.each([
    "never",
    "slants",
    "holds",
    "springs",
    "faceted",
    "regrows",
  ] as const)("keeps the game's own rule for %s", (trait) => {
    expect(STAND_INS[trait]).toBe(TRAIT_RULES[trait]);
  });

  it("shields a plated brick where the turn met its plates alone", () => {
    expect(strikePlated(FLOORWARD).shield).toBe("plate");
  });

  it.each([
    ["a cut across a plated face and a bare one", FLOORWARD | LEFT],
    ["a bare face", RIGHT],
    ["a long 45° face, along no side", 0],
  ])("strikes a plated brick met on %s", (_, sides) => {
    expect(strikePlated(sides).shield).toBeNull();
  });

  it("shuts a lock by its tint's bolts", () => {
    expect(STAND_INS.bolted.bolts?.(brickOf("lock", { tint: 3 }))).toBe(3);
  });

  it("takes the fuzzball to a portal's twin", () => {
    const calls: string[] = [];

    STAND_INS.teleports.entered?.(
      notingHooks(calls),
      0,
      brickOf("portal", { twin: 40 }),
    );

    expect(calls).toEqual(["teleport to 40"]);
  });

  it("takes the fuzzball nowhere from a portal with no twin", () => {
    const calls: string[] = [];

    STAND_INS.teleports.entered?.(notingHooks(calls), 0, brickOf("portal"));

    expect(calls).toEqual([]);
  });
});
