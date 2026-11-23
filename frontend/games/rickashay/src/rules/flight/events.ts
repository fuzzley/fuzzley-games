// What a round is: where it starts, the one fuzzball's flight once the shot
// is released, decided whole before any of it is drawn, and what it came
// to. The view, the scene and the shell play a round from these alone.

import type { At, BallTrack as TrackOf } from "@fz/brick-wall/rules/track";
import type { Wall } from "../catalog/kinds";

/** Names what the fuzzball is in its round: the player's, the one a round flies. */
export type BallRole = "player";

/** Names what turned a fuzzball: a side wall, the ceiling, the floor as a floor bounce is spent, a brick, or a hatch's bar. */
export type TurnOff = "wall" | "ceiling" | "floor" | "brick" | "bar";

/** Names what kept a turn off a brick from striking it: a plated face, or a lock still shut. */
export type Shield = "plate" | "lock";

/** Names what earned a floor bounce: the rally reaching a rung of the ladder, or a spring brick's break. */
export type EarnedBy = "rally" | "spring";

/** Names the guard that brought a flight home: its length, or its turns running with no flight between them. */
export type Guard = "length" | "turns";

/**
 * Describes something that happens in a flight, at its moment in units
 * flown since the release.
 *
 * A `cell` is a wall cell, wall row × 9 + column, so it survives the
 * wall's steps; the view finds its field row with `Wall.lowestRow`.
 */
export type FlightEvent = At &
  (
    | {
        /**
         * The fuzzball turns, its middle at a place, to a new heading: off a
         * brick where it met one, else a hatch's bar, a side wall, the
         * ceiling or the floor, in that order. `cells` are the bricks and
         * bars it met at that moment, floor up and then left to right,
         * those whose faces turned it and those that didn't, such as a
         * corner's cut met beside a flat: every cell the moment's strikes,
         * shieldings and hold name.
         */
        readonly kind: "turn";
        readonly x: number;
        readonly y: number;
        readonly dx: number;
        readonly dy: number;
        readonly off: TurnOff;
        readonly cells: readonly number[];
      }
    | {
        /** The fuzzball strikes a brick, taking hits off it, which may break it, and the rally counts it. */
        readonly kind: "strike";
        readonly cell: number;
        readonly took: number;
        readonly broke: boolean;
        /** The flight's rally after it, this strike among them. */
        readonly rally: number;
      }
    | {
        /** The fuzzball turns off a brick without striking it: off a plated face, or a lock still shut. */
        readonly kind: "shielded";
        readonly cell: number;
        readonly by: Shield;
      }
    | {
        /**
         * The flight earns a floor bounce, which it keeps unless it holds
         * the most it can already, though the bounce is announced either
         * way. A hot shot leaves holding its own, as `Flight.held` says,
         * which no event earns.
         */
        readonly kind: "bounce-earned";
        readonly by: EarnedBy;
        /** The floor bounces it holds after it. */
        readonly held: number;
        readonly kept: boolean;
      }
    | {
        /** The fuzzball spends a floor bounce, turning off the floor, as its turn there says. */
        readonly kind: "bounce-spent";
        /** The floor bounces it holds after it. */
        readonly held: number;
      }
    | {
        /**
         * A hatch's bar holds the fuzzball up, as its turn off it says: one
         * hold a turn, however many bars it met there, since hatches side by
         * side are one bar, named by the first it met.
         */
        readonly kind: "hold";
        readonly cell: number;
        /** The holds the hatches have left between them after it. */
        readonly left: number;
      }
    | {
        /** Every hatch in the field opens, at the hold that leaves none, until the fuzzball lands. */
        readonly kind: "hatches-open";
      }
    | {
        /**
         * A bolt slides back on every lock in the field, at each turn of the
         * flight that is a multiple of `FlightRules.boltTurns`, while a lock
         * there still has one shut; a lock is open once as many are drawn as
         * it has. A bolt is drawn after the bricks its turn met, so a lock
         * met at the turn that draws its last is still shut there.
         */
        readonly kind: "bolt";
        /** The bolts drawn so far. */
        readonly drawn: number;
      }
    | {
        /**
         * The fuzzball's middle crosses into a portal's eye and it comes out
         * at the same place in its twin's, flying the same way: no turn.
         */
        readonly kind: "teleport";
        readonly from: number;
        readonly to: number;
      }
    | {
        /** The fuzzball, bored, yawns, its middle at a place, and drops straight to the floor. */
        readonly kind: "bored";
        readonly x: number;
        readonly y: number;
      }
    | {
        /** A guard brings the fuzzball home, its middle at a place, and it drops straight to the floor. */
        readonly kind: "guard";
        readonly x: number;
        readonly y: number;
        readonly by: Guard;
      }
    | {
        /**
         * The fuzzball lands on the floor where its track ends, its flight
         * over, and waits at `x`: where it touched, no nearer a side wall
         * than `SIDE_MARGIN`.
         */
        readonly kind: "land";
        readonly x: number;
      }
  );

