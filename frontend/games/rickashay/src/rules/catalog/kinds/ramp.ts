import type { Kind } from "../kinds";

/**
 * The ramp, a steel wedge whose long face turns a flight a quarter turn,
 * written for the corner of its cell its right angle sits in, low left,
 * low right, top left or top right: Angles brings it in at level 10,
 * Launcher.
 */
export const RAMP = {
  name: "Ramp",
  hits: "never",
  mostHits: 0,
  needed: false,
  letters: ["L", "J", "F", "7"],
  firstLevel: 10,
  traits: [{ kind: "never" }, { kind: "slants" }],
} as const satisfies Kind;
