import {
  KEEPER,
  PICTURE_TORUS,
  catchOn,
  kindsLoggedOn,
  fieldFrom,
  floatingPickups,
  loggedOn,
  placeComet,
  placePickup,
  placeRock,
  placeStray,
  shipOf,
  speedOf,
  stepTimes,
  wholeRocks,
} from "../../testing/field_picture";
import { PICKUPS } from "../catalog/pickups";
import { ROCK_KINDS, type RockSize } from "../catalog/rocks";
import { knockLastLoose } from "../hazards/loose";
import { type Rock, hitRock, rockHitRadius, rocksLeft } from "../rocks/rocks";
import { type Crew, createCrew } from "../ship/pilots";
import {
  STILL,
  type Steer,
  TUNED_FLIGHT,
  createShip,
  flyShip,
  guardShip,
  isGuarded,
} from "../ship/ship";
import { TUNED_GUNNERY } from "../ship/shots";
import { TUNED_TOWING } from "../ship/tow";
import { STEP_MS, stepsIn } from "../stepper";
import { across, distance } from "../torus";
import {
  COMET_RADIUS,
  COMET_SPEED,
  HIT_GUARD_MS,
  LOOSE_SWELL_MS,
  PICKUP_PULL_REACH,
  ROCK_RADIUS,
  SHIELD_GUARD_MS,
  SHIP_HIT_RADIUS,
  SHIP_LENGTH,
  SHOT_RADIUS,
  SHOT_SPEED,
  STEP_S,
  STRAY_FIRST_MS,
  STRETCH_GUARD_MS,
  TOW_HOOK,
  TOW_LINK,
} from "../tuning";
import {
  type SectorData,
  type Wave,
  type WaveData,
  parseWave,
} from "../waves/waves";
import {
  type Field,
  type FieldSetup,
  type WaveSetup,
  createField,
  fieldFor,
  reshapeField,
  steerField,
  stepField,
} from "./field";
import { liesFairly } from "./spawn";

const SETUP: FieldSetup = {
  torus: PICTURE_TORUS,
  cap: 30,
  seed: 1,
  pace: 1.1,
  waveKind: "ice",
  drops: 0,
  pool: [],
  pickupsAtOnce: 2,
  strays: 1,
  strayFirstMs: STRAY_FIRST_MS,
  cometEvery: null,
  crew: createCrew(),
};

/** Steering that holds fire and nothing else. */
const FIRE: Readonly<Steer> = { ...STILL, fire: true };

/** Steering that holds thrust and nothing else. */
const THRUST: Readonly<Steer> = { ...STILL, thrust: 1 };

/** The sector of the specs' waves, whose chance of a pickup is 0.05. */
const SECTOR: SectorData = { id: "spec", name: "Spec", drops: 0.05, waves: [] };

/**
 * How the specs' waves start: on a desktop's field at Relaxed, a run's crew
 * handed on, nothing held.
 */
const START: WaveSetup = {
  torus: { width: 73, height: 40 },
  speed: "relaxed",
  seed: 5,
  crew: { pilot: 3, tow: [0], home: [6], lastGiven: 6 },
  held: STILL,
};

/** A crew of a pilot at the controls with no one in tow, whose run a hit ends. */
const ALONE: Crew = { pilot: 4, tow: [], home: [2], lastGiven: 6 };

/** The volatile rock's beat, in steps. */
const BEAT = stepsIn(ROCK_KINDS.volatile.traits[0].delayMs);

/** Steps a field by a steering. */
function stepBy(field: Field, steer: Readonly<Steer>, steps = 1): void {
  steerField(field, steer);
  stepTimes(field, steps);
}

/** Fires one pull from a field's ship, then lets fire go. */
function fireOnce(field: Field): void {
  stepBy(field, FIRE);
  steerField(field, STILL);
}

/**
 * Steps a field until a test holds of it, failing the spec if it doesn't within
 * a number of steps.
 */
function stepUntil(
  field: Field,
  holds: (field: Field) => boolean,
  most = 600,
): void {
  for (let step = 0; step < most; step++) {
    if (holds(field)) return;
    stepField(field);
  }
  throw new Error(`It didn't hold within ${String(most)} steps.`);
}

/** Returns the sizes of a field's whole rocks, smallest last. */
function sizesOf(field: Field): string[] {
  return wholeRocks(field)
    .map((rock) => rock.size)
    .sort();
}

/** Returns the velocities of a field's whole rocks. */
function velocitiesOf(field: Field): number[][] {
  return wholeRocks(field).map((rock) => [rock.vx, rock.vy]);
}

/** Returns the one rock a picture laid, failing the spec if it laid another number. */
function onlyRock(field: Field): Rock {
  const [rock, ...others] = wholeRocks(field);
  if (!rock || others.length > 0) throw new Error("Expected one rock.");
  return rock;
}

/** Returns a field's one whole rock of a size, failing the spec if it has another number. */
function rockOfSize(field: Field, size: RockSize): Rock {
  const [rock, ...others] = wholeRocks(field).filter(
    (each) => each.size === size,
  );
  if (!rock || others.length > 0) throw new Error(`Expected one ${size} rock.`);
  return rock;
}

