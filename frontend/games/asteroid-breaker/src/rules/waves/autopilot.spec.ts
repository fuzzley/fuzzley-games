import { readdirSync } from "node:fs";
import { join } from "node:path";
import { TURN } from "../angles";
import { waveToPlay } from "./endless";
import {
  ENDLESS_PLAYED,
  WIDEST,
  autoplay,
  pilot,
  playField,
  playWave,
} from "../../testing/autopilot";
import {
  fieldFrom,
  placeComet,
  placeLoose,
  placePickup,
  placeRock,
  placeSpark,
  placeStray,
  shipOf,
  wholeRocks,
} from "../../testing/field_picture";
import type { Field } from "../field/field";
import type { Crew } from "../ship/pilots";
import type { Rock } from "../rocks/rocks";
import { STILL, type Steer } from "../ship/ship";
import { drawReach } from "../sparks/sparks";
import { SPEEDS } from "../speed";
import { stepsIn } from "../stepper";
import {
  LOOSE_LIFE_MS,
  SHOT_SPEED,
  SPARK_LIFE_MS,
  SPARK_STATIC,
  STATIC_HOLD_MS,
  STRAY_SPEED,
  TOP_SPEED,
} from "../tuning";
import {
  type SectorData,
  type Wave,
  type WaveData,
  type WaveEntry,
  parseWave,
} from "./waves";

/** The seeds a spec plays from, to judge the autopilot by more than one game. */
const SEEDS = Array.from({ length: 8 }, (_, i) => i + 1);

/** The sector of the specs' waves, whose chance of a pickup is 0.05. */
const SECTOR: SectorData = { id: "spec", name: "Spec", drops: 0.05, waves: [] };

/** Returns a wave the specs write, numbered the game's third so a stray crosses it, changed as given: three large stones, scattered. */
function entryOf(changes: Partial<WaveData> = {}): WaveEntry {
  return {
    number: 3,
    sector: SECTOR,
    data: {
      id: "spec",
      name: "Spec",
      rocks: [{ kind: "stone", size: "large", count: 3 }],
      ...changes,
    },
  };
}

/** Returns a wave the specs write, changed as given, parsed. */
function waveOf(changes: Partial<WaveData> = {}): Wave {
  return parseWave(entryOf(changes));
}

/** A picture of the ship alone, at 18 by 18, its nose up. */
const SHIP_ALONE: readonly string[] = ["", "", "", "", "....^"];

/** A crew of the one ship in play. */
const ONE_SHIP: Crew = { pilot: 0, tow: [], home: [], lastGiven: 0 };

/** A crew of the pilot at the controls and one in tow. */
const ONE_IN_TOW: Crew = { pilot: 0, tow: [1], home: [], lastGiven: 1 };

/** The steps one knocked loose is out before it floats home. */
const LOOSE_LIFE_STEPS = stepsIn(LOOSE_LIFE_MS);

/**
 * Returns a field of one large rock and a crew, by default of a pilot with
 * no one in tow, which a comet crossing it hits at the first step, knocking
 * the last in tow loose or, with no one in tow, ending its run, unless
 * something guards it: the ship can't dash yet, which would carry it clear.
 */
function doomedField(crew: Crew = ONE_SHIP): Field {
  const field = fieldFrom(["L", ...SHIP_ALONE.slice(1)], { crew });
  const ship = shipOf(field);
  ship.rechargeSteps = 120;
  placeComet(field, ship.x, ship.y);
  return field;
}

/** Returns the steering the autopilot gives a field's ship for a frame, after a frame's held as given. */
function steerOf(field: Field, held: Partial<Steer> = {}): Steer {
  const steer = { ...STILL, ...held };
  pilot(field, steer);
  return steer;
}

/** Returns a field's only rock, failing the spec unless it has one. */
function onlyRock(field: Field): Rock {
  const [rock, ...others] = wholeRocks(field);
  if (!rock || others.length > 0) throw new Error("The field has one rock.");
  return rock;
}

