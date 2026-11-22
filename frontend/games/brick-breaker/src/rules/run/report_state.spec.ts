import {
  KEEPER,
  fieldFrom,
  stepTimes,
  throwBall,
} from "../../testing/field_picture";
import { EFFECT_KINDS, catchCapsule } from "../bricks/capsules";
import { CAPSULE_IDS } from "../catalog/capsules";
import {
  type Field,
  createField,
  launch,
  serve,
  steerField,
  stepField,
} from "../field/field";
import { levelsOf, parseLevel } from "../levels/levels";
import { fireBolts } from "../paddle/bolts";
import type { Steer } from "../paddle/paddle";
import { FIELD_WIDTH } from "../tuning";
import {
  type FieldMoment,
  layMoment,
  readMoment,
  takeMoment,
} from "./report_state";
import { type Run, catchUp, createRun, levelSeed, startLevel } from "./run";
import { restoreGame, saveGame, takeUpField } from "./saved_game";

/**
 * A level as busy as a field gets: a gift of each capsule, over gifts and
 * bricks it needs that let any capsule fall, cages whose friends join the
 * ball, two pairs of portals, bumpers, a row of blast bricks that sets off
 * a streak, and two trains of sliders.
 */
const LEVELS = levelsOf([
  {
    id: "moments",
    name: "Moments",
    place: "playroom",
    drops: 0.5,
    levels: [
      {
        id: "busy",
        name: "Busy",
        mark: 5,
        capsules: CAPSULE_IDS,
        legend: {
          W: { kind: "gift", capsule: "wide" },
          M: { kind: "gift", capsule: "multi" },
          S: { kind: "gift", capsule: "slow" },
          L: { kind: "gift", capsule: "life" },
          C: { kind: "gift", capsule: "catch" },
          N: { kind: "gift", capsule: "net" },
          Z: { kind: "gift", capsule: "laser" },
          K: { kind: "gift", capsule: "seeker" },
          A: { kind: "gift", capsule: "narrow" },
          F: { kind: "gift", capsule: "fire" },
          Q: { kind: "gift", capsule: "fast" },
          B: { kind: "gift", capsule: "blast" },
        },
        bricks: [
          "4444444444444",
          "3333333333333",
          "2c2@2c2%2c2?2",
          "o?oOo?oOo?o?o",
          "?o?%?o?@?o?c?",
          "***.......***",
          ".............",
          "WMSLCNZKAFQB?",
          ">>.........<<",
        ],
      },
    ],
  },
]);

/** How many steps the busy level is played for, 40 seconds of it. */
const STEPS = 4800;

/** How many steps the busy field is played between two moments taken, sharing no factor with the controls' beats. */
const STRIDE = 13;

/** How many steps each field laid back is played beside the busy one. */
const FOLLOW = 26;

/** The step from which the paddle keeps away from the ball until one is lost. */
const MISS_FROM = 1600;

/** How far off the ball's middle the paddle meets it, take by take, so the ball goes everywhere. */
const OFFSETS: readonly number[] = [-1.3, 0.4, -0.5, 1.2];

/** Every state of the busy field's play that a moment taken must hold. */
const MOMENT_STATES: readonly string[] = [
  "a ball caught",
  "a ball kind",
  "a ball lost",
  "a ball on the paddle",
  "a ball paced",
  "a ball through a portal",
  "a bolt rising",
  "a capsule falling",
  "a friend freed",
  "a net",
  "a paddle resizing",
  "a seeking ball",
  "a streak",
  "a timed effect",
  "an aim held",
  "balls in play",
  "double pay",
  "keys held",
];

/** Returns a new field of the level a run is on, as the game makes it. */
function fieldFor(run: Run): Field {
  const entry = LEVELS[run.level - 1];
  if (!entry) throw new Error(`No level ${String(run.level)}.`);
  return createField(parseLevel(entry), {
    speed: run.speed,
    seed: levelSeed(run),
  });
}

/** Returns the busy level's run, under way, and its field. */
function busyPlay(): { run: Run; field: Field } {
  const run = startLevel(
    createRun({ id: 1, seed: 7, speed: "normal", lastLevel: 1, level: 1 }),
  );
  return { run, field: fieldFor(run) };
}

/**
 * Returns the field a run and its field are taken up as, from their saved
 * game and the field's moment, each read back from JSON as a report's would
 * be.
 */
