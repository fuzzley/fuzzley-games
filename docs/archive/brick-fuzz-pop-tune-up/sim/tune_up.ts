// What the tune-up's sim measures, loaded through Vite from the scratch
// mirror `mirror.mjs` makes, where it sits at `src/testing/tune_up.ts`
// beside the helpers it plays with. `run.mjs` calls `measureLevel()` for
// each level on a pool of processes, and `summarize.mjs` reads what it
// returns.

import { createRandom } from "@fz/core/random";
import type { FlightEvent } from "../rules/flight/events";
import { VARIANT, type Variant } from "../rules/flight/variant";
import { BRICK_KINDS } from "../rules/catalog/bricks";
import { shotOf } from "../rules/levels/certificate";
import { type Level, levelStart } from "../rules/levels/level";
import { LEVELS, levelEntryOf, parseLevel } from "../rules/levels/levels";
import { type Round, type RoundStart, playRound } from "../rules/round/round";
import type { Shot } from "../rules/shot";
import { AIM_COUNT, MOST_CHARGE } from "../rules/tuning";
import { DEPTHS } from "../rules/wall/wall";
import { CASUAL_LOOKS, CASUAL_ROUNDS } from "./casual";
import { certificateOf } from "./every_level";
import { lineHolds, replayLine } from "./solver";
import { wallScore } from "./wall_score";

/** Describes a variant of the rules the sim plays: the flight's switches, and how far a fuzzball flies bored. */
export interface SimVariant extends Variant {
  readonly id: string;
  readonly bored: number;
  /** How far a fuzzball flies bored for each row of the field's depth, in place of `bored`, where a variant has boredom follow the depth. */
  readonly boredPerRow?: number;
}

/** The game's own rules, which every variant is compared with. */
const BASE: SimVariant = {
  id: "base",
  bored: 60,
  resets: "hit",
  mostIdle: Number.POSITIVE_INFINITY,
  woolFirst: false,
  mostFlight: 600,
  steelCosts: 0,
};

/** A touch on a brick that can break counting, which the candidates share. */
const TOUCH: SimVariant = { ...BASE, resets: "breakable" };

/**
 * The variants the sim plays, the game's own first: boredom alone at 90 to
 * 240; a touch on a brick that can break counting, at 120 to 180, free or
 * held to two or three times as far without a hit; the request read to the
 * letter, every brick but steel counting; boredom following the field's
 * depth; each touch on steel or a bumper costing some of it; wool charging
 * before the strike, alone and with each candidate; and the recommended
 * rules with the farthest a fuzzball flies moved out to 900 and to 1200.
 */