/** Returns the velocities of the pieces a field's rocks broke into. */
function piecesOf(field: Field): number[][] {
  return wholeRocks(field)
    .filter((rock) => rock.laidAt > 0)
    .map((rock) => [rock.vx, rock.vy]);
}

/** Returns how many of a field's shots are in flight. */
function shotsInFlight(field: Field): number {
  return field.shots.slots.filter((shot) => shot.lifeSteps > 0).length;
}

/** Returns where a field's whole rocks are. */
function placesOf(field: Field): number[][] {
  return wholeRocks(field).map((rock) => [rock.x, rock.y]);
}

/**
 * Returns the game's third wave as the specs write it, changed as given: three
 * large stones, scattered, a chance of a pickup of 0.9 and comets every 10 to
 * 20 s.
 */
function waveOf(changes: Partial<WaveData> = {}): Wave {
  return parseWave({
    number: 3,
    sector: SECTOR,
    data: {
      id: "spec",
      name: "Spec",
      rocks: [{ kind: "stone", size: "large", count: 3 }],
      drops: 0.9,
      comets: { every: [10, 20] },
      ...changes,
    },
  });
}

/**
 * Returns a field of ice rocks around the ship after a steering that turns,
 * thrusts and fires, from a seed.
 */
function played(seed: number): Field {
  const field = fieldFrom(["L...L", "", "..^..", "", "L...L"], {
    seed,
    kind: "ice",
  });
  stepBy(field, { ...STILL, turn: 0.3, thrust: 0.2, fire: true }, 240);
  return field;
}

/**
 * Returns a field whose shielded ship a large iron rock, which takes several
 * hits, has just come to touch.
 */
function rockOnShield(): Field {
  const field = fieldFrom(["^", "", "L"], { kind: "iron" });
  catchOn(field, "shield");
  onlyRock(field).y = 4;
  return field;
}

describe("a shielded ship", () => {
  it("breaks a rock that touches it a size down, whatever its hits, instead of being lost, and the shield goes, logging it", () => {
    const field = rockOnShield();

    stepField(field);

    expect({
      hits: field.hits,
      shielded: field.shielded,
      inEffect: field.effects.guard.pickup,
      sizes: sizesOf(field),
      events: kindsLoggedOn(field),
    }).toEqual({
      hits: 0,
      shielded: false,
      inEffect: null,
      sizes: ["medium", "medium"],
      events: ["caught", "shielded", "broken", "scored"],
    });
  });

  it("pushes the pieces of the rock it breaks away from the ship, as a hit from its side would", () => {
    const shielded = rockOnShield();
    const struck = rockOnShield();
    hitRock(struck, onlyRock(struck), 0, 2, "breaks");

    stepField(shielded);

    expect(velocitiesOf(shielded)).toEqual(velocitiesOf(struck));
  });

  it.each([
    ["keeps the ship from the pieces while the shield's guard holds", 0, 0],
    ["lets the pieces hit the ship once the shield's guard is over", 1, 1],
  ])("%s", (_, after, hits) => {
    const field = rockOnShield();
    stepField(field);
    for (const piece of wholeRocks(field)) {
      piece.vx = 0;
      piece.vy = 0;
    }

    stepTimes(field, stepsIn(SHIELD_GUARD_MS) + after);

    expect(field.hits).toBe(hits);
  });

  it("spends its shield on one rock, its guard keeping it from another touching it in the step", () => {
    const field = fieldFrom(["^", "", "LL"]);
    catchOn(field, "shield");
    const [first, second] = wholeRocks(field);
    if (!first || !second) throw new Error("The picture has two rocks.");
    first.y = 4;
    second.x = 2;
    second.y = 0.5;

    stepField(field);

    expect([field.hits, sizesOf(field)]).toEqual([
      0,
      ["large", "medium", "medium"],
    ]);
  });

  it("keeps the chain going through the rock it breaks, as a shot would", () => {
    const field = rockOnShield();
    field.chain = 4;
    field.lastBreakAt = field.steps;

    stepField(field);

    const scored = loggedOn(field).find((event) => event.kind === "scored");
    expect([scored?.times, field.chain]).toEqual([2, 5]);
  });

  it("keeps its shield while it is guarded otherwise", () => {
    const field = rockOnShield();
    guardShip(shipOf(field), 500);

    stepField(field);

    expect([field.shielded, sizesOf(field)]).toEqual([true, ["large"]]);
  });
});