function laidBack(run: Run, field: Field): Field {
  const saved: unknown = JSON.parse(
    JSON.stringify(saveGame(run, field, LEVELS)),
  );
  const takenUp = restoreGame(saved, LEVELS, 2);
  if (!takenUp) throw new Error("The saved game wasn't taken up.");
  const fresh = fieldFor(takenUp.run);
  takeUpField(fresh, takenUp.field, takenUp.run);
  layMoment(fresh, readMoment(JSON.parse(JSON.stringify(takeMoment(field)))));
  return fresh;
}

/** Returns the lowest record in play of a pool, or null with none. */
function lowestOf<T extends { live: boolean; y: number }>(
  records: readonly T[],
): T | null {
  let lowest: T | null = null;
  for (const record of records) {
    if (record.live && (!lowest || record.y > lowest.y)) lowest = record;
  }
  return lowest;
}

/**
 * Returns the steering of a step of the busy field, toward the lowest of
 * the balls and the capsules: held keys for one take in four, else a
 * pointer a little off its middle, or away across the field from
 * {@link MISS_FROM} until a ball is lost; and an aim held at every serve.
 */
function steeringOf(field: Readonly<Field>, step: number): Steer {
  const take = Math.floor(step / STRIDE);
  const ball = lowestOf(field.balls);
  const falling = lowestOf(field.falling);
  const chased = falling && (!ball || falling.y > ball.y) ? falling : ball;
  const x = chased?.x ?? FIELD_WIDTH / 2;
  const aim = field.state === "serve" ? 25 : null;
  if (step >= MISS_FROM && field.livesLost === 0) {
    return { to: x < FIELD_WIDTH / 2 ? FIELD_WIDTH : 0, by: 0, push: 0, aim };
  }
  if (take % 4 === 3) {
    const push = x > field.paddle.x ? 1 : -1;
    return { to: null, by: 0, push, aim };
  }
  return { to: x + (OFFSETS[take % OFFSETS.length] ?? 0), by: 0, push: 0, aim };
}

/**
 * Plays a step of a field as the busy field is played: a ball served a
 * while after the last is lost, a launch and the laser at their beats, the
 * steering, then the step.
 */
function playStep(field: Field, step: number, steer: Readonly<Steer>): void {
  if (field.state === "lost" && step % 40 === 39) serve(field);
  if (step % 19 === 18) launch(field);
  if (step % 4 === 0) fireBolts(field);
  steerField(field, steer);
  stepField(field);
}

/** Returns all a field holds, but its level, its setup and its events, which a field laid back makes anew. */
function shown(field: Readonly<Field>): string {
  return JSON.stringify({ ...field, level: null, setup: null, events: null });
}

/** Names the states of {@link MOMENT_STATES} a field holds now. */
function statesOf(field: Readonly<Field>): string[] {
  const live = field.balls.filter((ball) => ball.live);
  const states = [
    field.state === "serve" && "a ball on the paddle",
    field.state === "lost" && "a ball lost",
    live.length > 1 && "balls in play",
    field.state === "playing" &&
      live.some((ball) => ball.held) &&
      "a ball caught",
    field.falling.some((falling) => falling.live) && "a capsule falling",
    field.bolts.some((bolt) => bolt.live) && "a bolt rising",
    EFFECT_KINDS.some((kind) => field.effects[kind].endsAt > 0) &&
      "a timed effect",
    field.paddle.width !== field.paddle.goalWidth && "a paddle resizing",
    field.net && "a net",
    (field.seeking || live.some((ball) => ball.seeks)) && "a seeking ball",
    field.paceScale !== 1 && "a ball paced",
    field.ballKind !== "normal" && "a ball kind",
    field.pay > 1 && "double pay",
    field.streak > 0 && "a streak",
    field.friendsFreed > 0 && "a friend freed",
    live.some((ball) => ball.jumpedAt > 0) && "a ball through a portal",
    field.aim !== null && "an aim held",
    field.paddle.speed !== 0 && "keys held",
  ];
  return states.filter((state) => state !== false);
}

/**
 * Plays the busy field, taking its moment every {@link STRIDE} steps, and
 * as it first comes to a state, and laying it back on the field its saved
 * game takes up, and plays each such field beside it, on the same
 * steering, for {@link FOLLOW} steps; returns where one differed from it,
 * and the states its moments held.
 */
