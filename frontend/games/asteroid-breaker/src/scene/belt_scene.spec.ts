import { NO_INSETS } from "@fz/phaser/insets";
import { SpritePlayer } from "@fz/phaser/sound";
import type { SceneRun } from "@fz/phaser/testing";
import { Core, GameObjects, Textures } from "phaser";
import { TURN } from "../rules/angles";
import type { EffectKind, PickupId } from "../rules/catalog/pickups";
import type { Field } from "../rules/field/field";
import { COMET_RECORDS } from "../rules/hazards/comets";
import { hitRock } from "../rules/rocks/rocks";
import type { Ship } from "../rules/ship/ship";
import { stepsIn } from "../rules/stepper";
import { across } from "../rules/torus";
import {
  COMET_MARGIN,
  COMET_WARNING_MS,
  DASH_RECHARGE_MS,
  PICKUP_BLINK_MS,
  STRAY_RADIUS,
} from "../rules/tuning";
import { ART_PALETTE } from "../testing/art_frames";
import {
  BOARD,
  CANVAS,
  DARK,
  WIDER,
  type FakeShell,
  cacheSounds,
  humsIn,
  imagesIn,
  isShown,
  layersOf,
  metricsOf,
  objectsIn,
  onCanvas,
  overASecond,
  reshaping,
  shown,
  shownAt,
  slotOf,
  startBoard,
  stillness,
  strokesOf,
  withShip,
  zoomOf,
} from "../testing/belt_board";
import { viewport } from "../testing/canvases";
import {
  KEEPER,
  PICTURE_TORUS,
  fieldFrom,
  placeComet,
  placePickup,
  placeRock,
  placeStray,
  shipOf,
} from "../testing/field_picture";
import {
  DECK_FRAMES,
  FRAMES,
  PICKUP_REACH,
  PICTURE_FRAMES,
  STRAY_DROP,
  atlasFrames,
  deckFrames,
  mapPictures,
  pickupFrame,
  tagFrame,
} from "../view/art/art";
import {
  CONSTELLATION,
  LOOK,
  PILOT_SIZES,
  pilotFrame,
} from "../view/art/pilot_art";
import { rockFrame, takenFrame } from "../view/art/rock_art";
import { MOST_BAKED_UNIT, bakedScale, lineWidth } from "../view/art/shapes";
import { FLAME_BEHIND, WINDOW, flameShare } from "../view/art/ship_art";
import { SOUNDS } from "../view/effects/effects";
import {
  BREATH,
  GOLDEN_ANGLE,
  PULSE_LEAST,
  breathScale,
} from "../view/effects/flourish";
import {
  type BoardSetting,
  type DeckLayout,
  deckLayout,
} from "../view/field/field_metrics";
import { LAYERS, LAYER_CAMERAS } from "../view/field/layers";
import {
  CONSTELLATION_SIZE,
  speckCount,
  speckShares,
} from "../view/field/specks";
import { TAG_RADIUS, tagX, tagY } from "../view/field/tags";
import { WARNING_INSET } from "../view/field/warning";
import { type Deck, deckOf, rechargeRing } from "../view/steering/deck";
import { MOST_FINGERS } from "../view/steering/steering";
import { ATLAS, DECK_ATLAS } from "./atlas";
import { type BeltScene, makeBeltScene } from "./belt_scene";
import { REST_ALPHA, REST_KNOB_ALPHA } from "./painters/deck_painter";
import { GUARD_ALPHA } from "./painters/ship_painter";
import spritemap from "./sounds/sounds.json";

/**
 * Returns the time of the first frame, a frame of 16 ms at a time on from a
 * time, at which a pickup in a slot has breathed out past half its breath.
 */
function breathingOut(now: number, slot: number): number {
  let at = now + 16;
  while (breathScale(at / 1000, slot * GOLDEN_ANGLE, true) < 1 + BREATH / 2) {
    at += 16;
  }
  return at;
}

describe("the cameras", () => {
  it("point the field's at the field, showing the canvas's own pixels", async () => {
    const { shell, scene } = await startBoard();
    const metrics = metricsOf(shell);

    const camera = scene.cameras.main;

    expect([
      camera.x,
      camera.y,
      camera.width,
      camera.height,
      camera.scrollX,
      camera.scrollY,
    ]).toEqual([
      metrics.x,
      metrics.y,
      metrics.width,
      metrics.height,
      metrics.x,
      metrics.y,
    ]);
  });

  it("draw the frame and the deck with a camera over the whole canvas", async () => {
    const { scene } = await startBoard();

    const camera = scene.kit.deckCamera;

    expect([camera.x, camera.y, camera.width, camera.height]).toEqual([
      0,
      0,
      CANVAS.width,
      CANVAS.height,
    ]);
  });

  it("draw each layer by the camera layers.ts names for it, and by no other", async () => {
    const { scene } = await startBoard();
    const field = scene.cameras.main.id;
    const deck = scene.kit.deckCamera.id;

    const seen = [...layersOf(scene)].map(([name, layer]) => [
      name,
      (layer.cameraFilter & field) === 0,
      (layer.cameraFilter & deck) === 0,
    ]);

    expect(seen).toEqual(
      LAYERS.map((name) => [
        name,
        LAYER_CAMERAS[name] === "field",
        LAYER_CAMERAS[name] === "deck",
      ]),
    );
  });

  it("hold every object in a layer, none outside one, which both would draw", async () => {
    const { scene } = await startBoard();

    const loose = scene.children
      .getChildren()
      .filter((object) => !(object instanceof GameObjects.Layer));

    expect(loose).toEqual([]);
  });

  it("fill the field with its color", async () => {
    const { scene } = await startBoard();

    expect(scene.cameras.main.backgroundColor.color).toBe(ART_PALETTE.field);
  });
});

