import type { BrickTrait } from "../../catalog/bricks";
import type { TraitRule } from "../../flight/hooks";

/** Returns the error for a trait, or a zap's pattern, played before the level whose kind of brick brings it in. */
export function notUntil(what: string, level: number): Error {
  return new Error(`${what} is not until level ${String(level)}.`);
}

/**
 * Returns the rule of a trait whose kind of brick comes in at a later level
 * than the rules play yet, which throws at every moment it could run, so the
 * map of every trait's rule is whole and a flight never meets the trait
 * unplayed.
 */
export function comesAt<T extends BrickTrait>(level: number): TraitRule<T> {
  const refuse = ({ kind }: T): never => {
    throw notUntil(`The "${kind}" trait`, level);
  };
  return {
    struck: (_struck, trait) => refuse(trait),
    broken: (_hooks, _cell, _ball, trait) => refuse(trait),
    met: (_hooks, _ball, _nx, _ny, trait) => refuse(trait),
    entered: (_hooks, _ball, _cell, _twin, trait) => refuse(trait),
  };
}