function playAlongside(): { differed: string[]; held: string[] } {
  const play = busyPlay();
  const { field } = play;
  let { run } = play;
  const copies: { field: Field; from: number }[] = [];
  const differed: string[] = [];
  const held = new Set<string>();
  for (let step = 0; step < STEPS && run.outcome === "playing"; step++) {
    const states = statesOf(field);
    if (step % STRIDE === 0 || states.some((state) => !held.has(state))) {
      for (const state of states) held.add(state);
      copies.push({ field: laidBack(run, field), from: step });
    }
    const steer = steeringOf(field, step);
    playStep(field, step, steer);
    run = catchUp(run, field);
    const now = shown(field);
    for (const copy of copies) {
      playStep(copy.field, step, steer);
      if (shown(copy.field) !== now) {
        differed.push(`taken at ${String(copy.from)}, at ${String(step)}`);
      }
    }
    while (copies[0] && copies[0].from <= step - FOLLOW) copies.shift();
  }
  return { differed, held: [...held].sort() };
}

/**
 * Returns a field in which every part of its moment moves at its next
 * steps: a ball in flight, a capsule falling, a bolt rising, and an effect
 * about to end.
 */
function movingField(): Field {
  const field = fieldFrom(["ooo", ...KEEPER]);
  throwBall(field, 5, 20, 30);
  Object.assign(field.falling[0] ?? {}, { live: true, x: 13, y: 10 });
  Object.assign(field.bolts[0] ?? {}, { live: true, x: 5, y: 25, lastY: 25 });
  catchCapsule(field, "slow", 0, 0);
  field.effects.pace.endsAt = field.steps + 2;
  return field;
}

/** Returns the records of a field the scene holds as the field plays: its pools, its paddle and its effects, and each record in them. */
function recordsOf(field: Readonly<Field>): readonly object[] {
  return [
    field.balls,
    ...field.balls,
    field.paddle,
    field.falling,
    ...field.falling,
    field.effects,
    ...EFFECT_KINDS.map((kind) => field.effects[kind]),
    field.bolts,
    ...field.bolts,
  ];
}

/** Returns a field in play, a ball thrown, taken as a moment read back from JSON. */
function moment(): Record<string, unknown> {
  const field = fieldFrom(["ooo"]);
  throwBall(field, 5, 20, 30);
  return JSON.parse(JSON.stringify(takeMoment(field))) as Record<
    string,
    unknown
  >;
}

/** Returns a moment read back from JSON with one of its parts changed. */
function withPart(part: string, value: unknown): Record<string, unknown> {
  return { ...moment(), [part]: value };
}

/** Returns a moment read back from JSON with a part of the first record of one of its pools changed. */
function withRecord(
  pool: "balls" | "falling" | "bolts",
  change: Record<string, unknown>,
): Record<string, unknown> {
  const taken = moment();
  const records = taken[pool] as readonly Record<string, unknown>[];
  return {
    ...taken,
    [pool]: records.map((record, index) =>
      index === 0 ? { ...record, ...change } : record,
    ),
  };
}

/** Returns a moment read back from JSON with its effects changed. */
function withEffects(change: Record<string, unknown>): Record<string, unknown> {
  const taken = moment();
  return {
    ...taken,
    effects: { ...(taken["effects"] as object), ...change },
  };
}

describe("a field's moment", () => {
  it("lays a field back that plays on as it would have, step for step, through every state it comes to", () => {
    const { differed, held } = playAlongside();

    expect({ differed, held }).toEqual({ differed: [], held: MOMENT_STATES });
  });

  it("is taken as a copy, which play doesn't change", () => {
    const field = movingField();
    const taken = takeMoment(field);
    const before = JSON.stringify(taken);

    steerField(field, { to: 20, by: 0, push: 0, aim: null });
    stepTimes(field, 5);

    expect(JSON.stringify(taken)).toBe(before);
  });

  it("is laid into the field's own records, as the scene holds them", () => {
    const field = fieldFrom(["ooo", ...KEEPER]);
    const before = recordsOf(field);
    const moment = takeMoment(movingField());

    layMoment(field, moment);

    expect(
      recordsOf(field).map((record, index) => record === before[index]),
    ).toEqual(before.map(() => true));
    expect(takeMoment(field)).toEqual(moment);
  });

  it("is taken without the aim held", () => {
    const field = fieldFrom(["ooo"]);
    steerField(field, { to: null, by: 0, push: 0, aim: 25 });

    expect(takeMoment(field)).not.toHaveProperty("aim");
  });

  it("is laid back with no aim held", () => {
    const field = fieldFrom(["ooo"]);
    const taken = takeMoment(field);
    steerField(field, { to: null, by: 0, push: 0, aim: 25 });

    layMoment(field, taken);

    expect(field.aim).toBeNull();
  });
});

