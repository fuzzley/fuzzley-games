// Where the line in tow is drawn: from the hook at the pod's tail through
// each who rides in tow, between the field's last step and its next, each
// place laid the short way across the wrap from the one before, so the line
// is drawn as one chain, and again past the edges it reaches across.

import { type ArtScale, widthOf } from "@fz/phaser/shapes";
import { type Moving, across, copyShift, wrap } from "../../rules/torus";
import { MOST_CREW, TOW_HOOK } from "../../rules/tuning";
import type { Drawn, FieldView } from "./frame";

/** How wide the line in tow is drawn, in field units, as the art kit draws it. */
const TOW_LINE_WIDTH = 0.05;

/**
 * Describes where the line in tow is drawn, written again each frame into a
 * record made once.
 */
export interface TowLine {
  /** How many of {@link at}'s places the line runs through: the hook's and each in tow's, or none. */
  count: number;
  /**
   * The hook's place, on the field, then each in tow's, the first nearest
   * the pod, each the short way across the wrap from the one before, so
   * the places past the hook may lie off the field.
   */
  readonly at: readonly Moving[];
  /**
   * How far off its copies past the edges are drawn: across, `x`, and
   * down, `y`, each 0 where it reaches past no edge that way, and both for
   * its copy at the corner where it reaches past two.
   */
  readonly shift: Moving;
}

/** Returns a record for where the line in tow is drawn, with room for the most that ride, drawing none. */
export function createTowLine(): TowLine {
  return {
    count: 0,
    at: Array.from({ length: MOST_CREW }, () => ({ x: 0, y: 0 })),
    shift: { x: 0, y: 0 },
  };
}

/**
 * Writes where the line in tow is drawn into a record and returns it: from
 * the hook behind the pod, where the pod is drawn, through each who rides
 * in tow, `alpha` of the way from where it was a step ago to where it is,
 * across the wrap; and where its copies past the edges lie. It draws none
 * with no pod or no one in tow.
 */
export function towLineAt(
  field: Pick<FieldView, "tow" | "crew" | "torus">,
  ship: Readonly<Drawn> | null,
  alpha: number,
  line: TowLine,
): TowLine {
  const { torus } = field;
  const riding = Math.min(field.crew.tow.length, field.tow.length);
  const hook = line.at[0];
  line.count = 0;
  line.shift.x = 0;
  line.shift.y = 0;
  if (!ship || riding === 0 || !hook) return line;
  hook.x = wrap(ship.x - Math.cos(ship.angle) * TOW_HOOK, torus.width);
  hook.y = wrap(ship.y - Math.sin(ship.angle) * TOW_HOOK, torus.height);
  let ahead = hook;
  let left = hook.x;
  let right = hook.x;
  let top = hook.y;
  let bottom = hook.y;
  for (let i = 0; i < riding; i++) {
    const link = field.tow[i];
    const at = line.at[i + 1];
    if (!link || !at) break;
    const x = link.lastX + across(link.lastX, link.x, torus.width) * alpha;
    const y = link.lastY + across(link.lastY, link.y, torus.height) * alpha;
    at.x = ahead.x + across(ahead.x, x, torus.width);
    at.y = ahead.y + across(ahead.y, y, torus.height);
    left = Math.min(left, at.x);
    right = Math.max(right, at.x);
    top = Math.min(top, at.y);
    bottom = Math.max(bottom, at.y);
    ahead = at;
  }
  line.count = riding + 1;
  // The line is shorter than half the field's short side, so it reaches
  // past an edge of each axis at most.
  line.shift.x =
    copyShift((left + right) / 2, (right - left) / 2, torus.width) *
    torus.width;
  line.shift.y =
    copyShift((top + bottom) / 2, (bottom - top) / 2, torus.height) *
    torus.height;
  return line;
}

/** Returns how wide the line in tow is drawn, in whole device pixels, a CSS pixel at least. */
export function towLineWidth(scale: ArtScale): number {
  return widthOf(TOW_LINE_WIDTH, scale);
}