/** A flight event's kind, such as "strike". */
export type FlightEventKind = FlightEvent["kind"];

/** Describes the fuzzball's path, as `@fz/brick-wall/rules/track` lays one out. */
export type BallTrack = TrackOf<BallRole>;

/** Describes everything that happens in a round once its shot is released, which nothing may change. */
export interface Flight {
  /** The fuzzball's path, from where it waited to where it landed, ball 0; or, for a flight `fly()` stopped short, where it stopped. */
  readonly track: BallTrack;
  /**
   * In order of `at`, and at one moment: its turn; then each brick it met,
   * floor up and then left to right, with its strike or its shielding, a
   * strike followed by the floor bounces it earned, the rally's before a
   * spring brick's, and the hold where the first bar it met comes in that
   * order; then a floor bounce spent, the hatches opening and a bolt drawn;
   * then a teleport; then a yawn or a guard; then the landing.
   */
  readonly events: readonly FlightEvent[];
  /** The floor bounces it held as it was released: a hot shot's own, `FlightRules.hotBounces`, or none. */
  readonly held: number;
  /** Its length, its landing's `at`, which no event comes after; or, for a flight `fly()` stopped short, the moment it stopped. */
  readonly length: number;
  /** Its rally: the strikes it made. */
  readonly rally: number;
  /** Its turns: the moments its heading changed. */
  readonly turns: number;
  /** The moments of its strikes at each of `RALLY_MARKS`, its 10th, 25th and 45th, as many as it made, from which its playback quickens. */
  readonly marks: readonly number[];
  /** The moment of its last strike, from which its playback dashes home, or null for a flight that struck nothing. */
  readonly lastStrike: number | null;
}

/** Describes where a round starts, as the player aims. */
export interface RoundStart {
  readonly wall: Wall;
  /** How many rows the field is deep, 11 to 22. */
  readonly depth: number;
  /** Where the fuzzball waits on the floor. */
  readonly x: number;
  /** Whether the shot is a hot shot, which the last round's jump earned. */
  readonly hot: boolean;
}

/** Names how a round leaves its level: still on, cleared or lost. */
export type RoundResult = "on" | "cleared" | "lost";

/** Describes what a round came to. */
export interface RoundOutcome {
  /** Its flight's rally. */
  readonly rally: number;
  /** How many bricks it broke. */
  readonly broken: number;
  /**
   * How many floor bounces its flight earned and kept, the rally's and the
   * spring bricks': one earned while it held the most is lost and pays
   * nothing, and a hot shot's own is not earned.
   */
  readonly earned: number;
  /** Whether the wall jumped after it, which makes the next shot a hot shot. */
  readonly jumped: boolean;
  /** How many rows the wall came down after it: a row, a jump's, or none once the level is cleared. */
  readonly rowsDown: number;
  readonly result: RoundResult;
  /** The points it scored: its strikes', the floor bounces it earned and kept, and a jump's. */
  readonly points: number;
}

/** Describes a round played: its flight, what it came to and where the next starts. */
export interface Round {
  readonly flight: Flight;
  readonly outcome: RoundOutcome;
  /** Where the next round starts; also once this one cleared or lost the level, for the board to show. */
  readonly next: RoundStart;
}
