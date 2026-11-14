import { type BrickKindId, brickKind } from "../catalog/bricks";
import type { CapsuleId } from "../catalog/capsules";
import type { LevelBrick } from "./level";

/** Describes what a character in a level stands for. */
export interface BrickSpec {
  readonly kind: BrickKindId;
  /** Its hits, where its kind allows more than one; else its kind's. */
  readonly hits?: number;
  /** The capsule a gift brick gives, rather than one drawn. */
  readonly capsule?: CapsuleId;
  /** The pair a portal is of, 0 or 1, by which it finds its twin. */
  readonly pair?: number;
  /** The way a slider first heads along its row, 1 right or -1 left. */
  readonly heading?: number;
}

/** The character of a cell with no brick. */
export const NO_BRICK = ".";

/** The characters every level shares, each with the brick it stands for. */
export const LEGEND: Readonly<Record<string, BrickSpec>> = {
  o: { kind: "plain" },
  "2": { kind: "tough", hits: 2 },
  "3": { kind: "tough", hits: 3 },
  "4": { kind: "tough", hits: 4 },
  "#": { kind: "steel" },
  "*": { kind: "blast" },
  "?": { kind: "gift" },
  "~": { kind: "ghost" },
  "+": { kind: "regrow" },
  c: { kind: "cage" },
  u: { kind: "plated" },
  U: { kind: "plated", hits: 2 },
  k: { kind: "key" },
  "=": { kind: "gate" },
  O: { kind: "bumper" },
  "@": { kind: "portal", pair: 0 },
  "%": { kind: "portal", pair: 1 },
  ">": { kind: "slider", heading: 1 },
  "<": { kind: "slider", heading: -1 },
};

/** Returns the brick a spec lays out, in a tint from 0 to 7. */
export function brickOf(spec: BrickSpec, tint: number): LevelBrick {
  const { hits } = brickKind(spec.kind);
  return {
    kind: spec.kind,
    hits: hits === "never" ? 0 : (spec.hits ?? hits),
    tint,
    capsule: spec.capsule ?? null,
    ...(spec.pair === undefined ? {} : { pair: spec.pair }),
    ...(spec.heading === undefined ? {} : { heading: spec.heading }),
  };
}