describe("the autopilot", () => {
  it("clears a wave, taking no hit", () => {
    const report = autoplay(waveOf(), "normal", 1);

    expect(report).toMatchObject({ cleared: true, hits: 0 });
  });

  it("stops at its limit on a wave it can't clear in time", () => {
    const report = autoplay(waveOf(), "normal", 1, { limit: 120 });

    expect(report).toMatchObject({ cleared: false, steps: 120 });
  });

  it("plays a wave alike from the same seed", () => {
    const wave = waveOf({ drops: 0.5, comets: { every: [3, 4] } });

    const [first, second] = [1, 1].map((seed) =>
      autoplay(wave, "fast", seed, { torus: WIDEST }),
    );

    expect(first).toEqual(second);
  });

  it("plays an Endless wave made from the seed it is played from", () => {
    const entry = ENDLESS_PLAYED[9];
    if (!entry) throw new Error("No wave 40.");

    const play = playWave(entry, "fast", { seed: 9 });

    expect(play).toEqual(autoplay(waveToPlay(entry, 9), "fast", 9));
  });

  it("plays one of the game's waves on the narrowest field from its number, unless given a seed or a field", () => {
    const entry = entryOf({ drops: 0.5 });
    const wave = parseWave(entry);

    const plays = [
      playWave(entry, "fast"),
      playWave(entry, "fast", { seed: 9 }),
      playWave(entry, "fast", { torus: WIDEST }),
    ];

    expect(plays).toEqual([
      autoplay(wave, "fast", 3),
      autoplay(wave, "fast", 9),
      autoplay(wave, "fast", 3, { torus: WIDEST }),
    ]);
  });

  it("stops at the field's step it is told to stop at, counting the steps played before", () => {
    const field = fieldFrom(["L.L.L", ...SHIP_ALONE.slice(1)]);
    playField(field, { untilStep: 60 });

    const report = playField(field, { untilStep: 90 });

    expect(report).toMatchObject({ cleared: false, steps: 90 });
  });

  it("stops once a hit ends its run, the wave uncleared", () => {
    const field = doomedField();

    const report = playField(field);

    expect(report).toMatchObject({ cleared: false, hits: 1, steps: 1 });
  });

  it("takes no hit while nothing can take its ship", () => {
    const field = doomedField();

    const report = playField(field, { limit: 120, invulnerable: true });

    expect(report.hits).toBe(0);
  });

  it("counts the crew its hits knock loose and those that float home uncaught", () => {
    const field = doomedField(ONE_IN_TOW);
    placeLoose(field, 50, 30).knockedAt = field.steps + 1 - LOOSE_LIFE_STEPS;

    const report = playField(field, { untilStep: 1 });

    expect(report).toMatchObject({ hits: 1, knocked: 1, floated: 1 });
  });

  it("counts none floated home as the hit that ends its run floats them", () => {
    const field = doomedField();
    placeLoose(field, 50, 30);

    const report = playField(field);

    expect(report).toMatchObject({ hits: 1, knocked: 0, floated: 0 });
  });

  it("catches one of the crew knocked loose again, before the wave is cleared", () => {
    const field = fieldFrom(["L", ...SHIP_ALONE.slice(1)]);
    placeLoose(field, 18, 10);

    playField(field, { untilStep: 120 });

    expect([field.cleared, field.crew.tow]).toEqual([false, [1, 2, 6]]);
  });

  it("ends a wave held still for a first move that never comes at its limit", () => {
    const field = fieldFrom(SHIP_ALONE);
    shipOf(field).waiting = true;

    const report = playField(field, { limit: 10 });

    expect(report).toMatchObject({ cleared: false, steps: 0 });
  });

  it("counts a wave cleared as the hit that ended its run came as lost, as the run does", () => {
    const field = fieldFrom([], {
      crew: { ...ONE_SHIP, pilot: null, tow: [] },
    });
    field.cleared = true;

    const report = playField(field);

    expect(report).toMatchObject({ cleared: false, steps: 0 });
  });

  // Twenty large iron rocks, and all they break into, outlast both strays'
  // coming, the second 8 s after the first has gone. Playing each seed's wave that long takes a
  // busy machine past the five seconds a case is given.
  it("brings most of the strays that cross home", { timeout: 20_000 }, () => {
    const wave = waveOf({
      rocks: [{ kind: "iron", size: "large", count: 20 }],
      strays: 2,
    });

    const plays = SEEDS.map((seed) =>
      autoplay(wave, "normal", seed, { invulnerable: true }),
    );

    const sent = plays.reduce((sum, play) => sum + play.straysSent, 0);
    const home = plays.reduce((sum, play) => sum + play.straysHome, 0);
    expect(sent).toBeGreaterThan(SEEDS.length);
    expect(home).toBeGreaterThan(sent / 2);
  });

  it("reports the most static its pilot held, rounded down, not the last", () => {
    const field = fieldFrom(["L", ...SHIP_ALONE.slice(1)], { charge: 12.7 });
    field.charge.lastSparkAt = -stepsIn(STATIC_HOLD_MS);

    const report = playField(field, { untilStep: stepsIn(500) });

    expect([report.mostStatic, Math.floor(field.charge.level)]).toEqual([
      12, 11,
    ]);
  });

  it("gathers a spark it goes out of its way for", () => {
    const field = fieldFrom(["L", ...SHIP_ALONE.slice(1)]);
    const ship = shipOf(field);
    placeSpark(field, ship.x, ship.y - drawReach(field) - 2);

    const report = playField(field, { untilStep: stepsIn(1000) });

    expect(report.mostStatic).toBe(SPARK_STATIC);
  });

  it("catches pickups it has time for", () => {
    const wave = waveOf({ drops: 1 });

    const caught = SEEDS.reduce(
      (sum, seed) => sum + autoplay(wave, "normal", seed).caught,
      0,
    );

    expect(caught).toBeGreaterThan(SEEDS.length);
  });
});

