import {
  KEEPER,
  type PictureOptions,
  fieldFrom,
  kindsLoggedOn,
  loggedOn,
  placeRock,
  shipOf,
} from "../../testing/field_picture";
import { pointsFor } from "../catalog/rocks";
import { type Field, stepField, steerField } from "../field/field";
import { type Rock, rockHitRadius } from "../rocks/rocks";
import { STILL } from "../ship/ship";
import { STATIC_MOST, ZAP_ARCS, ZAP_COST, ZAP_REACH } from "../tuning";
import { TUNED_SPARKING } from "./charge";
import { DASH_PATH, zap } from "./zap";

/** A picture of the ship, the keeper far off it. */
const SHIP_PICTURE = [...KEEPER, "", "", "", ".........^"];

/** A sliver under the smallest a reach is measured to. */
const SLIVER = 1e-6;

/** How far a small stone's middle lies from the path as its edge comes to a zap's reach. */
const STONE_REACH = ZAP_REACH + rockHitRadius("small");

/** Returns a field of the ship and the keeper, its static full unless given. */
function fieldAt(options: PictureOptions = {}): Field {
  return fieldFrom(SHIP_PICTURE, { charge: STATIC_MOST, ...options });
}

/** Lays a small stone on a field so far along the way a zap heads from the pod, to its right, and so far off it. */
function stoneOff(field: Field, along: number, off = 0): Rock {
  const ship = shipOf(field);
  return placeRock(field, "small", ship.x + along, ship.y + off);
}

/** Zaps from the field's pod, heading to its right, and returns whether it did. */
function zapRight(field: Field): boolean {
  return zap(field, shipOf(field), 0);
}

/** Returns the slots of the rocks a field's zap arced to, in the order it arced. */
function arcedSlots(field: Field): number[] {
  return loggedOn(field)
    .filter((event) => event.kind === "arced")
    .map((event) => event.slot);
}

