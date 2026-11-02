import { NO_INSETS } from "@fz/phaser/insets";
import type { CssRect, Viewport } from "@fz/phaser/layout";
import { type SceneRun, runScene } from "@fz/phaser/testing";
import { Core, GameObjects } from "phaser";
import { TURN } from "../rules/angles";
import type { Field } from "../rules/field";
import { type Rock, hitRock } from "../rules/rocks";
import type { Ship, Steer } from "../rules/ship";
import { across } from "../rules/torus";
import { ART_PALETTE } from "../testing/art_frames";
import { viewport } from "../testing/canvases";
import {
  KEEPER,
  PICTURE_TORUS,
  fieldFrom,
  placeRock,
  shipOf,
} from "../testing/field_picture";
import { FRAMES, type Pictures, atlasFrames } from "../view/art";
import type { FieldCommand } from "../view/controls";
import {
  type BoardSetting,
  type FieldMetrics,
  fieldMetrics,
} from "../view/field_metrics";
import type { FieldFrame } from "../view/frame";
import { LAYERS } from "../view/layers";
import { type BeltPalette, beltPalette } from "../view/palette";
import { LOOK, PILOT_SIZES, pilotFrame } from "../view/pilot_art";
import { rockFrame, takenFrame } from "../view/rock_art";
import { MOST_BAKED_UNIT, bakedScale } from "../view/shapes";
import { FLAME_BEHIND, WINDOW, flameShare } from "../view/ship_art";
import { speckCount, speckShares } from "../view/specks";
import { MOST_FINGERS } from "../view/steering";
import { ATLAS } from "./atlas";
import {
  type BeltScene,
  type BeltSceneOptions,
  makeBeltScene,
} from "./belt_scene";
import type { Copies } from "./copies";
import { GUARD_ALPHA } from "./ship_painter";

/** A dark palette, for a scene to change to. */
const DARK = beltPalette(
  {
    field: "#14181c",
    fieldLine: "#3a434c",
    fieldText: "#eceff1",
    fieldMuted: "#9aa5b1",
    accent: "#4fbf7f",
    onAccent: "#0b1a12",
    danger: "#f47c74",
    warning: "#f39a4b",
  },
  "dark",
);

/** How the board lays the field out unless a spec says otherwise: no deck, a compact margin. */
const BOARD: BoardSetting = {
  marginCss: 12,
  deck: false,
  stickOnRight: false,
  fireByItself: false,
};

/** The canvas the scenes run on, in its pixels. */
const CANVAS = { width: 800, height: 500 } as const;

/** A larger canvas, for the field to be laid out on again at a larger unit. */
const WIDER = { width: 1000, height: 600 } as const;

/** What the scene handed the shell on a frame. */
interface Tick {
  readonly deltaMs: number;
  readonly steer: Steer;
}

/** What the scene told the shell as it laid the field out: the canvas, and where the field lies on it. */
interface Layout {
  readonly canvas: Viewport;
  readonly field: CssRect;
}

/** Plays the shell's part, keeping what the scene tells it. */
class FakeShell implements BeltSceneOptions {
  /** The field shown, which a spec may change as the rules would. */
  field: Field = fieldFrom(KEEPER);
  alpha = 0;
  seed = 7;
  colors: BeltPalette = ART_PALETTE;
  welcomesMotion = true;
  setting: BoardSetting = BOARD;
  readonly ticks: Tick[] = [];
  readonly layouts: Layout[] = [];
  readonly commands: FieldCommand[] = [];
  readonly pictures: Pictures[] = [];

  readonly tick = (deltaMs: number, steer: Readonly<Steer>): void => {
    this.ticks.push({ deltaMs, steer: { ...steer } });
  };
  readonly frame = (): FieldFrame => ({
    field: this.field,
    alpha: this.alpha,
    events: this.field.events,
    seed: this.seed,
  });
  readonly palette = (): BeltPalette => this.colors;
  readonly motion = (): boolean => this.welcomesMotion;
  readonly board = (): BoardSetting => this.setting;
  readonly onLayout = (canvas: Viewport, field: CssRect): void => {
    this.layouts.push({ canvas, field });
  };
  readonly command = (command: FieldCommand): void => {
    this.commands.push(command);
  };
  readonly onPictures = (pictures: Pictures): void => {
    this.pictures.push(pictures);
  };

  /** Returns the steering handed over on the last frame. */
  lastSteer(): Steer {
    const tick = this.ticks.at(-1);
    if (!tick) throw new Error("No frame yet.");
    return tick.steer;
  }
}