describe("fieldFor", () => {
  it("sets a wave's field up for its shape and the run's speed", () => {
    const wave = waveOf();
    const share = (73 * 40) / 1600;
    const sooner = Math.sqrt(share);

    const field = fieldFor(wave, START);

    expect(field.setup).toEqual({
      torus: START.torus,
      cap: 87,
      seed: 5,
      pace: 0.8,
      waveKind: "stone",
      drops: 1,
      pool: wave.pool,
      pickupsAtOnce: 4,
      strays: 2,
      strayFirstMs: STRAY_FIRST_MS * share,
      cometEvery: { least: 10_000 / sooner / 0.5, most: 20_000 / sooner / 0.5 },
      crew: START.crew,
    });
  });

  it("lays its rocks out, grown by the field's area, fairly round its ship waiting in the middle", () => {
    const field = fieldFor(waveOf(), START);

    const ship = shipOf(field);
    expect({
      ship: [ship.x, ship.y, ship.waiting],
      rocks: wholeRocks(field).length,
      unfair: wholeRocks(field).filter(
        (rock) => !liesFairly(field, rock, ship),
      ),
    }).toEqual({ ship: [36.5, 20, true], rocks: 5, unfair: [] });
  });

  it("lays its rocks out in its formation", () => {
    const field = fieldFor(waveOf({ formation: "ring" }), START);
    const halfAcross = 36.5 - ROCK_RADIUS.large - 1;
    const halfDown = 20 - ROCK_RADIUS.large - 1;

    const onRing = wholeRocks(field).map((rock) =>
      (
        (across(36.5, rock.x, 73) / halfAcross) ** 2 +
        (across(20, rock.y, 40) / halfDown) ** 2
      ).toFixed(9),
    );

    expect(new Set(onRing)).toEqual(new Set(["1.000000000"]));
  });

  it("breaks its boulders into the kind of rock it names", () => {
    const field = fieldFor(waveOf({ waveKind: "ice" }), START);

    expect(field.waveKind).toBe("ice");
  });

  it("flies a wave as tuning.ts says unless its setup tunes it", () => {
    const field = fieldFor(waveOf(), START);

    expect({
      flight: field.flight,
      gunnery: field.gunnery,
      rockSpeed: field.rockSpeed,
    }).toEqual({ flight: TUNED_FLIGHT, gunnery: TUNED_GUNNERY, rockSpeed: 1 });
  });

  it("tows its crew as tuning.ts says unless its setup gives another", () => {
    const towing = { mostInTow: 2 };

    const [tuned, given] = [START, { ...START, towing }].map(
      (setup) => fieldFor(waveOf(), setup).towing,
    );

    expect([tuned, given]).toEqual([TUNED_TOWING, towing]);
  });

  it("flies a wave as its setup tunes it", () => {
    const tuned = {
      flight: { ...TUNED_FLIGHT, topSpeed: 6 },
      gunnery: { ...TUNED_GUNNERY, shotSpeed: 20 },
      rockSpeed: 2,
    };

    const field = fieldFor(waveOf(), { ...START, ...tuned });

    expect({
      flight: field.flight,
      gunnery: field.gunnery,
      rockSpeed: field.rockSpeed,
    }).toEqual(tuned);
  });

  it("lays a wave's rocks out flying at its setup's rocks' speed, each twice as fast at 2", () => {
    const untuned = velocitiesOf(fieldFor(waveOf(), START));

    const tuned = velocitiesOf(fieldFor(waveOf(), { ...START, rockSpeed: 2 }));

    expect(tuned).toEqual(
      untuned.map((velocity) => velocity.map((v) => v * 2)),
    );
  });
});

describe("createField", () => {
  it("lays a wave's field out with free slots for its cap and its ship waiting in its middle", () => {
    const field = createField(SETUP);

    expect({
      slots: field.rocks.length,
      left: rocksLeft(field),
      ship: field.ship,
      weapon: field.weapon,
      pace: field.pace,
      cleared: field.cleared,
    }).toMatchObject({
      slots: 30,
      left: 0,
      ship: { x: 36, y: 20, waiting: true },
      weapon: "gun",
      pace: 1.1,
      cleared: false,
    });
  });

  it("lays the crew's line in tow out straight behind its ship", () => {
    const field = createField(SETUP);

    expect(
      field.tow.slice(0, SETUP.crew.tow.length).map((link) => [link.x, link.y]),
    ).toEqual([
      [36, expect.closeTo(20 + TOW_HOOK + TOW_LINK)],
      [36, expect.closeTo(20 + TOW_HOOK + 2 * TOW_LINK)],
    ]);
  });

  it("keeps its setup, with no pickup floating and none in effect", () => {
    const field = createField(SETUP);

    expect({
      setup: field.setup,
      floating: floatingPickups(field),
      inEffect: Object.values(field.effects).filter(
        (inEffect) => inEffect.pickup !== null,
      ),
      shielded: field.shielded,
      pullReach: field.pullReach,
    }).toEqual({
      setup: SETUP,
      floating: [],
      inEffect: [],
      shielded: false,
      pullReach: PICKUP_PULL_REACH,
    });
  });

  it("starts with the wave's crew, no hit taken, none knocked loose, no stray sent and no comet on its way", () => {
    const field = createField(SETUP);

    expect({
      crew: field.crew,
      hits: field.hits,
      loose: field.loose.filter((loose) => loose.live),
      adrift: field.strays.adrift.live,
      sent: field.strays.sent,
      broughtHome: field.strays.broughtHome,
      comets: field.comets.slots.filter((comet) => comet.live),
    }).toEqual({
      crew: SETUP.crew,
      hits: 0,
      loose: [],
      adrift: false,
      sent: 0,
      broughtHome: 0,
      comets: [],
    });
  });

  it.each([
    ["draws nothing for a wave without comets", null, 0],
    ["draws its first comet's time", { least: 14_000, most: 18_000 }, 1],
  ])("%s", (_, cometEvery, draws) => {
    const field = createField({ ...SETUP, cometEvery });

    expect(field.draws).toBe(draws);
  });

  // So a step taken before the first frame's steering comes moves nothing.
  it("steers by what the player holds as it starts, until a frame's steering comes", () => {
    const field = createField(SETUP, THRUST);
    stepField(field);

    stepBy(field, THRUST);

    expect([field.steps, shipOf(field).waiting]).toEqual([0, true]);
  });
});

