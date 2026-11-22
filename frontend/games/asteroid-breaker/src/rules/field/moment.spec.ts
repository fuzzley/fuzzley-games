import { describe, expect, it } from "vitest";
import { pilot, playField } from "../../testing/autopilot";
import {
  catchOn,
  placeBurr,
  placeComet,
  placePickup,
  placeShot,
  placeSpark,
  placeStray,
  shipOf,
  stepTimes,
} from "../../testing/field_picture";
import {
  UNDER_WAY_TORUS as TORUS,
  playedField,
  runUnderWay,
  waveOf,
  waveSetupOf,
} from "../../testing/run_under_way";
import { knockLastLoose, withLooseGoneHome } from "../hazards/loose";
import { isFree } from "../rocks/rocks";
import { STILL, type Steer } from "../ship/ship";
import { wrap } from "../torus";
import { type Field, steerField, stepField } from "./field";
import { fillFor } from "./fill";
import { layOutKeptField, savedField } from "./kept_field";
import { type FieldMoment, layMoment, momentOf, readMoment } from "./moment";

/** The specs' run, on its third wave. */
const RUN = runUnderWay();

/** The specs' run's wave, ready to play. */
const WAVE = waveOf(RUN);

/** How many burrs the specs' wave lets adrift at once, on its field. */
const BURRS_AT_ONCE = fillFor(WAVE, TORUS).burrsAtOnce;

/**
 * The steps the busy field is played on with the autopilot before things
 * are laid on it: two seconds, long enough to break rocks and to free
 * slots among them.
 */
const PLAYED_ON = 240;

/** The steps two fields are played side by side: ten seconds. */
const SIDE_BY_SIDE = 1200;

/** Describes a way to spoil a moment, and the part of it that names. */
type MomentSpoil = readonly [
  what: string,
  part: keyof FieldMoment | "moment",
  spoil: (moment: FieldMoment) => unknown,
];

/**
 * Returns the specs' run's field played on by the autopilot, its rocks
 * broken into slots with free ones between, then with something of every
 * kind laid on it: Spread, a Magnet and Slow caught, a shot, a pickup,
 * sparks with a free slot between them, the wave's first stray adrift, one
 * of the crew knocked loose, a comet and a burr.
 */
function busyField(): Field {
  const field = playedField(RUN);
  playField(field, { untilStep: field.steps + PLAYED_ON });
  if (!hasGap(field)) {
    throw new Error("The busy field's rocks have no free slot between them.");
  }
  const ship = shipOf(field);
  const at = (dx: number, dy: number): readonly [number, number] => [
    wrap(ship.x + dx, TORUS.width),
    wrap(ship.y + dy, TORUS.height),
  ];
  for (const pickup of ["spread", "magnet", "slow"] as const) {
    catchOn(field, pickup);
  }
  placeShot(field, "gun", ...at(1, 0), ship.angle);
  placePickup(field, "shield", ...at(12, 6));
  placeSpark(field, ...at(-8, 0));
  placeSpark(field, ...at(-9, 1)).live = false;
  placeSpark(field, ...at(-10, 2));
  placeStray(field, ...at(-14, -10), 0.5);
  field.strays.sent = 1;
  knockLastLoose(field, ship);
  placeComet(field, ...at(20, 14), 1.2);
  placeBurr(field, ...at(-20, 14), 2);
  return field;
}

/** Returns whether a field has a free slot for a rock before one taken. */
function hasGap(field: Field): boolean {
  const free = field.rocks.map(isFree);
  return free.some(
    (isSlotFree, slot) => isSlotFree && free.includes(false, slot),
  );
}

/** Returns a moment as a report carries it: through JSON, and read back. */
function carried(field: Field): FieldMoment {
  const moment = momentOf(field);
  return readMoment(
    JSON.parse(JSON.stringify(moment)),
    WAVE,
    savedField(field),
  );
}

/**
 * Returns the field a saved game takes up for a field, as the game takes it
 * up after a reload, the crew knocked loose kept as gone home, with the
 * field's moment laid on, carried as a report carries it.
 */
function takenUp(field: Field): Field {
  const crew = withLooseGoneHome(field.crew, field);
  const setup = { ...waveSetupOf(RUN), crew };
  const taken = layOutKeptField(WAVE, setup, savedField(field), {
    points: field.score,
    straysHome: field.strays.broughtHome,
  });
  layMoment(taken, carried(field));
  return taken;
}

