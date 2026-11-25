// What the view hands on of a round in play: what its flight has played
// back so far and what a frame of it came to, which the shell reads, and
// what the scene draws of it at a moment, one record reused frame after
// frame. Where a round stands, the card over a level's end and the run's
// state as the shell shows it are every wall game's, in `@fz/brick-wall`'s
// `view/rounds_played` and the round's driver.

import type { LevelCard } from "@fz/brick-wall/view/rounds_played";
import type { EventLogView, NumberedEvent } from "@fz/core/event_log";
import type { Wall } from "../rules/catalog/kinds";
import type { EarnedBy, FlightEvent, Round } from "../rules/flight/events";
import type { Fur } from "./art/frames";
import type { EventEffects } from "./effects/effects";

/** Describes what the round in play's flight has played back so far, as the bar and the panel count it. */
export interface FlightSoFar {
  /** Its rally so far. */
  readonly rally: number;
  /** The floor bounces it holds, a hot shot's own among them, as the panel's springs show. */
  readonly held: number;
  /** Its turns so far. */
  readonly turns: number;
  /** The points its strikes and the floor bounces it kept have scored so far. */
  readonly points: number;
}

/**
 * Describes something a level's rounds came to that the announcer says: a
 * floor bounce earned, as its flight reaches it ("Rally 10: a floor
 * bounce"), the "Rickaashay!" call, as a flight reaches the level's rally
 * mark, which the shell also shows over the field, and a round's end, as
 * its wall comes to rest.
 */
export type RoundNews =
  | {
      readonly kind: "earned";
      readonly by: EarnedBy;
      /** The flight's rally as it earned it. */
      readonly rally: number;
      /** Whether it was kept, or lost to the most held. */
      readonly kept: boolean;
    }
  | { readonly kind: "called" }
  | {
      readonly kind: "ended";
      readonly round: Round;
    };

/** Describes what a frame of a level's play came to, as it is handed on for the run's state to take in. */
export interface RoundChange {
  /** What the frame came to that the announcer says, in order. */
  readonly news: readonly RoundNews[];
  /** The card whose wait the frame ran out, after a round that cleared or lost the level; else null. */
  readonly opens: LevelCard | null;
}

/** Describes the fuzzball as the scene draws it at a moment. */
export interface BallView {
  /** Where its middle is, in field units. */
  readonly x: number;
  readonly y: number;
  /** Which way it flies, which its eyes look: its speeds across and up, none while it waits or drops home. */
  readonly dx: number;
  readonly dy: number;
  /** Its flight's rally so far, the number beside it. */
  readonly rally: number;
  /** How far its fur has lifted. */
  readonly fur: Fur;
  /** Whether it is a hot shot. */
  readonly hot: boolean;
  /** Whether it has yawned, bored, or been brought home by a guard, and drops to the floor. */
  readonly home: boolean;
}

/**
 * Returns where across the field a fuzzball waits on the floor to be let
 * fly, in field units, or null for one in the air or dropping home: one
 * waits while it heads nowhere and drops nowhere.
 */
export function waitingX({
  x,
  dx,
  dy,
  home,
}: Pick<BallView, "x" | "dx" | "dy" | "home">): number | null {
  return dx === 0 && dy === 0 && !home ? x : null;
}

/** Describes a round in play as the scene draws it at a moment, one record reused frame after frame. */
export interface RoundView {
  /** The fuzzball, waiting or in the air. */
  readonly ball: BallView;
  /**
   * The wall as it looks at this moment, another wall each time it changes,
   * so a frame that hands on the same wall changed nothing.
   *
   * A wall handed on before the last may be written over as a flight goes
   * on, so a reader reads the view after every frame played and compares
   * its wall only with the one it read the frame before.
   */
  readonly wall: Wall;
  /** How far through the wall's step or jump it is, 0 to 1 through its ease: 1 while the wall stands still. */
  readonly wallDrop: number;
  /** How many rows the wall's step or jump brings it down, which it is drawn `rowsDown × (1 − wallDrop)` rows over its place by: 0 but while the wall settles. */
  readonly rowsDown: number;
  /** The floor bounces the fuzzball holds, the springs lit in the floor's band. */
  readonly held: number;
  /** The holds the hatches have left between them, the dots on their bars: none once they open. */
  readonly holdsLeft: number;
  /** The bolts drawn so far, each lock's slots that many emptied. */
  readonly boltsDrawn: number;
  /**
   * The flight's events as playback reaches them, numbered from 1 in order,
   * the numbers running on from one round to the next, level after level:
   * those since the last frame give the flourishes and the sounds.
   */
  readonly events: EventLogView<LoggedEvent>;
  /** The round's moments beyond its flight's events, as it reaches them. */
  readonly beats: EventLogView<LoggedBeat>;
}

/**
 * Describes an event of the round in play as the view's log keeps it: the
 * flight's own event, numbered, so the writer fills a record of the log's
 * ring by pointing it at the next event.
 */
export interface LoggedEvent extends NumberedEvent {
  event: FlightEvent;
  /** What it calls for: nothing for an event skipped. */
  effects: EventEffects;
}

/** Every moment of a round beyond its flight's events: the shot's release, hot or not, the wall's step or its jump, the danger line, and the level cleared or lost. */
export const BEATS = [
  "release",
  "hot-release",
  "step",
  "jump",
  "danger",
  "cleared",
  "lost",
] as const satisfies readonly string[];

/** A moment of a round beyond its flight's events, such as "jump". */
export type Beat = (typeof BEATS)[number];

/** Describes a moment of a round beyond its flight's events, numbered, as the view's log keeps it. */
export interface LoggedBeat extends NumberedEvent {
  beat: Beat;
}
