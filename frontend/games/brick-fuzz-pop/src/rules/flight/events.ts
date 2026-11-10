import type { BrickKindId } from "../catalog/bricks";

/**
 * Names what a fuzzball is in its round: the player's, one of a triple
 * shot's two mates, a friend freed from a cage, or one a prism split off.
 */
export type BallRole = "player" | "mate" | "friend" | "split";

/** Names what a fuzzball turned off: a side wall, the ceiling, the floor, a brick's face or corner, or a bumper. */
export type Contact =
  "side" | "ceiling" | "floor" | "face" | "corner" | "bumper";

/** Names the cells a zap reaches from its brick: its row, its column, both, both diagonals, or the eight around it. */
export type ZapPattern = "row" | "column" | "cross" | "x" | "blast";

/** Names what broke a brick: a fuzzball's strike, a zap, or a bomb's blast. */
export type BreakCause = "fuzzball" | "zap" | "blast";

/** Says when something happens in a flight. */
interface At {
  /** Units flown since the shot was released, on the round's one clock. */
  readonly at: number;
}

/**
 * Describes something that happens in a flight, at a moment.
 *
 * A `ball` is a fuzzball's number in its round, from 0, in the order they
 * are made: the player's, the mates, the friends in the order they were
 * freed, then the splits in the order they were made. A `cell` is a wall
 * cell, `wallRow * 9 + column`, so it survives the wall's steps; the view
 * finds its field row with `Wall.lowestRow`.
 */
export type FlightEvent = At &
  (
    | {
        /** A fuzzball leaves from a place, heading as its aim says, with a charge. */
        readonly kind: "launch";
        readonly ball: number;
        readonly role: BallRole;
        readonly x: number;
        readonly y: number;
        readonly dx: number;
        readonly dy: number;
        readonly charge: number;
        readonly hot: boolean;
      }
    | {
        /** A fuzzball turns off what it met, its middle at a place, to a new heading. */
        readonly kind: "turn";
        readonly ball: number;
        readonly x: number;
        readonly y: number;
        readonly dx: number;
        readonly dy: number;
        readonly off: Contact;
      }
    | {
        /**
         * A fuzzball strikes a brick: `took` hits off it, which has `left`
         * hits left, and flies on with `charge`; `earthed` says the brick
         * took a charge it had, as steel, a plate or a bumper takes one that
         * isn't a hot shot's.
         */
        readonly kind: "strike";
        readonly ball: number;
        readonly cell: number;
        readonly took: number;
        readonly left: number;
        readonly charge: number;
        readonly earthed: boolean;
      }
    | {
        /**
         * A brick breaks: its kind, what broke it, how many bricks the round
         * has broken with it (`streak`), and what it scored at that streak.
         */
        readonly kind: "break";
        readonly cell: number;
        readonly brick: BrickKindId;
        readonly by: BreakCause;
        readonly streak: number;
        readonly points: number;
      }
    | {
        /**
         * A zap or a blast lands, from the brick that set it off, on the
         * cells of the bricks it takes hits off, by cell: what it passes
         * through, such as steel, isn't among them.
         */
        readonly kind: "zap";
        readonly cell: number;
        readonly pattern: ZapPattern;
        readonly reaches: readonly number[];
      }
    | {
        /** A fuzzball is charged to the most by the wool brick it broke. */
        readonly kind: "recharge";
        readonly ball: number;
        readonly cell: number;
      }
    | {
        /** A fuzzball goes into a portal and comes out of its twin. */
        readonly kind: "portal";
        readonly ball: number;
        readonly from: number;
        readonly to: number;
      }
    | {
        /** A prism splits a fuzzball, the new ones numbered `into`. */
        readonly kind: "split";
        readonly ball: number;
        readonly cell: number;
        readonly into: readonly number[];
      }
    | {
        /** A cage frees a friend, in its ink. */
        readonly kind: "free";
        readonly cell: number;
        readonly ink: number;
      }
    | {
        /** A bored fuzzball yawns, its middle at a place, and drops to the floor. */
        readonly kind: "yawn";
        readonly ball: number;
        readonly x: number;
        readonly y: number;
      }
    | {
        /** A fuzzball lands on the floor, where it waits if it is the player's. */
        readonly kind: "land";
        readonly ball: number;
        readonly x: number;
      }
  );

/** Describes where a fuzzball's middle is at a moment of its flight. */
export interface Waypoint {
  readonly at: number;
  readonly x: number;
  readonly y: number;
}

/**
 * Describes a fuzzball's path: where it left, each place it turned and where
 * it landed, in order of `at`, joined by straight lines flown at a unit a
 * unit of `at`. A portal's two places share a moment.
 */
export interface BallTrack {
  readonly ball: number;
  readonly role: BallRole;
  readonly waypoints: readonly Waypoint[];
}

/** Describes everything that happens in a round once its shot is released. */
export interface Flight {
  /**
   * In order of `at`. At one moment, events with a ball go by ball, then by
   * the kinds' order above; a break, zap or free goes right after the
   * strike or zap that caused it, those of one cause by cell.
   */
  readonly events: readonly FlightEvent[];
  /** Each fuzzball's path, by ball. */
  readonly tracks: readonly BallTrack[];
  /** The last landing's `at`. */
  readonly length: number;
  /** How many fuzzballs the 600-unit cap or the still turns brought home: 0 in play. */
  readonly capped: number;
}

/**
 * Returns where a fuzzball is at a moment, or null before it leaves or after
 * it lands.
 *
 * At a moment two of its waypoints share, as a portal's, it is at the
 * later, where it flies on from.
 */
export function positionAt(track: BallTrack, at: number): Waypoint | null {
  const { waypoints } = track;
  const first = waypoints[0];
  const last = waypoints[waypoints.length - 1];
  if (first === undefined || last === undefined) {
    return null;
  }
  if (!(at >= first.at && at <= last.at)) {
    return null;
  }
  // The last waypoint at or before the moment, the one it flies on from,
  // found by halves, since the view asks for every fuzzball every frame.
  let from = first;
  let fromIndex = 0;
  let low = 1;
  let high = waypoints.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const waypoint = waypoints[middle];
    if (waypoint === undefined || waypoint.at > at) {
      high = middle - 1;
    } else {
      from = waypoint;
      fromIndex = middle;
      low = middle + 1;
    }
  }
  const to = waypoints[fromIndex + 1];
  if (to === undefined) {
    return { at, x: from.x, y: from.y };
  }
  const share = (at - from.at) / (to.at - from.at);
  return {
    at,
    x: from.x + (to.x - from.x) * share,
    y: from.y + (to.y - from.y) * share,
  };
}