/**
 * Returns what of a field plays on: all but its events, the crew its setup
 * started the wave with, which only laying it out reads, and which a run
 * taken up starts with as storage kept it, and where each rock was a step
 * ago, which only its drawing reads and its next step sets; each slot free
 * of its kind as null, whatever it last held.
 */
function liveOf(field: Field): unknown {
  const { events: _events, ...kept } = field;
  const live = <T extends { readonly live: boolean }>(record: T): T | null =>
    record.live ? record : null;
  return {
    ...kept,
    setup: { ...field.setup, crew: null },
    tow: field.tow.slice(0, field.crew.tow.length),
    rocks: field.rocks.map((rock) => {
      const { lastX: _lastX, lastY: _lastY, ...kept } = rock;
      return isFree(rock) ? null : kept;
    }),
    shots: {
      ...field.shots,
      slots: field.shots.slots.map((shot) =>
        shot.lifeSteps > 0 ? shot : null,
      ),
    },
    pickups: field.pickups.map(live),
    sparks: field.sparks.map(live),
    strays: { ...field.strays, adrift: live(field.strays.adrift) },
    loose: field.loose.map(live),
    comets: { ...field.comets, slots: field.comets.slots.map(live) },
    burrs: { ...field.burrs, slots: field.burrs.slots.map(live) },
  };
}

/**
 * Plays two fields side by side, each steered as the autopilot steers the
 * first, until they stop being alike as each step is about to be taken, or
 * the steps run out, and returns what each holds then.
 */
function playSideBySide(
  played: Field,
  taken: Field,
  steps: number,
): readonly [unknown, unknown] {
  const steer: Steer = { ...STILL };
  const differ = (): boolean =>
    JSON.stringify(liveOf(played)) !== JSON.stringify(liveOf(taken));
  for (let step = 0; step < steps; step++) {
    pilot(played, steer);
    steerField(played, steer);
    steerField(taken, steer);
    if (differ()) break;
    stepField(played);
    stepField(taken);
  }
  return [liveOf(played), liveOf(taken)];
}

/** The busy field whose moment the spoils spoil. */
const SPOILED = busyField();

/** The moment the spoils spoil, of {@link SPOILED}. */
const MOMENT = momentOf(SPOILED);

/** Returns a moment's JSON as a value read, spoiled as a row of a table says. */
function spoiled(spoil: MomentSpoil[2]): unknown {
  if (!MOMENT) throw new Error("The busy field has no ship.");
  return JSON.parse(JSON.stringify(spoil(MOMENT)));
}

describe("momentOf", () => {
  it("takes nothing of a field whose run is over", () => {
    const field = playedField(RUN);
    field.ship = null;

    const moment = momentOf(field);

    expect(moment).toBeNull();
  });

  it("copies what moves, so the field moving on leaves it as it was", () => {
    const field = busyField();
    const moment = momentOf(field);
    const taken = JSON.stringify(moment);

    stepTimes(field, 10);

    expect(JSON.stringify(moment)).toBe(taken);
  });
});

describe("layMoment", () => {
  it("lays a busy field's moment on the field its saved game takes up, and both play on alike", () => {
    const played = busyField();
    const taken = takenUp(played);

    const [one, other] = playSideBySide(played, taken, SIDE_BY_SIDE);

    expect(other).toEqual(one);
  });

  it("lays the moment of a field with nothing but the ship and its rocks, and both play on alike", () => {
    const played = playedField(RUN);
    const taken = takenUp(played);

    const [one, other] = playSideBySide(played, taken, SIDE_BY_SIDE);

    expect(other).toEqual(one);
  });

  it("takes each rock to the slot it filled, freeing the slots between", () => {
    const played = busyField();

    const taken = takenUp(played);

    expect(taken.rocks.map(isFree)).toEqual(played.rocks.map(isFree));
  });
});