describe("the rocks", () => {
  it("draw a rock where it is, in its frame, turned as it has turned", async () => {
    const { shell, run, scene } = await startBoard();
    const rock = placeRock(shell.field, "large", 30, 20);
    rock.angle = 1;

    run.advance(16);

    const body = scene.kit.rocks.bodies[slotOf(shell.field, rock)];
    expect(shown(body)).toEqual([
      onCanvas(metricsOf(shell), 30, 20),
      null,
      null,
      null,
    ]);
    expect([body?.images[0]?.frame.name, body?.images[0]?.rotation]).toEqual([
      rockFrame(rock),
      1,
    ]);
  });

  it("draw a rock between its last place and its next", async () => {
    const { shell, run, scene } = await startBoard((each) => {
      each.alpha = 0.5;
    });
    const rock = placeRock(shell.field, "large", 30, 20);
    rock.lastX = 28;

    run.advance(16);

    expect(shown(scene.kit.rocks.bodies[slotOf(shell.field, rock)])[0]).toEqual(
      onCanvas(metricsOf(shell), 29, 20),
    );
  });

  it("draw a rock reaching past an edge on both sides of it", async () => {
    const { shell, run, scene } = await startBoard();
    const rock = placeRock(shell.field, "large", 1, 20);
    const { width } = shell.field.torus;

    run.advance(16);

    const metrics = metricsOf(shell);
    expect(shown(scene.kit.rocks.bodies[slotOf(shell.field, rock)])).toEqual([
      onCanvas(metrics, 1, 20),
      onCanvas(metrics, 1 + width, 20),
      null,
      null,
    ]);
  });

  it("draw a rock reaching past the bottom edge at the top too", async () => {
    const { shell, run, scene } = await startBoard();
    const { height } = shell.field.torus;
    const rock = placeRock(shell.field, "large", 30, height - 1);

    run.advance(16);

    const metrics = metricsOf(shell);
    expect(shown(scene.kit.rocks.bodies[slotOf(shell.field, rock)])).toEqual([
      onCanvas(metrics, 30, height - 1),
      null,
      onCanvas(metrics, 30, -1),
      null,
    ]);
  });

  it("draw a rock at a corner four times", async () => {
    const { shell, run, scene } = await startBoard();
    const { width, height } = shell.field.torus;
    const rock = placeRock(shell.field, "large", width - 1, 1);

    run.advance(16);

    const metrics = metricsOf(shell);
    expect(shown(scene.kit.rocks.bodies[slotOf(shell.field, rock)])).toEqual([
      onCanvas(metrics, width - 1, 1),
      onCanvas(metrics, -1, 1),
      onCanvas(metrics, width - 1, 1 + height),
      onCanvas(metrics, -1, 1 + height),
    ]);
  });

  it("draw nothing for a slot that holds no rock", async () => {
    const { scene } = await startBoard();

    const drawn = scene.kit.rocks.bodies.filter((body) =>
      shown(body).some((place) => place !== null),
    );

    // The keeper alone.
    expect(drawn).toHaveLength(1);
  });

  it("hide a rock once it breaks", async () => {
    const { shell, run, scene } = await startBoard();
    const rock = placeRock(shell.field, "small", 30, 20);
    run.advance(16);
    hitRock(shell.field, rock, 0, 0);

    run.advance(16);

    expect(shown(scene.kit.rocks.bodies[slotOf(shell.field, rock)])).toEqual([
      null,
      null,
      null,
      null,
    ]);
  });

  it("show the hits a rock has taken over it", async () => {
    const { shell, run, scene } = await startBoard();
    const rock = placeRock(shell.field, "large", 30, 20, "iron");
    rock.hits -= 1;

    run.advance(16);

    const taken = scene.kit.rocks.taken[slotOf(shell.field, rock)];
    expect([shown(taken)[0], taken?.images[0]?.frame.name]).toEqual([
      onCanvas(metricsOf(shell), 30, 20),
      takenFrame(rock),
    ]);
  });

  it("show no hits over a rock that has taken none", async () => {
    const { shell, run, scene } = await startBoard();
    const rock = placeRock(shell.field, "large", 30, 20, "iron");

    run.advance(16);

    expect(shown(scene.kit.rocks.taken[slotOf(shell.field, rock)])).toEqual([
      null,
      null,
      null,
      null,
    ]);
  });

  it("show no hits over a piece that takes the slot of the rock it broke from", async () => {
    const { shell, run, scene } = await startBoard();
    const rock = placeRock(shell.field, "large", 30, 20, "iron");
    const slot = slotOf(shell.field, rock);
    rock.hits -= 1;
    run.advance(16);
    hitRock(shell.field, rock, 0, 0, "smashes");

    run.advance(16);

    expect([
      scene.kit.rocks.bodies[slot]?.images[0]?.visible,
      shown(scene.kit.rocks.taken[slot]),
    ]).toEqual([true, [null, null, null, null]]);
  });

  it("draw the field's art at its unit, scaled up from the atlas baked at most at its largest", async () => {
    const big = { width: 3200, height: 1900 };
    const { shell, scene } = await startBoard(undefined, big);
    const metrics = metricsOf(shell, big);

    const keeper = scene.kit.rocks.bodies.find(
      (body) => body.images[0]?.visible,
    );

    expect(keeper?.images[0]?.scale).toBeCloseTo(
      metrics.unit / MOST_BAKED_UNIT,
      9,
    );
  });
});

describe("the shots", () => {
  /** Puts a shot in flight in the field's first slot, at a place, heading up. */
  function fire(field: Field, x: number, y: number): void {
    const shot = field.shots.slots[0];
    if (!shot) throw new Error("The field has no shot slots.");
    Object.assign(shot, { x, y, lastX: x, lastY: y, vx: 0, vy: -10 });
    shot.lifeSteps = 5;
  }

  it("draw a shot in flight where it is, along its travel", async () => {
    const { shell, run, scene } = await startBoard();
    fire(shell.field, 30, 20);

    run.advance(16);

    const shot = scene.kit.shots.shots[0];
    expect([shown(shot)[0], shot?.images[0]?.rotation]).toEqual([
      onCanvas(metricsOf(shell), 30, 20),
      -Math.PI / 2,
    ]);
  });

  it("draw nothing for a slot whose shot has landed", async () => {
    const { shell, run, scene } = await startBoard();
    fire(shell.field, 30, 20);
    run.advance(16);
    const slot = shell.field.shots.slots[0];
    if (slot) slot.lifeSteps = 0;

    run.advance(16);

    expect(shown(scene.kit.shots.shots[0])).toEqual([null, null, null, null]);
  });
});

