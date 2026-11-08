import { ROCK_KINDS, pointsFor } from "../rules/catalog/rocks";
import { hitRock } from "../rules/rocks/rocks";
import type { EndMarks } from "../rules/run/describe";
import { type Run, createRun, pause, startWave } from "../rules/run/run";
import type { Crew } from "../rules/ship/pilots";
import { STILL, type Steer } from "../rules/ship/ship";
import { STEP_MS, stepsIn } from "../rules/stepper";
import {
  CHAIN_MS,
  CLEAN_POINTS,
  CLEAR_POINTS,
  FIRST_SHIP_POINTS,
  SHIP_LENGTH,
} from "../rules/tuning";
import { type WaveData, wavesOf } from "../rules/waves/waves";
import {
  KEEPER,
  fieldFrom,
  placePickup,
  placeRock,
  placeStray,
  shipOf,
} from "../testing/field_picture";
import { CLEARED_BUZZ, LOST_BUZZ } from "./effects/haptics";
import { clearedDelayMs, resultDelayMs } from "./effects/timing";
import { type FrameChange, RunFrames } from "./run_frames";
import { WavePlay } from "./wave_play";

/** Returns a wave of the specs', by its name: what its field holds is the spec's picture's. */
function waveOf(id: string, name: string): WaveData {
  return { id, name, rocks: [], drops: 0, strays: 0 };
}

/**
 * The specs' waves: a sector of two, the last of them the last written, so
 * Endless comes after it.
 */
const WAVES = wavesOf([
  {
    id: "near",
    name: "Near",
    drops: 0,
    waves: [waveOf("first", "First"), waveOf("last", "Last")],
  },
]);

/** A small stone above the ship, which a shot clears. */
const PEBBLE: readonly string[] = ["S", "", "^"];

/** A ship free to fly, a large rock far off keeping its wave in play. */
const OPEN: readonly string[] = [...KEEPER, "", "", "", "....^"];

/** A ship beside a boulder, which takes it at once. */
const CRASH: readonly string[] = ["^B"];

/** A ship above a boulder, which takes it at once, its nose turned away from it. */
const ABOVE_A_BOULDER: readonly string[] = ["", "", "^", "B"];

/** A ship alone, its wave cleared once a rock laid on it goes. */
const ALONE: readonly string[] = ["^"];

/** The time a volatile rock takes to go off once broken, which a frame of twelve steps holds. */
const BLAST_MS = stepsIn(ROCK_KINDS.volatile.traits[0].delayMs) * STEP_MS;

/** A crew down to its last ship. */
const LAST_SHIP: Crew = { flying: [0], home: [], lastGiven: 2 };

/** Fire held, a first move and a shot. */
const FIRE: Readonly<Steer> = { ...STILL, fire: true };

/** A turn of the keys, a first move that fires no shot. */
const TURN: Readonly<Steer> = { ...STILL, turn: 1 };

/** What a frame that changes nothing hands the shell, playing nothing. */
const NOTHING: FrameChange = {
  run: null,
  moved: false,
  cameHome: [],
  chain: null,
  tally: null,
  opens: null,
  buzz: null,
};

/** The most frames a spec plays for something to happen: ten seconds' at 60 a second. */
const PLAY_LIMIT_FRAMES = 600;

/** Describes a run's wave in play, as the shell holds it, and what was said of it. */
interface Game {
  run: Run;
  readonly play: WavePlay;
  readonly frames: RunFrames;
  /** What the shell's records say the run's end set. */
  marks: EndMarks;
  /** Each frame's news, in the order said. */
  readonly said: string[];
}

/** Says how a spec's frame is played: how long it takes, and whether motion is welcome. */
interface FrameOptions {
  readonly ms?: number;
  readonly motion?: boolean;
}

/** Returns a run of the specs' waves at a wave, waiting for its first move. */
function runAt(wave: number): Run {
  return createRun({ id: 1, seed: 7, speed: "normal", wave });
}

/** Returns a run's wave in play over a pictured field, which takes the run's crew and points. */
function gameOf(run: Run, rows: readonly string[]): Game {
  const field = fieldFrom(rows, {
    crew: run.crew,
    banked: run.banked,
    nextShipAt: run.nextShipAt,
  });
  return {
    run,
    play: new WavePlay(field, run.seed),
    frames: new RunFrames(WAVES),
    marks: { newBest: false, clearedAll: false },
    said: [],
  };
}

/**
 * Returns a run's wave over a pictured field, its ship waiting for the
 * first move, as a wave's first does.
 */
function waiting(run: Run, rows: readonly string[]): Game {
  const game = gameOf(run, rows);
  shipOf(game.play.field).waiting = true;
  return game;
}

