import { TRAIT_RULES } from "../rules/bricks/trait_rules";
import type { Brick, KindId } from "../rules/catalog/kinds";
import type { Hooks } from "../rules/flight/hooks";
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

describe("STAND_INS", () => {
  it.each([
    "never",
    "slants",
    "holds",
    "springs",
    "faceted",
    "plated",
    "regrows",
  ] as const)("keeps the game's own rule for %s", (trait) => {
    expect(STAND_INS[trait]).toBe(TRAIT_RULES[trait]);
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
