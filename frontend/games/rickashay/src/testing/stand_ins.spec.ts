import { TRAIT_RULES } from "../rules/bricks/trait_rules";
import type { Brick, KindId } from "../rules/catalog/kinds";
import { STAND_INS } from "./stand_ins";

/** Returns a whole brick of a kind, with the tint given. */
function brickOf(kind: KindId, { tint = 0 }: Partial<Brick> = {}): Brick {
  return { kind, hits: 2, full: 2, plates: 0, tint, twin: null };
}

describe("STAND_INS", () => {
  it.each([
    "never",
    "slants",
    "holds",
    "springs",
    "faceted",
    "teleports",
    "plated",
    "regrows",
  ] as const)("keeps the game's own rule for %s", (trait) => {
    expect(STAND_INS[trait]).toBe(TRAIT_RULES[trait]);
  });

  it("shuts a lock by its tint's bolts", () => {
    expect(STAND_INS.bolted.bolts?.(brickOf("lock", { tint: 3 }))).toBe(3);
  });
});