/** Returns a run's first wave under way over a pictured field. */
function underWay(rows: readonly string[], run = runAt(1)): Game {
  return gameOf(startWave(run), rows);
}

/**
 * Plays a frame as the shell does, taking in the run it changed and what it
 * said, and returns what it changed.
 */
function tick(
  game: Game,
  steer: Readonly<Steer> = STILL,
  { ms = STEP_MS, motion = false }: FrameOptions = {},
): FrameChange {
  const change = game.frames.advance(game.play, game.run, ms, steer, motion);
  game.run = change.run ?? game.run;
  const news = game.frames.news(game.marks);
  if (news !== null) game.said.push(news);
  return change;
}

/**
 * Plays frames until the run comes to an outcome, failing the spec if it
 * never does, and returns the last frame's change.
 */
function playTo(
  game: Game,
  outcome: Run["outcome"],
  steer: Readonly<Steer> = STILL,
): FrameChange {
  for (let frame = 0; frame < PLAY_LIMIT_FRAMES; frame++) {
    const change = tick(game, steer);
    if (game.run.outcome === outcome) return change;
  }
  throw new Error(`The run never came to "${outcome}".`);
}

/**
 * Plays frames until the run loses a ship, failing the spec if it never
 * does, and returns the last frame's change.
 */
function playToLoss(game: Game): FrameChange {
  const ships = game.run.crew.flying.length;
  for (let frame = 0; frame < PLAY_LIMIT_FRAMES; frame++) {
    const change = tick(game);
    if (game.run.crew.flying.length < ships) return change;
  }
  throw new Error("The run never lost a ship.");
}

/**
 * Lays a small stone at the nose of a game's ship, which a shot fired breaks
 * in the step it is fired, before a rock can take the ship.
 */
function stoneOnTheNose(game: Game): void {
  const ship = shipOf(game.play.field);
  placeRock(game.play.field, "small", ship.x, ship.y - SHIP_LENGTH / 2);
}

/** Returns a run at its first wave whose points are a small stone short of the next ship. */
function aStoneShort(): Run {
  return {
    ...runAt(1),
    banked: FIRST_SHIP_POINTS - pointsFor("stone", "small"),
  };
}

/** Returns the run's first wave cleared, as the frame that cleared it left it. */
function cleared(): Game {
  const game = underWay(PEBBLE);
  playTo(game, "cleared", FIRE);
  return game;
}

/** Returns a run ended, its last ship lost, as the frame that ended it left it. */
function ended(): Game {
  const game = underWay(CRASH, { ...runAt(1), crew: LAST_SHIP });
  playTo(game, "over");
  return game;
}

