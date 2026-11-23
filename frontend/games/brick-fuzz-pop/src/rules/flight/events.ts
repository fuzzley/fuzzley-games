import type { At, BallTrack as TrackOf } from "@fz/brick-wall/rules/track";
import type { BrickKindId } from "../catalog/bricks";

/**
 * Names what a fuzzball is in its round: the player's, one of a triple
 * shot's two mates, a friend freed from a cage, or one a prism split off.
 */
export type BallRole = "player" | "mate" | "friend" | "split";

/** Names what a fuzzball meets: a side wall, the ceiling, the floor, a brick's face or corner, or a bumper. */
export type Contact =
  "side" | "ceiling" | "floor" | "face" | "corner" | "bumper";

/** Names what a fuzzball turns off: whatever it meets but the floor, which it lands on. */
export type TurnOff = Exclude<Contact, "floor">;

/** Names the cells a zap reaches from its brick: its row, its column, both, both diagonals, or the eight around it. */
export type ZapPattern = "row" | "column" | "cross" | "x" | "blast";

/** Names what broke a brick: a fuzzball's strike, a zap, or a bomb's blast. */
export type BreakCause = "fuzzball" | "zap" | "blast";

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
        readonly off: TurnOff;
      }
    | {
        /**
         * A fuzzball strikes a brick: `took` hits off it, which has `left`
         * hits left, and flies on with `charge`, which wool leaves higher
         * than a plain fuzzball struck with; `earthed` says the brick took a
         * charge it had, as steel, a plate or a bumper takes one that isn't a
         * hot shot's.
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
        /** A fuzzball in the air as the round is dropped stops, its middle at a place, and drops to the floor. */
        readonly kind: "drop";
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

/**
 * Describes a fuzzball's path in one of this game's roles, as
 * `@fz/brick-wall/rules/track` lays one out.
 *
 * A fuzzball a drop kept from leaving has no waypoints.
 */
export type BallTrack = TrackOf<BallRole>;

/** Describes everything that happens in a round once its shot is released. */
export interface Flight {
  /**
   * In order of `at`. At one moment, events with a ball go first, by ball,
   * then by the kinds' order above, and the zaps after them, by cell; a
   * break, zap or free goes right after the strike or zap that caused it,
   * those of one cause by cell. The drops go last, after every other event
   * of their moment, by ball, each followed by its fuzzball's landing where
   * it is on the floor already, as one just launched is.
   */
  readonly events: readonly FlightEvent[];
  /** Each fuzzball's path, by ball. */
  readonly tracks: readonly BallTrack[];
  /** The last event's `at`: the last landing's, or a zap's that lands after it, so no event comes later. */
  readonly length: number;
  /** How many fuzzballs the cap of `MOST_FLIGHT` or the still turns brought home, not boredom or a drop: 0 in play. */
  readonly capped: number;
}
