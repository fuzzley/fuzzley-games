import { advanceClock } from "@fz/core/clock";
import type { RunCommand } from "@fz/core/run";
import { type SceneRun, commandsOf, runKeyedScene } from "@fz/phaser/testing";
import { viewport } from "@fz/phaser/testing/pure";
import { GameObjects, type Scene } from "phaser";
import { type Field, reshapeField, stepField } from "../rules/field/field";
import type { Rock } from "../rules/rocks/rocks";
import type { Steer } from "../rules/ship/ship";
import { createFieldClock } from "../rules/stepper";
import type { Place } from "../rules/torus";
import {
  BeltScene,
  type BeltSceneOptions,
  makeBeltScene,
} from "../scene/belt_scene";
import type { Copies } from "../scene/painters/copies";
import type { Pictures } from "../view/art/art";
import { type PointsFont, letteringUnit } from "../view/art/points_art";
import { bakedScale } from "../view/art/shapes";
import { type BeltPalette, beltPalette } from "../view/colors/palette";
import { SOUND_NAMES, type SoundSwitches } from "../view/effects/sounds";
import {
  type BoardSetting,
  type FieldLayout,
  type FieldMetrics,
  MARGIN_CSS_PX,
  fieldMetrics,
  fieldShape,
} from "../view/field/field_metrics";
import type { FieldFrame } from "../view/field/frame";
import { LAYERS } from "../view/field/layers";
import { PLACE_IDS, type PlaceId } from "../view/places/places";
import { ART_PALETTE } from "./art_frames";
import { KEEPER, fieldFrom } from "./field_picture";

/** A dark palette, for a scene to change to. */
export const DARK = beltPalette(
  {
    page: "#0e1114",
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
  marginCss: MARGIN_CSS_PX.compact,
  deck: false,
  stickOnRight: false,
  fireByItself: false,
};

/** The canvas the scenes run on, in its pixels. */
export const CANVAS = { width: 800, height: 500 } as const;

/** A larger canvas, for the field to be laid out on again at a larger unit. */
export const WIDER = { width: 1000, height: 600 } as const;

/**
 * A place on the field away from its edges and the keeper, where a spec's
 * events happen.
 */
export const MIDDLE = { x: 30, y: 20 } as const;

/** What the scene handed the shell on a frame. */
interface Tick {
  readonly deltaMs: number;
  readonly steer: Steer;
}

/** The font family a fake shell hands the scene to write the points in. */
export const SHELL_FONT = "Spec Sans";

/** Plays the shell's part, keeping what the scene tells it. */
export class FakeShell implements BeltSceneOptions {
  /** The field shown, which a spec may change as the rules would. */
  field: Field = fieldFrom(KEEPER);
  alpha = 0;
  seed = 7;
  /** Where the constellation lies, as an Endless wave would lay it, or null for none. */
  constellation: Place | null = null;
  /** The place the wave is played in, as its sector names it. */
  place: PlaceId = PLACE_IDS[0];
  /** Whether the wave is its sector's last, as the game would say. */
  endsSector = false;
  colors: BeltPalette = ART_PALETTE;
  welcomesMotion = true;
  /** What of the sound the player wants, as the settings would switch it: all of it but mono. */
  switches: SoundSwitches = {
    sound: true,
    effects: true,
    voice: true,
    bed: true,
    mono: false,
  };
  /** Whether the ship thrusts while its wave plays on, as the game would say. */
  thrusts = false;
  /** Whether a lodestone is on the field while its wave plays on, as the game would say. */
  lodestoneOn = false;
  /** Static's multiplier, how many times what is scored scores, as the game would say. */
  times = 1;
  /** The place the wave after this one is played in. */
  nextPlace: PlaceId = PLACE_IDS[0];
  setting: BoardSetting = BOARD;
  /**
   * Whether each frame's time moves the field on, as the game does, steered
   * as the spec steers it on `field.steer`; else the field stands as the
   * spec leaves it.
   */
  stepsField = false;
  /**
   * Whether the field takes the shape of each room the scene lays it out in,
   * there and then, as the game reshapes a paused one.
   */
  reshapesField = false;
  readonly ticks: Tick[] = [];
  readonly layouts: FieldLayout[] = [];
  readonly commands: RunCommand[] = [];
  /**
   * What the scene handed over at each bake of the field's atlas to picture
   * How to play's art with, a bake each, the last bake's last.
   */
  readonly bakes: (() => Pictures)[] = [];
  /**
   * The font the points are written in, as the board reads the page's,
   * which a spec replaces as the page loads a face of it late.
   */
  typeface: PointsFont = { family: SHELL_FONT };

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
    constellation: this.constellation,
    place: this.place,
    endsSector: this.endsSector,
  });
  readonly palette = (): BeltPalette => this.colors;
  readonly motion = (): boolean => this.welcomesMotion;
  readonly sound = (): SoundSwitches => this.switches;
  readonly thrusting = (): boolean => this.thrusts;
  readonly lodestoneHums = (): boolean => this.lodestoneOn;
  readonly multiplier = (): number => this.times;
  readonly placeAfter = (): PlaceId => this.nextPlace;
  readonly board = (): BoardSetting => this.setting;
  readonly font = (): PointsFont => this.typeface;
  readonly onLayout = (layout: FieldLayout): void => {
    this.layouts.push(layout);
    if (!this.reshapesField) return;
    const torus = fieldShape(layout.viewport, this.setting, this.field.torus);
    reshapeField(this.field, torus);
  };
  readonly command = (command: RunCommand): void => {
    this.commands.push(command);
  };
  readonly onPictures = (pictures: () => Pictures): void => {
    this.bakes.push(pictures);
  };

  /**
   * Asks the scene for How to play's pictures of the atlas as last baked, as
   * the board does as How to play opens.
   */
  askPictures(): Pictures {
    const pictures = this.bakes.at(-1);
    if (!pictures) throw new Error("No bake yet.");
    return pictures();
  }

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

