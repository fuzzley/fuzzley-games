// The tune-up's prototype: the variants of the flight's rules the sim under
// docs/brick-fuzz-pop-tune-up/sim/ compares, set before a flight is flown.
// The game's own change writes the chosen one into the rules, with no switch.

/** Names what brings a fuzzball's boredom back to none: only a hit taken off a brick, as the game has it; a touch on any brick that can break, hit or not; or a touch on any brick but steel. */
export type Resets = "hit" | "breakable" | "notSteel";

/** Holds the variant of the flight's rules being flown. */
export interface Variant {
  resets: Resets;
  /** How far a fuzzball flies without taking a hit before it yawns whatever it touched: Infinity for no such limit. */
  mostIdle: number;
  /** Whether wool charges the fuzzball that strikes it before the strike, so it flies on through. */
  woolFirst: boolean;
  /** The farthest one fuzzball flies, the game's 600 unless a variant moves it. */
  mostFlight: number;
  /** How much sooner each touch on a brick that never breaks has a fuzzball yawn, in units: 0 for none. */
  steelCosts: number;
}

/** The variant being flown, the game's own until the sim sets another. */
export const VARIANT: Variant = {
  resets: "hit",
  mostIdle: Number.POSITIVE_INFINITY,
  woolFirst: false,
  mostFlight: 600,
  steelCosts: 0,
};