describe("the ship", () => {
  /**
   * Returns whether the hull, the guard's ring and the flame showed over a
   * second, each as the set of what it was, the ship's blinks among them.
   */
  function blinkingOf(
    run: SceneRun<BeltScene>,
    scene: BeltScene,
  ): {
    readonly hull: ReadonlySet<boolean>;
    readonly ring: ReadonlySet<boolean>;
    readonly flame: ReadonlySet<boolean>;
  } {
    const { hull, guard, flame } = scene.kit.ship;
    return {
      hull: overASecond(run, () => isShown(hull)),
      ring: overASecond(run, () => isShown(guard)),
      flame: overASecond(run, () => isShown(flame)),
    };
  }

  /**
   * What a ship nothing can touch shows over a second, with no thrust pushing
   * it: its hull blinking within its ring, and no flame.
   */
  const UNTOUCHABLE = {
    hull: new Set([true, false]),
    ring: new Set([true]),
    flame: new Set([false]),
  };

  /** Heads a ship at an angle off the axes, where it headed a step ago too. */
  function turn(ship: Ship, angle: number): void {
    ship.angle = angle;
    ship.lastAngle = angle;
  }

  it("draws the ship where it is, turned as it heads", async () => {
    const { shell, scene } = await startBoard(withShip);
    const ship = shipOf(shell.field);

    // Phaser keeps a rotation within half a turn either way of none.
    const turnedOff = across(
      scene.kit.ship.hull.images[0]?.rotation ?? Number.NaN,
      ship.angle,
      TURN,
    );

    expect(shown(scene.kit.ship.hull)[0]).toEqual(
      onCanvas(metricsOf(shell), ship.x, ship.y),
    );
    expect(turnedOff).toBeCloseTo(0, 9);
  });

  it("seats the pilot at the controls in its window, upright", async () => {
    const { shell, run, scene } = await startBoard(withShip);
    const ship = shipOf(shell.field);
    turn(ship, 0.5);
    const [pilot] = shell.field.crew.flying;

    run.advance(16);

    const image = scene.kit.ship.pilot.images[0];
    expect([
      shown(scene.kit.ship.pilot)[0],
      image?.frame.name,
      image?.rotation,
    ]).toEqual([
      onCanvas(
        metricsOf(shell),
        ship.x + Math.cos(0.5) * WINDOW.x,
        ship.y + Math.sin(0.5) * WINDOW.x,
      ),
      pilotFrame(pilot ?? 0, "seated"),
      0,
    ]);
  });

  it("turns the pilot's eyes the way the ship heads", async () => {
    const { shell, run, scene } = await startBoard(withShip);
    turn(shipOf(shell.field), 0.5);

    run.advance(16);

    const [pilot, eyes] = [scene.kit.ship.pilot, scene.kit.ship.eyes].map(
      (part) => shown(part)[0],
    );
    const { unit } = metricsOf(shell);
    expect(((eyes?.x ?? 0) - (pilot?.x ?? 0)) / unit).toBeCloseTo(
      Math.cos(0.5) * LOOK.across * PILOT_SIZES.seated,
      9,
    );
    expect(((eyes?.y ?? 0) - (pilot?.y ?? 0)) / unit).toBeCloseTo(
      Math.sin(0.5) * LOOK.down * PILOT_SIZES.seated,
      9,
    );
  });

  it("draws the flame behind the ship as long as its thrust", async () => {
    const { shell, run, scene } = await startBoard((each) => {
      withShip(each);
      stillness(each);
    });
    const ship = shipOf(shell.field);
    turn(ship, 0.5);
    ship.held.thrust = 0.5;

    run.advance(16);

    const { flame } = scene.kit.ship;
    expect([shown(flame)[0], flame.images[0]?.scaleX]).toEqual([
      onCanvas(
        metricsOf(shell),
        ship.x - Math.cos(0.5) * FLAME_BEHIND,
        ship.y - Math.sin(0.5) * FLAME_BEHIND,
      ),
      flameShare(0.5) * zoomOf(shell),
    ]);
  });

  it("draws no flame while the ship doesn't thrust", async () => {
    const { scene } = await startBoard(withShip);

    expect(shown(scene.kit.ship.flame)).toEqual([null, null, null, null]);
  });

  it("draws no flame for a waiting ship, however hard the thrust held as it came", async () => {
    const { shell, run, scene } = await startBoard(withShip);
    const ship = shipOf(shell.field);
    ship.waiting = true;
    ship.held.thrust = 1;

    const seen = blinkingOf(run, scene);

    expect(seen).toEqual(UNTOUCHABLE);
  });

  it("blinks a guarded ship within its faint ring", async () => {
    const { shell, run, scene } = await startBoard(withShip);
    shipOf(shell.field).guardSteps = 1000;

    const seen = blinkingOf(run, scene);

    expect(seen).toEqual(UNTOUCHABLE);
    expect(scene.kit.ship.guard.images[0]?.alpha).toBe(GUARD_ALPHA);
  });

  it("blinks a waiting ship within the same ring, as nothing can touch it either", async () => {
    const { shell, run, scene } = await startBoard(withShip);
    shipOf(shell.field).waiting = true;

    const seen = blinkingOf(run, scene);

    expect(seen).toEqual(UNTOUCHABLE);
  });

  it("rings a ship the Shield guards", async () => {
    const { shell, run, scene } = await startBoard(withShip);
    shell.field.shielded = true;

    run.advance(16);

    expect(shown(scene.kit.ship.shield)[0]).toEqual(
      onCanvas(metricsOf(shell), shipOf(shell.field).x, shipOf(shell.field).y),
    );
  });

  it("draws nothing of a ship between one and the next", async () => {
    const { shell, run, scene } = await startBoard(withShip);
    shell.field.ship = null;

    run.advance(16);

    expect(
      [scene.kit.ship.hull, scene.kit.ship.pilot, scene.kit.ship.eyes].flatMap(
        shown,
      ),
    ).toEqual(Array(12).fill(null));
  });
});

describe("the pickups", () => {
  it("draw a pickup floating where it is, in its frame, still where motion isn't welcome", async () => {
    const { shell, run, scene } = await startBoard(stillness);
    const floating = placePickup(shell.field, "magnet", 30, 20);

    run.advance(16);

    const copies =
      scene.kit.pickups.pickups[shell.field.pickups.indexOf(floating)];
    expect([
      shown(copies),
      copies?.images[0]?.frame.name,
      copies?.images[0]?.scale,
    ]).toEqual([
      [onCanvas(metricsOf(shell), 30, 20), null, null, null],
      pickupFrame("magnet"),
      zoomOf(shell),
    ]);
  });

  it("draw a pickup between its last place and its next, on both sides of an edge it reaches across", async () => {
    const { shell, run, scene } = await startBoard((each) => {
      each.alpha = 0.5;
    });
    const floating = placePickup(shell.field, "spread", 0.5, 20);
    floating.lastX = 1;

    run.advance(16);

    const metrics = metricsOf(shell);
    const { width } = shell.field.torus;
    expect(
      shown(scene.kit.pickups.pickups[shell.field.pickups.indexOf(floating)]),
    ).toEqual([
      onCanvas(metrics, 0.75, 20),
      onCanvas(metrics, 0.75 + width, 20),
      null,
      null,
    ]);
  });

  it("draw a pickup breathing out on both sides of an edge it reaches across only as it breathes", async () => {
    const { shell, run, scene } = await startBoard();
    const floating = placePickup(shell.field, "spread", 30, 20);
    const slot = shell.field.pickups.indexOf(floating);
    const at = breathingOut(scene.time.now, slot);
    const breath = breathScale(at / 1000, slot * GOLDEN_ANGLE, true);
    // Halfway between its reach at rest and its reach as it breathes.
    const x = (PICKUP_REACH * (1 + breath)) / 2;
    floating.x = x;
    floating.lastX = x;

    run.advance(at - scene.time.now);

    const metrics = metricsOf(shell);
    expect(shown(scene.kit.pickups.pickups[slot])).toEqual([
      onCanvas(metrics, x, 20),
      onCanvas(metrics, x + shell.field.torus.width, 20),
      null,
      null,
    ]);
  });

  it("breathe where motion is welcome, each a phase apart from the next", async () => {
    const { shell, run, scene } = await startBoard();
    placePickup(shell.field, "spread", 20, 20);
    placePickup(shell.field, "magnet", 40, 20);

    run.advance(16);

    const [first, second] = scene.kit.pickups.pickups.map(
      (copies) => copies.images[0]?.scale,
    );
    expect(first).not.toBe(second);
  });

  it("blink through their last seconds", async () => {
    const { shell, run, scene } = await startBoard();
    const floating = placePickup(shell.field, "spread", 30, 20);
    floating.lifeSteps = stepsIn(PICKUP_BLINK_MS);
    const copies =
      scene.kit.pickups.pickups[shell.field.pickups.indexOf(floating)];

    const seen = overASecond(run, () => isShown(copies));

    expect(seen).toEqual(new Set([true, false]));
  });

  it("show steadily before their last seconds", async () => {
    const { shell, run, scene } = await startBoard();
    const floating = placePickup(shell.field, "spread", 30, 20);
    floating.lifeSteps = stepsIn(PICKUP_BLINK_MS) + 1;
    const copies =
      scene.kit.pickups.pickups[shell.field.pickups.indexOf(floating)];

    const seen = overASecond(run, () => isShown(copies));

    expect(seen).toEqual(new Set([true]));
  });

  it("draw nothing for a record out of play", async () => {
    const { shell, run, scene } = await startBoard();
    const floating = placePickup(shell.field, "spread", 30, 20);
    run.advance(16);
    floating.live = false;

    run.advance(16);

    expect(
      shown(scene.kit.pickups.pickups[shell.field.pickups.indexOf(floating)]),
    ).toEqual([null, null, null, null]);
  });
});