describe("readMoment", () => {
  it("reads a busy field's moment back as it was taken", () => {
    const field = busyField();

    const moment = carried(field);

    expect(moment).toEqual(momentOf(field));
  });

  it("reads back a moment with no stray adrift and nothing in flight", () => {
    const field = playedField(RUN);

    const moment = carried(field);

    expect(moment).toEqual(momentOf(field));
  });

  const SPOILS: readonly MomentSpoil[] = [
    ["a moment that isn't a record", "moment", () => [1]],
    ["a crew that isn't a record", "crew", (m) => ({ ...m, crew: 3 })],
    [
      "no one at the controls",
      "crew",
      (m) => ({ ...m, crew: { ...m.crew, pilot: null } }),
    ],
    [
      "a pilot of a color there isn't",
      "crew",
      (m) => ({ ...m, crew: { ...m.crew, pilot: 8 } }),
    ],
    [
      "a pilot below the first color",
      "crew",
      (m) => ({ ...m, crew: { ...m.crew, pilot: -1 } }),
    ],
    [
      "a tow that isn't a list",
      "crew",
      (m) => ({ ...m, crew: { ...m.crew, tow: 1 } }),
    ],
    [
      "more in tow than ride",
      "crew",
      (m) => ({ ...m, crew: { ...m.crew, tow: [0, 1, 2, 3, 4, 5] } }),
    ],
    [
      "a home that isn't a list",
      "crew",
      (m) => ({ ...m, crew: { ...m.crew, home: null } }),
    ],
    [
      "no color last given",
      "crew",
      (m) => ({ ...m, crew: { ...m.crew, lastGiven: "red" } }),
    ],
    ["a ship that isn't a record", "ship", (m) => ({ ...m, ship: [] })],
    [
      "a ship left of the field",
      "ship",
      (m) => ({ ...m, ship: { ...m.ship, x: -1 } }),
    ],
    [
      "a ship past the field's width",
      "ship",
      (m) => ({ ...m, ship: { ...m.ship, x: TORUS.width } }),
    ],
    [
      "a ship above the field",
      "ship",
      (m) => ({ ...m, ship: { ...m.ship, y: -1 } }),
    ],
    [
      "a ship's last place past the field's height",
      "ship",
      (m) => ({ ...m, ship: { ...m.ship, lastY: TORUS.height } }),
    ],
    [
      "a ship's speed that isn't a number",
      "ship",
      (m) => ({ ...m, ship: { ...m.ship, vx: "fast" } }),
    ],
    [
      "a ship's guard that isn't a count",
      "ship",
      (m) => ({ ...m, ship: { ...m.ship, guardSteps: 1.5 } }),
    ],
    [
      "a ship's wait that isn't a yes or a no",
      "ship",
      (m) => ({ ...m, ship: { ...m.ship, waiting: 0 } }),
    ],
    [
      "nothing the ship last held",
      "ship",
      (m) => ({ ...m, ship: { ...m.ship, held: null } }),
    ],
    [
      "a heading held that isn't one",
      "ship",
      (m) => ({
        ...m,
        ship: { ...m.ship, held: { ...m.ship.held, heading: "north" } },
      }),
    ],
    [
      "a link for each but one in tow",
      "tow",
      (m) => ({ ...m, tow: m.tow.slice(1) }),
    ],
    [
      "a link off no number",
      "tow",
      (m) => ({ ...m, tow: m.tow.map((link) => ({ ...link, x: null })) }),
    ],
    ["rocks that aren't a list", "rocks", (m) => ({ ...m, rocks: {} })],
    [
      "a rock fewer than storage kept",
      "rocks",
      (m) => ({ ...m, rocks: m.rocks.slice(1) }),
    ],
    [
      "a rock's pass there isn't",
      "rocks",
      (m) => ({
        ...m,
        rocks: m.rocks.map((rock) => ({ ...rock, pass: "far" })),
      }),
    ],
    [
      "a rock in a slot past the cap",
      "rocks",
      (m) => ({
        ...m,
        rocks: m.rocks.map((rock, at) => ({ ...rock, slot: 1000 + at })),
      }),
    ],
    [
      "rocks in falling slots",
      "rocks",
      (m) => ({ ...m, rocks: [...m.rocks].reverse() }),
    ],
    [
      "a rock laid after the field was kept",
      "rocks",
      (m) => ({
        ...m,
        rocks: m.rocks.map((rock) => ({ ...rock, laidAt: 1_000_000 })),
      }),
    ],
    ["shots that aren't a list", "shots", (m) => ({ ...m, shots: "none" })],
    [
      "more shots than the field has slots for",
      "shots",
      (m) => ({ ...m, shots: Array.from({ length: 100 }, () => null) }),
    ],
    [
      "a shot that isn't a record",
      "shots",
      (m) => ({ ...m, shots: [...m.shots, 1] }),
    ],
    [
      "a shot with no steps left",
      "shots",
      (m) => ({
        ...m,
        shots: m.shots.map((shot) => shot && { ...shot, lifeSteps: 0 }),
      }),
    ],
    [
      "a shot of a weapon there isn't",
      "shots",
      (m) => ({
        ...m,
        shots: m.shots.map((shot) => shot && { ...shot, weapon: "laser" }),
      }),
    ],
    [
      "a shot's passes of another length",
      "shots",
      (m) => ({
        ...m,
        shots: m.shots.map((shot) => shot && { ...shot, passedAt: [] }),
      }),
    ],
    [
      "a shot's pass before the first step",
      "shots",
      (m) => ({
        ...m,
        shots: m.shots.map(
          (shot) => shot && { ...shot, passedAt: shot.passedAt.map(() => -2) },
        ),
      }),
    ],
    [
      "a shot's pass at no whole step",
      "shots",
      (m) => ({
        ...m,
        shots: m.shots.map(
          (shot) => shot && { ...shot, passedAt: shot.passedAt.map(() => 0.5) },
        ),
      }),
    ],
    [
      "a reload that isn't a count",
      "reloadSteps",
      (m) => ({ ...m, reloadSteps: -1 }),
    ],
    ["a weapon there isn't", "weapon", (m) => ({ ...m, weapon: "laser" })],
    ["effects that aren't a record", "effects", (m) => ({ ...m, effects: 1 })],
    [
      "an effect of a pickup there isn't",
      "effects",
      (m) => ({
        ...m,
        effects: { ...m.effects, pace: { pickup: "haste", endsAt: 9 } },
      }),
    ],
    [
      "an effect of another group's pickup",
      "effects",
      (m) => ({
        ...m,
        effects: { ...m.effects, weapon: { pickup: "slow", endsAt: 9 } },
      }),
    ],
    [
      "an effect ending at no step",
      "effects",
      (m) => ({
        ...m,
        effects: { ...m.effects, guard: { pickup: null, endsAt: -1 } },
      }),
    ],
    [
      "a shield that isn't a yes or a no",
      "shielded",
      (m) => ({ ...m, shielded: "yes" }),
    ],
    [
      "a pull that reaches nothing",
      "pullReach",
      (m) => ({ ...m, pullReach: 0 }),
    ],
    ["a pace that isn't a number", "pace", (m) => ({ ...m, pace: "slow" })],
    [
      "a pickup out of play",
      "pickups",
      (m) => ({
        ...m,
        pickups: m.pickups.map((one) => one && { ...one, live: false }),
      }),
    ],
    [
      "a pickup there isn't",
      "pickups",
      (m) => ({
        ...m,
        pickups: m.pickups.map((one) => one && { ...one, id: "boon" }),
      }),
    ],
    [
      "more sparks than the field has slots for",
      "sparks",
      (m) => ({ ...m, sparks: Array.from({ length: 1000 }, () => null) }),
    ],
    [
      "a spark off the field",
      "sparks",
      (m) => ({
        ...m,
        sparks: m.sparks.map((spark) => spark && { ...spark, x: -5 }),
      }),
    ],
    [
      "a stray of a color there isn't",
      "stray",
      (m) => ({ ...m, stray: { ...m.stray, pilot: 1.5 } }),
    ],
    [
      "a next stray at no step",
      "nextStrayAt",
      (m) => ({ ...m, nextStrayAt: "soon" }),
    ],
    [
      "one knocked loose at no speed",
      "loose",
      (m) => ({
        ...m,
        loose: m.loose.map((one) => one && { ...one, speed: null }),
      }),
    ],
    [
      "a comet's smashes of another length",
      "comets",
      (m) => ({
        ...m,
        comets: m.comets.map((comet) => comet && { ...comet, smashedAt: [] }),
      }),
    ],
    [
      "a comet's pass there isn't",
      "comets",
      (m) => ({
        ...m,
        comets: m.comets.map((comet) => comet && { ...comet, pass: "far" }),
      }),
    ],
    [
      "more burrs than may be adrift at once",
      "burrs",
      (m) => ({
        ...m,
        burrs: Array.from({ length: BURRS_AT_ONCE + 1 }, () => null),
      }),
    ],
    [
      "a burr's wrap that isn't a yes or a no",
      "burrs",
      (m) => ({
        ...m,
        burrs: m.burrs.map((burr) => burr && { ...burr, wraps: 1 }),
      }),
    ],
  ];

  it.each(SPOILS)("refuses %s, naming its part", (_what, part, spoil) => {
    const value = spoiled(spoil);

    const read = (): FieldMoment =>
      readMoment(value, WAVE, savedField(SPOILED));

    expect(read).toThrow(`The field's ${part} can't be read.`);
  });
});