describe("zap", () => {
  it("arcs from the pod to a rock in reach of the path, logged at the pod and at the rock, which takes a hit", () => {
    const field = fieldAt();
    const { x, y } = shipOf(field);
    const rock = stoneOff(field, 3, 4);

    const zapped = zapRight(field);

    const logged = loggedOn(field).filter(
      (event) => event.kind === "zapped" || event.kind === "arced",
    );
    expect([zapped, rock.live, logged]).toEqual([
      true,
      false,
      [
        expect.objectContaining({ kind: "zapped", x, y, wayX: 1, wayY: 0 }),
        expect.objectContaining({
          kind: "arced",
          x: x + 3,
          y: y + 4,
          slot: rock.slot,
          reach: 5,
        }),
      ],
    ]);
  });

  it("logs the zap, then each arc before the hit it brings", () => {
    const field = fieldAt();
    stoneOff(field, 3, 4);

    zapRight(field);

    expect(kindsLoggedOn(field).slice(0, 3)).toEqual([
      "zapped",
      "arced",
      "broken",
    ]);
  });

  it("takes one hit off each rock it arcs to", () => {
    const field = fieldAt();
    const rock = placeRock(field, "large", 0, 0, "iron");
    Object.assign(rock, { x: shipOf(field).x + 2, y: shipOf(field).y + 2 });
    const hits = rock.hits;

    zapRight(field);

    expect([rock.live, rock.hits]).toEqual([true, hits - 1]);
  });

  it("scores what it breaks at full static's multiplier, and then spends static, held from the step", () => {
    const field = fieldAt();
    field.steps = 300;
    stoneOff(field, 3, 4);

    zapRight(field);

    expect([field.score, field.charge]).toEqual([
      pointsFor("stone", "small") * 4,
      { level: STATIC_MOST - ZAP_COST, lastSparkAt: 300 },
    ]);
  });

  it("lets what it breaks shed its sparks", () => {
    const field = fieldAt();
    stoneOff(field, 3, 4);

    zapRight(field);

    expect(field.sparks.some((spark) => spark.live)).toBe(true);
  });

  it.each([
    ["beside the path", 4, STONE_REACH],
    ["past the path's end", DASH_PATH + STONE_REACH, 0],
    ["behind the pod", -STONE_REACH, 0],
  ])("arcs to a rock %s with its edge within its reach", (_, along, off) => {
    const field = fieldAt();
    const rock = stoneOff(field, along * (1 - SLIVER), off * (1 - SLIVER));

    zapRight(field);

    expect(rock.live).toBe(false);
  });

  it.each([
    ["beside the path", 4, STONE_REACH + 0.01],
    ["past the path's end", DASH_PATH + STONE_REACH + 0.01, 0],
    ["behind the pod", -STONE_REACH - 0.01, 0],
  ])("arcs to no rock %s with its edge beyond its reach", (_, along, off) => {
    const field = fieldAt();
    const rock = stoneOff(field, along, off);

    zapRight(field);

    expect(rock.live).toBe(true);
  });

  it("arcs to a rock in reach across the field's edge", () => {
    const field = fieldAt();
    const ship = shipOf(field);
    const rock = placeRock(field, "small", 1, ship.y);
    ship.x = field.torus.width - 1;

    zapRight(field);

    expect(rock.live).toBe(false);
  });

  it("arcs to the six rocks nearest the path, the nearest first", () => {
    const field = fieldAt();
    const offs = [3.5, 0.5, 4, 1, 3, 1.5, 2.5, 2];
    const rocks = offs.map((off) => stoneOff(field, 4, off));
    const nearest = [...rocks]
      .sort((one, other) => one.y - other.y)
      .slice(0, ZAP_ARCS)
      .map((rock) => rock.slot);

    zapRight(field);

    expect(arcedSlots(field)).toEqual(nearest);
  });

  it("arcs to a boulder whose edge lies nearer the path than a stone's, its middle farther, first", () => {
    const field = fieldAt();
    field.sparking = { ...TUNED_SPARKING, arcs: 1 };
    stoneOff(field, 4, 3);
    const ship = shipOf(field);
    const boulder = placeRock(
      field,
      "boulder",
      ship.x + 4,
      ship.y + 6,
      "boulder",
    );

    zapRight(field);

    expect(arcedSlots(field)).toEqual([boulder.slot]);
  });

  it("arcs to the rock sooner along the path of two as near it first", () => {
    const field = fieldAt();
    field.sparking = { ...TUNED_SPARKING, arcs: 1 };
    stoneOff(field, 5, 2);
    const sooner = stoneOff(field, 1, -2);

    zapRight(field);

    expect(arcedSlots(field)).toEqual([sooner.slot]);
  });

  it("arcs to as many rocks as the field's sparking says", () => {
    const field = fieldAt();
    field.sparking = { ...TUNED_SPARKING, arcs: 2 };
    const near = [1, 2, 2.5].map((off) => stoneOff(field, 4, off));

    zapRight(field);

    expect(arcedSlots(field)).toEqual(
      near.slice(0, 2).map((rock) => rock.slot),
    );
  });

  it("arcs from as far as the field's sparking says", () => {
    const field = fieldAt();
    field.sparking = { ...TUNED_SPARKING, zapReach: 3 };
    const reach = 3 + rockHitRadius("small");
    const within = [1, reach - 0.01].map((off) => stoneOff(field, 4, off));
    stoneOff(field, 4, -reach - 0.01);

    zapRight(field);

    expect(arcedSlots(field)).toEqual(within.map((rock) => rock.slot));
  });

  it("is no zap short of full static, which stays as it is", () => {
    const field = fieldAt({ charge: STATIC_MOST - 1 });
    const rock = stoneOff(field, 3, 4);

    const zapped = zapRight(field);

    expect([zapped, rock.live, field.charge.level, loggedOn(field)]).toEqual([
      false,
      true,
      STATIC_MOST - 1,
      [],
    ]);
  });

  it("is no zap with no rock in reach, and static is kept", () => {
    const field = fieldAt();
    stoneOff(field, 4, STONE_REACH + 1);

    const zapped = zapRight(field);

    expect([zapped, field.charge.level, loggedOn(field)]).toEqual([
      false,
      STATIC_MOST,
      [],
    ]);
  });
});

describe("a zap in play", () => {
  /**
   * Returns a field whose ship dashes this step, nose up, its static at a
   * level, and a stone ahead of it, beyond a zap's reach of the pod but
   * within it of the dash's path.
   */
  function dashing(charge: number): Field {
    const field = fieldAt({ charge });
    const ship = shipOf(field);
    placeRock(field, "small", ship.x, ship.y - 11);
    steerField(field, { ...STILL, dash: true });
    return field;
  }

  it("zaps along the way a dash begun at full static heads", () => {
    const field = dashing(STATIC_MOST);

    stepField(field);

    const zapping = loggedOn(field).filter(
      (event) => event.kind === "zapped" || event.kind === "arced",
    );
    expect(zapping).toEqual([
      expect.objectContaining({ kind: "zapped", wayY: -1 }),
      expect.objectContaining({ kind: "arced" }),
    ]);
  });

  it("dashes without a zap short of full static", () => {
    const field = dashing(STATIC_MOST - 1);

    stepField(field);

    expect(kindsLoggedOn(field)).toEqual(["dashed"]);
  });
});