describe("steerField", () => {
  it("keeps a frame's steering, whatever its record becomes after", () => {
    const field = createField(SETUP);
    const aim = { x: 1, y: 2 };
    const given: Steer = {
      turn: -1,
      heading: 1,
      aim,
      thrust: 0.5,
      fire: true,
      autoFire: true,
      dash: true,
    };

    steerField(field, given);
    Object.assign(given, STILL);

    expect(field.steer).toEqual({
      turn: -1,
      heading: 1,
      aim,
      thrust: 0.5,
      fire: true,
      autoFire: true,
      dash: true,
    });
  });
});

describe("stepField", () => {
  it("counts its steps", () => {
    const field = fieldFrom(KEEPER);

    stepTimes(field, 3);

    expect(field.steps).toBe(3);
  });

  it("makes the same field from the same seed and steering", () => {
    const first = played(3);

    const second = played(3);

    expect(second).toEqual(first);
  });

  it("draws its rocks' pieces from its seed", () => {
    const first = played(3);

    const second = played(4);

    expect(piecesOf(second)).not.toEqual(piecesOf(first));
  });

  describe("flying and firing", () => {
    it("flies the ship by the frame's steering", () => {
      const field = fieldFrom([...KEEPER, "", "", "....^"]);
      const by = { ...STILL, thrust: 1, turn: 0.5 };
      const alone = { ...createShip(18, 14, STILL), waiting: false };
      for (let step = 0; step < 60; step++) flyShip(alone, by, SETUP.torus);

      stepBy(field, by, 60);

      expect([shipOf(field).x, shipOf(field).y]).toEqual([
        expect.closeTo(alone.x),
        expect.closeTo(alone.y),
      ]);
    });

    it("follows the ship with its line in tow, the first link a link's length from the hook", () => {
      const field = fieldFrom([...KEEPER, "", "", "....^"]);

      stepBy(field, { ...STILL, thrust: 1, turn: 0.5 }, 30);

      const ship = shipOf(field);
      const hookX = ship.x - Math.cos(ship.angle) * TOW_HOOK;
      const hookY = ship.y - Math.sin(ship.angle) * TOW_HOOK;
      const [first] = field.tow;
      expect(
        distance(field.torus, hookX, hookY, first!.x, first!.y),
      ).toBeCloseTo(TOW_LINK);
    });

    it("flies the ship by the field's flight", () => {
      const field = fieldFrom([...KEEPER, "", "", "....^"]);
      field.flight = { ...TUNED_FLIGHT, topSpeed: TUNED_FLIGHT.topSpeed / 3 };

      stepBy(field, { ...STILL, thrust: 1 }, 240);

      expect(speedOf(shipOf(field))).toBeCloseTo(field.flight.topSpeed);
    });

    it("logs a dash as it starts, once while it is held", () => {
      const field = fieldFrom([...KEEPER, "", "", "....^"]);

      stepBy(field, { ...STILL, dash: true }, 10);

      expect(kindsLoggedOn(field)).toEqual(["dashed"]);
    });

    it("logs the way the ship heads as it dashes, for its trail", () => {
      const field = fieldFrom([...KEEPER, "", "", "....^"]);

      stepBy(field, { ...STILL, dash: true });

      const [dash] = loggedOn(field);
      expect(dash?.wayX).toBeCloseTo(0, 9);
      expect(dash?.wayY).toBeCloseTo(-1, 9);
    });

    it("fires the weapon in hand while fire is held, logging the pull", () => {
      const field = fieldFrom([...KEEPER, "", "", "....^"]);
      field.weapon = "spread";

      stepBy(field, FIRE);

      expect([shotsInFlight(field), kindsLoggedOn(field)]).toEqual([
        3,
        ["fired"],
      ]);
    });

    it("fires by itself with no fire held, as the setting has it", () => {
      const field = fieldFrom([...KEEPER, "", "", "....^"]);

      stepBy(field, { ...STILL, autoFire: true });

      expect([shotsInFlight(field), kindsLoggedOn(field)]).toEqual([
        1,
        ["fired"],
      ]);
    });

    it("fires by the field's gunnery", () => {
      const field = fieldFrom([...KEEPER, "", "", "....^"]);
      field.gunnery = {
        ...TUNED_GUNNERY,
        shotSpeed: TUNED_GUNNERY.shotSpeed / 2,
      };

      stepBy(field, FIRE);

      const [shot] = field.shots.slots;
      expect(shot?.vy).toBeCloseTo(-field.gunnery.shotSpeed);
    });
  });

  describe("shots meeting rocks", () => {
    it("breaks the rock a shot meets, spending the shot", () => {
      const field = fieldFrom(["S...L", "", "^"]);
      fireOnce(field);

      stepTimes(field, 40);

      expect([sizesOf(field), shotsInFlight(field)]).toEqual([["large"], 0]);
    });

    it("leaves whole a rock no shot flies at, whatever lies in the shots' free slots", () => {
      const field = fieldFrom(["B"]);

      stepTimes(field, 10);

      expect(onlyRock(field).hits).toBe(ROCK_KINDS.boulder.hits.boulder);
    });

    it("pushes a broken rock's pieces along the shot that broke it", () => {
      const struck = fieldFrom(["M", "", "^"]);
      hitRock(struck, onlyRock(struck), 0, -1);
      const shot = fieldFrom(["M", "", "^"]);
      fireOnce(shot);

      stepUntil(shot, (each) => wholeRocks(each).length === 2);

      expect(velocitiesOf(shot)).toEqual(
        velocitiesOf(struck).map(([vx = 0, vy = 0]): unknown[] => [
          expect.closeTo(vx),
          expect.closeTo(vy),
        ]),
      );
    });

    it("breaks only the first rock in a shot's way", () => {
      const field = fieldFrom(["L", "", "M", "", "^"]);
      fireOnce(field);

      stepTimes(field, 60);

      expect(sizesOf(field)).toEqual(["large", "small", "small"]);
    });

    it.each([
      ["the one it meets first", ["S", "L", "", "", "^"]],
      ["the other", ["L", "S", "", "", "^"]],
    ])(
      "breaks the rock a shot meets first within a step, its slot %s",
      (_, rows) => {
        const field = fieldFrom(rows);
        const small = rockOfSize(field, "small");
        const large = rockOfSize(field, "large");
        const step = SHOT_SPEED * STEP_S;
        const into = 18 - SHIP_LENGTH / 2 - 15 * step;
        small.y = into - 0.1 - rockHitRadius("small") - SHOT_RADIUS;
        large.y = into - 0.2 - rockHitRadius("large") - SHOT_RADIUS;
        fireOnce(field);

        stepTimes(field, 15);

        expect(sizesOf(field)).toEqual(["large"]);
      },
    );

    it("flies a shot on through where a rock broke before, to the next", () => {
      const field = fieldFrom(["L", "", "S", "", "^"]);
      fireOnce(field);
      stepTimes(field, 40);
      fireOnce(field);

      stepTimes(field, 60);

      expect(sizesOf(field)).toEqual(["medium", "medium"]);
    });

    it("breaks a rock across an edge in the step a shot comes within its reach", () => {
      const field = fieldFrom(["^"]);
      placeRock(field, "small", 2, 39.6);

      stepBy(field, FIRE);

      expect(sizesOf(field)).toEqual([]);
    });

    it("flies a Lance shot on past the pieces of two rocks close together", () => {
      const field = fieldFrom(["", "", "", "M", "L", "", "^"]);
      rockOfSize(field, "medium").y = 15;
      field.weapon = "lance";
      fireOnce(field);

      stepTimes(field, 60);

      expect(sizesOf(field)).toEqual(["medium", "medium", "small", "small"]);
    });

    it("flies a Lance shot on past the pieces of a rock it breaks, to the next", () => {
      const field = fieldFrom(["L", "", "M", "", "^"]);
      field.weapon = "lance";
      fireOnce(field);

      stepTimes(field, 60);

      expect(sizesOf(field)).toEqual(["medium", "medium", "small", "small"]);
    });
  });

  describe("taking a hit", () => {
    it("knocks the last in tow loose at a rock that touches the ship, which breaks a size down, logging it with how many ride in tow", () => {
      const field = fieldFrom(["^", "", "L"]);
      onlyRock(field).y = 4;

      stepField(field);

      expect({
        hits: field.hits,
        tow: field.crew.tow,
        loose: field.loose.filter((loose) => loose.live).map((l) => l.pilot),
        flying: field.ship !== null,
        sizes: sizesOf(field),
        events: kindsLoggedOn(field),
        knocked: [loggedOn(field)[0]?.pilot, loggedOn(field)[0]?.inTow],
      }).toEqual({
        hits: 1,
        tow: [1],
        loose: [2],
        flying: true,
        sizes: ["medium", "medium"],
        events: ["knocked", "broken", "scored"],
        knocked: [2, 1],
      });
    });

    it("logs the way the blow came as one is knocked loose, from the rock toward the ship", () => {
      const field = fieldFrom(["^", "", "L"]);
      onlyRock(field).y = 4;

      stepField(field);

      expect(loggedOn(field)[0]).toMatchObject({ wayX: 0, wayY: -1 });
    });

    it("knocks the last in tow loose at a comet, which flies on", () => {
      const field = fieldFrom(["^", "", "", "", "", "", "........S"]);
      const comet = placeComet(field, 3, 2);

      stepField(field);

      expect([field.hits, field.crew.tow, comet.live]).toEqual([1, [1], true]);
    });

    it.each([
      ["untouchable through the guard a hit leaves", 0, 1],
      ["hit again after", 1, 2],
    ])("keeps the ship %s", (_, after, hits) => {
      const field = fieldFrom(["^", "", "L"]);
      onlyRock(field).y = 4;
      stepField(field);
      for (const piece of wholeRocks(field)) {
        piece.vx = 0;
        piece.vy = 0;
      }

      stepTimes(field, stepsIn(HIT_GUARD_MS) + after);

      expect(field.hits).toBe(hits);
    });

    it("keeps the effects in play and the pickups floating at a hit that knocks one loose", () => {
      const field = fieldFrom(["^", "", "L"]);
      catchOn(field, "spread");
      placePickup(field, "nova", 40, 20);
      onlyRock(field).y = 4;

      stepField(field);

      expect([field.weapon, floatingPickups(field)]).toEqual([
        "spread",
        [expect.objectContaining({ id: "nova" })],
      ]);
    });

    it("ends the chain at a hit, the rock it breaks counted in it first", () => {
      const field = fieldFrom(["^", "", "L"]);
      onlyRock(field).y = 4;
      field.chain = 4;
      field.lastBreakAt = field.steps;

      stepField(field);

      const scored = loggedOn(field).find((event) => event.kind === "scored");
      expect([scored?.times, field.chain]).toEqual([2, 0]);
    });

    it("ends the run at a hit with no one in tow, the pilot bailing out home, logged", () => {
      const field = fieldFrom(["^B"], { crew: ALONE });

      stepField(field);

      expect([field.ship, field.hits, field.crew, loggedOn(field)]).toEqual([
        null,
        1,
        { pilot: null, tow: [], home: [2, 4], lastGiven: 6 },
        [expect.objectContaining({ kind: "lost", pilot: 4, inTow: 0 })],
      ]);
    });

    it("leaves the rock that ends the run whole", () => {
      const field = fieldFrom(["^B"], { crew: ALONE });

      stepField(field);

      expect(sizesOf(field)).toEqual(["boulder"]);
    });

    it("floats the crew knocked loose home as a hit ends the run", () => {
      const field = fieldFrom(["^", "", "L"], {
        crew: { pilot: 4, tow: [1], home: [2], lastGiven: 6 },
      });
      knockLastLoose(field, shipOf(field));
      onlyRock(field).y = 4;

      stepField(field);

      expect({
        home: field.crew.home,
        loose: field.loose.filter((loose) => loose.live),
        events: kindsLoggedOn(field),
      }).toEqual({ home: [2, 4, 1], loose: [], events: ["lost", "floated"] });
    });

    it.each([
      ["hits the ship with a rock just within", -0.01, 1],
      ["keeps the ship from a rock just past", 0.01, 0],
    ])("%s its reach", (_, beyond, hits) => {
      const field = fieldFrom(["^", "", "L"]);
      const [rock] = wholeRocks(field);
      if (!rock) throw new Error("The picture has no rock.");
      rock.y = 2 + SHIP_HIT_RADIUS + rockHitRadius("large") + beyond;

      stepField(field);

      expect(field.hits).toBe(hits);
    });

    it("hits the ship with a rock across an edge", () => {
      const field = fieldFrom(["^"]);
      shipOf(field).x = 0.5;
      placeRock(field, "small", 71.5, 2);

      stepField(field);

      expect(field.hits).toBe(1);
    });

    it("keeps the ship from where a rock beside it broke", () => {
      const field = fieldFrom(["^", "S"]);
      const rock = onlyRock(field);
      rock.y = shipOf(field).y + SHIP_HIT_RADIUS;
      hitRock(field, rock, 0, 0);

      stepField(field);

      expect(field.hits).toBe(0);
    });

    it("keeps a guarded ship from a rock that touches it", () => {
      const field = fieldFrom(["^B"]);
      guardShip(shipOf(field), 500);

      stepField(field);

      expect(field.hits).toBe(0);
    });

    it("ends every effect and lets the pickups go as a hit ends the run", () => {
      const field = fieldFrom(["^", "", "L"], { pace: 1.2, crew: ALONE });
      catchOn(field, "spread");
      catchOn(field, "slow");
      placePickup(field, "nova", 40, 20);
      onlyRock(field).y = 4;

      stepField(field);

      expect({
        hits: field.hits,
        weapon: field.weapon,
        pace: field.pace,
        inEffect: [field.effects.weapon.pickup, field.effects.pace.pickup],
        floating: floatingPickups(field),
      }).toEqual({
        hits: 1,
        weapon: "gun",
        pace: 1.2,
        inEffect: [null, null],
        floating: [],
      });
    });

    it("lets the shots in flight outlive the ship", () => {
      const field = fieldFrom(["^", "B"], { crew: ALONE });
      stepBy(field, FIRE);

      stepBy(field, FIRE, 5);

      expect([shotsInFlight(field), kindsLoggedOn(field)]).toEqual([
        1,
        ["fired", "lost"],
      ]);
    });

    it("brings no ship once the run is over", () => {
      const field = fieldFrom(["^B"], { crew: ALONE });

      stepTimes(field, 240);

      expect(field.ship).toBeNull();
    });

    it("flies its rocks on without a ship, and fires nothing", () => {
      const field = fieldFrom(["...L"]);
      const [rock] = wholeRocks(field);
      if (!rock) throw new Error("The picture has no rock.");
      rock.vx = 3;

      stepBy(field, FIRE, 120);

      expect([rock.x, kindsLoggedOn(field)]).toEqual([
        expect.closeTo(14 + 3),
        [],
      ]);
    });
  });

  describe("the crew knocked loose", () => {
    it("lets the ship catch one knocked loose again once it has swelled", () => {
      const field = fieldFrom(["^", "", "", "", "", "", "........S"]);
      knockLastLoose(field, shipOf(field));
      const [loose] = field.loose;
      loose!.speed = 0;
      loose!.x = shipOf(field).x;
      loose!.y = shipOf(field).y;

      stepTimes(field, stepsIn(LOOSE_SWELL_MS));

      expect([field.crew.tow, kindsLoggedOn(field)]).toEqual([
        [1, 2],
        ["recaught"],
      ]);
    });

    it("takes the crew knocked loose back as the wave is cleared", () => {
      const field = fieldFrom(["^", "", "", "", "", "", "........S"]);
      knockLastLoose(field, shipOf(field));
      hitRock(field, onlyRock(field), 0, 0);

      stepField(field);

      expect([field.cleared, field.crew.tow, kindsLoggedOn(field)]).toEqual([
        true,
        [1, 2],
        ["broken", "scored", "recaught", "cleared"],
      ]);
    });
  });

  describe("clearing the wave", () => {
    it("clears the wave once no rock is left, logging it last", () => {
      const field = fieldFrom(["S", "", "^"]);
      fireOnce(field);

      stepUntil(field, (each) => each.cleared);

      expect(kindsLoggedOn(field)).toEqual([
        "fired",
        "broken",
        "scored",
        "cleared",
      ]);
    });

    it("clears a wave with no ship in it", () => {
      const field = fieldFrom(["S"]);
      const [rock] = wholeRocks(field);
      if (!rock) throw new Error("The picture has no rock.");
      hitRock(field, rock, 0, 0);

      stepField(field);

      expect(field.cleared).toBe(true);
    });

    it("waits for a broken rock's blast to go off before it clears", () => {
      const field = fieldFrom(["M", "", "^"], { kind: "volatile" });
      fireOnce(field);
      stepUntil(field, (each) => wholeRocks(each).length === 0);
      const clearedAsItBroke = field.cleared;

      stepTimes(field, BEAT);

      expect([clearedAsItBroke, field.cleared]).toEqual([false, true]);
    });

    it("ends every effect and lets the pickups go as the wave is cleared", () => {
      const field = fieldFrom(["^", "", "", "", "", "", "........S"]);
      catchOn(field, "spread");
      placePickup(field, "nova", 40, 10);
      hitRock(field, onlyRock(field), 0, 0);

      stepField(field);

      expect({
        cleared: field.cleared,
        weapon: field.weapon,
        inEffect: field.effects.weapon.pickup,
        floating: floatingPickups(field),
      }).toEqual({
        cleared: true,
        weapon: "gun",
        inEffect: null,
        floating: [],
      });
    });

    it("lets the stray and the comets go as the wave is cleared", () => {
      const field = fieldFrom(["^", "", "", "", "", "", "........S"]);
      placeStray(field, 40, 30);
      placeComet(field, 20, 30);
      hitRock(field, onlyRock(field), 0, 0);

      stepField(field);

      expect([
        field.cleared,
        field.strays.adrift.live,
        field.comets.slots.filter((comet) => comet.live),
      ]).toEqual([true, false, []]);
    });

    it("stands still once the wave is cleared", () => {
      const field = fieldFrom(["S", "", "^"]);
      stepBy(field, { ...STILL, turn: 0.4, thrust: 0.5 }, 30);
      hitRock(field, onlyRock(field), 0, 0);
      stepField(field);
      const { steps } = field;
      const { x, y, angle } = shipOf(field);

      stepBy(field, { ...STILL, thrust: 1 }, 30);

      expect([field.steps, shipOf(field)]).toEqual([
        steps,
        expect.objectContaining({ x, y, lastX: x, lastY: y, lastAngle: angle }),
      ]);
    });

    it("holds its line in tow still once the wave is cleared", () => {
      const field = fieldFrom(["S", "", "^"]);
      stepBy(field, { ...STILL, turn: 0.4, thrust: 0.5 }, 30);
      hitRock(field, onlyRock(field), 0, 0);

      stepField(field);

      const riding = field.tow.slice(0, field.crew.tow.length);
      expect(riding.map((link) => [link.lastX, link.lastY])).toEqual(
        riding.map((link) => [link.x, link.y]),
      );
    });

    it("holds its shots in flight still once the wave is cleared", () => {
      const field = fieldFrom(["S", "", "^"]);
      steerField(field, FIRE);
      stepUntil(field, (each) => each.cleared);

      const moved = field.shots.slots.filter(
        (shot) =>
          shot.lifeSteps > 0 &&
          (shot.lastX !== shot.x || shot.lastY !== shot.y),
      );

      expect([shotsInFlight(field) > 0, moved]).toEqual([true, []]);
    });
  });

  describe("the order of a step", () => {
    it("sets blasts off before the ship is tested, so one that breaks a rock on the ship saves it", () => {
      const field = fieldFrom(["^", "", "L"], { kind: "volatile" });
      const volatile = onlyRock(field);
      volatile.y = 8;
      placeRock(field, "small", 2, 3);
      guardShip(shipOf(field), (BEAT - 1) * STEP_MS);
      hitRock(field, volatile, 0, 0);

      stepTimes(field, BEAT);

      expect([field.hits, sizesOf(field)]).toEqual([0, []]);
    });

    it("sets blasts off before the shots fly, so a shot meets what a blast left in its step", () => {
      const field = fieldFrom(["", "", "^"]);
      const ahead =
        10 - SHIP_LENGTH / 2 - 0.2 - rockHitRadius("large") - SHOT_RADIUS;
      placeRock(field, "large", 2, ahead);
      hitRock(field, placeRock(field, "large", 10, ahead, "volatile"), 0, 0);
      stepTimes(field, BEAT - 1);
      stepBy(field, FIRE);
      steerField(field, STILL);

      stepTimes(field, 30);

      expect(sizesOf(field)).toEqual(["medium", "small", "small"]);
    });

    it("lands the shots before the ship is tested, so one that breaks a rock on the ship saves it", () => {
      const field = fieldFrom(["", "", "^"]);
      placeRock(field, "small", 2, 10 - SHIP_LENGTH / 2);

      stepBy(field, FIRE);

      expect([field.hits, sizesOf(field)]).toEqual([0, []]);
    });

    it("lands the shots before the comets fly, so a rock both meet in a step is the shot's", () => {
      const picture = ["", "....M", "", "....^"];
      const options = { kind: "crystal", pool: ["spread"] } as const;
      // The twin, with no comet, tells the step the shot breaks the crystal
      // in, letting a pickup go; the comet comes within reach of it in that
      // step.
      const twin = fieldFrom(picture, options);
      fireOnce(twin);
      stepUntil(twin, (each) => floatingPickups(each).length > 0);
      const field = fieldFrom(picture, options);
      const rock = onlyRock(field);
      const reach = COMET_RADIUS + rockHitRadius("medium") - 0.01;
      placeComet(
        field,
        rock.x - reach - twin.steps * COMET_SPEED * STEP_S,
        rock.y,
      );

      fireOnce(field);
      stepTimes(field, twin.steps - 1);

      expect(floatingPickups(field)).toHaveLength(1);
    });

    it("lets a rock hit the ship before it can catch a Shield", () => {
      const field = fieldFrom(["^", "", "L"]);
      onlyRock(field).y = 4;
      placePickup(field, "shield", 2, 2);

      stepField(field);

      expect([field.hits, field.crew.tow]).toEqual([1, [1]]);
    });

    it("lets a rock end the run before the ship can catch a stray", () => {
      const field = fieldFrom(["^", "", "L"], { crew: ALONE });
      onlyRock(field).y = 4;
      const stray = placeStray(field, 2, 2);

      stepField(field);

      expect([field.hits, stray.live]).toEqual([1, true]);
    });

    it("ends an effect whose time is up before the ship fires", () => {
      const field = fieldFrom(["^", "", "", "", "", "", "........L"]);
      catchOn(field, "spread");
      stepTimes(field, stepsIn(PICKUPS.spread.effect.ms) - 1);

      stepBy(field, FIRE);

      expect(shotsInFlight(field)).toBe(1);
    });
  });

  describe("the player's first move", () => {
    it("holds a wave still for the player's first move", () => {
      const field = fieldFor(waveOf(), START);
      const laid = placesOf(field);

      stepBy(field, STILL, 240);

      expect([field.steps, shipOf(field).waiting, placesOf(field)]).toEqual([
        0,
        true,
        laid,
      ]);
    });

    it("holds a wave still as the ship comes to fire by itself, which is no move of the player's", () => {
      const field = fieldFor(waveOf(), START);

      stepBy(field, { ...STILL, autoFire: true }, 60);

      expect([field.steps, shipOf(field).waiting]).toEqual([0, true]);
    });

    it("starts a wave with the player's first move", () => {
      const field = fieldFor(waveOf(), START);
      stepBy(field, STILL, 60);

      stepBy(field, THRUST);

      const still = wholeRocks(field).filter(
        (rock) => rock.x === rock.lastX && rock.y === rock.lastY,
      );
      expect([field.steps, shipOf(field).waiting, still]).toEqual([
        1,
        false,
        [],
      ]);
    });

    it("takes what the player holds as a wave starts as no move until it changes", () => {
      const field = fieldFor(waveOf(), { ...START, held: THRUST });

      stepBy(field, THRUST, 60);

      expect([field.steps, shipOf(field).waiting]).toEqual([0, true]);
    });
  });
});

describe("reshapeField", () => {
  /**
   * Returns a field of 72 by 40, its ship flying near its middle and a large
   * rock in its corner.
   */
  function flying(): Field {
    return fieldFrom(["L", "", "", "", ".........^"]);
  }

  it("stretches a field to a new shape, though only one side changes", () => {
    const field = flying();

    reshapeField(field, { width: 72, height: 80 });

    expect([field.torus, placesOf(field)]).toEqual([
      { width: 72, height: 80 },
      [[2, 4]],
    ]);
  });

  it.each([
    ["untouchable through a second's steps", 0, true],
    ["touchable after", 1, false],
  ])("keeps the ship %s from the next step on", (_, after, guarded) => {
    const field = flying();
    reshapeField(field, { width: 36, height: 80 });

    stepTimes(field, stepsIn(STRETCH_GUARD_MS) + after);

    expect(isGuarded(shipOf(field))).toBe(guarded);
  });

  it("leaves a field of its shape as it is, its ship touchable", () => {
    const field = flying();

    reshapeField(field, { width: 72, height: 40 });

    expect([field.torus, placesOf(field), isGuarded(shipOf(field))]).toEqual([
      PICTURE_TORUS,
      [[2, 2]],
      false,
    ]);
  });
});