/**
 * Sets a shell up to shape its field to each room the scene lays it out in,
 * as the game does a paused one.
 */
export function reshaping(shell: FakeShell): void {
  shell.reshapesField = true;
}

/**
 * A scene running for a spec: the shell it plays to, the run that steps it, its
 * scene, and the element its keyboard listens on.
 */
export interface Board {
  readonly shell: FakeShell;
  readonly run: SceneRun<BeltScene>;
  readonly scene: BeltScene;
  /** The element the scene's keyboard listens on: the board. */
  readonly keys: HTMLElement;
}

/**
 * Runs the scene for a shell on a canvas, its first frame drawn, till the case
 * that runs it finishes.
 */
export async function startBoard(
  setUp: (shell: FakeShell) => void = () => undefined,
  canvas: { readonly width: number; readonly height: number } = CANVAS,
): Promise<Board> {
  const shell = new FakeShell();
  setUp(shell);
  const { run, keys } = await runKeyedScene(makeBeltScene(shell), canvas);
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

/**
 * Returns how much larger the field draws on the spec's canvas than its atlas
 * is baked, as the scene zooms it.
 */
export function zoomOf(
  shell: FakeShell,
  canvas: { readonly width: number; readonly height: number } = CANVAS,
): number {
  const metrics = metricsOf(shell, canvas);
  return metrics.unit / bakedScale(metrics).unit;
}

/**
 * Returns how much larger the points draw on the spec's canvas than they are
 * lettered, as the scene zooms them.
 */
export function pointsZoomOf(
  shell: FakeShell,
  canvas: { readonly width: number; readonly height: number } = CANVAS,
): number {
  const { unit } = metricsOf(shell, canvas);
  return unit / letteringUnit(unit);
}

/** Returns where a place on the field lies on the canvas. */
export function onCanvas(
  metrics: FieldMetrics,
  x: number,
  y: number,
): { readonly x: number; readonly y: number } {
  return { x: metrics.x + x * metrics.unit, y: metrics.y + y * metrics.unit };
}

/**
 * Returns how far the field's camera is scrolled from where it rests, in the
 * canvas's pixels.
 */
export function scrolledBy(
  scene: BeltScene,
  shell: FakeShell,
): { readonly x: number; readonly y: number } {
  const metrics = metricsOf(shell);
  const camera = scene.cameras.main;
  return { x: camera.scrollX - metrics.x, y: camera.scrollY - metrics.y };
}

/** Returns the tint of each shard alive. */
export function shardTints(scene: BeltScene): readonly number[] {
  const tints: number[] = [];
  scene.kit.debris.shards.forEachAlive((shard) => {
    tints.push(shard.tint);
  }, null);
  return tints;
}

/** Describes a triangle a `Graphics` fills: its corners, x and y of each in turn, in its fill's color and alpha. */
export interface FilledTriangle {
  readonly points: readonly number[];
  readonly color: number;
  readonly alpha: number;
}

/** Returns each triangle a `Graphics` fills, in order, each in the fill style set before it. */
export function trianglesOf(
  graphics: GameObjects.Graphics,
): readonly FilledTriangle[] {
  const triangles: FilledTriangle[] = [];
  let color = 0;
  let alpha = 1;
  for (const command of commandsOf(graphics)) {
    if (command.kind === "fillStyle") ({ color, alpha } = command);
    if (command.kind === "fillTriangle") {
      triangles.push({ points: command.points, color, alpha });
    }
  }
  return triangles;
}

/**
 * Describes a round a `Graphics` fills, a disc or a band: where its middle
 * is on the canvas, how far its nearest and its farthest corners lie from
 * it, and the fill style it was filled in.
 */
export interface FilledRound {
  readonly x: number;
  readonly y: number;
  readonly inner: number;
  readonly outer: number;
  readonly color: number;
  readonly alpha: number;
}

/**
 * Returns each round a `Graphics` fills, in order, as the triangles it fills
 * after each fill style it sets, its middle the middle of their box, as a
 * polygon of an even count of corners has it.
 */
export function roundsOf(
  graphics: GameObjects.Graphics,
): readonly FilledRound[] {
  const rounds: FilledRound[] = [];
  let color = 0;
  let alpha = 1;
  let points: number[] = [];
  const close = (): void => {
    if (points.length === 0) return;
    const xs = points.filter((_, i) => i % 2 === 0);
    const ys = points.filter((_, i) => i % 2 === 1);
    const x = (Math.min(...xs) + Math.max(...xs)) / 2;
    const y = (Math.min(...ys) + Math.max(...ys)) / 2;
    const far = xs.map((each, i) => Math.hypot(each - x, (ys[i] ?? y) - y));
    rounds.push({
      x,
      y,
      inner: Math.min(...far),
      outer: Math.max(...far),
      color,
      alpha,
    });
    points = [];
  };
  for (const command of commandsOf(graphics)) {
    if (command.kind === "fillStyle") {
      close();
      ({ color, alpha } = command);
    }
    if (command.kind === "fillTriangle") points.push(...command.points);
  }
  close();
  return rounds;
}

/**
 * Describes a ring a `Graphics` fills as a band: where its middle is on the
 * canvas, how far out the circle down its middle runs, each rounded to a
 * millionth of a pixel, and the fill style it was filled in.
 */
export interface Band {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly color: number;
  readonly alpha: number;
}

/** Returns each band a `Graphics` fills, in order, as {@link roundsOf} reads each round. */
export function bandsOf(graphics: GameObjects.Graphics): readonly Band[] {
  return roundsOf(graphics).map(({ x, y, inner, outer, color, alpha }) => ({
    x: toMillionths(x),
    y: toMillionths(y),
    radius: toMillionths((inner + outer) / 2),
    color,
    alpha,
  }));
}

/** Returns a number rounded to a millionth, as a spec compares places on the canvas. */
export function toMillionths(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

/** Describes a straight line a `Graphics` strokes, in the line style set before it. */
export interface StrokedLine {
  readonly fromX: number;
  readonly fromY: number;
  readonly toX: number;
  readonly toY: number;
  readonly width: number;
  readonly color: number;
  readonly alpha: number;
}

/** Returns each straight line a `Graphics` strokes, a path of one move and one line, in order. */
export function linesOf(
  graphics: GameObjects.Graphics,
): readonly StrokedLine[] {
  const lines: StrokedLine[] = [];
  let style = { width: 1, color: 0, alpha: 1 };
  let from: { readonly x: number; readonly y: number } | null = null;
  let to: { readonly x: number; readonly y: number } | null = null;
  for (const command of commandsOf(graphics)) {
    if (command.kind === "lineStyle") style = command;
    if (command.kind === "beginPath") from = to = null;
    if (command.kind === "moveTo") from = command;
    if (command.kind === "lineTo") to = command;
    if (command.kind === "strokePath" && from && to) {
      const { width, color, alpha } = style;
      lines.push({
        fromX: from.x,
        fromY: from.y,
        toX: to.x,
        toY: to.y,
        width,
        color,
        alpha,
      });
    }
  }
  return lines;
}

/**
 * Returns what a spec reads of the copies of a thing: where each shows, or null
 * where it doesn't.
 */
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

/**
 * Returns how many of the belt scene's sounds it holds, looping, not yet
 * let go: its hums, apart from the sounds made for its plays.
 *
 * @throws {Error} For a scene that isn't the belt.
 */
export function humsIn(scene: Scene): number {
  if (!(scene instanceof BeltScene)) throw new Error("Not the belt.");
  const { sounds } = scene.kit;
  return SOUND_NAMES.filter((name) => sounds.holds(name)).length;
}