describe("the stray", () => {
  it("draws the stray adrift in its bubble, its pilot low in it in its ink, looking the way it drifts between ships", async () => {
    const { shell, run, scene } = await startBoard(stillness);
    placeStray(shell.field, 30, 20, 0.5, 3);

    run.advance(16);

    const metrics = metricsOf(shell);
    const sits = 20 + STRAY_DROP * STRAY_RADIUS;
    const size = PILOT_SIZES.adrift;
    const { bubble, pilot, eyes } = scene.kit.strays.adrift;
    expect({
      bubble: shownAt(bubble),
      pilot: shownAt(pilot),
      ink: pilot.frame.name,
      eyes: shownAt(eyes),
    }).toEqual({
      bubble: onCanvas(metrics, 30, 20),
      pilot: onCanvas(metrics, 30, sits),
      ink: pilotFrame(3, "adrift"),
      eyes: onCanvas(
        metrics,
        30 + Math.cos(0.5) * LOOK.across * size,
        sits + Math.sin(0.5) * LOOK.down * size,
      ),
    });
  });

  it("turns the stray's eyes on the ship, where it is drawn between its last place and its next", async () => {
    const { shell, run, scene } = await startBoard((each) => {
      stillness(each);
      withShip(each);
      each.alpha = 0.5;
    });
    const ship = shipOf(shell.field);
    ship.lastX = ship.x - 2;
    // Straight below where the ship is drawn, so it looks straight up.
    placeStray(shell.field, ship.x - 1, ship.y + 10, 0.5);

    run.advance(16);

    const sits = ship.y + 10 + STRAY_DROP * STRAY_RADIUS;
    expect(shownAt(scene.kit.strays.adrift.eyes)).toEqual(
      onCanvas(
        metricsOf(shell),
        ship.x - 1,
        sits - LOOK.down * PILOT_SIZES.adrift,
      ),
    );
  });

  it("draws the stray between its last place and its next, off the field as it comes in", async () => {
    const { shell, run, scene } = await startBoard((each) => {
      each.alpha = 0.5;
    });
    const stray = placeStray(shell.field, -1, 20);
    stray.lastX = -2;

    run.advance(16);

    expect(shownAt(scene.kit.strays.adrift.bubble)).toEqual(
      onCanvas(metricsOf(shell), -1.5, 20),
    );
  });

  it("bobs its pilot in its bubble where motion is welcome", async () => {
    const { shell, run, scene } = await startBoard();
    placeStray(shell.field, 30, 20);
    const { bubble, pilot } = scene.kit.strays.adrift;

    const seen = {
      bubble: overASecond(run, () => bubble.y).size,
      pilot: overASecond(run, () => pilot.y).size,
    };

    expect(seen.bubble).toBe(1);
    expect(seen.pilot).toBeGreaterThan(1);
  });

  it("draws nothing while no stray is adrift", async () => {
    const { scene } = await startBoard();

    const { bubble, pilot, eyes } = scene.kit.strays.adrift;

    expect([bubble, pilot, eyes].map(shownAt)).toEqual([null, null, null]);
  });
});

describe("the comets", () => {
  it("draw a comet crossing where it is, turned the way it flies", async () => {
    const { shell, run, scene } = await startBoard();
    placeComet(shell.field, 30, 20, 0.5);

    run.advance(16);

    const [comet] = scene.kit.hazards.comets;
    const [warning] = scene.kit.hazards.warnings;
    expect({
      comet: comet && shownAt(comet),
      turned: comet?.rotation,
      warning: warning && shownAt(warning),
    }).toEqual({
      comet: onCanvas(metricsOf(shell), 30, 20),
      turned: 0.5,
      warning: null,
    });
  });

  it("draw a comet between its last place and its next, off the field as it comes in", async () => {
    const { shell, run, scene } = await startBoard((each) => {
      each.alpha = 0.5;
    });
    const comet = placeComet(shell.field, -1, 20);
    comet.lastX = -2;

    run.advance(16);

    const [image] = scene.kit.hazards.comets;
    expect(image && shownAt(image)).toEqual(
      onCanvas(metricsOf(shell), -1.5, 20),
    );
  });

  it("warn of a comet at the edge it will come in by, pointing in, and draw it not yet", async () => {
    const { shell, run, scene } = await startBoard(stillness);
    const comet = placeComet(shell.field, -COMET_MARGIN, 20);
    comet.warnSteps = 100;

    run.advance(16);

    const [image] = scene.kit.hazards.comets;
    const [warning] = scene.kit.hazards.warnings;
    expect({
      comet: image && shownAt(image),
      warning: warning && shownAt(warning),
      turned: warning?.rotation,
      alpha: warning?.alpha,
    }).toEqual({
      comet: null,
      warning: onCanvas(metricsOf(shell), WARNING_INSET, 20),
      turned: 0,
      alpha: 1,
    });
  });

  it.each([
    ["full as it starts", 0, 1],
    ["at its faintest half a pulse on", 625, PULSE_LEAST],
  ])(
    "pulse a warning where motion is welcome, %s",
    async (_, warnedMs, alpha) => {
      const { shell, run, scene } = await startBoard();
      placeComet(shell.field, -COMET_MARGIN, 20).warnSteps =
        stepsIn(COMET_WARNING_MS) - stepsIn(warnedMs);

      run.advance(16);

      expect(scene.kit.hazards.warnings[0]?.alpha).toBeCloseTo(alpha, 9);
    },
  );

  it("draw nothing for a record out of play", async () => {
    const { scene } = await startBoard();

    expect(
      [...scene.kit.hazards.comets, ...scene.kit.hazards.warnings].map(shownAt),
    ).toEqual(Array(2 * COMET_RECORDS).fill(null));
  });
});

