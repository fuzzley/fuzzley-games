// What the guide shows of a shot before it is let fly, as the design's
// "Look" has it: the rules' own flight for the aim, which the rules stop a
// little past the last turn the guide follows it to, read as a wall game's
// guide, which `@fz/brick-wall/scene/guide`'s painter draws. Dots run along
// it, a ring stands at each turn, and each brick it strikes on the way is
// marked; the dots past that turn fade. Where it stops is the rules' alone:
// the view draws what the cast holds.

import { COLUMNS, MOST_DEPTH, RADIUS } from "@fz/brick-wall/rules/field";
import { positionAt } from "@fz/brick-wall/rules/track";
import type {
  GuideDot,
  GuidePlace,
  WallGuide,
} from "@fz/brick-wall/view/guide";
import type { Flight } from "../../rules/flight/events";
import { FLIGHT_RULES, type FlightRules } from "../../rules/tuning";

/** How far apart the guide's dots lie along the flight, in field units, as the art draws them. */
export const GUIDE_DOT_GAP = 0.36;

/** The most turns the player's setting has the guide follow a shot to. */
export const MOST_GUIDE_TURNS = 5;

/**
 * How far a fuzzball flies between two turns, in field units, as it
 * crosses a gap a cell wide from one side to the other: the cell, less its
 * width. Two turns at an inside corner may come closer.
 */
const SHORTEST_CROSSING = 1 - 2 * RADIUS;

/**
 * The most turns the guide rings: the most the setting has it follow a
 * shot to, and those it meets on the way it runs on past the last,
 * crossing a gap a cell wide again and again. Turns at inside corners
 * may come closer still, and one past the pool goes unringed, as the
 * guide's painter rings no more turns than it holds.
 */
export const MOST_GUIDE_RINGS =
  MOST_GUIDE_TURNS + Math.floor(FLIGHT_RULES.guidePast / SHORTEST_CROSSING);

/**
 * The most dots the guide shows: a dot a gap along the longest flight it
 * shows, the most turns each a straight line across the deepest field
 * from corner to corner, and the way it runs on past the last. A flight
 * longer still, through portals, shows as many.
 */
export const MOST_GUIDE_DOTS = Math.ceil(
  (MOST_GUIDE_TURNS * Math.hypot(COLUMNS, MOST_DEPTH) +
    FLIGHT_RULES.guidePast) /
    GUIDE_DOT_GAP,
);

/**
 * Describes the flight the guide shows: the rules' own cast for the aim,
 * its path and its events, which the rules stop `guidePast` past the turn
 * the guide follows it to, `guideTurns`, unless it lands first.
 */
export type GuideFlight = Pick<Flight, "track" | "events">;

/** Says how far the guide follows a shot: to which turn, and how far past it the rules stop its cast, over which its dots fade. */
export type GuideReach = Pick<FlightRules, "guideTurns" | "guidePast">;

/**
 * Returns the wall game's guide a flight shows: a dot every
 * {@link GUIDE_DOT_GAP} along it from where it leaves to where it stops,
 * none across a portal's jump; a ring at each of its turns; and the cell
 * of each brick it strikes, once each, in the order it strikes them. The
 * dots past its `guideTurns`th turn fade over `guidePast`, to nothing
 * where the rules stop it, as fast where it lands sooner; a flight that
 * lands before that turn fades none.
 */
export function wallGuideOf(
  { track, events }: GuideFlight,
  { guideTurns, guidePast }: Readonly<GuideReach>,
): WallGuide {
  const turns: GuidePlace[] = [];
  const struck: number[] = [];
  let fadesFrom = Number.POSITIVE_INFINITY;
  for (const event of events) {
    if (event.kind === "turn") {
      turns.push({ x: event.x, y: event.y });
      if (turns.length === guideTurns) fadesFrom = event.at;
    }
    if (event.kind === "strike" && !struck.includes(event.cell)) {
      struck.push(event.cell);
    }
  }
  const dots: GuideDot[] = [];
  for (let dot = 1; ; dot++) {
    const at = dot * GUIDE_DOT_GAP;
    const place = positionAt(track, at);
    // Past where the flight stops, it is nowhere.
    if (place === null) break;
    const { x, y } = place;
    dots.push(
      at <= fadesFrom
        ? { x, y }
        : { x, y, alpha: Math.max(0, 1 - (at - fadesFrom) / guidePast) },
    );
  }
  return { dots, turns, struck };
}

/**
 * Reads the flight the guide shows as a wall game's guide, making one a
 * flight and a reach, so the guide's painter draws again only as the
 * guide is cast again or its reach is retuned.
 */
export class WallGuides {
  /** The flight last read, or null. */
  private read: GuideFlight | null = null;
  /** The turn it was read to. */
  private turns = 0;
  /** The way past that turn it was read with. */
  private past = 0;
  /** The wall game's guide made of it, or null where none shows. */
  private made: WallGuide | null = null;

  /** Returns the wall game's guide a flight shows, or null where none shows: the same one while handed the same flight and reach. */
  of(
    flight: GuideFlight | null,
    { guideTurns, guidePast }: Readonly<GuideReach>,
  ): WallGuide | null {
    if (
      flight !== this.read ||
      guideTurns !== this.turns ||
      guidePast !== this.past
    ) {
      this.read = flight;
      this.turns = guideTurns;
      this.past = guidePast;
      this.made = flight && wallGuideOf(flight, { guideTurns, guidePast });
    }
    return this.made;
  }
}
