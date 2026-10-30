import type { Provider } from "@angular/core";
import type { GameService } from "../app/play/game.service";
import { GAME_LEVELS, GAME_RANDOM } from "../app/play/tokens";
import {
  type LevelData,
  type LevelEntry,
  type LevelSetData,
  levelsOf,
} from "../rules/levels";
import type { Steer } from "../rules/paddle";
import { FIELD_WIDTH } from "../rules/tuning";

/** How long a frame of the board takes, at 60 a second. */
export const FRAME_MS = 1000 / 60;

/** The most frames a spec plays for something to happen: a minute's at 60 a second. */
const PLAY_LIMIT_FRAMES = 3600;

/** Returns a level of gifts that each let a capsule fall, before a wall of steel. */
function giftsOf(capsule: string, name: string): LevelData {
  return {
    id: capsule,
    name,
    capsules: [],
    legend: { g: { kind: "gift", capsule } },
    bricks: ["#".repeat(13), ".............", "g".repeat(13)],
  };
}

/** A row of blast bricks, which a hit on any one of them clears. */
const BLASTS: LevelData = {
  id: "blasts",
  name: "Blasts",
  capsules: [],
  bricks: ["*".repeat(13)],
};

/** The last level, blasts again, clearing which wins the run. */
const LAST: LevelData = { ...BLASTS, id: "last", name: "Last" };

/** The levels the shell's specs play: small, each set up to come to one thing soon. */
const SET: LevelSetData = {
  id: "specs",
  name: "Specs",
  drops: 0,
  levels: [
    BLASTS,
    // Gifts that each let a wide paddle fall, before steel.
    giftsOf("wide", "Wide"),
    // A wall of steel, which no ball gets past, before the brick it needs.
    {
      id: "steel",
      name: "Steel",
      capsules: [],
      bricks: ["......o......", ".............", "#".repeat(13)],
    },
    // Five bricks the blasts below them can't reach.
    {
      id: "few",
      name: "Few",
      capsules: [],
      bricks: ["ooooo........", ".............", "*".repeat(13)],
    },
    giftsOf("life", "Lives"),
    giftsOf("laser", "Laser"),
    giftsOf("catch", "Catch"),
    LAST,
  ],
};

/** The shell's specs' levels, numbered from 1. */
export const SPEC_LEVELS: readonly LevelEntry[] = levelsOf([SET]);

/** Two sets, of two levels and then one, each cleared at a hit. */
export const TWO_SETS: readonly LevelEntry[] = levelsOf([
  {
    id: "first",
    name: "First",
    drops: 0,
    levels: [BLASTS, { ...BLASTS, id: "again", name: "Again" }],
  },
  { id: "second", name: "Second", drops: 0, levels: [LAST] },
]);

/** Each of the specs' levels' numbers, by what it is set up for. */
export const SPEC_LEVEL = {
  blasts: 1,
  wide: 2,
  steel: 3,
  few: 4,
  lives: 5,
  laser: 6,
  catch: 7,
  last: 8,
} as const;

/** Returns the providers that hand `GameService` the specs' levels, or those given, and a seed of its own. */
export function provideSpecLevels(
  levels: readonly LevelEntry[] = SPEC_LEVELS,
): Provider[] {
  return [
    { provide: GAME_LEVELS, useValue: levels },
    { provide: GAME_RANDOM, useValue: () => 0.5 },
  ];
}

/** Leaves the paddle where it is. */
export const STILL: Readonly<Steer> = { to: null, by: 0, push: 0 };

/** Returns the steering that keeps the paddle under the lowest ball in play. */
export function under(game: GameService): Steer {
  return { to: lowestBallX(game), by: 0, push: 0 };
}

/** Returns the steering that sends the paddle to the wall farthest from the lowest ball. */
export function awayFrom(game: GameService): Steer {
  const x = lowestBallX(game) ?? FIELD_WIDTH / 2;
  return { to: x < FIELD_WIDTH / 2 ? FIELD_WIDTH : 0, by: 0, push: 0 };
}

/** Returns the steering that puts the paddle under a falling capsule, else under the ball. */
export function underCapsule(game: GameService): Steer {
  const capsule = game.frame().field.falling.find((each) => each.live);
  return capsule ? { to: capsule.x, by: 0, push: 0 } : under(game);
}

/** Returns where the lowest ball in play is across, or null with none. */
function lowestBallX(game: GameService): number | null {
  let lowest: { x: number; y: number } | null = null;
  for (const ball of game.frame().field.balls) {
    if (ball.live && (!lowest || ball.y > lowest.y)) lowest = ball;
  }
  return lowest?.x ?? null;
}

/**
 * Ticks the game a frame at a time, steered as a rule says, until something
 * comes to pass, failing past a minute's frames.
 */
export function playUntil(
  game: GameService,
  steer: (game: GameService) => Readonly<Steer>,
  done: () => boolean,
  frameMs = FRAME_MS,
): void {
  for (let frame = 0; !done(); frame++) {
    if (frame > PLAY_LIMIT_FRAMES) throw new Error("It never came to pass.");
    game.tick(frameMs, steer(game));
  }
}

/** Ticks the game a frame at a time for a while, steered the same way throughout. */
export function playFor(
  game: GameService,
  ms: number,
  steer: Readonly<Steer>,
): void {
  for (let played = 0; played < ms; played += FRAME_MS) {
    game.tick(FRAME_MS, steer);
  }
}

/** Serves the ball, at once or once it is back on the paddle, and plays it until it is lost. */
export function loseBall(game: GameService): void {
  playUntil(game, () => STILL, game.serving);
  const lives = game.lives();
  game.launch();
  playUntil(game, awayFrom, () => game.lives() < lives);
}

/** Launches the level in play and keeps the ball in play until the level is cleared or the run won. */
export function playToClear(game: GameService): void {
  game.launch();
  playUntil(game, under, () => game.outcome() !== "playing");
}

/** Clears the level in play, then goes on to the next once its card shows. */
export function clearToNext(game: GameService): void {
  playToClear(game);
  playUntil(game, () => STILL, game.clearedOpen);
  game.nextLevel();
}