describe("RunFrames", () => {
  describe("a wave waiting for its first move", () => {
    it("holds the field still while nothing moves, and says nothing", () => {
      const game = waiting(runAt(1), OPEN);

      const change = tick(game, STILL, { ms: 1000 });

      expect({
        change,
        steps: game.play.field.steps,
        said: game.said,
      }).toEqual({
        change: { ...NOTHING, chain: 1 },
        steps: 0,
        said: [],
      });
    });

    it("goes on waiting as the ship comes to fire by itself, as the setting turned on asks", () => {
      const game = waiting(runAt(1), OPEN);

      tick(game, { ...STILL, autoFire: true }, { ms: 1000 });

      expect({
        outcome: game.run.outcome,
        steps: game.play.field.steps,
      }).toEqual({ outcome: "ready", steps: 0 });
    });

    it("starts the wave at the first move, and says which wave it is", () => {
      const game = waiting(runAt(1), OPEN);

      const { moved } = tick(game, TURN);

      expect({ outcome: game.run.outcome, moved, said: game.said }).toEqual({
        outcome: "playing",
        moved: true,
        said: ["Wave 1, First. 1 rock."],
      });
    });

    it("says which wave it is no more at the frame after its first move", () => {
      const game = waiting(runAt(1), OPEN);
      tick(game, TURN);

      tick(game, TURN);

      expect(game.said).toEqual(["Wave 1, First. 1 rock."]);
    });

    it("starts a later wave, saying nothing more of it, as going on to it said which it is", () => {
      const game = waiting({ ...runAt(1), wave: 2 }, OPEN);

      tick(game, TURN);

      expect({ outcome: game.run.outcome, said: game.said }).toEqual({
        outcome: "playing",
        said: [],
      });
    });
  });

  describe("a wave under way", () => {
    it("changes nothing of the run at a frame that changes nothing of the field", () => {
      const game = underWay(OPEN);
      const { run } = game;

      const change = tick(game);

      expect({ ...change, kept: game.run === run }).toEqual({
        ...NOTHING,
        moved: true,
        chain: 1,
        kept: true,
      });
    });

    it("costs the run a ship lost, and says how many are left", () => {
      const game = underWay(CRASH);

      playToLoss(game);

      expect({
        outcome: game.run.outcome,
        ships: game.run.crew.flying.length,
        said: game.said,
      }).toEqual({
        outcome: "playing",
        ships: 2,
        said: ["Ship lost. 2 ships left."],
      });
    });

    it("says a pickup caught by its name", () => {
      const game = underWay(OPEN);
      const ship = shipOf(game.play.field);
      placePickup(game.play.field, "shield", ship.x, ship.y);

      tick(game);

      expect(game.said).toEqual(["Shield."]);
    });

    it("hands on the pilot of a stray brought home, and says so", () => {
      const game = underWay(OPEN);
      const ship = shipOf(game.play.field);
      placeStray(game.play.field, ship.x, ship.y, Math.PI / 2, 5);

      const { cameHome } = tick(game);

      expect({
        cameHome,
        strays: game.run.strays,
        said: game.said,
      }).toEqual({
        cameHome: [5],
        strays: 1,
        said: ["Brought home: 1 waiting."],
      });
    });

    it("hands on no pilot at the frame after a stray is brought home", () => {
      const game = underWay(OPEN);
      const ship = shipOf(game.play.field);
      placeStray(game.play.field, ship.x, ship.y, Math.PI / 2, 5);
      tick(game);

      const { cameHome } = tick(game);

      expect(cameHome).toEqual([]);
    });

    it("scores twice once five breaks count on in a chain", () => {
      const game = underWay(OPEN);
      game.play.field.chain = 5;

      const { chain } = tick(game);

      expect(chain).toBe(2);
    });

    it("scores once again when the chain's time is up", () => {
      const game = underWay(OPEN);
      game.play.field.chain = 5;
      for (let frame = 0; frame < stepsIn(CHAIN_MS); frame++) tick(game);

      const { chain } = tick(game);

      expect(chain).toBe(1);
    });
  });

  describe("clearing a wave", () => {
    it("banks the wave's points, and says so", () => {
      const game = underWay(PEBBLE);

      playTo(game, "cleared", FIRE);

      expect({ score: game.run.score, said: game.said }).toEqual({
        score: pointsFor("stone", "small") + CLEAR_POINTS + CLEAN_POINTS,
        said: ["Wave 1 cleared! Score 1,040."],
      });
    });

    it("adds up the wave's points for its card", () => {
      const game = underWay(PEBBLE);

      const { tally } = playTo(game, "cleared", FIRE);

      expect(tally).toEqual({
        rocks: pointsFor("stone", "small"),
        chains: 0,
        strays: 0,
        cleared: CLEAR_POINTS,
        clean: CLEAN_POINTS,
      });
    });

    it("ends the chain, though it counts as the last rock breaks", () => {
      const game = underWay(PEBBLE);
      game.play.field.chain = 5;

      const { chain, tally } = playTo(game, "cleared", FIRE);

      expect({ chain, chains: tally?.chains }).toEqual({
        chain: 1,
        chains: pointsFor("stone", "small"),
      });
    });

    it("says the last sector is cleared, and Endless begins", () => {
      const game = underWay(PEBBLE, runAt(2));

      playTo(game, "cleared", FIRE);

      expect(game.said).toEqual(["Near cleared! Endless begins. Score 1,040."]);
    });

    it("opens the card at the next frame where the player prefers less motion", () => {
      const game = cleared();

      const { opens } = tick(game);

      expect(opens).toBe("cleared");
    });

    it("waits for the last shards to fly before the card where motion is welcome", () => {
      const game = cleared();

      const { opens } = tick(game, STILL, {
        ms: clearedDelayMs(true) - 1,
        motion: true,
      });

      expect(opens).toBeNull();
    });

    it("opens the card once the last shards have flown", () => {
      const game = cleared();

      const { opens } = tick(game, STILL, {
        ms: clearedDelayMs(true),
        motion: true,
      });

      expect(opens).toBe("cleared");
    });

    it("opens the card once, and plays the wave no more", () => {
      const game = cleared();
      const steps = game.play.field.steps;
      tick(game);

      const change = tick(game, FIRE);

      expect({ change, steps: game.play.field.steps }).toEqual({
        change: NOTHING,
        steps,
      });
    });
  });

  describe("the end of a run", () => {
    it("ends once the last ship is lost, and says so", () => {
      const game = underWay(CRASH, { ...runAt(1), crew: LAST_SHIP });

      playTo(game, "over");

      expect({
        ships: game.run.crew.flying.length,
        said: game.said,
      }).toEqual({ ships: 0, said: ["Game over. Score 0, on wave 1."] });
    });

    it("says the run's end last of all a frame says", () => {
      const game = gameOf({ ...runAt(1), crew: LAST_SHIP }, CRASH);

      tick(game);

      expect(game.said).toEqual([
        "Wave 1, First. 1 rock. Game over. Score 0, on wave 1.",
      ]);
    });

    it("says what the run set as it ends, as the shell's records say", () => {
      const game = underWay(CRASH, { ...runAt(1), crew: LAST_SHIP });
      game.marks = { newBest: true, clearedAll: true };

      playTo(game, "over");

      expect(game.said).toEqual([
        "Game over. Score 0, on wave 1. A new best! Cleared all thirty!",
      ]);
    });

    it("opens the result card at the next frame where the player prefers less motion", () => {
      const game = ended();

      const { opens } = tick(game);

      expect(opens).toBe("result");
    });

    it("waits for the last ship's burst before the result card where motion is welcome", () => {
      const game = ended();

      const { opens } = tick(game, STILL, {
        ms: resultDelayMs(true) - 1,
        motion: true,
      });

      expect(opens).toBeNull();
    });

    it("opens the result card once the last ship's burst has flown", () => {
      const game = ended();

      const { opens } = tick(game, STILL, {
        ms: resultDelayMs(true),
        motion: true,
      });

      expect(opens).toBe("result");
    });
  });

  describe("buzzing the phone", () => {
    it("buzzes once, firmly, as the run loses a ship", () => {
      const game = underWay(CRASH);

      const { buzz } = playToLoss(game);

      expect(buzz).toBe(LOST_BUZZ);
    });

    it("buzzes once, firmly, as the run loses its last ship", () => {
      const game = underWay(CRASH, { ...runAt(1), crew: LAST_SHIP });

      const { buzz } = playTo(game, "over");

      expect(buzz).toBe(LOST_BUZZ);
    });

    it("buzzes for a ship lost in the step a shot gains the crew another", () => {
      const game = underWay(ABOVE_A_BOULDER, startWave(aStoneShort()));
      stoneOnTheNose(game);

      const { buzz } = tick(game, FIRE);

      expect({ ships: game.run.crew.flying.length, buzz }).toEqual({
        ships: 3,
        buzz: LOST_BUZZ,
      });
    });

    it("buzzes nothing as a shot gains the crew a ship", () => {
      const game = underWay(OPEN, startWave(aStoneShort()));
      stoneOnTheNose(game);

      const { buzz } = tick(game, FIRE);

      expect({ ships: game.run.crew.flying.length, buzz }).toEqual({
        ships: 4,
        buzz: null,
      });
    });

    it("buzzes nothing at the frame after a ship is lost", () => {
      const game = underWay(CRASH);
      playToLoss(game);

      const { buzz } = tick(game);

      expect(buzz).toBeNull();
    });

    it("buzzes nothing at the frames after the run ends", () => {
      const game = ended();

      const { buzz } = tick(game);

      expect(buzz).toBeNull();
    });

    it("buzzes twice, lightly, as the run clears a wave", () => {
      const game = underWay(PEBBLE);

      const { buzz } = playTo(game, "cleared", FIRE);

      expect(buzz).toBe(CLEARED_BUZZ);
    });

    // The stone on the ship takes it at the frame's first step, and the blast
    // breaks the stone at its last.
    it("buzzes for a ship lost rather than the wave a blast then clears in the frame", () => {
      const game = underWay(ALONE);
      const ship = shipOf(game.play.field);
      placeRock(game.play.field, "small", ship.x, ship.y);
      const volatile = placeRock(
        game.play.field,
        "medium",
        ship.x + 3,
        ship.y,
        "volatile",
      );
      hitRock(game.play.field, volatile, 0, 0);

      const { buzz } = tick(game, STILL, { ms: BLAST_MS });

      expect({ outcome: game.run.outcome, buzz }).toEqual({
        outcome: "cleared",
        buzz: LOST_BUZZ,
      });
    });
  });

  describe("a paused wave", () => {
    it("stays as it is, its chain too", () => {
      const game = underWay(OPEN);
      tick(game);
      game.run = pause(game.run);
      const steps = game.play.field.steps;

      const change = tick(game, FIRE, { ms: 10 * STEP_MS });

      expect({ change, steps: game.play.field.steps }).toEqual({
        change: NOTHING,
        steps,
      });
    });
  });

  describe("news", () => {
    it("says what a frame heard before the wave it starts, all at once", () => {
      const game = waiting(runAt(1), OPEN);
      const ship = shipOf(game.play.field);
      placePickup(game.play.field, "shield", ship.x, ship.y);

      tick(game, TURN);

      expect(game.said).toEqual(["Shield. Wave 1, First. 1 rock."]);
    });

    it("forgets what it said", () => {
      const game = waiting(runAt(1), OPEN);
      tick(game, TURN);

      const news = game.frames.news(game.marks);

      expect(news).toBeNull();
    });
  });
});