export const VARIANTS: readonly SimVariant[] = [
  BASE,
  { ...BASE, id: "bored-90", bored: 90 },
  { ...BASE, id: "bored-120", bored: 120 },
  { ...BASE, id: "bored-150", bored: 150 },
  { ...BASE, id: "bored-180", bored: 180 },
  { ...BASE, id: "bored-240", bored: 240 },
  { ...BASE, id: "touch-120", bored: 120, resets: "breakable" },
  { ...BASE, id: "touch-150", bored: 150, resets: "breakable" },
  { ...BASE, id: "touch-180", bored: 180, resets: "breakable" },
  {
    ...BASE,
    id: "touch-120-held-360",
    bored: 120,
    resets: "breakable",
    mostIdle: 360,
  },
  {
    ...BASE,
    id: "touch-150-held-450",
    bored: 150,
    resets: "breakable",
    mostIdle: 450,
  },
  { ...BASE, id: "not-steel-120", bored: 120, resets: "notSteel" },
  { ...BASE, id: "not-steel-150", bored: 150, resets: "notSteel" },
  { ...BASE, id: "wool", woolFirst: true },
  {
    ...BASE,
    id: "touch-120-wool",
    bored: 120,
    resets: "breakable",
    woolFirst: true,
  },
  {
    ...BASE,
    id: "touch-150-wool",
    bored: 150,
    resets: "breakable",
    woolFirst: true,
  },
  {
    ...BASE,
    id: "touch-120-held-360-wool",
    bored: 120,
    resets: "breakable",
    mostIdle: 360,
    woolFirst: true,
  },
  {
    ...BASE,
    id: "touch-150-held-450-wool",
    bored: 150,
    resets: "breakable",
    mostIdle: 450,
    woolFirst: true,
  },
  { ...TOUCH, id: "touch-180-wool", bored: 180, woolFirst: true },
  { ...TOUCH, id: "touch-rows-8", bored: 0, boredPerRow: 8 },
  { ...TOUCH, id: "touch-rows-10", bored: 0, boredPerRow: 10 },
  { ...TOUCH, id: "touch-150-steel-5", bored: 150, steelCosts: 5 },
  { ...TOUCH, id: "touch-150-steel-10", bored: 150, steelCosts: 10 },
  { ...TOUCH, id: "touch-180-steel-10", bored: 180, steelCosts: 10 },
  { ...TOUCH, id: "touch-180-steel-15", bored: 180, steelCosts: 15 },
  {
    ...TOUCH,
    id: "touch-150-steel-10-wool",
    bored: 150,
    steelCosts: 10,
    woolFirst: true,
  },
  {
    ...TOUCH,
    id: "touch-180-steel-10-wool",
    bored: 180,
    steelCosts: 10,
    woolFirst: true,
  },
  { ...TOUCH, id: "touch-120-held-240", bored: 120, mostIdle: 240 },
  { ...TOUCH, id: "touch-180-held-360", bored: 180, mostIdle: 360 },
  { ...BASE, id: "bored-180-wool", bored: 180, woolFirst: true },
  {
    ...TOUCH,
    id: "touch-120-held-240-wool",
    bored: 120,
    mostIdle: 240,
    woolFirst: true,
  },
  {
    ...TOUCH,
    id: "touch-180-held-360-wool",
    bored: 180,
    mostIdle: 360,
    woolFirst: true,
  },
  {
    ...TOUCH,
    id: "touch-180-held-360-wool-cap-900",
    bored: 180,
    mostIdle: 360,
    woolFirst: true,
    mostFlight: 900,
  },
  {
    ...TOUCH,
    id: "touch-180-held-360-wool-cap-1200",
    bored: 180,
    mostIdle: 360,
    woolFirst: true,
    mostFlight: 1200,
  },
];

/** How many touches on bricks that never break, while a fuzzball flies bored, make its yawn a pocket's: it rattled among them, rather than passing one by. */
const POCKET_TOUCHES = 6;

/** Returns how far a fuzzball flies bored under a variant on a field of a depth. */
function boredOf(variant: SimVariant, depth: number): number {
  return variant.boredPerRow === undefined
    ? variant.bored
    : variant.boredPerRow * depth;
}

/** The depths the sim plays: the shallowest, the specs' 13, the middle, and the deepest two shapes a phone takes. */
export const SIM_DEPTHS = [11, 13, 16, 19, 22] as const;

/** How many charges a shot can take. */
const CHARGE_COUNT = MOST_CHARGE + 1;

/**
 * Describes a round as the sim counts it: `[fuzzballs, yawns in open air,
 * yawns among bricks that never break, yawns among bricks that can, whether
 * the player's own yawned, fuzzballs a cap brought home, the flight's
 * length, the longest fuzzball's time in the air, bricks broken, plain
 * strikes on wool, yawns in a pocket of bricks that never break, among the
 * yawns among them]`.
 */
export type RoundCount = readonly [
  balls: number,
  airYawns: number,
  neverYawns: number,
  breakableYawns: number,
  playerYawned: number,
  capped: number,
  length: number,
  longest: number,
  broken: number,
  plainWool: number,
  pocketYawns: number,
];

/** Describes a game of the careless player's as the sim counts it. */
export interface GameCount {
  readonly depth: number;
  readonly seed: number;
  readonly cleared: boolean;
  readonly jumps: number;
  /** Each round it played, in order. */
  readonly rounds: readonly RoundCount[];
}