describe("readMoment", () => {
  it("reads a moment back as it was taken", () => {
    const field = fieldFrom(["ooo"]);
    throwBall(field, 5, 20, 30);
    const taken: FieldMoment = takeMoment(field);

    expect(readMoment(JSON.parse(JSON.stringify(taken)))).toEqual(taken);
  });

  it("refuses a moment that isn't a record", () => {
    expect(() => readMoment([])).toThrow(
      "The game state's moment doesn't fit this build.",
    );
  });

  it("refuses a part it doesn't know, naming it", () => {
    expect(() => readMoment(withPart("aim", 25))).toThrow(
      "The game state's moment.aim doesn't fit this build.",
    );
  });

  it.each<[string, unknown]>([
    ["state", "cleared"],
    ["height", 29],
    ["height", 46],
    ["pay", 0.5],
    ["streak", -1],
    ["climbRate", -0.5],
    ["paceScale", 0],
    ["ballSpeedScale", Number.NaN],
    ["customPercent", 52],
    ["ballKind", "ghost"],
    ["mode", "glue"],
    ["net", "yes"],
    ["seeking", 1],
    ["boltsReadyAt", 1.5],
    ["friendsFreed", null],
  ])("refuses a %s of %j, naming it", (part, value) => {
    expect(() => readMoment(withPart(part, value))).toThrow(
      `The game state's moment.${part} doesn't fit this build.`,
    );
  });

  it.each<["balls" | "falling" | "bolts", Record<string, unknown>]>([
    ["balls", { live: "yes" }],
    ["balls", { x: "5" }],
    ["balls", { dy: Number.POSITIVE_INFINITY }],
    ["balls", { letGoAt: -1 }],
    ["balls", { ink: -2 }],
    ["balls", { ink: 8 }],
    ["balls", { ink: 0.5 }],
    ["balls", { jumpedAt: undefined }],
    ["balls", { spin: 1 }],
    ["falling", { id: "giant" }],
    ["falling", { y: "1" }],
    ["bolts", { lastY: null }],
  ])("refuses %s whose first record has %j", (pool, change) => {
    expect(() => readMoment(withRecord(pool, change))).toThrow(
      `The game state's moment.${pool} doesn't fit this build.`,
    );
  });

  it.each(["balls", "falling", "bolts"])(
    "refuses %s of another size, or no list",
    (pool) => {
      const taken = moment();
      const records = taken[pool] as readonly unknown[];

      expect(() => readMoment({ ...taken, [pool]: records.slice(1) })).toThrow(
        `The game state's moment.${pool} doesn't fit this build.`,
      );
      expect(() => readMoment({ ...taken, [pool]: {} })).toThrow(
        `The game state's moment.${pool} doesn't fit this build.`,
      );
    },
  );

  it.each<Record<string, unknown>>([
    { width: 0 },
    { goalWidth: -4 },
    { target: "5" },
    { dragging: 0 },
    { push: 2 },
    { facing: 0 },
  ])("refuses a paddle with %j", (change) => {
    const taken = moment();

    expect(() =>
      readMoment({
        ...taken,
        paddle: { ...(taken["paddle"] as object), ...change },
      }),
    ).toThrow("The game state's moment.paddle doesn't fit this build.");
  });

  it("reads a paddle heading for a place", () => {
    const taken = moment();
    const paddle = { ...(taken["paddle"] as object), target: 4.5 };

    expect(readMoment({ ...taken, paddle }).paddle.target).toBe(4.5);
  });

  it("reads an effect in play of its own group", () => {
    const pace = { capsule: "slow", endsAt: 900 };

    expect(readMoment(withEffects({ pace })).effects.pace).toEqual(pace);
  });

  it.each<Record<string, unknown>>([
    { pace: { capsule: "wide", endsAt: 900 } },
    { pace: { capsule: "slow", endsAt: -1 } },
    { pace: undefined },
    { sparkle: { capsule: null, endsAt: 0 } },
  ])("refuses effects with %j", (change) => {
    expect(() => readMoment(withEffects(change))).toThrow(
      "The game state's moment.effects doesn't fit this build.",
    );
  });
});
