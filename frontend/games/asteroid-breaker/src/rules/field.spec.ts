import {
  KEEPER,
  PICTURE_TORUS,
  catchOn,
  eventsOf,
  fieldFrom,
  floatingPickups,
  loggedOn,
  placeComet,
  placePickup,
  placeRock,
  placeStray,
  shipOf,
  stepTimes,
  wholeRocks,
} from "../testing/field_picture";
import { PICKUPS } from "./catalog/pickups";
import { ROCK_KINDS, type RockSize } from "./catalog/rocks";
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
import { createCrew } from "./pilots";
import { type Rock, hitRock, rockHitRadius, rocksLeft } from "./rocks";
import {
  STILL,
  type Steer,
  TUNED_FLIGHT,
  createShip,
  flyShip,
  guardShip,
  isGuarded,
} from "./ship";
import { TUNED_GUNNERY } from "./shots";
import { liesFairly, safestPlace } from "./spawn";
import { STEP_MS, stepsIn } from "./stepper";
import { distance } from "./torus";
import {
  COMET_RADIUS,
  COMET_SPEED,
  FIRST_SHIP_POINTS,
  NEW_SHIP_MS,
  PICKUP_PULL_REACH,
  SHIELD_GUARD_MS,
  SHIP_HIT_RADIUS,
  SHIP_LENGTH,
  SHOT_RADIUS,
  SHOT_SPEED,
  STEP_S,
  STRETCH_GUARD_MS,
} from "./tuning";
import { type SectorData, type Wave, type WaveData, parseWave } from "./waves";

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
  cometEvery: null,
  crew: createCrew(),
  banked: 0,
  nextShipAt: FIRST_SHIP_POINTS,
};

/** Steering that holds fire and nothing else. */
const FIRE: Readonly<Steer> = { ...STILL, fire: true };

/** Steering that holds thrust and nothing else. */
const THRUST: Readonly<Steer> = { ...STILL, thrust: 1 };

/** The sector of the specs' waves, whose chance of a pickup is 0.05. */
const SECTOR: SectorData = { id: "spec", name: "Spec", drops: 0.05, waves: [] };

/** How the specs' waves start: on a desktop's field at Relaxed, a run's points and crew handed on, nothing held. */
const START: WaveSetup = {
  torus: { width: 73, height: 40 },
  speed: "relaxed",
  seed: 5,
  crew: { flying: [3, 0], home: [6], lastGiven: 6 },
  banked: 1200,
  nextShipAt: 20_000,
  held: STILL,
};

/** The step a ship lost in a field's first step is followed by the next in line at. */
const NEXT_SHIP_STEP = 1 + stepsIn(NEW_SHIP_MS);

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

/** Steps a field until a test holds of it, failing the spec if it doesn't within a number of steps. */
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

/** Returns the game's third wave as the specs write it, changed as given: three large stones, scattered, a chance of a pickup of 0.9 and comets every 10 to 20 s. */
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

/** Returns a field of ice rocks around the ship after a steering that turns, thrusts and fires, from a seed. */
function played(seed: number): Field {
  const field = fieldFrom(["L...L", "", "..^..", "", "L...L"], {
    seed,
    kind: "ice",
  });
  stepBy(field, { ...STILL, turn: 0.3, thrust: 0.2, fire: true }, 240);
  return field;
}