describe("the tags", () => {
  /** Puts an effect in play on a field from a pickup, with so much of its time left. */
  function inPlay(
    field: Field,
    kind: EffectKind,
    id: PickupId,
    ms: number,
  ): void {
    const effect = field.effects[kind];
    effect.pickup = id;
    effect.endsAt = field.steps + stepsIn(ms);
  }

  it("show each lasting effect in play in a row at the field's bottom left, in its pickup's frame", async () => {
    const { shell, run, scene } = await startBoard();
    inPlay(shell.field, "weapon", "spread", 12_000);
    inPlay(shell.field, "pace", "slow", 8000);

    run.advance(16);

    const metrics = metricsOf(shell);
    const y = tagY(shell.field.torus.height);
    const { weapon, pace } = scene.kit.tags.images;
    expect([
      [shownAt(weapon), weapon.frame.name],
      [shownAt(pace), pace.frame.name],
    ]).toEqual([
      [onCanvas(metrics, tagX(0), y), tagFrame("spread")],
      [onCanvas(metrics, tagX(1), y), tagFrame("slow")],
    ]);
  });

  it("ring each tag in the field's line, emptying in the accent as its time runs out", async () => {
    const { shell, run, scene } = await startBoard();
    // Half of Slow's eight seconds left.
    inPlay(shell.field, "pace", "slow", 4000);

    run.advance(16);

    const metrics = metricsOf(shell);
    const ring = {
      ...onCanvas(metrics, tagX(0), tagY(shell.field.torus.height)),
      radius: TAG_RADIUS * metrics.unit,
      width: lineWidth(metrics),
    };
    expect(strokesOf(scene.kit.tags.rings)).toEqual([
      { ...ring, start: 0, end: 2 * Math.PI, color: ART_PALETTE.line },
      // Half the ring, from its top round to its foot.
      {
        ...ring,
        start: -Math.PI / 2,
        end: Math.PI / 2,
        color: ART_PALETTE.accent,
      },
    ]);
  });

  it("show none, and no rings, while no lasting effect is in play", async () => {
    const { scene } = await startBoard();

    expect({
      tags: Object.values(scene.kit.tags.images).filter(
        (image) => image.visible,
      ),
      rings: strokesOf(scene.kit.tags.rings),
    }).toEqual({ tags: [], rings: [] });
  });
});

describe("the deck", () => {
  /** How the board lays the field out with the deck showing. */
  const WITH_DECK: BoardSetting = { ...BOARD, deck: true };

  /** Shows the deck on a shell's board. */
  function withDeck(shell: FakeShell): void {
    shell.setting = WITH_DECK;
  }

  /** The spec's canvas, as the scene measures it. */
  const MEASURED = viewport(CANVAS.width, CANVAS.height);

  /** Returns where the deck's zones lie on the spec's canvas, as the scene lays them out. */
  function zonesFor(shell: FakeShell): DeckLayout {
    const zones = deckLayout(MEASURED, shell.setting, shell.field.torus);
    if (!zones) throw new Error("The board shows no deck.");
    return zones;
  }

  /** Returns where the deck's parts lie on the spec's canvas, as the scene lays them out. */
  function deckFor(shell: FakeShell): Deck {
    return deckOf(zonesFor(shell), shell.setting, MEASURED.pixelRatio);
  }

  /**
   * Returns how an image of the deck shows: where, in what color, how opaque;
   * or null where it doesn't.
   */
  function look(
    image: GameObjects.Image,
  ): { x: number; y: number; tint: number; alpha: number } | null {
    return image.visible
      ? { x: image.x, y: image.y, tint: image.tintTopLeft, alpha: image.alpha }
      : null;
  }

  it("tells the shell where the deck's zones lie", async () => {
    const { shell } = await startBoard(withDeck);

    expect(shell.layouts.at(-1)?.deck).toEqual(zonesFor(shell));
  });

  it("draws nothing on a board with no deck", async () => {
    const { scene } = await startBoard();

    const drawn = layersOf(scene)
      .get("deck")
      ?.getChildren()
      .filter(
        (object) => object instanceof GameObjects.Image && object.visible,
      );

    expect(drawn).toEqual([]);
  });

  it("shows the stick faintly where it waits, and the buttons at rest", async () => {
    const { shell, scene } = await startBoard(withDeck);
    const deck = deckFor(shell);
    const { stick, fire, dash } = deck;
    if (!fire) throw new Error("The deck has no Fire.");
    const waits = { x: stick.x, y: stick.y };

    const { rest, knob, base } = scene.kit.deck;

    expect({
      rest: look(rest),
      knob: look(knob),
      base: look(base),
      fire: look(scene.kit.deck.fire.disc),
      symbol: look(scene.kit.deck.dash.symbol),
    }).toEqual({
      rest: { ...waits, tint: ART_PALETTE.muted, alpha: REST_ALPHA },
      knob: { ...waits, tint: ART_PALETTE.muted, alpha: REST_KNOB_ALPHA },
      base: null,
      fire: { x: fire.x, y: fire.y, tint: ART_PALETTE.deck, alpha: 1 },
      symbol: {
        x: dash.x,
        y: dash.y,
        tint: ART_PALETTE.muted,
        alpha: 1,
      },
    });
  });

  it.each([
    ["the stick", (deck: Deck) => deck.stick],
    ["Dash", (deck: Deck) => deck.dash],
  ])("asks to go on at a finger on %s", async (_, part) => {
    const { shell, run } = await startBoard(withDeck);
    const { x, y } = part(deckFor(shell));

    run.touch("start", x, y);

    expect(shell.commands).toEqual(["go"]);
  });

  it("asks nothing at a finger on the field", async () => {
    const { shell, run } = await startBoard(withDeck);
    const { x, y } = onCanvas(metricsOf(shell), 10, 10);

    run.touch("start", x, y);

    expect(shell.commands).toEqual([]);
  });

  it("draws the stick where a finger holds it, its knob in the accent", async () => {
    const { shell, run, scene } = await startBoard(withDeck);
    const { x, y } = deckFor(shell).stick;

    run.touch("start", x, y);
    run.advance(16);

    const { base, knob, rest } = scene.kit.deck;
    expect({
      base: look(base),
      knob: look(knob),
      rest: look(rest),
    }).toEqual({
      base: { x, y, tint: ART_PALETTE.deck, alpha: 1 },
      knob: { x, y, tint: ART_PALETTE.accent, alpha: 1 },
      rest: null,
    });
  });

  it.each([
    ["turns", 0.3, [ART_PALETTE.muted, REST_ALPHA], ART_PALETTE.line],
    ["thrusts", 0.75, [ART_PALETTE.accent, 1], ART_PALETTE.line],
    ["pushes to its edge", 1, [ART_PALETTE.accent, 1], ART_PALETTE.accent],
  ])(
    "follows the knob over its base, lighting the stick's rings, as it %s",
    async (_, out, thrust, edge) => {
      const { shell, run, scene } = await startBoard(withDeck);
      const { x, y, radius } = deckFor(shell).stick;
      run.touch("start", x, y);

      run.touch("move", x + out * radius, y);
      run.advance(16);

      const { deck } = scene.kit;
      expect({
        base: deck.base.x,
        knob: deck.knob.x,
        thrust: [deck.thrust.tintTopLeft, deck.thrust.alpha],
        edge: deck.edge.tintTopLeft,
      }).toEqual({ base: x, knob: x + out * radius, thrust, edge });
    },
  );

  it("fills a button in the accent while a finger presses it", async () => {
    const { shell, run, scene } = await startBoard(withDeck);
    const { x, y } = deckFor(shell).dash;

    run.touch("start", x, y);
    run.advance(16);

    const { disc, ring, symbol } = scene.kit.deck.dash;
    expect([disc, ring, symbol].map((image) => image.tintTopLeft)).toEqual([
      ART_PALETTE.accent,
      ART_PALETTE.accent,
      ART_PALETTE.onAccent,
    ]);
  });

  it("draws no Fire where fire is held by itself", async () => {
    const { scene } = await startBoard((shell) => {
      shell.setting = { ...WITH_DECK, fireByItself: true };
    });

    const { disc, ring, symbol } = scene.kit.deck.fire;

    expect([disc, ring, symbol].map(shownAt)).toEqual([null, null, null]);
  });

  it("rings Dash as it recharges", async () => {
    const { shell, run, scene } = await startBoard((each) => {
      withShip(each);
      withDeck(each);
    });
    shipOf(shell.field).rechargeSteps = stepsIn(DASH_RECHARGE_MS) / 2;

    run.advance(16);

    // Half the ring, from its top round to its foot.
    expect(strokesOf(scene.kit.deck.recharge)).toEqual([
      {
        ...rechargeRing(deckFor(shell).dash, 1, {
          x: 0,
          y: 0,
          radius: 0,
          width: 0,
        }),
        start: -Math.PI / 2,
        end: Math.PI / 2,
        color: ART_PALETTE.accent,
      },
    ]);
  });

  it("draws no ring round Dash once it is charged", async () => {
    const { scene } = await startBoard(withDeck);

    expect(strokesOf(scene.kit.deck.recharge)).toEqual([]);
  });

  it("shows the deck as the board comes to show it", async () => {
    const { shell, run, scene } = await startBoard();

    withDeck(shell);
    run.advance(16);

    expect(shownAt(scene.kit.deck.rest)).toEqual({
      x: deckFor(shell).stick.x,
      y: deckFor(shell).stick.y,
    });
  });

  it("hides the deck as the board stops showing it", async () => {
    const { shell, run, scene } = await startBoard(withDeck);

    shell.setting = BOARD;
    run.advance(16);

    expect(
      [scene.kit.deck.rest, scene.kit.deck.dash.disc].map(shownAt),
    ).toEqual([null, null]);
  });
});