describe("a frame of the autopilot's", () => {
  it("fires at a rock dead ahead within its shots' reach, keeping still", () => {
    const field = fieldFrom(["L", "", "^"]);

    const steer = steerOf(field);

    expect(steer).toMatchObject({
      heading: -Math.PI / 2,
      thrust: 0,
      fire: true,
    });
  });

  it("turns toward a rock off its nose, holding its fire", () => {
    const field = fieldFrom(["^.L"]);

    const steer = steerOf(field);

    expect(steer).toMatchObject({ heading: 0, thrust: 0, fire: false });
  });

  it("holds its fire at a rock dead ahead beyond its shots' reach", () => {
    const field = fieldFrom(["L", "", "", "", "", "", "", "", "^"], {
      torus: { width: 72, height: 72 },
    });

    const steer = steerOf(field);

    expect(steer).toMatchObject({
      heading: -Math.PI / 2,
      thrust: 0.5,
      fire: false,
    });
  });

  it("closes on a rock beyond its shots' reach at half thrust", () => {
    const field = fieldFrom(["^.......L"]);

    const steer = steerOf(field);

    expect(steer).toMatchObject({ heading: 0, thrust: 0.5, fire: false });
  });

  // A chase at the ship's top speed gains on it too slowly, where the rock
  // comes round the field to a ship that waits.
  it("crosses to the row of a rock beyond its shots' reach running along it nearly as fast as it, to wait by it", () => {
    const field = fieldFrom(["........L", "", "", "", "", "", "", "", "^"], {
      torus: { width: 72, height: 72 },
    });
    onlyRock(field).vx = 0.9 * TOP_SPEED;

    const steer = steerOf(field);

    expect([steer.heading, steer.thrust]).toEqual([
      expect.closeTo(-Math.PI / 2),
      0.5,
    ]);
  });

  it("waits by the row of a fast rock beyond its shots' reach, near enough to it", () => {
    const field = fieldFrom(["........L", "", "^"], {
      torus: { width: 72, height: 72 },
    });
    onlyRock(field).vx = 0.9 * TOP_SPEED;

    const steer = steerOf(field);

    expect(steer).toMatchObject({ thrust: 0, fire: false });
  });

  it.each([
    ["closes on", 0.7, 1, 0.5],
    ["waits for", 0.9, 1, 0],
    ["waits for", 0.7, 1.25, 0],
  ])(
    "%s a rock beyond its shots' reach flying at %s of the ship's top speed, at a pace of %s",
    (_, share, pace, thrust) => {
      const field = fieldFrom(["^.......L"], { pace });
      onlyRock(field).vx = share * TOP_SPEED;

      const steer = steerOf(field);

      expect(steer).toMatchObject({ thrust, fire: false });
    },
  );

  // A shot meets the rock if it flies across as fast as the rock does.
  it("aims ahead of a crossing rock, where a shot meets it", () => {
    const field = fieldFrom(["L", "", "", "^"]);
    onlyRock(field).vx = 8;

    const { heading } = steerOf(field);

    expect(Math.cos(heading ?? 0) * SHOT_SPEED).toBeCloseTo(8);
  });

  it("flees a rock whose course comes near it, away from where it comes nearest", () => {
    const field = fieldFrom(SHIP_ALONE);
    placeRock(field, "medium", 16, 6).vy = 15;

    const steer = steerOf(field);

    expect([steer.heading, steer.thrust, steer.dash]).toEqual([
      expect.closeTo(0),
      1,
      false,
    ]);
  });

  it("pays a course no heed that comes near only after a second", () => {
    const field = fieldFrom(SHIP_ALONE);
    placeRock(field, "medium", 16, 6).vy = 5;

    const steer = steerOf(field);

    expect(steer.thrust).toBe(0);
  });

  it("flees a rock at the pace the field flies it", () => {
    const field = fieldFrom(SHIP_ALONE, { pace: 2 });
    placeRock(field, "medium", 16, 3).vy = 10;

    const steer = steerOf(field);

    expect([steer.heading, steer.thrust]).toEqual([expect.closeTo(0), 1]);
  });

  it("flees the course that comes nearest soonest", () => {
    const field = fieldFrom(SHIP_ALONE);
    placeRock(field, "medium", 16, 6).vy = 15;
    placeRock(field, "medium", 20, 12).vy = 20;

    const steer = steerOf(field);

    // Left, whether the heading comes out as π or −π.
    expect([Math.cos(steer.heading ?? 0), steer.thrust, steer.dash]).toEqual([
      expect.closeTo(-1),
      1,
      false,
    ]);
  });

  it("flees a course that only passes near it without dashing", () => {
    const field = fieldFrom(SHIP_ALONE);
    placeRock(field, "medium", 15.2, 15).vy = 20;

    const steer = steerOf(field);

    expect([steer.heading, steer.thrust, steer.dash]).toEqual([
      expect.closeTo(0),
      1,
      false,
    ]);
  });

  it("pays no heed to a rock drawing away beside it", () => {
    const field = fieldFrom(SHIP_ALONE);
    placeRock(field, "small", 20.5, 18).vx = 5;

    const steer = steerOf(field);

    expect([steer.thrust, steer.dash]).toEqual([0, false]);
  });

  it("dashes from a rock about to meet it, at right angles to its course", () => {
    const field = fieldFrom(SHIP_ALONE);
    placeRock(field, "small", 18, 15).vy = 20;

    const steer = steerOf(field);

    expect([steer.heading, steer.thrust, steer.dash]).toEqual([
      expect.closeTo(Math.PI),
      1,
      true,
    ]);
  });

  it("lets go of a dash the frame after, so the next is a fresh press", () => {
    const field = fieldFrom(SHIP_ALONE);
    placeRock(field, "small", 18, 15).vy = 20;

    const steer = steerOf(field, { dash: true });

    expect(steer.dash).toBe(false);
  });

  it("holds its dash while its last recharges", () => {
    const field = fieldFrom(SHIP_ALONE);
    shipOf(field).rechargeSteps = 60;
    placeRock(field, "small", 18, 15).vy = 20;

    const steer = steerOf(field);

    expect([steer.thrust, steer.dash]).toEqual([1, false]);
  });

  it("fires at a rock lined up as it flees another", () => {
    const field = fieldFrom(SHIP_ALONE);
    placeRock(field, "large", 18, 6);
    placeRock(field, "medium", 16, 30).vy = -15;

    const steer = steerOf(field);

    expect([steer.heading, steer.thrust, steer.fire]).toEqual([
      expect.closeTo(0),
      1,
      true,
    ]);
  });

  it("flees a comet crossing near it", () => {
    const field = fieldFrom(SHIP_ALONE);
    placeComet(field, 6, 20);

    const steer = steerOf(field);

    expect([steer.heading, steer.thrust]).toEqual([
      expect.closeTo(-Math.PI / 2),
      1,
    ]);
  });

  it("flees a comet at the pace the field flies it", () => {
    const field = fieldFrom(SHIP_ALONE, { pace: 2 });
    placeComet(field, -12, 20);

    const steer = steerOf(field);

    expect([steer.heading, steer.thrust]).toEqual([
      expect.closeTo(-Math.PI / 2),
      1,
    ]);
  });

  // A comet crosses the field once, so one coming in at the far edge is a
  // field away, not beside a ship near the near one.
  it("judges a comet coming in as far as it looks, across no wrap", () => {
    const field = fieldFrom(["", "", "", "", ".................^"]);
    placeComet(field, -3, 18);

    const steer = steerOf(field);

    expect(steer).toEqual(STILL);
  });

  it("pays no heed to a comet that has crossed past it", () => {
    const field = fieldFrom(["", "", "", "", "^"]);
    placeComet(field, 71, 18);

    const steer = steerOf(field);

    expect(steer).toEqual(STILL);
  });

  it("leaves a comet be while it is only warned of", () => {
    const field = fieldFrom(SHIP_ALONE);
    placeComet(field, 6, 20).warnSteps = 60;

    const steer = steerOf(field);

    expect(steer).toEqual(STILL);
  });

  it("heads for where a stray will be as it reaches it at its top speed", () => {
    const field = fieldFrom(SHIP_ALONE);
    placeStray(field, 18, 6);

    const steer = steerOf(field);

    expect([steer.heading, steer.thrust]).toEqual([
      expect.closeTo(Math.atan2(-12, STRAY_SPEED * (12 / TOP_SPEED))),
      1,
    ]);
  });

  it("heads for where one of the crew knocked loose will be as it reaches it at its top speed", () => {
    const field = fieldFrom(SHIP_ALONE);
    placeLoose(field, 18, 6);

    const steer = steerOf(field);

    expect([steer.heading, steer.thrust]).toEqual([
      expect.closeTo(Math.atan2(-12, STRAY_SPEED * (12 / TOP_SPEED))),
      1,
    ]);
  });

  it("heads for one of the crew knocked loose before a stray adrift", () => {
    const field = fieldFrom(SHIP_ALONE);
    placeStray(field, 6, 18, TURN / 4);
    placeLoose(field, 18, 6);

    const steer = steerOf(field);

    expect(steer.heading).toBeCloseTo(
      Math.atan2(-12, STRAY_SPEED * (12 / TOP_SPEED)),
    );
  });

  it.each([
    ["it has no time to reach before it floats home", 1, [1, 2]],
    ["the line in tow has no room for", LOOSE_LIFE_STEPS, [1, 2, 3, 4, 5]],
  ])(
    "heads for a stray adrift past one of the crew knocked loose %s",
    (_, stepsLeft, tow) => {
      const field = fieldFrom(SHIP_ALONE, { crew: { ...ONE_IN_TOW, tow } });
      placeStray(field, 6, 18, TURN / 4);
      placeLoose(field, 18, 6).knockedAt =
        field.steps + stepsLeft - LOOSE_LIFE_STEPS;

      const steer = steerOf(field);

      expect(steer.heading).toBeCloseTo(
        Math.atan2(STRAY_SPEED * (12 / TOP_SPEED), -12),
      );
    },
  );

  it("chases a pickup against its own drift", () => {
    const field = fieldFrom(SHIP_ALONE);
    shipOf(field).vx = 5;
    placePickup(field, "shield", 18, 6);

    const steer = steerOf(field);

    expect([steer.heading, steer.thrust]).toEqual([
      expect.closeTo(Math.atan2(-TOP_SPEED, -5)),
      1,
    ]);
  });

  it("lets a pickup go that would fade before it got there", () => {
    const field = fieldFrom(SHIP_ALONE);
    placePickup(field, "shield", 18, 6).lifeSteps = 1;

    const steer = steerOf(field);

    expect(steer).toEqual(STILL);
  });

  it("heads for a spark a little way beyond its draw", () => {
    const field = fieldFrom(SHIP_ALONE);
    const ship = shipOf(field);
    placeSpark(field, ship.x, ship.y - drawReach(field) - 2);

    const steer = steerOf(field);

    expect([steer.heading, steer.thrust]).toEqual([
      expect.closeTo(-TURN / 4),
      1,
    ]);
  });

  it("heads for a spark a little way beyond its draw where its draw is farther, as at Relaxed", () => {
    const field = fieldFrom(SHIP_ALONE, { sparkReach: 1.6 });
    const ship = shipOf(field);
    placeSpark(field, ship.x, ship.y - drawReach(field) - 2);

    const steer = steerOf(field);

    expect(steer.heading).toBeCloseTo(-TURN / 4);
  });

  it("heads for the spark it can draw in soonest", () => {
    const field = fieldFrom(SHIP_ALONE);
    const ship = shipOf(field);
    placeSpark(field, ship.x, ship.y - drawReach(field) - 1);
    placeSpark(field, ship.x + drawReach(field) + 3, ship.y);

    const steer = steerOf(field);

    expect(steer.heading).toBeCloseTo(-TURN / 4);
  });

  it.each([
    ["within its draw, which brings it in", -1],
    ["farther beyond its draw than it goes for", 6],
  ])("lets a spark be %s", (_, beyond) => {
    const field = fieldFrom(SHIP_ALONE);
    const ship = shipOf(field);
    placeSpark(field, ship.x, ship.y - drawReach(field) - beyond);

    const steer = steerOf(field);

    expect(steer).toEqual(STILL);
  });

  it("lets a spark go that would go before it got there", () => {
    const field = fieldFrom(SHIP_ALONE);
    const ship = shipOf(field);
    placeSpark(field, ship.x, ship.y - drawReach(field) - 2).shedAt =
      field.steps + 1 - stepsIn(SPARK_LIFE_MS);

    const steer = steerOf(field);

    expect(steer).toEqual(STILL);
  });

  it("heads for a pickup before a spark", () => {
    const field = fieldFrom(SHIP_ALONE);
    const ship = shipOf(field);
    placeSpark(field, ship.x, ship.y - drawReach(field) - 2);
    placePickup(field, "shield", ship.x + 12, ship.y);

    const steer = steerOf(field);

    expect(steer.heading).toBeCloseTo(0);
  });

  it("lets go of everything while it has no ship", () => {
    const field = fieldFrom(["L"]);

    const steer = steerOf(field, { heading: 1, thrust: 1, fire: true });

    expect(steer).toEqual(STILL);
  });
});

// Vitest plays the specs of a file one after another, so the specs that
// play every wave keep a file for each speed, which it plays side by side.
describe("the specs that play every wave", () => {
  it.each(["every_wave", "every_endless_wave"])(
    "keep a file in %s for each speed, and only those",
    (folder) => {
      const files = readdirSync(join(import.meta.dirname, folder));

      expect(new Set(files)).toEqual(
        new Set(SPEEDS.map((speed) => `${speed}.spec.ts`)),
      );
    },
  );
});
