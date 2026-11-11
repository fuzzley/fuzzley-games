import { struckOf } from "../../../testing/stand_ins";
import type { TraitOf } from "../../catalog/bricks";
import type { Hooks } from "../../flight/hooks";
import { comesAt } from "./not_until";

/** A trait whose kind comes in later. */
const CAGE: TraitOf["frees"] = { kind: "frees" };

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

describe("comesAt()", () => {
  const rule = comesAt<TraitOf["frees"]>(15);

  it.each([
    ["is struck", () => rule.struck?.(struckOf(), CAGE)],
    ["breaks", () => rule.broken?.(HOOKS, 4, 0, CAGE)],
    ["is met", () => rule.met?.(HOOKS, 0, 0, -1, CAGE)],
    ["is crossed into", () => rule.entered?.(HOOKS, 0, 4, null, CAGE)],
  ])("throws as its brick %s, naming the trait and the level", (_, run) => {
    expect(run).toThrow('The "frees" trait is not until level 15.');
  });
});
