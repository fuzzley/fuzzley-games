import { struckOf } from "../../../testing/stand_ins";
import type { TraitOf } from "../../catalog/bricks";
import type { Hooks } from "../../flight/hooks";
import { comesAt, notUntil } from "./not_until";

/** A trait whose kind comes in later. */
const WOOL: TraitOf["recharges"] = { kind: "recharges" };

/** Throws, for a hook no rule here may ask for. */
function unasked(): never {
  throw new Error("A rule that comes later asks for no hook.");
}

/** Hooks no rule here asks for. */
const HOOKS: Hooks = {
  split: unasked,
  teleport: unasked,
  kick: unasked,
  zap: unasked,
  recharge: unasked,
  free: unasked,
};

describe("notUntil()", () => {
  it("says what is played before its level, and the level", () => {
    const error = notUntil("A cross zap", 11);

    expect(error.message).toBe("A cross zap is not until level 11.");
  });
});

describe("comesAt()", () => {
  const rule = comesAt<TraitOf["recharges"]>(14);

  it.each([
    ["is struck", () => rule.struck?.(struckOf(), WOOL)],
    ["breaks", () => rule.broken?.(HOOKS, 4, 0, WOOL)],
    ["is met", () => rule.met?.(HOOKS, 0, 0, -1, WOOL)],
    ["is crossed into", () => rule.entered?.(HOOKS, 0, 4, null, WOOL)],
  ])("throws as its brick %s, naming the trait and the level", (_, run) => {
    expect(run).toThrow('The "recharges" trait is not until level 14.');
  });
});
