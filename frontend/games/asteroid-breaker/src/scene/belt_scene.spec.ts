import { NO_INSETS } from "@fz/phaser/insets";
import {
  type PaintCommand,
  type WashCommand,
  lineWidth,
} from "@fz/phaser/shapes";
import { SpritePlayer } from "@fz/phaser/sound";
import {
  type SceneRun,
  cacheSounds,
  imagesIn,
  objectsIn,
  strokesOf,
  watchUploads,
} from "@fz/phaser/testing";
import { viewport } from "@fz/phaser/testing/pure";
import { Core, GameObjects, Textures } from "phaser";
import { TURN } from "../rules/angles";
import type { EffectKind, PickupId } from "../rules/catalog/pickups";
import type { Field } from "../rules/field/field";
import { COMET_RECORDS } from "../rules/hazards/comets";
import { hitRock } from "../rules/rocks/rocks";
import { atControls } from "../rules/ship/pilots";
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
  humsIn,
  isShown,
  layersOf,
  metricsOf,
  onCanvas,
  overASecond,
  reshaping,
  shown,
  shownAt,
  slotOf,
  startBoard,
  stillness,
  withShip,
  zoomOf,
} from "../testing/belt_board";
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
  pickupFrame,
  tagFrame,
} from "../view/art/art";
import { LOOK, PILOT_SIZES, pilotFrame } from "../view/art/pilot_art";
import {
  isFine,
  rockFrame,
  rockFrames,
  rockPictures,
} from "../view/art/rock_art";
import { MOST_BAKED_UNIT, bakedScale } from "../view/art/shapes";
import { FLAME_BEHIND, WINDOW, flameShare } from "../view/art/ship_art";
import { SOUNDS } from "../view/effects/sounds";
import {
  BREATH,
  GOLDEN_ANGLE,
  PULSE_LEAST,
  breathScale,
} from "../view/effects/flourish";
import type { BeltPalette } from "../view/colors/palette";
import { farLight } from "../view/colors/rock_light";
import {
  type BoardSetting,
  type DeckLayout,
  type FieldMetrics,
  deckLayout,
} from "../view/field/field_metrics";
import { LAYERS, LAYER_CAMERAS } from "../view/field/layers";
import { TAG_RADIUS, tagX, tagY } from "../view/field/tags";
import { WARNING_INSET } from "../view/field/warning";
import { placeColors } from "../view/places/colors";
import type { Flicker } from "../view/places/marks";
import { NEAR_SLIDE, flickerAt } from "../view/places/motion";
import { BLEED_CSS_PX, type PlaceArt, placeArt } from "../view/places/paint";
import { backdropOf } from "../view/places/places";
import { type Deck, deckOf, rechargeRing } from "../view/steering/deck";
import { MOST_FINGERS } from "../view/steering/steering";
import { ATLAS, DECK_ATLAS, ROCK_ATLAS, ROCK_NORMALS } from "./atlas";
import { type BeltScene, SOUNDS_KEY, makeBeltScene } from "./belt_scene";
import { REST_ALPHA, REST_KNOB_ALPHA } from "./painters/deck_painter";
import { PLACE_TEXTURES, flashTexture } from "./painters/place_painter";
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

/** Describes how the scene lights the rocks: its ambient, and where its field's light stands and how strong it is. */
interface Lighting {
  readonly on: boolean;
  readonly ambient: readonly number[];
  readonly light: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
    readonly radius: number;
    readonly intensity: number;
  } | null;
}

/** Returns how a scene lights the rocks: by every light it has but a held hit's flash. */
function lightingOf(scene: BeltScene): Lighting {
  const { ambientColor, active, lights } = scene.lights;
  const [sun, ...others] = lights.filter(
    (light) => !scene.kit.rocks.flashes.includes(light),
  );
  return {
    on: active,
    ambient: [ambientColor.r, ambientColor.g, ambientColor.b],
    light:
      sun && others.length === 0
        ? {
            x: sun.x,
            y: sun.y,
            z: sun.z,
            radius: sun.radius,
            intensity: sun.intensity,
          }
        : null,
  };
}