/** Describes how a level's certificate on a depth plays under a variant. */
export interface CertificateCount {
  readonly depth: number;
  /** How many shots its line has. */
  readonly shots: number;
  readonly holds: boolean;
  readonly cleared: boolean;
  /** The rounds it played before its level ended, or its line did. */
  readonly rounds: number;
}

/** Describes what a variant came to on a level. */
export interface VariantCount {
  readonly games: readonly GameCount[];
  /** The base games' shots, each flown again from the wall it was played at, in the base games' order. */
  readonly paired: readonly RoundCount[];
  /** A shot drawn at random from each of those walls, flown the same way. */
  readonly pairedRandom: readonly RoundCount[];
  readonly certificates: readonly CertificateCount[];
}

/** Describes what the sim measured of a level, by variant. */
export interface LevelCount {
  readonly level: number;
  readonly id: string;
  readonly name: string;
  readonly set: string;
  readonly seeds: number;
  readonly variants: Readonly<Record<string, VariantCount>>;
}

/** Describes a shot played from a wall, kept to fly again under another variant. */
interface Played {
  readonly start: RoundStart;
  readonly shot: Shot;
  /** A shot drawn at random at the same wall. */
  readonly random: Shot;
}

/** Sets the flight's switches to a variant's. */
function fly(variant: SimVariant): void {
  VARIANT.resets = variant.resets;
  VARIANT.mostIdle = variant.mostIdle;
  VARIANT.woolFirst = variant.woolFirst;
  VARIANT.mostFlight = variant.mostFlight;
  VARIANT.steelCosts = variant.steelCosts;
}

/** Returns a shot drawn from a source, an aim then a charge from one draw, as the careless player draws one. */
function drawShot(random: () => number): Shot {
  const drawn = Math.floor(random() * AIM_COUNT * CHARGE_COUNT);
  return shotOf([Math.floor(drawn / CHARGE_COUNT), drawn % CHARGE_COUNT]);
}

/** Returns a round as the sim counts it, flown from a wall under a variant. */
function countRound(
  { flight, outcome }: Round,
  start: RoundStart,
  variant: SimVariant,
): RoundCount {
  let air = 0;
  let never = 0;
  let breakable = 0;
  let playerYawned = 0;
  let plainWool = 0;
  let pocket = 0;
  const bored = boredOf(variant, start.depth);
  /** Each fuzzball's charge before its next strike. */
  const charges: number[] = [];
  /** Each fuzzball's strikes that took no hit, as the moment and whether the brick can break. */
  const touches: [at: number, breaks: boolean][][] = [];
  for (const event of flight.events) {
    switch (event.kind) {
      case "launch":
        charges[event.ball] = event.hot ? MOST_CHARGE : event.charge;
        break;
      case "recharge":
        charges[event.ball] = MOST_CHARGE;
        break;
      case "strike": {
        const kind = start.wall.bricks[event.cell]?.kind;
        if (kind === "wool" && (charges[event.ball] ?? 0) === 0) plainWool++;
        charges[event.ball] = event.charge;
        if (event.took === 0 && kind !== undefined) {
          (touches[event.ball] ??= []).push([
            event.at,
            BRICK_KINDS[kind].hits !== "never",
          ]);
        }
        break;
      }
      case "yawn": {
        if (isCapped(flight.events, event, variant)) break;
        if (event.ball === 0) playerYawned = 1;
        const since = event.at - bored;
        const touched = (touches[event.ball] ?? []).filter(
          ([at]) => at > since,
        );
        if (touched.some(([, breaks]) => breaks)) breakable++;
        else if (touched.length > 0) never++;
        else air++;
        if (
          touched.length >= POCKET_TOUCHES &&
          touched.every(([, breaks]) => !breaks)
        ) {
          pocket++;
        }
        break;
      }
      default:
        break;
    }
  }
  const longest = flight.tracks.reduce((most, { waypoints }) => {
    const first = waypoints[0];
    const last = waypoints.at(-1);
    return first && last ? Math.max(most, last.at - first.at) : most;
  }, 0);
  return [
    flight.tracks.length,
    air,
    never,
    breakable,
    playerYawned,
    flight.capped,
    Math.round(flight.length * 100) / 100,
    Math.round(longest * 100) / 100,
    outcome.broken,
    plainWool,
    pocket,
  ];
}