describe("the specks", () => {
  it("strew as many as the field holds, where the run's seed lays them", async () => {
    const { shell, scene } = await startBoard();
    const metrics = metricsOf(shell);
    const [first] = speckShares(shell.seed);

    const visible = scene.kit.field.specks.filter((speck) => speck.visible);

    expect(visible).toHaveLength(speckCount(shell.field.torus));
    expect([visible[0]?.x, visible[0]?.y]).toEqual([
      metrics.x + (first?.x ?? 0) * metrics.width,
      metrics.y + (first?.y ?? 0) * metrics.height,
    ]);
  });

  it("strew them anew for another run", async () => {
    const { shell, run, scene } = await startBoard();
    const before = scene.kit.field.specks[0]?.x;
    shell.seed = 8;

    run.advance(16);

    expect(scene.kit.field.specks[0]?.x).not.toBe(before);
  });

  it("tint each in the specks' color", async () => {
    const { scene } = await startBoard();

    expect(scene.kit.field.specks[0]?.tintTopLeft).toBe(ART_PALETTE.speck);
  });
});

describe("the constellation", () => {
  it("lies nowhere in a sector's wave", async () => {
    const { scene } = await startBoard();

    expect(scene.kit.field.stars.filter((star) => star.visible)).toEqual([]);
  });

  it("traces the fuzzball where an Endless wave lays it, at its size in field units", async () => {
    const { shell, scene } = await startBoard((setUp) => {
      setUp.constellation = { x: 0.4, y: 0.6 };
    });
    const metrics = metricsOf(shell);
    const across = CONSTELLATION_SIZE * metrics.unit;

    const [star] = scene.kit.field.stars;
    const [first] = CONSTELLATION.specks;

    expect({
      shown: scene.kit.field.stars.filter((each) => each.visible).length,
      x: star?.x,
      y: star?.y,
    }).toEqual({
      shown: CONSTELLATION.specks.length + CONSTELLATION.eyes.length,
      x: metrics.x + 0.4 * metrics.width + (first?.x ?? 0) * across,
      y: metrics.y + 0.6 * metrics.height + (first?.y ?? 0) * across,
    });
  });

  it("tints its specks as the field's and its eyes brighter", async () => {
    const { scene } = await startBoard((shell) => {
      shell.constellation = { x: 0.5, y: 0.5 };
    });

    const tints = scene.kit.field.stars.map((star) => star.tintTopLeft);

    expect({
      specks: new Set(tints.slice(0, CONSTELLATION.specks.length)),
      eyes: new Set(tints.slice(CONSTELLATION.specks.length)),
    }).toEqual({
      specks: new Set([ART_PALETTE.speck]),
      eyes: new Set([ART_PALETTE.muted]),
    });
  });

  it("goes as the next wave, a sector's, comes", async () => {
    const { shell, run, scene } = await startBoard((setUp) => {
      setUp.constellation = { x: 0.5, y: 0.5 };
    });
    shell.constellation = null;

    run.advance(16);

    expect(scene.kit.field.stars.filter((star) => star.visible)).toEqual([]);
  });
});