/** Returns how a palette's light lights the rocks of a field laid out in its metrics. */
function lightingWanted(palette: BeltPalette, metrics: FieldMetrics): Lighting {
  const { ambient, intensity } = palette.rockLight;
  return {
    on: true,
    ambient: [ambient, ambient, ambient],
    light: { ...farLight(metrics, palette.rockLight), intensity },
  };
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

  it("draw a rock that has taken hits and held in its cracked frame", async () => {
    const { shell, run, scene } = await startBoard();
    const rock = placeRock(shell.field, "large", 30, 20, "iron");
    rock.hits -= 1;

    run.advance(16);

    const body = scene.kit.rocks.bodies[slotOf(shell.field, rock)];
    expect(body?.images[0]?.frame.name).toBe(rockFrame(rock));
  });

  it("draw a piece that takes the slot of the rock it broke from whole", async () => {
    const { shell, run, scene } = await startBoard();
    const rock = placeRock(shell.field, "large", 30, 20, "iron");
    const slot = slotOf(shell.field, rock);
    rock.hits -= 1;
    run.advance(16);
    hitRock(shell.field, rock, 0, 0, "smashes");

    run.advance(16);

    const piece = shell.field.rocks[slot];
    expect(scene.kit.rocks.bodies[slot]?.images[0]?.frame.name).toBe(
      piece && rockFrame(piece),
    );
  });

  it("draw every rock from the rocks' atlas, lit through its normal map", async () => {
    const { scene } = await startBoard();

    const images = scene.kit.rocks.bodies.flatMap(({ images }) => images);

    expect({
      textures: new Set(images.map((image) => image.texture.key)),
      lit: images.every((image) => image.lighting),
    }).toEqual({ textures: new Set([ROCK_ATLAS]), lit: true });
  });

  it("light the rocks with the palette's light, far off along its way, over its ambient", async () => {
    const { shell, scene } = await startBoard();

    expect(lightingOf(scene)).toEqual(
      lightingWanted(ART_PALETTE, metricsOf(shell)),
    );
  });

  it("light the rocks anew in a new palette", async () => {
    const { shell, run, scene } = await startBoard();
    shell.colors = DARK;

    run.advance(16);

    expect(lightingOf(scene)).toEqual(lightingWanted(DARK, metricsOf(shell)));
  });

  it("move the field's light with the field on a canvas of a new size", async () => {
    const { shell, run, scene } = await startBoard();

    run.game.scale.resize(WIDER.width, WIDER.height);
    run.advance(16);

    expect(lightingOf(scene)).toEqual(
      lightingWanted(ART_PALETTE, metricsOf(shell, WIDER)),
    );
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
    const pilot = atControls(shell.field.crew);

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
      pilotFrame(pilot, "seated"),
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
      anticlockwise: false,
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
        anticlockwise: false,
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

describe("the place", () => {
  /** Returns the place's art as the scene should paint it for a shell's frame, on a canvas. */
  function artFor(
    shell: FakeShell,
    canvas: { readonly width: number; readonly height: number } = CANVAS,
  ): PlaceArt {
    const { place, seed, constellation } = shell;
    const backdrop = backdropOf({
      place,
      torus: shell.field.torus,
      seed,
      constellation,
    });
    return placeArt(
      backdrop,
      placeColors(shell.colors),
      metricsOf(shell, canvas),
    );
  }

  /** Returns the flicker of the first flash the scene painted. */
  function firstFlicker(scene: BeltScene): Flicker {
    const flicker = scene.kit.place.art?.flashes[0]?.flicker;
    if (!flicker) throw new Error("The place has no flash.");
    return flicker;
  }

  /** Returns the image a place's flash shows in, by its place among the art's flashes. */
  function flashOf(
    scene: BeltScene,
    index: number,
  ): GameObjects.Image | undefined {
    return imagesIn(scene).find(
      (image) => image.texture.key === flashTexture(index),
    );
  }

  /** Returns the step of the field at which a flicker is a share of a second into its first. */
  function stepInto(flicker: Flicker, seconds: number): number {
    return stepsIn((flicker.after + seconds) * 1000);
  }

  /**
   * Returns where the nearer stars' nine copies lie at rest, row by row:
   * one on the field, and one a field's width or height or both from it
   * each way.
   */
  function copiesAtRest({
    x,
    y,
    width,
    height,
  }: FieldMetrics): readonly (readonly [number, number])[] {
    return [-1, 0, 1].flatMap((row) =>
      [-1, 0, 1].map(
        (column) => [x + column * width, y + row * height] as const,
      ),
    );
  }

  /** Returns where the nearer stars' copies lie. */
  function nearAt(scene: BeltScene): readonly (readonly [number, number])[] {
    return scene.kit.place.near.map(({ x, y }) => [x, y]);
  }

  /** Returns how far the nearer stars' copies reach together, on the canvas. */
  function nearReach(scene: BeltScene): {
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
  } {
    const { near } = scene.kit.place;
    return {
      left: Math.min(...near.map((copy) => copy.x)),
      top: Math.min(...near.map((copy) => copy.y)),
      right: Math.max(...near.map((copy) => copy.x + copy.frame.width)),
      bottom: Math.max(...near.map((copy) => copy.y + copy.frame.height)),
    };
  }

  /** Moves the ship on the field, drawn where it now is. */
  function flyShip(shell: FakeShell, x: number, y: number): void {
    const ship = shipOf(shell.field);
    Object.assign(ship, { x, y, lastX: x, lastY: y });
  }

  it("paints the wave's place as its art has it, for the field, the palette and the run", async () => {
    const { shell, scene } = await startBoard();

    expect(scene.kit.place.art).toEqual(artFor(shell));
  });

  it("lays what stays and what stands before the stars over the field and as far past each edge as its camera kicks and shakes", async () => {
    const { shell, scene } = await startBoard();
    const { x, y, width, height, pixelRatio } = metricsOf(shell);
    const bleed = Math.ceil(BLEED_CSS_PX * pixelRatio);

    const { back, front } = scene.kit.place;

    expect(
      [back, front].map((picture) => ({
        texture: picture.texture.key,
        at: [picture.x, picture.y],
        size: [picture.frame.width, picture.frame.height],
      })),
    ).toEqual(
      [PLACE_TEXTURES.back, PLACE_TEXTURES.front].map((texture) => ({
        texture,
        at: [x - bleed, y - bleed],
        size: [width + 2 * bleed, height + 2 * bleed],
      })),
    );
  });

  it("shows nothing apart before a place that doesn't flash", async () => {
    const { scene } = await startBoard();

    expect(scene.kit.place.over.visible).toBe(false);
  });

  it("lays nine copies of the nearer stars, each the field's size, three across and three down about the field, so they show whole as they slide", async () => {
    const { shell, scene } = await startBoard();
    const metrics = metricsOf(shell);

    const { near } = scene.kit.place;

    expect({
      at: nearAt(scene),
      textures: new Set(near.map((copy) => copy.texture.key)),
      sizes: new Set(near.map((copy) => copy.frame.width * copy.frame.height)),
    }).toEqual({
      at: copiesAtRest(metrics),
      textures: new Set([PLACE_TEXTURES.near]),
      sizes: new Set([metrics.width * metrics.height]),
    });
  });

  it.each([-10, 10, 100])(
    "covers the field and its bleed with the nearer stars, the pod flown %s units across and down",
    async (flown) => {
      const { shell, run, scene } = await startBoard(withShip);
      const { x, y } = shipOf(shell.field);
      flyShip(shell, x + flown, y + flown);

      run.advance(16);

      const metrics = metricsOf(shell);
      const bleed = Math.ceil(BLEED_CSS_PX * metrics.pixelRatio);
      const reach = nearReach(scene);
      expect([
        reach.left <= metrics.x - bleed,
        reach.top <= metrics.y - bleed,
        reach.right >= metrics.x + metrics.width + bleed,
        reach.bottom >= metrics.y + metrics.height + bleed,
      ]).toEqual([true, true, true, true]);
    },
  );

  it.each([
    [
      "another place, as a new sector's wave is in",
      (shell: FakeShell) => {
        shell.place = "iron-reach";
      },
    ],
    [
      "another palette",
      (shell: FakeShell) => {
        shell.colors = DARK;
      },
    ],
    [
      "another run",
      (shell: FakeShell) => {
        shell.seed = 8;
      },
    ],
    [
      "an Endless wave's constellation",
      (shell: FakeShell) => {
        shell.place = "endless";
        shell.constellation = { x: 0.4, y: 0.6 };
      },
    ],
    [
      "a field of another shape",
      (shell: FakeShell) => {
        shell.field = fieldFrom(KEEPER, { torus: { width: 60, height: 48 } });
      },
    ],
  ])("paints it again for %s", async (_, change) => {
    const { shell, run, scene } = await startBoard();
    change(shell);

    run.advance(16);

    expect(scene.kit.place.art).toEqual(artFor(shell));
  });

  it("paints it again at a new unit, the field laid out on a larger canvas", async () => {
    const { shell, run, scene } = await startBoard();

    run.game.scale.resize(WIDER.width, WIDER.height);
    run.advance(16);

    const { width, pixelRatio } = metricsOf(shell, WIDER);
    expect([scene.kit.place.art, scene.kit.place.back.frame.width]).toEqual([
      artFor(shell, WIDER),
      width + 2 * Math.ceil(BLEED_CSS_PX * pixelRatio),
    ]);
  });

  it("paints it again for the next Endless wave's constellation", async () => {
    const { shell, run, scene } = await startBoard((setUp) => {
      setUp.place = "endless";
      setUp.constellation = { x: 0.4, y: 0.6 };
    });
    shell.constellation = { x: 0.6, y: 0.3 };

    run.advance(16);

    expect(scene.kit.place.art).toEqual(artFor(shell));
  });

  it("lays it out again, painting nothing anew, as the field moves on the canvas at the same size", async () => {
    const { shell, run, scene } = await startBoard();
    const painted = scene.kit.place.art;
    const moved = { width: CANVAS.width, height: CANVAS.height + 40 };
    run.game.scale.resize(moved.width, moved.height);

    run.advance(16);

    const { x, y, pixelRatio } = metricsOf(shell, moved);
    const bleed = Math.ceil(BLEED_CSS_PX * pixelRatio);
    expect({
      same: scene.kit.place.art === painted,
      at: [scene.kit.place.back.x, scene.kit.place.back.y],
      moved: y !== metricsOf(shell).y,
    }).toEqual({ same: true, at: [x - bleed, y - bleed], moved: true });
  });

  it("paints nothing anew for a new wave in the same place", async () => {
    const { shell, run, scene } = await startBoard();
    const painted = scene.kit.place.art;
    shell.field = fieldFrom(KEEPER);

    run.advance(16);

    expect(scene.kit.place.art).toBe(painted);
  });

  it("slides the nearer stars against the pod's travel, by a small share of it", async () => {
    const { shell, run, scene } = await startBoard(withShip);
    const { x, y } = shipOf(shell.field);
    const { unit } = metricsOf(shell);
    flyShip(shell, x + 10, y);

    run.advance(16);

    // The middle copy, which the field shows most of.
    expect(scene.kit.place.near[4]?.x).toBeCloseTo(
      metricsOf(shell).x - 10 * NEAR_SLIDE * unit,
    );
  });

  it("holds the stars where they lie where motion isn't welcome", async () => {
    const { shell, run, scene } = await startBoard((setUp) => {
      withShip(setUp);
      stillness(setUp);
    });
    const { x, y } = shipOf(shell.field);
    flyShip(shell, x + 10, y + 5);

    run.advance(16);

    expect(nearAt(scene)).toEqual(copiesAtRest(metricsOf(shell)));
  });

  it("starts a new field's stars where they lie", async () => {
    const { shell, run, scene } = await startBoard(withShip);
    const { x, y } = shipOf(shell.field);
    flyShip(shell, x + 10, y + 5);
    run.advance(16);

    withShip(shell);
    flyShip(shell, x + 3, y);
    run.advance(16);

    expect(nearAt(scene)).toEqual(copiesAtRest(metricsOf(shell)));
  });

  describe("in the Storm", () => {
    /** Sets a shell up to play in the Storm. */
    function inTheStorm(shell: FakeShell): void {
      shell.place = "storm";
    }

    /** Describes what a picture is painted with: where each wash lies, and how many lines and filled shapes. */
    interface Painted {
      readonly washes: (readonly [number, number])[];
      strokes: number;
      fills: number;
    }

    /** Returns what a canvas paints for some commands: each wash it fills, and each line and shape. */
    function paintedBy(commands: readonly PaintCommand[]): Painted {
      const washes = commands.filter(
        (command): command is WashCommand =>
          command.kind === "wash" &&
          command.radiusX !== 0 &&
          command.radiusY !== 0,
      );
      const count = (...kinds: readonly PaintCommand["kind"][]): number =>
        commands.filter(({ kind }) => kinds.includes(kind)).length;
      return {
        washes: washes.map(({ x, y }) => [x, y] as const),
        strokes: count("line", "polyline", "ring"),
        fills: washes.length + count("rect", "roundRect", "circle", "polygon"),
      };
    }

    /** Records what each of some canvas textures is painted with from here on, until the test finishes. */
    function recordPaints(
      scene: BeltScene,
      keys: readonly string[],
    ): readonly Painted[] {
      return keys.map((key) => {
        const texture = scene.textures.get(key);
        if (!(texture instanceof Textures.CanvasTexture)) {
          throw new Error(`No canvas for "${key}".`);
        }
        const context = texture.getContext();
        const painted: Painted = { washes: [], strokes: 0, fills: 0 };
        context.translate = (x, y) => {
          painted.washes.push([x, y]);
        };
        context.stroke = () => {
          painted.strokes += 1;
        };
        context.fill = () => {
          painted.fills += 1;
        };
        context.fillRect = () => {
          painted.fills += 1;
        };
        // The canvas goes back to Phaser's pool, for the next texture made.
        onTestFinished(() => {
          for (const name of ["translate", "stroke", "fill", "fillRect"]) {
            Reflect.deleteProperty(context, name);
          }
        });
        return painted;
      });
    }

    it("paints each of its pictures and flashes with its own commands", async () => {
      const { shell, run, scene } = await startBoard(inTheStorm);
      const painted = recordPaints(scene, [
        PLACE_TEXTURES.back,
        PLACE_TEXTURES.near,
        PLACE_TEXTURES.front,
        flashTexture(0),
        flashTexture(1),
        PLACE_TEXTURES.over,
      ]);
      shell.colors = DARK;

      run.advance(16);

      const art = scene.kit.place.art;
      expect(painted).toEqual(
        [
          art?.back,
          art?.near,
          art?.front,
          art?.flashes[0]?.commands,
          art?.flashes[1]?.commands,
          art?.over,
        ].map((commands) => paintedBy(commands ?? [])),
      );
    });

    it("paints each fork's flash over the place, where its area lies on the field", async () => {
      const { shell, scene } = await startBoard(inTheStorm);
      const { x, y } = metricsOf(shell);
      const flashes = scene.kit.place.art?.flashes ?? [];

      const images = flashes.map((_, i) => flashOf(scene, i));

      expect(
        images.map((image) => ({
          at: [image?.x, image?.y],
          size: [image?.frame.width, image?.frame.height],
          layer: image?.displayList === layersOf(scene).get("place"),
        })),
      ).toEqual(
        flashes.map(({ area }) => ({
          at: [x + area.x, y + area.y],
          size: [area.width, area.height],
          layer: true,
        })),
      );
    });

    it("lies behind the field, its pictures back to front, its flashes over them and what stands before the flashes over those", async () => {
      const { scene } = await startBoard(inTheStorm);

      const { back, near, front, over } = scene.kit.place;

      expect(layersOf(scene).get("place")?.getChildren()).toEqual([
        back,
        ...near,
        front,
        flashOf(scene, 0),
        flashOf(scene, 1),
        over,
      ]);
    });

    it("shows what stands before its flashes over the field and as far past each edge as the back", async () => {
      const { shell, scene } = await startBoard(inTheStorm);
      const { x, y, width, height, pixelRatio } = metricsOf(shell);
      const bleed = Math.ceil(BLEED_CSS_PX * pixelRatio);

      const { over } = scene.kit.place;

      expect({
        visible: over.visible,
        texture: over.texture.key,
        at: [over.x, over.y],
        size: [over.frame.width, over.frame.height],
      }).toEqual({
        visible: true,
        texture: PLACE_TEXTURES.over,
        at: [x - bleed, y - bleed],
        size: [width + 2 * bleed, height + 2 * bleed],
      });
    });

    it("lays its flashes and what stands before them out again as the field moves on the canvas", async () => {
      const { shell, run, scene } = await startBoard(inTheStorm);
      const moved = { width: CANVAS.width, height: CANVAS.height + 40 };
      run.game.scale.resize(moved.width, moved.height);

      run.advance(16);

      const { x, y, pixelRatio } = metricsOf(shell, moved);
      const bleed = Math.ceil(BLEED_CSS_PX * pixelRatio);
      const area = scene.kit.place.art?.flashes[0]?.area;
      const flash = flashOf(scene, 0);
      const { over } = scene.kit.place;
      expect({
        flash: [flash?.x, flash?.y],
        over: [over.x, over.y],
        moved: y !== metricsOf(shell).y,
      }).toEqual({
        flash: [x + (area?.x ?? NaN), y + (area?.y ?? NaN)],
        over: [x - bleed, y - bleed],
        moved: true,
      });
    });

    it("paints a flash for each of its two forks", async () => {
      const { scene } = await startBoard(inTheStorm);

      expect(scene.kit.place.art?.flashes).toHaveLength(2);
    });

    it("shows no flash between flickers", async () => {
      const { scene } = await startBoard(inTheStorm);

      expect([flashOf(scene, 0)?.visible, flashOf(scene, 1)?.visible]).toEqual([
        false,
        false,
      ]);
    });

    it("shows a fork's flash as strongly as its flicker is at the field's step", async () => {
      const { shell, run, scene } = await startBoard(inTheStorm);
      const flicker = firstFlicker(scene);
      const steps = stepInto(flicker, 0.05);
      shell.field.steps = steps;

      run.advance(16);

      const flash = flashOf(scene, 0);
      expect([flash?.visible, flash?.alpha]).toEqual([
        true,
        flickerAt(flicker, steps),
      ]);
    });

    it("flickers nothing where motion isn't welcome", async () => {
      const { shell, run, scene } = await startBoard((setUp) => {
        inTheStorm(setUp);
        stillness(setUp);
      });
      const flicker = firstFlicker(scene);
      shell.field.steps = stepInto(flicker, 0.05);

      run.advance(16);

      expect(flashOf(scene, 0)?.visible).toBe(false);
    });

    it("hides its flashes as the next wave is in a place without them", async () => {
      const { shell, run, scene } = await startBoard(inTheStorm);
      shell.field.steps = stepInto(firstFlicker(scene), 0.05);
      run.advance(16);
      const shown = flashOf(scene, 0)?.visible;

      shell.place = "inner-belt";
      run.advance(16);

      expect([shown, flashOf(scene, 0)?.visible]).toEqual([true, false]);
    });

    it("hides what stands before its flashes as the next wave is in a place without them", async () => {
      const { shell, run, scene } = await startBoard(inTheStorm);

      shell.place = "inner-belt";
      run.advance(16);

      expect(scene.kit.place.over.visible).toBe(false);
    });
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

  it("lets go of every key held as the page hides", async () => {
    const { shell, run } = await startBoard();
    run.key("keydown", "ArrowUp");

    run.game.events.emit(Core.Events.HIDDEN);
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

  it.each([
    ["Ctrl", { ctrlKey: true }],
    ["Alt", { altKey: true }],
    ["Meta", { metaKey: true }],
  ] as const)(
    "leaves the browser its shortcuts with %s",
    async (_, modifiers) => {
      const { shell, run } = await startBoard();

      run.key("keydown", "KeyP", "p", modifiers);
      run.key("keydown", "ArrowUp", "ArrowUp", modifiers);
      run.advance(16);

      expect({
        commands: shell.commands,
        thrust: shell.lastSteer().thrust,
      }).toEqual({ commands: [], thrust: 0 });
    },
  );

  it("ignores a key the game doesn't use", async () => {
    const { shell, run } = await startBoard();

    run.key("keydown", "KeyQ", "q");
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

  /** A lodestone's frame, wider with its fine marks, as its field reaches past it. */
  const LODESTONE = rockFrame({ kind: "lodestone", size: "large", outline: 0 });

  /** Returns how wide a lodestone's frame is baked at 32 device pixels a unit, four to a CSS pixel, with its fine marks or without. */
  function lodestoneWidth(fine: boolean): number {
    const frame = rockFrames(
      ART_PALETTE,
      { unit: MOST_BAKED_UNIT, pixelRatio: 4 },
      fine,
    ).find(({ ink }) => ink.name === LODESTONE);
    return frame?.ink.width ?? 0;
  }

  /** A canvas four times the spec's each way. */
  const FOURFOLD = {
    width: CANVAS.width * 4,
    height: CANVAS.height * 4,
  } as const;

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

  it("encodes How to play's pictures of the atlas, and draws the rocks' lit, as the shell asks for them", async () => {
    const { shell, scene } = await startBoard();
    const baked = (frame: string): string =>
      scene.textures.getBase64(ATLAS, frame);
    const metrics = metricsOf(shell);

    const pictures = shell.askPictures();

    expect([
      pictures.rocks.iron,
      pictures.pickups.shield,
      pictures.stray,
      pictures.comet,
    ]).toEqual([
      rockPictures(ART_PALETTE, bakedScale(metrics), isFine(metrics)).iron,
      baked(PICTURE_FRAMES.pickups.shield),
      baked(PICTURE_FRAMES.stray),
      baked(PICTURE_FRAMES.comet),
    ]);
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

  it("draws How to play's rock pictures anew in a new palette", async () => {
    const { shell, run } = await startBoard();
    shell.colors = DARK;
    run.advance(16);
    const metrics = metricsOf(shell);

    const pictures = shell.askPictures();

    expect(pictures.rocks.iron).toBe(
      rockPictures(DARK, bakedScale(metrics), isFine(metrics)).iron,
    );
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

  it.each([
    ["as it is created", CANVAS],
    ["again at a new unit", WIDER],
  ] as const)(
    "bakes the rocks' normal map %s, its frames where the rocks' atlas has them, and has the atlas read it",
    async (_, canvas) => {
      const { shell, run, scene } = await startBoard();
      run.game.scale.resize(canvas.width, canvas.height);
      run.advance(16);
      const name = rockFrame({ kind: "iron", size: "large", outline: 2 });
      const placeOf = (key: string): readonly number[] => {
        const { cutX, cutY, cutWidth, cutHeight } = scene.textures.getFrame(
          key,
          name,
        );
        return [cutX, cutY, cutWidth, cutHeight];
      };

      const metrics = metricsOf(shell, canvas);
      const ink = rockFrames(
        ART_PALETTE,
        bakedScale(metrics),
        isFine(metrics),
      ).find((frame) => frame.ink.name === name)?.ink;

      expect({
        read: scene.textures.get(ROCK_ATLAS).getDataSourceImage(),
        place: placeOf(ROCK_NORMALS),
        width: placeOf(ROCK_ATLAS)[2],
      }).toEqual({
        read: scene.textures.get(ROCK_NORMALS).getSourceImage(),
        place: placeOf(ROCK_ATLAS),
        width: ink?.width,
      });
    },
  );

  it("uploads the rocks' normal map twice as it bakes it again at a new unit: its own, and as the rocks' atlas's", async () => {
    const { run, scene } = await startBoard();
    const normals = scene.textures.get(ROCK_NORMALS).getSourceImage();
    let uploads = 0;
    watchUploads(scene, (canvas) => {
      if (canvas === normals) uploads += 1;
    });

    run.game.scale.resize(WIDER.width, WIDER.height);
    run.advance(16);

    expect(uploads).toBe(2);
  });

  it("bakes a rock's fine marks by the field's own unit, past the most its atlas is baked at", async () => {
    // Four times the spec's canvas at four device pixels to a CSS pixel: a
    // unit of 10 CSS pixels and more, baked at 32 device pixels, 8 of them.
    const { run, scene } = await startBoard(undefined, FOURFOLD);
    run.game.scale.setZoom(1 / 4);
    run.advance(16);

    expect({
      baked: scene.textures.getFrame(ROCK_ATLAS, LODESTONE).cutWidth,
      widerFine: lodestoneWidth(true) > lodestoneWidth(false),
    }).toEqual({ baked: lodestoneWidth(true), widerFine: true });
  });

  it("bakes the rocks again without their fine marks as the field's unit falls under 10 CSS pixels, its atlas's unit the same", async () => {
    const { shell, run, scene } = await startBoard(undefined, FOURFOLD);
    run.game.scale.setZoom(1 / 4);
    run.advance(16);
    const bakes = shell.bakes.length;

    run.game.scale.resize(FOURFOLD.width * 0.9, FOURFOLD.height * 0.9);
    run.advance(16);

    expect({
      bakes: shell.bakes.length,
      baked: scene.textures.getFrame(ROCK_ATLAS, LODESTONE).cutWidth,
    }).toEqual({ bakes: bakes + 1, baked: lodestoneWidth(false) });
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
    cacheSounds(scene, SOUNDS_KEY);

    shell.thrusts = true;
    run.advance(16);

    expect(humsIn(scene)).toBe(1);
  });

  it("stop humming once the ship doesn't thrust", async () => {
    const { shell, run, scene } = await startBoard();
    cacheSounds(scene, SOUNDS_KEY);
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
