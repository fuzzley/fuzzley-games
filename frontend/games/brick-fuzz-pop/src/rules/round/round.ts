import { clamp } from "@fz/core/math";
import { TRAIT_RULES } from "../bricks/trait_rules";
import { BRICK_KINDS } from "../catalog/bricks";
import type { Flight } from "../flight/events";
import { type FlightRules, type FlightStart, fly } from "../flight/flight";
import type { Boon, Shot } from "../shot";
import {
  BORED,
  COLUMNS,
  JUMP_POINTS,
  SIDE_MARGIN,
  TRIPLE_MATES,
} from "../tuning";
import { isCleared, lowerWall } from "../wall/lower";
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
 * It changes nothing it is handed. It throws a `RangeError` for an aim that
 * isn't one of the 657.
 */
export function playRound(
  start: RoundStart,
  shot: Shot,
  levelBoon: Boon,
  rules: RoundRules = RULES,
): Round {
  return playRoundBy(start, shot, levelBoon, flightRulesOf(rules));
}

/**
 * Returns the round a shot plays, flown by the kinds of brick and the trait
 * rules given, where `playRound()` flies by the catalog's and the bricks'
 * own, so a spec can hand it stand-ins.
 *
 * The wall comes down, and is found cleared or not, by the catalog's kinds
 * whatever the flight was flown by, so a stand-in is needed as the kind it
 * stands in for is.
 */
export function playRoundBy(
  start: RoundStart,
  shot: Shot,
  levelBoon: Boon,
  rules: FlightRules,
): Round {
  const { flight, wall } = fly(flightStartOf(start, shot), rules);
  const lowered = lowerWall(wall, start.depth);
  let points = lowered.jumped ? JUMP_POINTS : 0;
  let broken = 0;
  let waits = start.x;
  const friends = [...start.crew.friends];
  for (const event of flight.events) {
    switch (event.kind) {
      case "break":
        broken++;
        points += event.points;
        break;
      case "land":
        if (event.ball === 0) {
          waits = event.x;
        }
        break;
      case "free":
        friends.push(event.ink);
        break;
      default:
        break;
    }
  }
  return {
    flight,
    outcome: {
      broken,
      points,
      rowsDown: lowered.rowsDown,
      jumped: lowered.jumped,
      freed: friends.length - start.crew.friends.length,
      result: isCleared(wall) ? "cleared" : lowered.lost ? "lost" : "on",
    },
    next: {
      wall: lowered.wall,
      depth: start.depth,
      x: clamp(waits, SIDE_MARGIN, COLUMNS - SIDE_MARGIN),
      crew: { friends },
      boon: lowered.jumped ? levelBoon : null,
    },
  };
}

/** Returns what a round's flight is played by: the catalog's kinds, the bricks' own rules, and the numbers the round is handed. */
export function flightRulesOf(rules: RoundRules): FlightRules {
  return { bored: rules.bored, kinds: BRICK_KINDS, traits: TRAIT_RULES };
}

/** Returns how a round's fuzzballs leave as a shot from where it starts sends them: a boon's hot shot or mates, and the crew behind. */
export function flightStartOf(start: RoundStart, shot: Shot): FlightStart {
  return {
    wall: start.wall,
    depth: start.depth,
    x: start.x,
    aim: shot.aim,
    charge: shot.charge,
    hot: start.boon === "hot",
    mates: start.boon === "triple" ? TRIPLE_MATES : 0,
    friends: start.crew.friends.length,
  };
}
