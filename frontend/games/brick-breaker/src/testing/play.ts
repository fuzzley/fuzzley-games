import type { Provider } from "@angular/core";
import { levelsOf } from "@fz/core/levels";
import { FRAME_MS, playUntil } from "@fz/core/testing";
import { GAME_RANDOM } from "@fz/game-ui/random";
import type { GameService } from "../app/play/game.service";
import { GAME_LEVELS } from "../app/tokens";
import type {
  LevelData,
  LevelEntry,
  LevelSetData,
} from "../rules/levels/levels";
import { FIELD_WIDTH } from "../rules/tuning";
import type { PlayerSteer } from "../view/steering/steering";

/** Returns a level of gifts that each let a capsule fall, before a wall of steel. */
function giftsOf(capsule: string, name: string): LevelData {
  return {
    id: capsule,
    name,
    mark: 5,
    capsules: [],
    legend: { g: { kind: "gift", capsule } },
    bricks: ["#".repeat(13), ".............", "g".repeat(13)],
  };
}

/**
 * A short row of blast bricks, which a hit on any one of them clears: short
 * enough that the blasts' chain is out before the ball is back at the
 * paddle at any speed, which would end the streak and change the points.
 */
const BLASTS: LevelData = {
  id: "blasts",
  name: "Blasts",
  mark: 5,
  capsules: [],
  bricks: ["........*****"],
};

/** A row of a level's bricks with none in it. */
const NO_BRICKS = ".".repeat(13);

/**
 * A gift that lets a narrow paddle fall into the paddle kept under the ball
 * the gift sends straight back, which goes on to set off a row of blasts
 * far above it, each paying double; its mark lies past the five blasts'
 * streak, so it clears without its third star.
 */
const DARE: LevelData = {
  id: "dare",
  name: "Dare",
  mark: 10,
  capsules: [],
  legend: { n: { kind: "gift", capsule: "narrow" } },
  bricks: [
    NO_BRICKS,
    NO_BRICKS,
    ".....*****...",
    ...Array.from({ length: 12 }, () => NO_BRICKS),
    ".........n...",
  ],
};

/** The last level, blasts again, clearing which wins the run. */
const LAST: LevelData = { ...BLASTS, id: "last", name: "Last" };

/** The levels the shell's specs play: small, each set up to come to one thing soon. */
const SET: LevelSetData = {
  id: "specs",
  name: "Specs",
  place: "playroom",
  drops: 0,
  levels: [
    BLASTS,
    // Gifts that each let a wide paddle fall, before steel.
    giftsOf("wide", "Wide"),
    // A wall of steel, which no ball gets past, before the brick it needs.
    {
      id: "steel",
      name: "Steel",
      mark: 5,
      capsules: [],
      bricks: ["......o......", ".............", "#".repeat(13)],
    },
    // Five bricks the blasts below them can't reach.
    {
      id: "few",
      name: "Few",
      mark: 5,
      capsules: [],
      bricks: ["ooooo........", ".............", "*".repeat(13)],
    },
    giftsOf("life", "Lives"),
    giftsOf("laser", "Laser"),
    giftsOf("catch", "Catch"),
    DARE,
    LAST,
  ],
};

/** The shell's specs' levels, numbered from 1. */
export const SPEC_LEVELS: readonly LevelEntry[] = levelsOf([SET]);

/** Two sets, of two levels and then one, each cleared at a hit. */
export const TWO_SETS: readonly LevelEntry[] = levelsOf<LevelSetData>([
  {
    id: "first",
    name: "First",
    place: "playroom",
    drops: 0,
    levels: [BLASTS, { ...BLASTS, id: "again", name: "Again" }],
  },
  { id: "second", name: "Second", place: "playroom", drops: 0, levels: [LAST] },
]);

/** Two sets of a level each, in two places: the playroom, then the workshop. */
export const TWO_PLACES: readonly LevelEntry[] = levelsOf<LevelSetData>([
  { id: "near", name: "Near", place: "playroom", drops: 0, levels: [BLASTS] },
  { id: "far", name: "Far", place: "workshop", drops: 0, levels: [LAST] },
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
  dare: 8,
  last: 9,
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

/** Leaves the paddle where it is, and holds no aim. */
export const STILL: Readonly<PlayerSteer> = {
  to: null,
  by: 0,
  push: 0,
  aim: null,
  showsGuide: false,
  turnEnded: false,
};

/** Returns the steering that keeps the paddle under the lowest ball in play. */
export function under(game: GameService): PlayerSteer {
  return { ...STILL, to: lowestBallX(game) };
}

/** Returns the steering that sends the paddle to the wall farthest from the lowest ball. */
export function awayFrom(game: GameService): PlayerSteer {
  const x = lowestBallX(game) ?? FIELD_WIDTH / 2;
  return { ...STILL, to: x < FIELD_WIDTH / 2 ? FIELD_WIDTH : 0 };
}

/** Returns the steering that puts the paddle under a falling capsule, else under the ball. */
export function underCapsule(game: GameService): PlayerSteer {
  const capsule = game.frame().field.falling.find((each) => each.live);
  return capsule ? { ...STILL, to: capsule.x } : under(game);
}

/** Returns where the lowest ball in play is across, or null with none. */
function lowestBallX(game: GameService): number | null {
  let lowest: { x: number; y: number } | null = null;
  for (const ball of game.frame().field.balls) {
    if (ball.live && (!lowest || ball.y > lowest.y)) lowest = ball;
  }
  return lowest?.x ?? null;
}

/** Returns how far the first ball moves in the game's next frame, the paddle still. */
export function travelled(game: GameService): number {
  const [ball] = game.frame().field.balls;
  if (!ball) throw new Error("No ball on the field.");
  const { x, y } = ball;
  game.tick(FRAME_MS, STILL);
  return Math.hypot(ball.x - x, ball.y - y);
}

/** Serves the ball, at once or once it is back on the paddle, and plays it until it is lost. */
export function loseBall(game: GameService): void {
  playUntil(
    game,
    () => STILL,
    () => game.frame().field.state !== "lost",
  );
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
