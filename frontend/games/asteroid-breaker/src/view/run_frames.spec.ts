import { ROCK_KINDS, pointsFor } from "../rules/catalog/rocks";
import { hitRock } from "../rules/rocks/rocks";
import type { EndMarks } from "../rules/run/describe";
import { type Run, createRun, pause, startWave } from "../rules/run/run";
import { type Crew, aboard } from "../rules/ship/pilots";
import { STILL, type Steer } from "../rules/ship/ship";
import { STEP_MS, stepsIn } from "../rules/stepper";
import {
  CLEAN_POINTS,
  CLEAR_POINTS,
  LOOSE_LIFE_MS,
  LOOSE_SWELL_MS,
  STATIC_HOLD_MS,
  STATIC_MOST,
  STATIC_STEPS,
} from "../rules/tuning";
import { type WaveData, wavesOf } from "../rules/waves/waves";
import {
  KEEPER,
  fieldFrom,
  placeLoose,
  placePickup,
  placeRock,
  placeStray,
  shipOf,
} from "../testing/field_picture";
import { CLEARED_BUZZ, LOST_BUZZ } from "./effects/haptics";
import {
  BOULDER_HOLD_MS,
  clearedDelayMs,
  resultDelayMs,
} from "./effects/timing";
import { type FrameChange, RunFrames } from "./run_frames";
import { TALLY_COUNT_MS } from "./tally";
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

/** A ship alone, its wave cleared once a rock laid on it goes. */
const ALONE: readonly string[] = ["^"];

/** The time a volatile rock takes to go off once broken, which a frame of twelve steps holds. */
const BLAST_MS = stepsIn(ROCK_KINDS.volatile.traits[0].delayMs) * STEP_MS;

/** A crew with no one in tow, its pilot at the controls alone. */
const NO_ONE_IN_TOW: Crew = { pilot: 0, tow: [], home: [], lastGiven: 2 };

/** Fire held, a first move and a shot. */
const FIRE: Readonly<Steer> = { ...STILL, fire: true };

/** Where static's first step, ×2, starts. */
const FIRST_STEP = STATIC_STEPS[2].from;

/** A turn of the keys, a first move that fires no shot. */
const TURN: Readonly<Steer> = { ...STILL, turn: 1 };

