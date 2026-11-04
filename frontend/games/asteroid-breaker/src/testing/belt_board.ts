import { advanceClock } from "@fz/core/clock";
import type { CssRect, Viewport } from "@fz/phaser/layout";
import { type SceneRun, runScene } from "@fz/phaser/testing";
import { GameObjects, type Scene } from "phaser";
import { type Field, stepField } from "../rules/field";
import type { Rock } from "../rules/rocks";
import type { Steer } from "../rules/ship";
import { createFieldClock } from "../rules/stepper";
import {
  type BeltScene,
  type BeltSceneOptions,
  makeBeltScene,
} from "../scene/belt_scene";
import { SOUNDS_KEY } from "../scene/belt_scene";
import type { Copies } from "../scene/copies";
import type { Pictures } from "../view/art";
import type { FieldCommand } from "../view/controls";
import {
  type BoardSetting,
  type FieldMetrics,
  fieldMetrics,
} from "../view/field_metrics";
import type { FieldFrame } from "../view/frame";
import { LAYERS } from "../view/layers";
import { type BeltPalette, beltPalette } from "../view/palette";
import { ART_PALETTE } from "./art_frames";
import { viewport } from "./canvases";
import { KEEPER, fieldFrom } from "./field_picture";

/** A dark palette, for a scene to change to. */
export const DARK = beltPalette(
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
export const BOARD: BoardSetting = {
  marginCss: 12,
  deck: false,
  stickOnRight: false,
  fireByItself: false,
};

/** The canvas the scenes run on, in its pixels. */
export const CANVAS = { width: 800, height: 500 } as const;

/** A larger canvas, for the field to be laid out on again at a larger unit. */
export const WIDER = { width: 1000, height: 600 } as const;

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
export class FakeShell implements BeltSceneOptions {
  /** The field shown, which a spec may change as the rules would. */
  field: Field = fieldFrom(KEEPER);
  alpha = 0;
  seed = 7;
  colors: BeltPalette = ART_PALETTE;
  welcomesMotion = true;
  wantsSound = true;
  /** Whether the ship thrusts while its wave plays on, as the game would say. */
  thrusts = false;
  setting: BoardSetting = BOARD;
  /**
   * Whether each frame's time moves the field on, as the game does, steered
   * as the spec steers it on `field.steer`; else the field stands as the
   * spec leaves it.
   */
  stepsField = false;
  readonly ticks: Tick[] = [];
  readonly layouts: Layout[] = [];
  readonly commands: FieldCommand[] = [];
  readonly pictures: Pictures[] = [];

  /** The time the field's steps run by, while it is stepped. */
  private readonly clock = createFieldClock();

  readonly tick = (deltaMs: number, steer: Readonly<Steer>): void => {
    this.ticks.push({ deltaMs, steer: { ...steer } });
    if (!this.stepsField) return;
    const steps = advanceClock(this.clock, deltaMs);
    for (let i = 0; i < steps; i++) stepField(this.field);
  };
  readonly frame = (): FieldFrame => ({
    field: this.field,
    alpha: this.alpha,
    events: this.field.events,
    seed: this.seed,
  });
  readonly palette = (): BeltPalette => this.colors;
  readonly motion = (): boolean => this.welcomesMotion;
  readonly sound = (): boolean => this.wantsSound;
  readonly thrusting = (): boolean => this.thrusts;
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

/** A field with a ship in it: the keeper, and the ship in the middle. */
const SHIP_PICTURE = [...KEEPER, "", "", "", ".........^"];

/** Shows a field with a ship in it on a shell. */
export function withShip(shell: FakeShell): void {
  shell.field = fieldFrom(SHIP_PICTURE);
}

/** Sets a shell up for a player who prefers less motion. */
export function stillness(shell: FakeShell): void {
  shell.welcomesMotion = false;
}

/** Sets a shell up to move its field on by each frame's time, as the game does. */
export function stepping(shell: FakeShell): void {
  shell.stepsField = true;
}

/** A scene running for a spec: the shell it plays to, the run that steps it, its scene, and the element its keyboard listens on. */
export interface Board {
  readonly shell: FakeShell;
  readonly run: SceneRun<BeltScene>;
  readonly scene: BeltScene;
  /** The element the scene's keyboard listens on: the board. */
  readonly keys: HTMLElement;
}

/** Runs the scene for a shell on a canvas, its first frame drawn, till the case that runs it finishes. */
export async function startBoard(
  setUp: (shell: FakeShell) => void = () => undefined,
  canvas: { readonly width: number; readonly height: number } = CANVAS,
): Promise<Board> {
  const shell = new FakeShell();
  setUp(shell);
  const keys = document.createElement("div");
  keys.tabIndex = 0;
  document.body.append(keys);
  onTestFinished(() => {
    keys.remove();
  });
  const run = await runScene(makeBeltScene(shell), {
    ...canvas,
    config: { input: { keyboard: { target: keys } } },
  });
  onTestFinished(() => {
    run.destroy();
  });
  run.advance(16);
  return { shell, run, scene: run.scene, keys };
}

/** Returns where the field lies on the spec's canvas, as the scene lays it out. */
export function metricsOf(
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
export function onCanvas(
  metrics: FieldMetrics,
  x: number,
  y: number,
): { readonly x: number; readonly y: number } {
  return { x: metrics.x + x * metrics.unit, y: metrics.y + y * metrics.unit };
}

/** Returns what a spec reads of the copies of a thing: where each shows, or null where it doesn't. */
export function shown(
  copies: Copies | undefined,
): readonly ({ readonly x: number; readonly y: number } | null)[] {
  return (copies?.images ?? []).map((image) =>
    image.visible ? { x: image.x, y: image.y } : null,
  );
}

/** Returns whether a thing's copy where it is shows. */
export function isShown(copies: Copies | undefined): boolean {
  return copies?.images[0]?.visible ?? false;
}

/** Returns where an image shows, or null where it doesn't. */
export function shownAt(
  image: GameObjects.Image,
): { readonly x: number; readonly y: number } | null {
  return image.visible ? { x: image.x, y: image.y } : null;
}

/** The numbers of the `Graphics` commands the painters give, as its command buffer holds them, each followed by its arguments. */
const COMMANDS = { arc: 0, beginPath: 1, lineStyle: 6, strokePath: 9 } as const;

/** Describes an arc a `Graphics` stroked: about where, how far out, between which angles, and in what line. */
export interface Stroke {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly start: number;
  readonly end: number;
  readonly width: number;
  readonly color: number;
}

/**
 * Returns each arc a `Graphics` stroked, a circle among them, in order,
 * each in the line it was drawn in, read from its command buffer.
 *
 * @throws {Error} For a command the painters give none of, whose
 *   arguments it can't step over.
 */
export function strokesOf(graphics: GameObjects.Graphics): readonly Stroke[] {
  const buffer: readonly unknown[] = graphics.commandBuffer;
  const at = (i: number): number => Number(buffer[i]);
  const strokes: Stroke[] = [];
  let width = 0;
  let color = 0;
  let i = 0;
  while (i < buffer.length) {
    switch (buffer[i]) {
      case COMMANDS.lineStyle:
        width = at(i + 1);
        color = at(i + 2);
        // Its width, color and alpha.
        i += 4;
        break;
      case COMMANDS.arc:
        strokes.push({
          x: at(i + 1),
          y: at(i + 2),
          radius: at(i + 3),
          start: at(i + 4),
          end: at(i + 5),
          width,
          color,
        });
        // Its middle, radius and angles, which way round and its overshoot.
        i += 8;
        break;
      case COMMANDS.beginPath:
      case COMMANDS.strokePath:
        i += 1;
        break;
      default:
        throw new Error(`No painter gives command ${String(buffer[i])}.`);
    }
  }
  return strokes;
}

/**
 * Returns what a spec reads of the scene over a second, frame by frame, as
 * the set of what it read: ten frames of 100 ms, enough to see a blink or a
 * swing both ways.
 */
export function overASecond<T>(
  run: SceneRun<BeltScene>,
  read: () => T,
): ReadonlySet<T> {
  const seen = new Set<T>();
  for (let frame = 0; frame < 10; frame++) {
    run.advance(100, 100);
    seen.add(read());
  }
  return seen;
}

/** Returns a rock's slot, which its painter's images are drawn for. */
export function slotOf(field: Field, rock: Rock): number {
  return field.rocks.indexOf(rock);
}

/** Returns the field's layers, by name, as the scene made them, back to front. */
export function layersOf(
  scene: BeltScene,
): ReadonlyMap<string, GameObjects.Layer> {
  const layers = scene.children
    .getChildren()
    .filter(
      (object): object is GameObjects.Layer =>
        object instanceof GameObjects.Layer,
    );
  return new Map(layers.map((layer, i) => [LAYERS[i] ?? "", layer]));
}

/** Returns how many game objects a scene holds, those in its layers too. */
export function objectsIn(scene: BeltScene): number {
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
export function imagesIn(scene: BeltScene): readonly GameObjects.Image[] {
  return [...layersOf(scene).values()].flatMap((layer) =>
    layer
      .getChildren()
      .filter(
        (object): object is GameObjects.Image =>
          object instanceof GameObjects.Image,
      ),
  );
}

/**
 * Puts the sounds' sprite in a scene's audio cache, as a load that worked
 * would, so the scene can hold its hum. The headless game loads no audio.
 */
export function cacheSounds(scene: Scene): void {
  scene.cache.audio.add(SOUNDS_KEY, {});
}

/** Returns how many of the scene's sounds it holds, looping, not yet let go: its hums. */
export function humsIn(scene: Scene): number {
  return scene.sound.getAll(SOUNDS_KEY).filter((sound) => !sound.pendingRemove)
    .length;
}