/** Returns whether a yawn is a cap's, the fuzzball having flown as far as one may since it left. */
function isCapped(
  events: readonly FlightEvent[],
  yawn: Extract<FlightEvent, { kind: "yawn" }>,
  variant: SimVariant,
): boolean {
  const launch = events.find(
    (event) => event.kind === "launch" && event.ball === yawn.ball,
  );
  return launch !== undefined && yawn.at - launch.at >= variant.mostFlight;
}

/**
 * Plays a level as the careless player does (`playCasually()`), counting
 * each round, and handing each shot it plays, with the wall it played it
 * at, to `keep`.
 */
function playGame(
  level: Level,
  depth: number,
  seed: number,
  variant: SimVariant,
  keep: (played: Played) => void,
): GameCount {
  const random = createRandom(seed);
  let start = levelStart(level, depth);
  let jumps = 0;
  const rounds: RoundCount[] = [];
  for (let played = 1; played <= CASUAL_ROUNDS; played++) {
    let best: Round | null = null;
    let bestShot: Shot = { aim: 0, charge: 0 };
    let bestScore = Number.NEGATIVE_INFINITY;
    let first: Shot | null = null;
    for (let look = 0; look < CASUAL_LOOKS; look++) {
      const shot = drawShot(random);
      first ??= shot;
      const round = playRound(start, shot, level.boon, {
        bored: boredOf(variant, depth),
      });
      const score = wallScore(round, played);
      if (best === null || score > bestScore) {
        best = round;
        bestShot = shot;
        bestScore = score;
      }
    }
    if (best === null || first === null) break;
    keep({ start, shot: bestShot, random: first });
    rounds.push(countRound(best, start, variant));
    jumps += best.outcome.jumped ? 1 : 0;
    if (best.outcome.result !== "on") {
      const cleared = best.outcome.result === "cleared";
      return { depth, seed, cleared, jumps, rounds };
    }
    start = best.next;
  }
  return { depth, seed, cleared: false, jumps, rounds };
}

/**
 * Returns what every variant comes to on a level, by its number: the
 * careless player's games on each of {@link SIM_DEPTHS} from `seeds` seeds
 * of the level's own, numbered as `yarn report:levels` numbers them; the
 * base games' shots flown again under each variant; and the level's
 * certificates replayed on every depth.
 */
export function measureLevel(number: number, seeds: number): LevelCount {
  const entry = levelEntryOf(LEVELS, number);
  const level = parseLevel(entry.data);
  const kept: Played[] = [];
  const variants: Record<string, VariantCount> = {};
  for (const variant of VARIANTS) {
    fly(variant);
    const games: GameCount[] = [];
    for (const depth of SIM_DEPTHS) {
      for (let game = 0; game < seeds; game++) {
        games.push(
          playGame(level, depth, number * 1000 + game, variant, (played) => {
            if (variant === BASE) kept.push(played);
          }),
        );
      }
    }
    const again = (start: RoundStart, shot: Shot): RoundCount =>
      countRound(
        playRound(start, shot, level.boon, {
          bored: boredOf(variant, start.depth),
        }),
        start,
        variant,
      );
    const paired = kept.map(({ start, shot }) => again(start, shot));
    const pairedRandom = kept.map(({ start, random }) => again(start, random));
    const certificates = DEPTHS.flatMap((depth) => {
      const line = certificateOf(entry, depth);
      if (line === null) return [];
      const played = replayLine(level, depth, line, {
        bored: boredOf(variant, depth),
      });
      return [
        {
          depth,
          shots: line.length,
          holds: lineHolds(line, played),
          cleared: played.cleared,
          rounds: played.rounds,
        },
      ];
    });
    variants[variant.id] = { games, paired, pairedRandom, certificates };
  }
  fly(BASE);
  return {
    level: number,
    id: entry.data.id,
    name: entry.data.name,
    set: entry.set.id,
    seeds,
    variants,
  };
}

/** How many levels the game has, which `run.mjs` plays each of. */
export const LEVEL_COUNT = LEVELS.length;