/** What a frame that changes nothing hands the shell, playing nothing, its pilot at rest. */
const NOTHING: FrameChange = {
  run: null,
  moved: false,
  cameHome: [],
  loose: null,
  multiplier: null,
  step: null,
  face: "rest",
  lift: 0,
  tally: null,
  opens: null,
  countMs: 0,
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

/** Returns a run's wave in play over a pictured field, which takes the run's crew. */
function gameOf(run: Run, rows: readonly string[]): Game {
  const field = fieldFrom(rows, { crew: run.crew });
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
 * Plays frames until a hit knocks one of the run's crew loose, failing the
 * spec if none ever does, and returns the last frame's change.
 */
function playToKnock(game: Game): FrameChange {
  const before = aboard(game.run.crew);
  for (let frame = 0; frame < PLAY_LIMIT_FRAMES; frame++) {
    const change = tick(game);
    if (aboard(game.run.crew) < before) return change;
  }
  throw new Error("No hit ever knocked one of the crew loose.");
}

/** Logs a boulder broken far from a game's ship, which its next frame hears. */
function breakBoulder(game: Game): void {
  const boulder = placeRock(game.play.field, "boulder", 60, 10, "boulder");
  boulder.live = false;
  game.play.field.events.addBreak(boulder, 1, 1, 0);
}

/** Returns the run's first wave cleared, as the frame that cleared it left it. */
function cleared(): Game {
  const game = underWay(PEBBLE);
  playTo(game, "cleared", FIRE);
  return game;
}

/** Returns a run ended, its pod hit with no one in tow, as the frame that ended it left it. */
function ended(): Game {
  const game = underWay(CRASH, { ...runAt(1), crew: NO_ONE_IN_TOW });
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
        change: { ...NOTHING, multiplier: 1, step: 0, face: "sleepy" },
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
    it("holds the field still for a boulder's first beat where motion is welcome", () => {
      const game = underWay(OPEN);
      breakBoulder(game);
      tick(game, STILL, { motion: true });
      const { steps } = game.play.field;

      tick(game, STILL, { ms: BOULDER_HOLD_MS, motion: true });

      expect(game.play.field.steps).toBe(steps);
    });

    it("holds the field still for no boulder where the player prefers less motion", () => {
      const game = underWay(OPEN);
      breakBoulder(game);
      tick(game);
      const { steps } = game.play.field;

      tick(game, STILL, { ms: 2.5 * STEP_MS });

      expect(game.play.field.steps).toBe(steps + 2);
    });

    it("changes nothing of the run at a frame that changes nothing of the field", () => {
      const game = underWay(OPEN);
      const { run } = game;

      const change = tick(game);

      expect({ ...change, kept: game.run === run }).toEqual({
        ...NOTHING,
        moved: true,
        multiplier: 1,
        step: 0,
        kept: true,
      });
    });

    it("costs the run one of its crew knocked loose by a hit, and says how many are left in tow", () => {
      const game = underWay(CRASH);

      playToKnock(game);

      expect({
        outcome: game.run.outcome,
        aboard: aboard(game.run.crew),
        said: game.said,
      }).toEqual({
        outcome: "playing",
        aboard: 2,
        said: ["Hit! One knocked loose. 1 in tow."],
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
        said: ["Caught. 3 in tow."],
      });
    });

    it("hands on the pilot of a stray brought straight home with the line full, and says so", () => {
      const full: Crew = {
        pilot: 0,
        tow: [1, 2, 3, 4, 6],
        home: [],
        lastGiven: 6,
      };
      const game = underWay(OPEN, { ...runAt(1), crew: full });
      const ship = shipOf(game.play.field);
      placeStray(game.play.field, ship.x, ship.y, Math.PI / 2, 5);

      const { cameHome } = tick(game);

      expect({ cameHome, said: game.said }).toEqual({
        cameHome: [5],
        said: ["Brought straight home, with the line full."],
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

    it("scores twice once static reaches the multiplier's first step", () => {
      const game = underWay(OPEN);
      game.play.field.charge.level = FIRST_STEP;

      const { multiplier, step } = tick(game);

      expect({ multiplier, step }).toEqual({ multiplier: 2, step: 1 });
    });

    it("scores once again as static drains below that step", () => {
      const game = underWay(OPEN);
      game.play.field.charge.level = FIRST_STEP;
      for (let frame = 0; frame < stepsIn(STATIC_HOLD_MS); frame++) tick(game);

      const { multiplier, step } = tick(game);

      expect({ multiplier, step }).toEqual({ multiplier: 1, step: 0 });
    });
  });

  describe("clearing a wave", () => {
    it("banks the wave's points, and says so, and which wave comes next", () => {
      const game = underWay(PEBBLE);

      playTo(game, "cleared", FIRE);

      expect({ score: game.run.score, said: game.said }).toEqual({
        score: pointsFor("stone", "small") + CLEAR_POINTS + CLEAN_POINTS,
        said: ["Wave 1 cleared! Score 1,040. Next: wave 2, Last."],
      });
    });

    it("adds up the wave's points for its card", () => {
      const game = underWay(PEBBLE);

      const { tally } = playTo(game, "cleared", FIRE);

      expect(tally).toEqual({
        rocks: pointsFor("stone", "small"),
        sparks: 0,
        static: 0,
        strays: 0,
        cleared: CLEAR_POINTS,
        clean: CLEAN_POINTS,
      });
    });

    it("keeps static as the wave clears, adding what it multiplied to the wave's points apart", () => {
      const game = underWay(PEBBLE);
      game.play.field.charge.level = FIRST_STEP;

      const { multiplier, tally } = playTo(game, "cleared", FIRE);

      expect({ multiplier, static: tally?.static }).toEqual({
        multiplier: 2,
        static: pointsFor("stone", "small"),
      });
    });

    it("says the last sector is cleared, and Endless begins", () => {
      const game = underWay(PEBBLE, runAt(2));

      playTo(game, "cleared", FIRE);

      expect(game.said).toEqual([
        "Near cleared! Endless begins. Score 1,040. Next: wave 3, Endless.",
      ]);
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
      tick(game, STILL, { motion: true });

      const change = tick(game, FIRE, { ms: 20, motion: true });

      expect({ change, steps: game.play.field.steps }).toEqual({
        change: { ...NOTHING, countMs: 20, face: "happy" },
        steps,
      });
    });

    it("counts each frame's time toward the card's sum counting up where motion is welcome", () => {
      const game = cleared();

      const { countMs } = tick(game, STILL, { ms: 20, motion: true });

      expect(countMs).toBe(20);
    });

    it("counts the card's sum whole at once where the player prefers less motion", () => {
      const game = cleared();

      const { countMs } = tick(game, STILL, { ms: 20 });

      expect(countMs).toBe(TALLY_COUNT_MS);
    });

    it("counts nothing toward a sum at the frame that clears the wave", () => {
      const game = underWay(PEBBLE);

      const { countMs } = playTo(game, "cleared", FIRE);

      expect(countMs).toBe(0);
    });
  });

  describe("the end of a run", () => {
    it("ends as a hit takes the pod with no one in tow, and says so", () => {
      const game = underWay(CRASH, { ...runAt(1), crew: NO_ONE_IN_TOW });

      playTo(game, "over");

      expect({
        aboard: aboard(game.run.crew),
        said: game.said,
      }).toEqual({
        aboard: 0,
        said: ["Everyone is home. Score 0, on wave 1."],
      });
    });

    it("says the run's end last of all a frame says", () => {
      const game = gameOf({ ...runAt(1), crew: NO_ONE_IN_TOW }, CRASH);

      tick(game);

      expect(game.said).toEqual([
        "Wave 1, First. 1 rock. Everyone is home. Score 0, on wave 1.",
      ]);
    });

    it("says what the run set as it ends, as the shell's records say", () => {
      const game = underWay(CRASH, { ...runAt(1), crew: NO_ONE_IN_TOW });
      game.marks = { newBest: true, clearedAll: true };

      playTo(game, "over");

      expect(game.said).toEqual([
        "Everyone is home. Score 0, on wave 1. A new best! Cleared all thirty!",
      ]);
    });

    it("opens the result card at the next frame where the player prefers less motion", () => {
      const game = ended();

      const { opens } = tick(game);

      expect(opens).toBe("result");
    });

    it("waits for the pod's burst before the result card where motion is welcome", () => {
      const game = ended();

      const { opens } = tick(game, STILL, {
        ms: resultDelayMs(true) - 1,
        motion: true,
      });

      expect(opens).toBeNull();
    });

    it("opens the result card once the pod's burst has flown", () => {
      const game = ended();

      const { opens } = tick(game, STILL, {
        ms: resultDelayMs(true),
        motion: true,
      });

      expect(opens).toBe("result");
    });
  });

  describe("buzzing the phone", () => {
    it("buzzes once, firmly, as a hit knocks one of the crew loose", () => {
      const game = underWay(CRASH);

      const { buzz } = playToKnock(game);

      expect(buzz).toBe(LOST_BUZZ);
    });

    it("buzzes once, firmly, as a hit ends the run", () => {
      const game = underWay(CRASH, { ...runAt(1), crew: NO_ONE_IN_TOW });

      const { buzz } = playTo(game, "over");

      expect(buzz).toBe(LOST_BUZZ);
    });

    it("buzzes nothing as a stray brought home rides in tow", () => {
      const game = underWay(OPEN);
      const ship = shipOf(game.play.field);
      placeStray(game.play.field, ship.x, ship.y, Math.PI / 2, 5);

      const { buzz } = tick(game);

      expect({ aboard: aboard(game.run.crew), buzz }).toEqual({
        aboard: 4,
        buzz: null,
      });
    });

    it("buzzes nothing at the frame after one is knocked loose", () => {
      const game = underWay(CRASH);
      playToKnock(game);

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
    it("buzzes for a hit rather than the wave a blast then clears in the frame", () => {
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

  describe("the pilot at the controls", () => {
    it("shows the face its field shows, set as the ship fires", () => {
      const game = underWay(OPEN);

      const { face } = tick(game, FIRE);

      expect(face).toBe("set");
    });

    it("blinks now and then where motion is welcome", () => {
      const game = underWay(OPEN);

      const { face } = tick(game, STILL, { motion: true });

      expect(face).toBe("blink");
    });

    it("never blinks where the player prefers less motion", () => {
      const game = underWay(OPEN);

      const { face } = tick(game, STILL, { motion: false });

      expect(face).toBe("rest");
    });

    it("looks dizzy once a hit knocks one of the crew loose", () => {
      const game = underWay(CRASH);

      const { face } = playToKnock(game);

      expect(face).toBe("dizzy");
    });

    it("notes what an event means for the face at the step its field stands at", () => {
      const game = underWay(OPEN);
      game.play.field.steps = 1000;
      const ship = shipOf(game.play.field);
      placeStray(game.play.field, ship.x, ship.y, Math.PI / 2, 5);

      const { face } = tick(game);

      expect(face).toBe("happy");
    });

    it("forgets the last wave's moments on the next wave's field", () => {
      const game = underWay(CRASH);
      playToKnock(game);
      const next: Game = { ...game, play: new WavePlay(fieldFrom(OPEN), 7) };

      const { face } = tick(next);

      expect(face).toBe("rest");
    });

    it("looks happy over a cleared wave", () => {
      const game = underWay(PEBBLE);

      const { face } = playTo(game, "cleared", FIRE);

      expect(face).toBe("happy");
    });

    it.each([
      [0, 0],
      [STATIC_STEPS[2].from, 1],
      [STATIC_STEPS[1].from, 2],
      [STATIC_STEPS[0].from, 3],
      [STATIC_MOST, 3],
    ])(
      "lifts the fur a step for each of static's multipliers, and no further at full static: at %d static, lift %i",
      (level, lift) => {
        const game = underWay(OPEN);
        game.play.field.charge.level = level;

        const change = tick(game);

        expect(change.lift).toBe(lift);
      },
    );

    it("lays the fur flat again as static drains below its first step", () => {
      const game = underWay(OPEN);
      game.play.field.charge.level = FIRST_STEP;
      for (let frame = 0; frame < stepsIn(STATIC_HOLD_MS); frame++) tick(game);

      const { lift } = tick(game);

      expect(lift).toBe(0);
    });

    it("shows the pilot's face and fur while its wave is paused, as its field does", () => {
      const game = underWay(OPEN);
      game.play.field.charge.level = STATIC_STEPS[1].from;
      tick(game, FIRE);
      game.run = pause(game.run);

      const { face, lift } = tick(game, STILL, { ms: 10 * STEP_MS });

      expect({ face, lift }).toEqual({ face: "set", lift: 2 });
    });
  });

  describe("the crew knocked loose", () => {
    it("says who a hit knocks loose", () => {
      const game = underWay(CRASH);

      const change = playToKnock(game);

      expect(change.loose).toEqual([2]);
    });

    it("says nothing of them at a frame that changes none of them", () => {
      const game = underWay(CRASH);
      playToKnock(game);

      expect(tick(game).loose).toBeNull();
    });

    it("says those out the last knocked first, as the line ran before the hits", () => {
      const game = underWay(OPEN);
      const { field } = game.play;
      placeLoose(field, 10, 10, 5).knockedAt = field.steps - 1;
      placeLoose(field, 30, 10, 4).knockedAt = field.steps;

      expect(tick(game).loose).toEqual([4, 5]);
    });

    it("says none out as the pod catches one again", () => {
      const game = underWay(CRASH);
      playToKnock(game);
      const { field } = game.play;
      const ship = shipOf(field);
      const loose = field.loose.find((each) => each.live);
      if (!loose) throw new Error("No one was knocked loose.");
      Object.assign(loose, {
        x: ship.x,
        y: ship.y,
        lastX: ship.x,
        lastY: ship.y,
        knockedAt: field.steps - stepsIn(LOOSE_SWELL_MS),
      });

      expect(tick(game).loose).toEqual([]);
    });

    it("says those out anew as the same pilots change places, one caught and knocked loose again", () => {
      const game = underWay(OPEN);
      const { field } = game.play;
      const first = placeLoose(field, 10, 10, 5);
      first.knockedAt = field.steps - 2;
      placeLoose(field, 30, 10, 4).knockedAt = field.steps - 1;
      tick(game);

      first.knockedAt = field.steps;

      expect(tick(game).loose).toEqual([5, 4]);
    });

    it("says nothing of them on the next wave's field, with none out, though some were on the last", () => {
      const game = underWay(CRASH);
      playToKnock(game);
      const next: Game = { ...game, play: new WavePlay(fieldFrom(OPEN), 7) };

      expect(tick(next).loose).toBeNull();
    });

    it("says none out as one floats home", () => {
      const game = underWay(OPEN);
      const { field } = game.play;
      const loose = placeLoose(field, 10, 10, 5);
      tick(game);

      loose.knockedAt = field.steps - stepsIn(LOOSE_LIFE_MS) + 1;

      expect(tick(game).loose).toEqual([]);
    });

    it("says none out as the wave is cleared, taking them back", () => {
      const game = underWay(PEBBLE);
      placeLoose(game.play.field, 40, 30, 5);
      tick(game);

      const { loose } = playTo(game, "cleared", FIRE);

      expect(loose).toEqual([]);
    });

    it("says none out as the run ends, floating them home", () => {
      const game = underWay(OPEN, { ...runAt(1), crew: NO_ONE_IN_TOW });
      const { field } = game.play;
      placeLoose(field, 40, 30, 5);
      tick(game);
      const ship = shipOf(field);
      placeRock(field, "small", ship.x, ship.y);

      const { loose } = playTo(game, "over");

      expect(loose).toEqual([]);
    });
  });

  describe("a paused wave", () => {
    it("stays as it is, its static too", () => {
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