describe("the steering", () => {
  it("follows as many fingers at once as it reads", async () => {
    const { run } = await startBoard();

    expect(run.game.input.pointersTotal).toBe(MOST_FINGERS);
  });

  it("adds no fingers for a scene built after another in the same game", async () => {
    const { shell, run } = await startBoard();
    const next = makeBeltScene(shell)({
      insets: () => NO_INSETS,
      ready: () => undefined,
    });

    run.game.scene.add(next.key, next, true);
    run.advance(16);

    expect(run.game.input.pointersTotal).toBe(MOST_FINGERS);
  });

  it("is handed to the shell each frame, a held key's push in it", async () => {
    const { shell, run } = await startBoard();

    run.key("keydown", "ArrowUp");
    run.advance(16);

    expect(shell.lastSteer().thrust).toBe(1);
  });

  it("is let go of as the key is", async () => {
    const { shell, run } = await startBoard();
    run.key("keydown", "ArrowUp");
    run.advance(16);

    run.key("keyup", "ArrowUp");
    run.advance(16);

    expect(shell.lastSteer().thrust).toBe(0);
  });

  it("takes the mouse's main button as fire", async () => {
    const { shell, run } = await startBoard();

    run.pointer("down", 300, 200);
    run.advance(16);

    expect(shell.lastSteer().fire).toBe(true);
  });

  it("lets go of fire as the mouse's button is", async () => {
    const { shell, run } = await startBoard();
    run.pointer("down", 300, 200);
    run.advance(16);

    run.pointer("up", 300, 200);
    run.advance(16);

    expect(shell.lastSteer().fire).toBe(false);
  });

  it("aims the ship where the mouse moves on the field", async () => {
    const { shell, run } = await startBoard();
    const metrics = metricsOf(shell);

    run.pointer("move", 300, 200);
    run.advance(16);

    const aim = shell.lastSteer().aim;
    expect(aim?.x).toBeCloseTo((300 - metrics.x) / metrics.unit, 9);
    expect(aim?.y).toBeCloseTo((200 - metrics.y) / metrics.unit, 9);
  });

  it("lets go of every key held as the focus leaves the board", async () => {
    const { shell, run, keys } = await startBoard();
    run.key("keydown", "ArrowUp");
    run.advance(16);

    keys.dispatchEvent(new FocusEvent("focusout", { relatedTarget: null }));
    run.advance(16);

    expect(shell.lastSteer().thrust).toBe(0);
  });

  it("keeps a key held as the focus moves to a button on the board", async () => {
    const { shell, run, keys } = await startBoard();
    const resume = document.createElement("button");
    keys.append(resume);
    run.key("keydown", "ArrowUp");
    run.advance(16);

    keys.dispatchEvent(new FocusEvent("focusout", { relatedTarget: resume }));
    run.advance(16);

    expect(shell.lastSteer().thrust).toBe(1);
  });

  it("lets go of every key held as the window loses the player", async () => {
    const { shell, run } = await startBoard();
    run.key("keydown", "ArrowUp");

    run.game.events.emit(Core.Events.BLUR);
    run.advance(16);

    expect(shell.lastSteer().thrust).toBe(0);
  });

  it("goes on with a paused game at a key that flies the ship, once a press", async () => {
    const { shell, run } = await startBoard();

    run.key("keydown", "Space", " ");
    run.key("keydown", "Space", " ", { repeat: true });

    expect(shell.commands).toEqual(["go"]);
  });

  it("passes on what a key asks, once a press", async () => {
    const { shell, run } = await startBoard();

    run.key("keydown", "Escape", "Escape");
    run.key("keydown", "Escape", "Escape", { repeat: true });

    expect(shell.commands).toEqual(["pause"]);
  });

  it("leaves the browser its shortcuts", async () => {
    const { shell, run } = await startBoard();

    run.key("keydown", "KeyP", "p", { ctrlKey: true });
    run.advance(16);

    expect(shell.commands).toEqual([]);
  });
});

describe("baking", () => {
  /**
   * A canvas a little wider than the spec's, on which the field's unit, 10
   * and a fraction device pixels, grows by less than one.
   */
  const NUDGED = { width: 805, height: CANVAS.height } as const;

  /**
   * The widths of a window dragged wider, a frame each, its field's unit
   * passing 11 device pixels only at the last.
   */
  const DRAGGED = [805, 812, 818, 836] as const;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("bakes the atlas as it is created", async () => {
    const { shell } = await startBoard();

    expect(shell.bakes).toHaveLength(1);
  });

  it("draws the field's art at its unit, zoomed from the atlas baked at its whole device pixels", async () => {
    const { shell, scene } = await startBoard();
    // The spec's canvas lays the field out at 10 and a fraction device pixels
    // a unit.
    const { unit } = metricsOf(shell);

    const keeper = scene.kit.rocks.bodies.find(
      (body) => body.images[0]?.visible,
    );

    expect(keeper?.images[0]?.scale).toBe(unit / Math.floor(unit));
  });

  it("bakes nothing again as the canvas grows by less than a device pixel of the unit", async () => {
    const { shell, run } = await startBoard();

    run.game.scale.resize(NUDGED.width, NUDGED.height);
    run.advance(16);

    expect(shell.bakes).toHaveLength(1);
  });

  it("bakes the atlas again once in a drag that takes the unit past a device pixel", async () => {
    const { shell, run } = await startBoard();

    for (const width of DRAGGED) {
      run.game.scale.resize(width, CANVAS.height);
      run.advance(16);
    }

    expect(shell.bakes).toHaveLength(2);
  });

  it("bakes both atlases again at a new pixel ratio, its unit's whole device pixels the same", async () => {
    const { shell, run, scene } = await startBoard();

    // As a browser zoomed in has it: the canvas as many device pixels, each
    // CSS pixel two of them, which leaves the unit 10 and a fraction.
    run.game.scale.setZoom(1 / 2);
    run.advance(16);

    const knob = deckFrames(2).find((frame) => frame.name === DECK_FRAMES.knob);
    expect([
      shell.bakes.length,
      scene.textures.getFrame(DECK_ATLAS, DECK_FRAMES.knob).width,
    ]).toEqual([2, knob?.width]);
  });

  it("bakes nothing again as the screen turns and the field takes its new shape, its unit the same", async () => {
    const { shell, run } = await startBoard(reshaping);
    const bakes = shell.bakes.length;

    run.game.scale.resize(CANVAS.height, CANVAS.width);
    run.advance(16);

    expect(shell.bakes).toHaveLength(bakes);
  });

  it("encodes none of How to play's pictures as it bakes the atlas", async () => {
    const encode = vi.spyOn(Textures.TextureManager.prototype, "getBase64");
    const { shell, run } = await startBoard();
    shell.colors = DARK;

    run.advance(16);

    expect(encode).not.toHaveBeenCalled();
  });

  it("encodes How to play's pictures of the atlas as the shell asks for them", async () => {
    const { shell, scene } = await startBoard();

    const pictures = shell.askPictures();

    expect(pictures).toEqual(
      mapPictures(PICTURE_FRAMES, (frame) =>
        scene.textures.getBase64(ATLAS, frame),
      ),
    );
  });

  it("keeps How to play's pictures until it bakes the atlas again", async () => {
    const { shell, run } = await startBoard();
    const asked = shell.askPictures();
    run.advance(16);

    const again = shell.askPictures();

    expect(again).toBe(asked);
  });

  it("encodes How to play's pictures anew once it has baked the atlas again", async () => {
    const { shell, run } = await startBoard();
    const asked = shell.askPictures();
    run.game.scale.resize(WIDER.width, WIDER.height);
    run.advance(16);

    const again = shell.askPictures();

    expect(again).not.toEqual(asked);
  });

  it("bakes the atlas again in a new palette, and fills the field with it", async () => {
    const { shell, run, scene } = await startBoard();
    shell.colors = DARK;

    run.advance(16);

    expect([
      shell.bakes.length,
      scene.cameras.main.backgroundColor.color,
    ]).toEqual([2, DARK.field]);
  });

  it("bakes the atlas again at a new unit", async () => {
    const { shell, run, scene } = await startBoard();

    run.game.scale.resize(WIDER.width, WIDER.height);
    run.advance(16);

    const art = atlasFrames(
      ART_PALETTE,
      bakedScale(metricsOf(shell, WIDER)),
    ).find((frame) => frame.name === FRAMES.comet);
    expect(scene.textures.getFrame(ATLAS, FRAMES.comet).width).toBe(art?.width);
  });

  it("has every image take up its frame anew at a new unit", async () => {
    const { shell, run, scene } = await startBoard();
    placeRock(shell.field, "large", 30, 20);
    run.advance(16);

    run.game.scale.resize(WIDER.width, WIDER.height);
    run.advance(16);

    const stale = imagesIn(scene)
      .filter(
        (image) =>
          image.width !== image.frame.width ||
          image.displayOriginX !== image.originX * image.frame.width,
      )
      .map((image) => image.frame.name);
    expect(stale).toEqual([]);
  });

  it("lays the field out again on a canvas of a new size, and tells the shell", async () => {
    const { shell, run, scene } = await startBoard();

    run.game.scale.resize(WIDER.width, WIDER.height);
    run.advance(16);

    const metrics = metricsOf(shell, WIDER);
    const { main } = scene.cameras;
    const deck = scene.kit.deckCamera;
    expect({
      field: [main.x, main.y, main.width, main.height],
      deck: [deck.width, deck.height],
      told: shell.layouts.at(-1),
    }).toEqual({
      field: [metrics.x, metrics.y, metrics.width, metrics.height],
      deck: [WIDER.width, WIDER.height],
      told: {
        viewport: viewport(WIDER.width, WIDER.height),
        torus: shell.field.torus,
        metrics,
        deck: null,
      },
    });
  });

  it("lays the field out again for a new board, and tells the shell", async () => {
    const { shell, run, scene } = await startBoard();
    shell.setting = { ...BOARD, marginCss: 24 };

    run.advance(16);

    const metrics = metricsOf(shell);
    expect([
      shell.layouts.length,
      shell.layouts.at(-1)?.metrics,
      scene.cameras.main.x,
    ]).toEqual([2, metrics, metrics.x]);
  });
});