/** Returns a field whose shielded ship a large iron rock, which takes several hits, has just come to touch. */
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
      lost: field.shipsLost,
      shielded: field.shielded,
      inEffect: field.effects.guard.pickup,
      sizes: sizesOf(field),
      events: eventsOf(field),
    }).toEqual({
      lost: 0,
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
    ["lets the pieces take the ship once the shield's guard is over", 1, 1],
  ])("%s", (_, after, lost) => {
    const field = rockOnShield();
    stepField(field);
    for (const piece of wholeRocks(field)) {
      piece.vx = 0;
      piece.vy = 0;
    }

    stepTimes(field, stepsIn(SHIELD_GUARD_MS) + after);

    expect(field.shipsLost).toBe(lost);
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

    expect([field.shipsLost, sizesOf(field)]).toEqual([
      0,
      ["large", "medium", "medium"],
    ]);
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
    const sooner = Math.sqrt((73 * 40) / 1600);

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
      cometEvery: { least: 10_000 / sooner / 0.5, most: 20_000 / sooner / 0.5 },
      crew: START.crew,
      banked: 1200,
      nextShipAt: 20_000,
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

    const offs = wholeRocks(field).map((rock) =>
      distance(field.torus, 36.5, 20, rock.x, rock.y).toFixed(9),
    );
    expect(new Set(offs).size).toBe(1);
  });

  it("breaks its boulders into the kind of rock it names", () => {
    const field = fieldFor(waveOf({ waveKind: "ice" }), START);

    expect(field.waveKind).toBe("ice");
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

  it("starts with the wave's crew, no stray sent and no comet on its way", () => {
    const field = createField(SETUP);

    expect({
      crew: field.crew,
      lost: field.shipsLost,
      adrift: field.strays.adrift.live,
      sent: field.strays.sent,
      broughtHome: field.strays.broughtHome,
      comets: field.comets.slots.filter((comet) => comet.live),
    }).toEqual({
      crew: SETUP.crew,
      lost: 0,
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

  it("flies the ship by the field's flight", () => {
    const field = fieldFrom([...KEEPER, "", "", "....^"]);
    field.flight = { ...TUNED_FLIGHT, topSpeed: TUNED_FLIGHT.topSpeed / 3 };

    stepBy(field, { ...STILL, thrust: 1 }, 240);

    expect(Math.hypot(shipOf(field).vx, shipOf(field).vy)).toBeCloseTo(
      field.flight.topSpeed,
    );
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

  it("logs a dash as it starts, once while it is held", () => {
    const field = fieldFrom([...KEEPER, "", "", "....^"]);

    stepBy(field, { ...STILL, dash: true }, 10);

    expect(eventsOf(field)).toEqual(["dashed"]);
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

    expect([shotsInFlight(field), eventsOf(field)]).toEqual([3, ["fired"]]);
  });

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

  it("flies a shot on through where a rock broke before, to the next", () => {
    const field = fieldFrom(["L", "", "S", "", "^"]);
    fireOnce(field);
    stepTimes(field, 40);
    fireOnce(field);

    stepTimes(field, 60);

    expect(sizesOf(field)).toEqual(["medium", "medium"]);
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

  it("sets blasts off before the ship is tested, so one that breaks a rock on the ship saves it", () => {
    const field = fieldFrom(["^", "", "L"], { kind: "volatile" });
    const volatile = onlyRock(field);
    volatile.y = 8;
    placeRock(field, "small", 2, 3);
    guardShip(shipOf(field), (BEAT - 1) * STEP_MS);
    hitRock(field, volatile, 0, 0);

    stepTimes(field, BEAT);

    expect([field.shipsLost, sizesOf(field)]).toEqual([0, []]);
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

    expect([field.shipsLost, sizesOf(field)]).toEqual([0, []]);
  });

  it("breaks a rock across an edge in the step a shot comes within its reach", () => {
    const field = fieldFrom(["^"]);
    placeRock(field, "small", 2, 39.6);

    stepBy(field, FIRE);

    expect(sizesOf(field)).toEqual([]);
  });

  it("loses the ship to a rock across an edge", () => {
    const field = fieldFrom(["^"]);
    shipOf(field).x = 0.5;
    placeRock(field, "small", 71.5, 2);

    stepField(field);

    expect(field.shipsLost).toBe(1);
  });

  it("keeps the ship from where a rock beside it broke", () => {
    const field = fieldFrom(["^", "S"]);
    const rock = onlyRock(field);
    rock.y = shipOf(field).y + SHIP_HIT_RADIUS;
    hitRock(field, rock, 0, 0);

    stepField(field);

    expect(field.shipsLost).toBe(0);
  });

  it("loses the ship to a rock that touches it, logging it", () => {
    const field = fieldFrom(["^B"]);

    stepField(field);

    expect([field.ship, field.shipsLost, eventsOf(field)]).toEqual([
      null,
      1,
      ["lost"],
    ]);
  });

  it("bails the pilot at the controls out of a lost ship, logging it with the ships left, and hands the controls to the next", () => {
    const field = fieldFrom(["^B"], {
      crew: { flying: [4, 1, 6], home: [2], lastGiven: 6 },
    });

    stepField(field);

    expect([field.crew, loggedOn(field)]).toEqual([
      { flying: [1, 6], home: [2], lastGiven: 6 },
      [
        expect.objectContaining({
          kind: "lost",
          pilot: 4,
          ships: 2,
          waiting: 1,
        }),
      ],
    ]);
  });

  it.each([
    ["loses the ship to a rock just within", -0.01, 1],
    ["keeps the ship from a rock just past", 0.01, 0],
  ])("%s its reach", (_, beyond, lost) => {
    const field = fieldFrom(["^", "", "L"]);
    const [rock] = wholeRocks(field);
    if (!rock) throw new Error("The picture has no rock.");
    rock.y = 2 + SHIP_HIT_RADIUS + rockHitRadius("large") + beyond;

    stepField(field);

    expect(field.shipsLost).toBe(lost);
  });

  it("keeps a guarded ship from a rock that touches it", () => {
    const field = fieldFrom(["^B"]);
    guardShip(shipOf(field), 500);

    stepField(field);

    expect(field.shipsLost).toBe(0);
  });

  it("ends every effect and lets the pickups go as the ship is lost", () => {
    const field = fieldFrom(["^", "", "L"], { pace: 1.2 });
    catchOn(field, "spread");
    catchOn(field, "slow");
    placePickup(field, "nova", 40, 20);
    onlyRock(field).y = 4;

    stepField(field);

    expect({
      lost: field.shipsLost,
      weapon: field.weapon,
      pace: field.pace,
      inEffect: [field.effects.weapon.pickup, field.effects.pace.pickup],
      floating: floatingPickups(field),
    }).toEqual({
      lost: 1,
      weapon: "gun",
      pace: 1.2,
      inEffect: [null, null],
      floating: [],
    });
  });

  it("lets a rock take the ship before it can catch a Shield in the step", () => {
    const field = fieldFrom(["^", "", "L"]);
    onlyRock(field).y = 4;
    placePickup(field, "shield", 2, 2);

    stepField(field);

    expect(field.shipsLost).toBe(1);
  });

  it("lets a rock take the ship before it can bring a stray home in the step", () => {
    const field = fieldFrom(["^", "", "L"]);
    onlyRock(field).y = 4;
    const stray = placeStray(field, 2, 2);

    stepField(field);

    expect([field.shipsLost, stray.live]).toEqual([1, true]);
  });

  it("ends an effect whose time is up before the ship fires in the step", () => {
    const field = fieldFrom(["^", "", "", "", "", "", "........L"]);
    catchOn(field, "spread");
    stepTimes(field, stepsIn(PICKUPS.spread.effect.ms) - 1);

    stepBy(field, FIRE);

    expect(shotsInFlight(field)).toBe(1);
  });

  it("lets the shots in flight outlive a lost ship", () => {
    const field = fieldFrom(["^", "B"]);
    stepBy(field, FIRE);

    stepBy(field, FIRE, 5);

    expect([shotsInFlight(field), eventsOf(field)]).toEqual([
      1,
      ["fired", "lost"],
    ]);
  });

  it("flies its rocks on without a ship, and fires nothing", () => {
    const field = fieldFrom(["...L"]);
    const [rock] = wholeRocks(field);
    if (!rock) throw new Error("The picture has no rock.");
    rock.vx = 3;

    stepBy(field, FIRE, 120);

    expect([rock.x, eventsOf(field)]).toEqual([expect.closeTo(14 + 3), []]);
  });

  it("clears the wave once no rock is left, logging it last", () => {
    const field = fieldFrom(["S", "", "^"]);
    fireOnce(field);

    stepUntil(field, (each) => each.cleared);

    expect(eventsOf(field)).toEqual(["fired", "broken", "scored", "cleared"]);
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

  it("clears a wave with no ship in it", () => {
    const field = fieldFrom(["S"]);
    const [rock] = wholeRocks(field);
    if (!rock) throw new Error("The picture has no rock.");
    hitRock(field, rock, 0, 0);

    stepField(field);

    expect(field.cleared).toBe(true);
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

  it("holds its shots in flight still once the wave is cleared", () => {
    const field = fieldFrom(["S", "", "^"]);
    steerField(field, FIRE);
    stepUntil(field, (each) => each.cleared);

    const moved = field.shots.slots.filter(
      (shot) =>
        shot.lifeSteps > 0 && (shot.lastX !== shot.x || shot.lastY !== shot.y),
    );

    expect([shotsInFlight(field) > 0, moved]).toEqual([true, []]);
  });

  it("waits for a broken rock's blast to go off before it clears", () => {
    const field = fieldFrom(["M", "", "^"], { kind: "volatile" });
    fireOnce(field);
    stepUntil(field, (each) => wholeRocks(each).length === 0);
    const clearedAsItBroke = field.cleared;

    stepTimes(field, BEAT);

    expect([clearedAsItBroke, field.cleared]).toEqual([false, true]);
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

  it("starts a wave with the player's first move", () => {
    const field = fieldFor(waveOf(), START);
    stepBy(field, STILL, 60);

    stepBy(field, THRUST);

    const still = wholeRocks(field).filter(
      (rock) => rock.x === rock.lastX && rock.y === rock.lastY,
    );
    expect([field.steps, shipOf(field).waiting, still]).toEqual([1, false, []]);
  });

  it("takes what the player holds as a wave starts as no move until it changes", () => {
    const field = fieldFor(waveOf(), { ...START, held: THRUST });

    stepBy(field, THRUST, 60);

    expect([field.steps, shipOf(field).waiting]).toEqual([0, true]);
  });

  it("brings no ship for a second after one is lost", () => {
    const field = fieldFrom(["^B"]);

    stepTimes(field, NEXT_SHIP_STEP - 1);

    expect(field.ship).toBeNull();
  });

  // A large rock beside the middle keeps the next ship from it.
  it("brings the next in line a second after, waiting where it is safest", () => {
    const field = fieldFrom(["^B", "", "", "", "", ".........L"]);

    stepTimes(field, NEXT_SHIP_STEP);

    const safest = safestPlace(field);
    const ship = shipOf(field);
    expect([ship.x, ship.y, ship.waiting]).toEqual([safest.x, safest.y, true]);
    expect([safest.x, safest.y]).not.toEqual([36, 20]);
  });

  it("flies the rocks on while the next ship waits", () => {
    const field = fieldFrom(["^B", "", "", "", "", "..........L"]);
    stepTimes(field, NEXT_SHIP_STEP);
    const rock = rockOfSize(field, "large");
    rock.vx = 3;

    stepTimes(field, 120);

    expect([shipOf(field).waiting, rock.x]).toEqual([
      true,
      expect.closeTo(42 + 3, 9),
    ]);
  });

  it("gives the next ship what the player holds as it comes, no move until it changes", () => {
    const field = fieldFrom(["^B"]);

    stepBy(field, THRUST, NEXT_SHIP_STEP + 60);

    expect(shipOf(field).waiting).toBe(true);
  });

  it("lets the next ship fly with the player's first move, and keeps it", () => {
    const field = fieldFrom(["^B"]);
    stepTimes(field, NEXT_SHIP_STEP);

    stepBy(field, THRUST, 60);

    expect(shipOf(field).waiting).toBe(false);
  });

  it("brings no ship once the crew has none left", () => {
    const field = fieldFrom(["^B"], {
      crew: { flying: [0], home: [], lastGiven: 0 },
    });

    stepTimes(field, NEXT_SHIP_STEP + 60);

    expect([field.ship, field.shipDueAt]).toEqual([null, null]);
  });

  // The shots in flight, or a blast, can break the last rock in the wait.
  it("brings no ship once the wave is cleared while one is due", () => {
    const field = fieldFrom(["^"]);
    const ship = shipOf(field);
    const rock = placeRock(field, "small", ship.x, ship.y);
    stepField(field);
    hitRock(field, rock, 0, 0);

    stepTimes(field, NEXT_SHIP_STEP);

    expect([field.cleared, field.ship, field.shipDueAt]).toEqual([
      true,
      null,
      null,
    ]);
  });

  it("brings the next ship as its step starts, so a drawn rock is pulled toward it in that step", () => {
    const field = fieldFrom(["^B", "", "", "", "", "..........L"], {
      kind: "lodestone",
    });
    stepTimes(field, NEXT_SHIP_STEP - 1);
    const rock = rockOfSize(field, "large");
    rock.vx = 0;
    rock.vy = 0;

    stepField(field);

    expect(Math.hypot(rock.vx, rock.vy)).toBeGreaterThan(0);
  });
});

describe("reshapeField", () => {
  /** Returns a field of 72 by 40, its ship flying near its middle and a large rock in its corner. */
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

  it("brings the next ship, due as the field was stretched, onto its new shape", () => {
    const field = fieldFrom(["^B", "", "", "", "", ".........L"]);
    stepField(field);
    reshapeField(field, { width: 36, height: 80 });

    stepTimes(field, NEXT_SHIP_STEP - 1);

    const safest = safestPlace(field);
    const ship = shipOf(field);
    expect([field.torus, ship.x, ship.y, ship.waiting]).toEqual([
      { width: 36, height: 80 },
      safest.x,
      safest.y,
      true,
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