/** Sets a shell up for a player who prefers less motion. */
function stillness(shell: FakeShell): void {
  shell.welcomesMotion = false;
}

interface Board {
  readonly shell: FakeShell;
  readonly run: SceneRun<BeltScene>;
  readonly scene: BeltScene;
  /** The element the scene's keyboard listens on: the board. */
  readonly keys: HTMLElement;
}

let running: SceneRun<BeltScene> | null = null;
/** The element the running scene's keyboard listens on. */
let listening: HTMLElement | null = null;

afterEach(() => {
  running?.destroy();
  running = null;
  listening?.remove();
  listening = null;
});

/** Runs the scene for a shell on a canvas, its first frame drawn. */
async function startBoard(
  setUp: (shell: FakeShell) => void = () => undefined,
  canvas: { readonly width: number; readonly height: number } = CANVAS,
): Promise<Board> {
  const shell = new FakeShell();
  setUp(shell);
  const keys = document.createElement("div");
  keys.tabIndex = 0;
  document.body.append(keys);
  listening = keys;
  const run = await runScene(makeBeltScene(shell), {
    ...canvas,
    config: { input: { keyboard: { target: keys } } },
  });
  running = run;
  run.advance(16);
  return { shell, run, scene: run.scene, keys };
}

/** Returns where the field lies on the spec's canvas, as the scene lays it out. */
function metricsOf(
  shell: FakeShell,
  canvas: { readonly width: number; readonly height: number } = CANVAS,
): FieldMetrics {
  return fieldMetrics(
    viewport(canvas.width, canvas.height),
    shell.setting,
    shell.field.torus,
  );
}

/** Returns where a place on the field lies on the canvas. */
function onCanvas(
  metrics: FieldMetrics,
  x: number,
  y: number,
): { readonly x: number; readonly y: number } {
  return { x: metrics.x + x * metrics.unit, y: metrics.y + y * metrics.unit };
}

/** Returns what a spec reads of the copies of a thing: where each shows, or null where it doesn't. */
function shown(
  copies: Copies | undefined,
): readonly ({ readonly x: number; readonly y: number } | null)[] {
  return (copies?.images ?? []).map((image) =>
    image.visible ? { x: image.x, y: image.y } : null,
  );
}

/** Returns a rock's slot, which its painter's images are drawn for. */
function slotOf(field: Field, rock: Rock): number {
  return field.rocks.indexOf(rock);
}

/** Returns the field's layers, by name, as the scene made them, back to front. */
function layersOf(scene: BeltScene): ReadonlyMap<string, GameObjects.Layer> {
  const layers = scene.children
    .getChildren()
    .filter(
      (object): object is GameObjects.Layer =>
        object instanceof GameObjects.Layer,
    );
  return new Map(layers.map((layer, i) => [LAYERS[i] ?? "", layer]));
}

/** Returns how many game objects a scene holds, those in its layers too. */
function objectsIn(scene: BeltScene): number {
  return scene.children
    .getChildren()
    .reduce(
      (sum, object) =>
        sum +
        1 +
        (object instanceof GameObjects.Layer ? object.getChildren().length : 0),
      0,
    );
}