describe("a new field", () => {
  it("makes no game object in a frame of play", async () => {
    const { run, scene } = await startBoard();
    const before = objectsIn(scene);

    run.advance(500);

    expect(objectsIn(scene)).toBe(before);
  });

  it("makes the images a field of more rock slots needs as it is shown", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field = fieldFrom(KEEPER, { cap: 60 });

    run.advance(16);

    expect(scene.kit.rocks.bodies).toHaveLength(60);
  });

  it.each([
    ["narrower", { width: 60, height: PICTURE_TORUS.height }],
    ["taller", { width: PICTURE_TORUS.width, height: 48 }],
  ])("lays a field of a new size out anew: %s", async (_, torus) => {
    const { shell, run } = await startBoard();
    shell.field = fieldFrom(KEEPER, { torus });

    run.advance(16);

    const told = shell.layouts.at(-1);
    expect({ torus: told?.torus, metrics: told?.metrics }).toEqual({
      torus,
      metrics: metricsOf(shell),
    });
  });

  it("keeps the layout for a field of the last's size", async () => {
    const { shell, run } = await startBoard();
    shell.field = fieldFrom(KEEPER, { torus: { ...PICTURE_TORUS } });

    run.advance(16);

    expect(shell.layouts).toHaveLength(1);
  });

  it("draws a rock of the new field's in the place of the last's", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field = fieldFrom([".........L"]);

    run.advance(16);

    const drawn = scene.kit.rocks.bodies.filter(
      (body) => body.images[0]?.visible,
    );
    expect(drawn.map((body) => shown(body)[0])).toEqual([
      onCanvas(metricsOf(shell), 38, 2),
    ]);
  });
});

describe("the sounds", () => {
  /**
   * Returns each sound the scenes play from now on, with how far it rose,
   * as they play it. The sprite can't load headless, so playing leaves
   * nothing else to look at.
   */
  function soundsPlayed(): [string, number][] {
    const played: [string, number][] = [];
    vi.spyOn(SpritePlayer.prototype, "play").mockImplementation(
      (name: string, config) => {
        played.push([name, config?.detune ?? 0]);
      },
    );
    return played;
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("are the view's, in the sprite's order", () => {
    expect(Object.keys(spritemap.spritemap)).toEqual(SOUNDS);
  });

  it("loop the thrust's hum alone", () => {
    expect(
      Object.entries(spritemap.spritemap)
        .filter(([, sound]) => sound.loop)
        .map(([name]) => name),
    ).toEqual(["thrust"]);
  });

  it("can be heard while the player wants them", async () => {
    const { scene } = await startBoard();

    expect(scene.sound.mute).toBe(false);
  });

  it("are muted while the player wants none", async () => {
    const { shell, run, scene } = await startBoard();

    shell.wantsSound = false;
    run.advance(16);

    expect(scene.sound.mute).toBe(true);
  });

  it("play a broken rock's by its size, risen along its chain", async () => {
    const { shell, run } = await startBoard();
    const rock = placeRock(shell.field, "small", 30, 20);
    run.advance(16);
    const played = soundsPlayed();
    shell.field.chain = 4;
    shell.field.lastBreakAt = shell.field.steps;

    hitRock(shell.field, rock, 0, 0);
    run.advance(16);

    expect(played).toEqual([["small", 400]]);
  });

  it("play two breaks of a frame as one, at the higher", async () => {
    const { shell, run } = await startBoard();
    const first = placeRock(shell.field, "small", 30, 20);
    const second = placeRock(shell.field, "small", 10, 20);
    run.advance(16);
    const played = soundsPlayed();

    hitRock(shell.field, first, 0, 0);
    hitRock(shell.field, second, 0, 0);
    run.advance(16);

    expect(played).toEqual([["small", 100]]);
  });

  it("hum while the ship thrusts", async () => {
    const { shell, run, scene } = await startBoard();
    cacheSounds(scene);

    shell.thrusts = true;
    run.advance(16);

    expect(humsIn(scene)).toBe(1);
  });

  it("stop humming once the ship doesn't thrust", async () => {
    const { shell, run, scene } = await startBoard();
    cacheSounds(scene);
    shell.thrusts = true;
    run.advance(16);

    shell.thrusts = false;
    run.advance(16);

    expect(humsIn(scene)).toBe(0);
  });

  it("leave the field playing where they can't be loaded", async () => {
    const { shell, run, scene } = await startBoard();
    const rock = placeRock(shell.field, "small", 30, 20);
    run.advance(16);

    hitRock(shell.field, rock, 0, 0);
    run.advance(16);

    expect(scene.kit.sounds.loaded).toBe(false);
    expect(shown(scene.kit.rocks.bodies[slotOf(shell.field, rock)])).toEqual([
      null,
      null,
      null,
      null,
    ]);
  });
});
