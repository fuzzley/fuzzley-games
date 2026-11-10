import type { Flight } from "../flight/events";
import type { Boon, Shot } from "../shot";
import { BORED } from "../tuning";
import type { Wall } from "../wall/wall";

/** Describes the friends a level's cages have freed, who fly behind the player's fuzzball every round. */
export interface Crew {
  /** Each friend's ink, in the order they were freed. */
  readonly friends: readonly number[];
}

/** Describes where a round starts, as the player aims. */
export interface RoundStart {
  readonly wall: Wall;
  /** How many rows the field is deep, 11 to 22. */
  readonly depth: number;
  /** Where the fuzzball waits on the floor. */
  readonly x: number;
  readonly crew: Crew;
  /** The boon this shot carries, which the last round's jump earned, or none. */
  readonly boon: Boon | null;
}

/** Names how a round leaves its level: still on, cleared or lost. */
export type RoundResult = "on" | "cleared" | "lost";

/** Describes what a round came to. */
export interface RoundOutcome {
  /** How many bricks it broke. */
  readonly broken: number;
  /** The points it scored, a jump's among them. */
  readonly points: number;
  /** How many rows the wall came down after it: a row, a jump's, or none once the level is cleared. */
  readonly rowsDown: number;
  /** Whether the wall jumped, which earns the next shot the level's boon. */
  readonly jumped: boolean;
  /** How many friends it freed. */
  readonly freed: number;
  readonly result: RoundResult;
}

/** Describes a round played: its flight, what it came to and where the next starts. */
export interface Round {
  readonly flight: Flight;
  readonly outcome: RoundOutcome;
  /** Where the next round starts; also when this one cleared or lost the level, for the board to show. */
  readonly next: RoundStart;
}

/** Holds the rules' numbers the debug menu may retune, which the rules are handed rather than read. */
export interface RoundRules {
  /** How far a fuzzball flies without taking a hit off a brick before it yawns. */
  readonly bored: number;
}

/** The rules' numbers as `tuning.ts` sets them. */
export const RULES: RoundRules = { bored: BORED };

/**
 * Returns the round a shot plays from where it starts: the whole flight,
 * decided as it is released, what it came to, and the next round's start.
 * `levelBoon` is the boon a jump earns the next shot.
 *
 * It throws until R6 writes it: the streams build against the contracts and
 * `src/testing/flight_fixtures.ts` until then.
 */
export function playRound(
  _start: RoundStart,
  _shot: Shot,
  _levelBoon: Boon,
  _rules: RoundRules = RULES,
): Round {
  throw new Error("Not yet: R6 writes playRound().");
}