/** Returns every image the scene draws, in its layers. */
function imagesIn(scene: BeltScene): readonly GameObjects.Image[] {
  return [...layersOf(scene).values()].flatMap((layer) =>
    layer
      .getChildren()
      .filter(
        (object): object is GameObjects.Image =>
          object instanceof GameObjects.Image,
      ),
  );
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

    const camera = scene.deckCamera;

    expect([camera.x, camera.y, camera.width, camera.height]).toEqual([
      0,
      0,
      CANVAS.width,
      CANVAS.height,
    ]);
  });

  it("keep the frame and the deck from the field's camera, and the field from the deck's", async () => {
    const { scene } = await startBoard();
    const field = scene.cameras.main.id;
    const deck = scene.deckCamera.id;

    const seen = [...layersOf(scene)].map(([name, layer]) => [
      name,
      (layer.cameraFilter & field) === 0 ? "field" : "deck",
      (layer.cameraFilter & deck) === 0,
    ]);

    expect(seen).toEqual(
      LAYERS.map((name) =>
        name === "frame" || name === "deck"
          ? [name, "deck", true]
          : [name, "field", false],
      ),
    );
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

    const body = scene.rocks.bodies[slotOf(shell.field, rock)];
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

    expect(shown(scene.rocks.bodies[slotOf(shell.field, rock)])[0]).toEqual(
      onCanvas(metricsOf(shell), 29, 20),
    );
  });

  it("draw a rock reaching past an edge on both sides of it", async () => {
    const { shell, run, scene } = await startBoard();
    const rock = placeRock(shell.field, "large", 1, 20);
    const { width } = shell.field.torus;

    run.advance(16);

    const metrics = metricsOf(shell);
    expect(shown(scene.rocks.bodies[slotOf(shell.field, rock)])).toEqual([
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
    expect(shown(scene.rocks.bodies[slotOf(shell.field, rock)])).toEqual([
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
    expect(shown(scene.rocks.bodies[slotOf(shell.field, rock)])).toEqual([
      onCanvas(metrics, width - 1, 1),
      onCanvas(metrics, -1, 1),
      onCanvas(metrics, width - 1, 1 + height),
      onCanvas(metrics, -1, 1 + height),
    ]);
  });

  it("draw nothing for a slot that holds no rock", async () => {
    const { scene } = await startBoard();

    const drawn = scene.rocks.bodies.filter((body) =>
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

    expect(shown(scene.rocks.bodies[slotOf(shell.field, rock)])).toEqual([
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

    const taken = scene.rocks.taken[slotOf(shell.field, rock)];
    expect([shown(taken)[0], taken?.images[0]?.frame.name]).toEqual([
      onCanvas(metricsOf(shell), 30, 20),
      takenFrame(rock),
    ]);
  });

  it("show no hits over a rock that has taken none", async () => {
    const { shell, run, scene } = await startBoard();
    const rock = placeRock(shell.field, "large", 30, 20, "iron");

    run.advance(16);

    expect(shown(scene.rocks.taken[slotOf(shell.field, rock)])).toEqual([
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
      scene.rocks.bodies[slot]?.images[0]?.visible,
      shown(scene.rocks.taken[slot]),
    ]).toEqual([true, [null, null, null, null]]);
  });

  it("draw the field's art at its unit, scaled up from the atlas baked at most at its largest", async () => {
    const big = { width: 3200, height: 1900 };
    const { shell, scene } = await startBoard(undefined, big);
    const metrics = metricsOf(shell, big);

    const keeper = scene.rocks.bodies.find((body) => body.images[0]?.visible);

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

    const shot = scene.shots.shots[0];
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

    expect(shown(scene.shots.shots[0])).toEqual([null, null, null, null]);
  });
});

describe("the ship", () => {
  /** The field the ship's cases fly in: the keeper, and the ship in the middle. */
  const SHIP_PICTURE = [...KEEPER, "", "", "", ".........^"];

  /** Shows the ship's picture on a shell. */
  function withShip(shell: FakeShell): void {
    shell.field = fieldFrom(SHIP_PICTURE);
  }

  /** Returns whether the hull and the guard's ring showed, frame by frame over a second. */
  function overASecond(
    run: SceneRun<BeltScene>,
    scene: BeltScene,
  ): {
    readonly hull: ReadonlySet<boolean>;
    readonly ring: ReadonlySet<boolean>;
  } {
    const hull = new Set<boolean>();
    const ring = new Set<boolean>();
    for (let frame = 0; frame < 10; frame++) {
      run.advance(100, 100);
      hull.add(scene.ship.hull.images[0]?.visible ?? false);
      ring.add(scene.ship.guard.images[0]?.visible ?? false);
    }
    return { hull, ring };
  }

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
      scene.ship.hull.images[0]?.rotation ?? Number.NaN,
      ship.angle,
      TURN,
    );

    expect(shown(scene.ship.hull)[0]).toEqual(
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

    const image = scene.ship.pilot.images[0];
    expect([
      shown(scene.ship.pilot)[0],
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

    const [pilot, eyes] = [scene.ship.pilot, scene.ship.eyes].map(
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

    const { flame } = scene.ship;
    expect([shown(flame)[0], flame.images[0]?.scaleX]).toEqual([
      onCanvas(
        metricsOf(shell),
        ship.x - Math.cos(0.5) * FLAME_BEHIND,
        ship.y - Math.sin(0.5) * FLAME_BEHIND,
      ),
      flameShare(0.5),
    ]);
  });

  it("draws no flame while the ship doesn't thrust", async () => {
    const { scene } = await startBoard(withShip);

    expect(shown(scene.ship.flame)).toEqual([null, null, null, null]);
  });

  it("draws no flame for a waiting ship, however hard the thrust held as it came", async () => {
    const { shell, run, scene } = await startBoard(withShip);
    const ship = shipOf(shell.field);
    ship.waiting = true;
    ship.held.thrust = 1;

    run.advance(16);

    // The hull shows, so the flame isn't hidden by the ship's blink.
    expect([
      scene.ship.hull.images[0]?.visible,
      shown(scene.ship.flame),
    ]).toEqual([true, [null, null, null, null]]);
  });

  it("blinks a guarded ship within its faint ring", async () => {
    const { shell, run, scene } = await startBoard(withShip);
    shipOf(shell.field).guardSteps = 1000;

    const seen = overASecond(run, scene);

    expect(seen).toEqual({
      hull: new Set([true, false]),
      ring: new Set([true]),
    });
    expect(scene.ship.guard.images[0]?.alpha).toBe(GUARD_ALPHA);
  });

  it("blinks a waiting ship within the same ring, as nothing can touch it either", async () => {
    const { shell, run, scene } = await startBoard(withShip);
    shipOf(shell.field).waiting = true;

    const seen = overASecond(run, scene);

    expect(seen).toEqual({
      hull: new Set([true, false]),
      ring: new Set([true]),
    });
  });

  it("rings a ship the Shield guards", async () => {
    const { shell, run, scene } = await startBoard(withShip);
    shell.field.shielded = true;

    run.advance(16);

    expect(shown(scene.ship.shield)[0]).toEqual(
      onCanvas(metricsOf(shell), shipOf(shell.field).x, shipOf(shell.field).y),
    );
  });

  it("draws nothing of a ship between one and the next", async () => {
    const { shell, run, scene } = await startBoard(withShip);
    shell.field.ship = null;

    run.advance(16);

    expect(
      [scene.ship.hull, scene.ship.pilot, scene.ship.eyes].flatMap(shown),
    ).toEqual(Array(12).fill(null));
  });
});

describe("the specks", () => {
  it("strew as many as the field holds, where the run's seed lays them", async () => {
    const { shell, scene } = await startBoard();
    const metrics = metricsOf(shell);
    const [first] = speckShares(shell.seed);

    const visible = scene.field.specks.filter((speck) => speck.visible);

    expect(visible).toHaveLength(speckCount(shell.field.torus));
    expect([visible[0]?.x, visible[0]?.y]).toEqual([
      metrics.x + (first?.x ?? 0) * metrics.width,
      metrics.y + (first?.y ?? 0) * metrics.height,
    ]);
  });

  it("strew them anew for another run", async () => {
    const { shell, run, scene } = await startBoard();
    const before = scene.field.specks[0]?.x;
    shell.seed = 8;

    run.advance(16);

    expect(scene.field.specks[0]?.x).not.toBe(before);
  });

  it("tint each in the specks' color", async () => {
    const { scene } = await startBoard();

    expect(scene.field.specks[0]?.tintTopLeft).toBe(ART_PALETTE.speck);
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
  it("hands How to play its pictures as the atlas is baked", async () => {
    const { shell } = await startBoard();

    expect(shell.pictures).toHaveLength(1);
  });

  it("bakes the atlas again in a new palette, and fills the field with it", async () => {
    const { shell, run, scene } = await startBoard();
    shell.colors = DARK;

    run.advance(16);

    expect([
      shell.pictures.length,
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
    const deck = scene.deckCamera;
    expect({
      field: [main.x, main.y, main.width, main.height],
      deck: [deck.width, deck.height],
      told: shell.layouts.at(-1),
    }).toEqual({
      field: [metrics.x, metrics.y, metrics.width, metrics.height],
      deck: [WIDER.width, WIDER.height],
      told: {
        canvas: viewport(WIDER.width, WIDER.height),
        field: metrics.css,
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
      shell.layouts.at(-1)?.field,
      scene.cameras.main.x,
    ]).toEqual([2, metrics.css, metrics.x]);
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

    expect(scene.rocks.bodies).toHaveLength(60);
  });

  it.each([
    ["narrower", { width: 60, height: PICTURE_TORUS.height }],
    ["taller", { width: PICTURE_TORUS.width, height: 48 }],
  ])("lays a field of a new size out anew: %s", async (_, torus) => {
    const { shell, run } = await startBoard();
    shell.field = fieldFrom(KEEPER, { torus });

    run.advance(16);

    expect(shell.layouts.at(-1)?.field).toEqual(metricsOf(shell).css);
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

    const drawn = scene.rocks.bodies.filter((body) => body.images[0]?.visible);
    expect(drawn.map((body) => shown(body)[0])).toEqual([
      onCanvas(metricsOf(shell), 38, 2),
    ]);
  });
});
