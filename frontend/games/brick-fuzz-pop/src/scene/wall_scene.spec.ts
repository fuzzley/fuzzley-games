import { EventLog, type EventLogView } from "@fz/core/event_log";
import { recordOf } from "@fz/core/records";
import type { Insets } from "@fz/phaser/insets";
import { FUZZBALL_LOOK } from "@fz/phaser/fuzzball";
import { type PixelRect, framePixels } from "@fz/phaser/layout";
import { outlineRoundRect } from "@fz/phaser/shapes";
import {
  type SceneRun,
  commandsOf,
  colorsOf,
  imagesIn,
  objectsIn,
  runKeyedScene,
  watchUploads,
} from "@fz/phaser/testing";
import { drawnIn, frameNamed, viewport } from "@fz/phaser/testing/pure";
import { Core, GameObjects, Textures } from "phaser";
import type { MockInstance } from "vitest";
import { BRICK_KIND_IDS, brickKind } from "../rules/catalog/bricks";
import type { FlightEvent } from "../rules/flight/events";
import { type Guide, guideOf } from "../rules/flight/guide";
import { FLOORWARD, cellAt } from "../rules/grid";
import type { Crew } from "../rules/round/round";
import type { Boon } from "../rules/shot";
import {
  AIMS_PER_DEGREE,
  COLUMNS,
  GUIDE_PAST_TURN,
  MOST_CHARGE,
  MOST_DEPTH,
  MOST_FUZZBALLS,
  RADIUS,
} from "../rules/tuning";
import { AIMS } from "../rules/aims";
import { type Brick, type Wall, thirdsOf } from "../rules/wall/wall";
import { ART_PALETTE, looksOf } from "../testing/art_frames";
import { marginInsets } from "../testing/canvases";
import {
  FLIGHT_FIXTURES,
  type FlightFixture,
} from "../testing/flight_fixtures";
import { wallFrom } from "../testing/wall_picture";
import { brickLayers } from "../view/art/art";
import { atlasFrames } from "../view/art/atlas_frames";
import { FRAMES, FRAME_NAMES } from "../view/art/frames";
import { fuzzballGrid } from "../view/art/fuzzball_art";
import { FLARE_FROM, RING_FROM, SWELL } from "../view/effects/flourish";
import {
  BOLT_MS,
  FLARE_MS,
  FLASH_MS,
  HOP_MS,
  RING_MS,
  SHAKE_MS,
  SHARDS,
  STREAK_MS,
  SWELL_MS,
} from "../view/effects/timing";
import { brickColor } from "../view/colors/brick_colors";
import { type WallPalette, wallPalette } from "../view/colors/palette";
import {
  type EventEffects,
  type Flourish,
  SOUNDS,
  type SoundName,
} from "../view/effects/effects";
import {
  FRAME_CSS_PX,
  type FieldMetrics,
  type FieldShape,
  type Place,
  bandPixels,
  fieldMetrics,
  fieldShape,
  lintelPixels,
  toCanvas,
} from "../view/field/field_metrics";
import type { Beat } from "../view/effects/effects";
import {
  type BallView,
  FLIGHT_PACE,
  type LoggedBeat,
  type LoggedEvent,
  RoundPlay,
  type RoundView,
} from "../view/round_play";
import { type PointerAiming, STRAIGHT_UP } from "../view/steering/aiming";
import type { FieldCommand } from "../view/steering/controls";
import { MOST_FINGERS, type Steer, aimToward } from "../view/steering/steering";
import { ATLAS, MOST_BAKED_UNIT, bakedScaleOf } from "./atlas";
import {
  FIELD_FRAMES,
  FLIGHT_FRAMES,
  fieldFrames,
  flightFrames,
} from "./field_art";
import {
  DANGER_LINE,
  FIELD_BAKE,
  JUMP_LINE,
  MOST_COUNTED,
} from "./painters/field_painter";
import {
  FLASH_ALPHA,
  MOST_SHARDS_FLYING,
  SHARD_FALL,
  SHARD_SPEED,
} from "./painters/effects_painter";
import { MOST_GUIDE_DOTS, MOST_PUNCHED } from "./painters/guide_painter";
import { MOST_LAYERS, MOST_SWELLING, WALL_BAKE } from "./painters/wall_painter";
import {
  PICTURE_FRAMES,
  PICTURE_LAYERS,
  type Pictures,
  pictureFrames,
} from "./pictures";
import spritemap from "./sounds/sounds.json";
import {
  type WallScene,
  type WallSceneOptions,
  makeWallScene,
} from "./wall_scene";

/** The light palette the specs draw in, the art's specs'. */
const LIGHT = ART_PALETTE;

/** A dark palette, its roles each a color no other role takes. */
const DARK = wallPalette(
  {
    field: "#1c2329",
    fieldLine: "#3a444d",
    fieldText: "#eceff1",
    fieldMuted: "#9aa5ae",
    page: "#11161a",
    accent: "#e0b13a",
    danger: "#f47c74",
    warning: "#f39a4b",
  },
  "dark",
);

/** The margin the board keeps around the field, a compact screen's, which the frame lies in. */
const INSETS = marginInsets(12);

/** The canvas the specs run on, in CSS pixels, unless one says otherwise. */
const CANVAS = { width: 400, height: 400 } as const;

/** A round whose plain shot wears a tough brick on a wall 11 deep, its lowest row in row 5. */
const PLAIN = FLIGHT_FIXTURES.plain;

/** A round whose zap leaves the lower two-thirds clear, so the wall jumps three rows. */
const ZAP = FLIGHT_FIXTURES.zap;

/** A log of no events, as the scene reads none yet. */
const NO_EVENTS: EventLogView<LoggedEvent> = {
  latest: 0,
  forEachSince: () => undefined,
};

/** An empty log of beats, for a view that has reached none. */
const NO_BEATS: EventLogView<LoggedBeat> = {
  latest: 0,
  forEachSince: () => undefined,
};

/** Returns the round as the view draws it, no fuzzball in the air and no event or beat reached, its wall eased down as far as given, coming down the rows given. */
function viewOf(wall: Wall, wallDrop = 1, rowsDown = 0): RoundView {
  return {
    balls: [],
    wall,
    wallDrop,
    rowsDown,
    events: NO_EVENTS,
    beats: NO_BEATS,
  };
}

/** Returns the shape the shell works out for a canvas of some CSS pixels, inside the board's margin. */
function shapeAt(width: number, height: number): FieldShape {
  return fieldShape(viewport(width, height, 1, INSETS));
}

/** Returns where the field lies on a canvas of some CSS pixels, in the shape the shell works out for it. */
function metricsAt(
  width: number = CANVAS.width,
  height: number = CANVAS.height,
): FieldMetrics {
  return fieldMetrics(
    viewport(width, height, 1, INSETS),
    shapeAt(width, height),
  );
}

/** Plays the shell's part, keeping what the scene tells it. */
class FakeShell implements WallSceneOptions {
  round: RoundView = viewOf(PLAIN.start.wall);
  /** Where the fuzzball waits, or null while it flies, as the shell has it without a round played. */
  waiting: number | null = null;
  /** The boon the fuzzball waiting carries, without a round played. */
  carried: Boon | null = null;
  /** The crew, without a round played. */
  friends: Crew = { friends: [] };
  /** How the mouse and fingers aim, as the settings say. */
  aimingSet: PointerAiming = "pointAndHold";
  /** Casts the guide for the shot steered, or none. */
  casting: ((steer: Readonly<Steer>) => Guide | null) | null = null;
  /** The round played, which the ticks play on and the scene draws, or null to draw the round set by hand. */
  play: RoundPlay | null = null;
  colors: WallPalette = LIGHT;
  fieldShape: FieldShape = shapeAt(CANVAS.width, CANVAS.height);
  welcomesMotion = true;
  wantsSound = true;
  /** The chrome the board declares over the canvas, the margin it keeps around the field. */
  chrome: Insets = INSETS;
  /** The shape the shell works out as it ticks, as it does between rounds, or null. */
  shapeAsked: FieldShape | null = null;
  readonly ticks: number[] = [];
  /** The steering handed over with each tick. */
  readonly steers: Readonly<Steer>[] = [];
  readonly layouts: FieldMetrics[] = [];
  readonly commands: FieldCommand[] = [];
  /** What the scene handed over at each bake of the atlas to picture the kinds with, the last bake's last. */
  readonly bakes: (() => Pictures)[] = [];

  readonly tick = (deltaMs: number, steer: Readonly<Steer>): void => {
    this.ticks.push(deltaMs);
    // The steering hands the same record each frame, so a copy is kept.
    this.steers.push({ ...steer });
    if (this.shapeAsked) this.fieldShape = this.shapeAsked;
    this.play?.advance(deltaMs, {
      pace: FLIGHT_PACE,
      speed: "normal",
      fast: false,
      speedUp: false,
      motion: this.welcomesMotion,
      paused: false,
    });
  };
  readonly view = (): RoundView =>
    this.play?.view ?? {
      ...this.round,
      events: this.loggedEvents,
      beats: this.loggedBeats,
    };
  readonly waitingX = (): number | null =>
    this.play ? this.play.waitingX : this.waiting;
  readonly boon = (): Boon | null => {
    if (!this.play) return this.carried;
    switch (this.play.phase) {
      case "aiming":
        return this.play.start.boon;
      case "flying":
        return null;
      case "settling":
        return this.play.round?.next.boon ?? null;
    }
  };
  readonly crew = (): Crew => this.play?.start.crew ?? this.friends;
  readonly guide = (): Guide | null => {
    const steer = this.steers.at(-1);
    return this.casting && steer ? this.casting(steer) : null;
  };
  readonly pointerAiming = (): PointerAiming => this.aimingSet;
  readonly palette = (): WallPalette => this.colors;
  readonly shape = (): FieldShape => this.fieldShape;
  readonly motion = (): boolean => this.welcomesMotion;
  readonly sound = (): boolean => this.wantsSound;
  readonly onLayout = (metrics: FieldMetrics): void => {
    this.layouts.push(metrics);
  };
  readonly command = (command: FieldCommand): void => {
    this.commands.push(command);
  };
  readonly onPictures = (pictures: () => Pictures): void => {
    this.bakes.push(pictures);
  };

  /** Asks the scene for the pictures of the atlas as last baked, as How to play does as it opens. */
  askPictures(): Pictures {
    const pictures = this.bakes.at(-1);
    if (!pictures) throw new Error("No bake yet.");
    return pictures();
  }

  /** Shows a wall standing still. */
  showWall(wall: Wall): void {
    this.round = viewOf(wall);
  }

  /** Shows the wall that comes down the rows given, a step's one unless told, eased down as far as given. */
  bringDown(wall: Wall, wallDrop: number, rowsDown = 1): void {
    this.round = viewOf(wall, wallDrop, rowsDown);
  }

  /** Aims a round of the fixtures, which the ticks play on, and lets it fly. */
  fly(fixture: FlightFixture): RoundPlay {
    const play = this.aim(fixture);
    play.release(fixture.round);
    return play;
  }

  /** Aims a round of the fixtures, which the ticks play on. */
  aim(fixture: FlightFixture): RoundPlay {
    this.play = new RoundPlay(fixture.start);
    return this.play;
  }

  /** Shows the round set by hand as having reached some events since the last frame, each with the effects given. */
  reach(...events: readonly ReachedEvent[]): void {
    for (const [event, flourishes, sound = null] of events) {
      const logged = this.loggedEvents.next();
      logged.event = event;
      logged.effects = { flourishes, sound };
    }
  }

  /** Shows the round set by hand as having reached some beats since the last frame. */
  beat(...beats: readonly Beat[]): void {
    for (const beat of beats) this.loggedBeats.next().beat = beat;
  }

  /** The events the round set by hand has reached. */
  private readonly loggedEvents = new EventLog<LoggedEvent>(64, () => ({
    serial: 0,
    event: LANDING,
    effects: QUIET,
  }));

  /** The beats the round set by hand has reached. */
  private readonly loggedBeats = new EventLog<LoggedBeat>(16, () => ({
    serial: 0,
    beat: "step",
  }));
}

/** An event the round set by hand reaches, the flourishes it calls for and its sound, none unless given. */
type ReachedEvent = readonly [
  event: FlightEvent,
  flourishes: readonly Flourish[],
  sound?: SoundName | null,
];

/** A landing, which a blank record of the log holds. */
const LANDING: FlightEvent = { kind: "land", at: 0, ball: 0, x: 4.5 };

/** What an event calls for that plays nothing. */
const QUIET: EventEffects = { flourishes: [], sound: null };

/** Sets a shell up for a player who prefers less motion. */
function stillness(shell: FakeShell): void {
  shell.welcomesMotion = false;
}

interface Board {
  readonly shell: FakeShell;
  readonly run: SceneRun<WallScene>;
  readonly scene: WallScene;
}

/**
 * Runs the scene for a shell, on a canvas of some CSS pixels, its first
 * frame drawn, till the case that runs it finishes.
 */
async function startBoard(
  setUp: (shell: FakeShell) => void = () => undefined,
  canvas: { readonly width: number; readonly height: number } = CANVAS,
): Promise<Board> {
  // What the wall's bake shows is read from what it was handed from the
  // start, as a headless game draws no pixels.
  spyOnBakes();
  const shell = new FakeShell();
  shell.fieldShape = shapeAt(canvas.width, canvas.height);
  setUp(shell);
  const make = makeWallScene(shell);
  const { run } = await runKeyedScene(
    (surroundings) => make({ ...surroundings, insets: () => shell.chrome }),
    canvas,
  );
  run.advance(16);
  return { shell, run, scene: run.scene };
}

/** Resizes the canvas, the shell working the shape out for it as it does between rounds, and draws a frame. */
function resizeTo(board: Board, width: number, height: number): void {
  board.run.game.scale.resize(width, height);
  board.shell.fieldShape = shapeAt(width, height);
  board.run.advance(16);
}

/** Returns the images of the swell over a field row and column that show, from the bottom of its stack up: none where no brick swells there. */
function swellAt(
  scene: WallScene,
  row: number,
  column: number,
): GameObjects.Image[] {
  const swelling = scene.wall.swellings.find(
    ({ cell }) => cell === row * COLUMNS + column,
  );
  return swelling?.images.filter((image) => image.visible) ?? [];
}

/**
 * Returns the frames the wall's bake shows in a field row and column, from
 * the bottom of the stack up, as the commands it rendered since the board
 * started stamped and cleared them.
 */
function framesAt(scene: WallScene, row: number, column: number): string[] {
  const { image } = scene.wall;
  const unit = image.width / COLUMNS;
  const depth = image.height / unit;
  const middle = { x: (column + 0.5) * unit, y: (depth - row - 0.5) * unit };
  let drawn: string[] = [];
  let shown: string[] = [];
  for (const command of bakeCommands(spyOnBakes(), WALL_BAKE, FROM_START)) {
    if (command.kind === "render") shown = [...drawn];
    if (command.kind === "clear" && covers(command.rect, middle)) drawn = [];
    if (
      command.kind === "stamp" &&
      command.x === middle.x &&
      command.y === middle.y
    ) {
      drawn.push(command.frame);
    }
  }
  return shown;
}

/** Returns whether a clear's rectangle, or the whole bake where it names none, covers a place. */
function covers(rect: PixelRect | null, { x, y }: Place): boolean {
  return (
    rect === null ||
    (x >= rect.x &&
      x < rect.x + rect.width &&
      y >= rect.y &&
      y < rect.y + rect.height)
  );
}

/** Returns where the middle of a field row and column's cell shows on the canvas, as the wall's bake is shown. */
function placeAt(scene: WallScene, row: number, column: number): Place {
  const { image } = scene.wall;
  const unit = image.width / COLUMNS;
  const depth = image.height / unit;
  return {
    x: image.x + (column + 0.5) * unit,
    y: image.y + (depth - row - 0.5) * unit,
  };
}

/** Returns how many frames a wall's bricks stack in a field of a depth, each of which a bake stamped whole stamps. */
function wallStamps(wall: Wall, depth: number): number {
  let frames = 0;
  for (let row = 0; row < depth; row++) {
    for (let column = 0; column < COLUMNS; column++) {
      const brick = wall.bricks[cellAt(wall, column, row)];
      if (brick) frames += brickLayers(brick).length;
    }
  }
  return frames;
}

/** Returns where an image's top left lies on the canvas, and how large it shows. */
function rectOf(image: GameObjects.Image): PixelRect {
  return {
    x: image.x,
    y: image.y,
    width: image.displayWidth,
    height: image.displayHeight,
  };
}

/**
 * Describes a command a bake was handed, in the bake's own pixels: a fill,
 * a stamp of a frame of the atlas from its middle, or the field's grid
 * dots' from its top left, a clear, of the whole bake where it names no
 * rectangle, or a render of what it was handed.
 */
type BakeCommand =
  | {
      readonly kind: "fill";
      readonly color: number;
      readonly rect: PixelRect;
    }
  | {
      readonly kind: "stamp";
      readonly frame: string;
      readonly x: number;
      readonly y: number;
      readonly scale: number;
    }
  | { readonly kind: "clear"; readonly rect: PixelRect | null }
  | { readonly kind: "render" };

/**
 * Spies on the commands every bake is handed, until the mocks are restored,
 * through the spies a spec already made where it made them.
 */
function spyOnBakes(): BakeSpies {
  const texture = Textures.DynamicTexture.prototype;
  return {
    fill: vi.spyOn(texture, "fill"),
    stamp: vi.spyOn(texture, "stamp"),
    clear: vi.spyOn(texture, "clear"),
    render: vi.spyOn(texture, "render"),
  };
}

/** The spies on what every bake is handed, each kind of command's. */
interface BakeSpies {
  readonly fill: MockInstance<Textures.DynamicTexture["fill"]>;
  readonly stamp: MockInstance<Textures.DynamicTexture["stamp"]>;
  readonly clear: MockInstance<Textures.DynamicTexture["clear"]>;
  readonly render: MockInstance<Textures.DynamicTexture["render"]>;
}

/** How many calls of each kind of command to pass over, from the first. */
type CallsPast = Readonly<Record<keyof BakeSpies, number>>;

/** Passes over no call: reads every command since the spies were made. */
const FROM_START: CallsPast = { fill: 0, stamp: 0, clear: 0, render: 0 };

/**
 * Records every command a bake is handed from now on, until the mocks are
 * restored, and returns what reads, in order, those a bake of a key was
 * handed: a scene's first bakes among them where it is called before the
 * scene starts.
 */
function recordBakes(): (key: string) => BakeCommand[] {
  const spies = spyOnBakes();
  const past: CallsPast = {
    fill: spies.fill.mock.calls.length,
    stamp: spies.stamp.mock.calls.length,
    clear: spies.clear.mock.calls.length,
    render: spies.render.mock.calls.length,
  };
  return (key) => bakeCommands(spies, key, past);
}

/** Returns, in order, the commands a bake of a key was handed, past the calls given. */
function bakeCommands(
  { fill, stamp, clear, render }: BakeSpies,
  key: string,
  past: CallsPast,
): BakeCommand[] {
  const keyOf = (bake: unknown): string | null =>
    bake instanceof Textures.DynamicTexture ? bake.key : null;
  const ordered: [number, BakeCommand][] = [];
  fill.mock.calls.forEach(
    ([color, , x = 0, y = 0, width = 0, height = 0], at) => {
      if (at < past.fill || keyOf(fill.mock.contexts[at]) !== key) return;
      ordered.push([
        fill.mock.invocationCallOrder[at] ?? 0,
        { kind: "fill", color, rect: { x, y, width, height } },
      ]);
    },
  );
  stamp.mock.calls.forEach(([, frame, x = 0, y = 0, config], at) => {
    if (at < past.stamp || keyOf(stamp.mock.contexts[at]) !== key) return;
    ordered.push([
      stamp.mock.invocationCallOrder[at] ?? 0,
      {
        kind: "stamp",
        frame: String(frame),
        x,
        y,
        scale: config?.scale ?? 1,
      },
    ]);
  });
  clear.mock.calls.forEach(([x, y, width, height], at) => {
    if (at < past.clear || keyOf(clear.mock.contexts[at]) !== key) return;
    ordered.push([
      clear.mock.invocationCallOrder[at] ?? 0,
      {
        kind: "clear",
        rect:
          x === undefined || y === undefined
            ? null
            : { x, y, width: width ?? 0, height: height ?? 0 },
      },
    ]);
  });
  render.mock.contexts.forEach((bake, at) => {
    if (at < past.render || keyOf(bake) !== key) return;
    ordered.push([
      render.mock.invocationCallOrder[at] ?? 0,
      { kind: "render" },
    ]);
  });
  return ordered.sort(([a], [b]) => a - b).map(([, command]) => command);
}

/** Returns the stamps among a bake's commands. */
function stampsIn(
  commands: readonly BakeCommand[],
): Extract<BakeCommand, { kind: "stamp" }>[] {
  return commands.flatMap((command) =>
    command.kind === "stamp" ? [command] : [],
  );
}

/** Returns the fills among a bake's commands. */
function fillsIn(
  commands: readonly BakeCommand[],
): Extract<BakeCommand, { kind: "fill" }>[] {
  return commands.flatMap((command) =>
    command.kind === "fill" ? [command] : [],
  );
}

/** The plain round's break of the brick at wall cell 0, as a flight might reach it. */
const PLAIN_BREAK: FlightEvent = {
  kind: "break",
  at: 1,
  cell: 0,
  brick: "brick",
  by: "fuzzball",
  streak: 1,
  points: 10,
};

/** The punch round, whose fuzzball flies charged. */
const PUNCH = FLIGHT_FIXTURES.punch;

/** The round a friend flies in, in ink 2. */
const FRIEND = FLIGHT_FIXTURES.friend;

/** The hot shot's round. */
const HOT_SHOT = FLIGHT_FIXTURES.hotShot;

/** How many device pixels a unit of the fuzzball's grid is shown at, on the specs' canvas, whose unit the atlas is baked at. */
const GRID = fuzzballGrid(bakedScaleOf(metricsAt()));

/** The player's fuzzball flying off up and to the left. */
const LAUNCH_LEFT: FlightEvent = {
  kind: "launch",
  at: 0,
  ball: 0,
  role: "player",
  x: 4.5,
  y: RADIUS,
  dx: -0.8,
  dy: 0.6,
  charge: 2,
  hot: false,
};

/** The player's fuzzball turning off something, to fly straight left. */
const TURN_LEFT: FlightEvent = {
  kind: "turn",
  at: 1,
  ball: 0,
  x: 4,
  y: 4,
  dx: -1,
  dy: 0,
  off: "side",
};

/** The player's fuzzball yawning, which drops it to the floor. */
const YAWN: FlightEvent = { kind: "yawn", at: 2, ball: 0, x: 4, y: 4 };

/** The player's fuzzball striking the plain round's tough brick, at wall cell 8. */
const STRIKE_8: FlightEvent = {
  kind: "strike",
  at: 1,
  ball: 0,
  cell: 8,
  took: 1,
  left: 1,
  charge: 0,
  earthed: false,
};

/** A row zap from wall cell 4 of the plain round's wall, reaching the rest of its row. */
const ROW_ZAP: FlightEvent = {
  kind: "zap",
  at: 1,
  cell: 4,
  pattern: "row",
  reaches: [0, 1, 2, 3, 5, 6, 7, 8],
};

/** A column zap from wall cell 0 of the plain round's wall, reaching eight rows up, past the ceiling. */
const COLUMN_ZAP: FlightEvent = {
  kind: "zap",
  at: 1,
  cell: 0,
  pattern: "column",
  reaches: [9, 18, 27, 36, 45, 54, 63, 72],
};

/** An X zap from wall cell 4 of the plain round's wall, reaching the cell up and to its right. */
const X_ZAP: FlightEvent = {
  kind: "zap",
  at: 1,
  cell: 4,
  pattern: "x",
  reaches: [14],
};

/** A bomb's blast at wall cell 8. */
const BLAST: FlightEvent = {
  kind: "zap",
  at: 1,
  cell: 8,
  pattern: "blast",
  reaches: [7, 17],
};

/** A friend freed in ink 3 from a cage at wall cell 8. */
const FREE: FlightEvent = { kind: "free", at: 1, cell: 8, ink: 3 };

/** Returns a fuzzball in the air, by its number, at a place, plain. */
function ballAt(ball: number, x: number, y: number): BallView {
  return { ball, role: "player", x, y, charge: 0, hot: false };
}

/** Returns the launch of a round's player's fuzzball. */
function launchOf(fixture: FlightFixture): { dx: number; dy: number } {
  const [launch] = fixture.round.flight.events;
  if (launch?.kind !== "launch") throw new Error("No launch first.");
  return launch;
}

/** Returns a number rounded to nine places, past which its arithmetic may stray. */
function rounded(value: number): number {
  return Math.round(value * 1e9) / 1e9;
}

/** Returns the brick at a wall cell, failing where there is none. */
function brickAt(wall: Wall, cell: number): Brick {
  const brick = wall.bricks[cell];
  if (!brick) throw new Error(`No brick at ${String(cell)}.`);
  return brick;
}

/** Returns the rectangles a `Graphics` fills in a color, as drawn. */
function rectsIn(
  graphics: GameObjects.Graphics,
  color: number,
): { x: number; y: number; width: number; height: number }[] {
  let filling: number | null = null;
  return commandsOf(graphics).flatMap((command) => {
    if (command.kind === "fillStyle") filling = command.color;
    if (command.kind !== "fillRect" || filling !== color) return [];
    const { x, y, width, height } = command;
    return [{ x, y, width, height }];
  });
}

/** Returns the box the field's frame bounds, around every rectangle the rim draws in the frame's color. */
function frameOf(scene: WallScene): PixelRect {
  const rects = rectsIn(scene.field.rim, LIGHT.line);
  const left = Math.min(...rects.map(({ x }) => x));
  const top = Math.min(...rects.map(({ y }) => y));
  const right = Math.max(...rects.map(({ x, width }) => x + width));
  const bottom = Math.max(...rects.map(({ y, height }) => y + height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/** Returns the main camera's viewport on the canvas, and where in the world it looks. */
function cameraOf(
  scene: WallScene,
): PixelRect & { scrollX: number; scrollY: number } {
  const { x, y, width, height, scrollX, scrollY } = scene.cameras.main;
  return { x, y, width, height, scrollX, scrollY };
}

/** Returns whether the meter's middle pip, straight under the waiting fuzzball, stands within half a pixel of under a place on the canvas. */
function middlePipUnder(scene: WallScene, middle: Place): boolean {
  const pip = scene.meter.pips[Math.floor(MOST_CHARGE / 2)];
  return Math.abs((pip?.x ?? 0) - middle.x) <= 0.5;
}

/** Returns how many of a set of images show. */
function showing(images: readonly GameObjects.Image[]): number {
  return images.filter((image) => image.visible).length;
}

/** Returns the field column and row of each warning frame shown, from the floor. */
function framedIn(scene: WallScene): (readonly [number, number])[] {
  return scene.wall.warnings.flatMap((warning, at) =>
    warning.visible ? [[at % COLUMNS, Math.floor(at / COLUMNS)] as const] : [],
  );
}

/** Returns each object's place in the list it is drawn from, counted from the back. */
function placesInLayer(objects: readonly GameObjects.GameObject[]): number[] {
  return objects.map((object) => object.displayList.getIndex(object));
}

/** Returns the place in the scene of the layer an object is drawn in, counted from the back, or -1 where it is in none. */
function layerPlaceOf(
  scene: WallScene,
  object: GameObjects.GameObject | undefined,
): number {
  const layer = object?.displayList;
  return layer instanceof GameObjects.Layer
    ? scene.children.getIndex(layer)
    : -1;
}

/** Returns where a dot of the jump line's count stands, in field units, counted from its end, on a field of the depth given: the first a gap of the line's and half the count's pitch of 0.24 short of the right wall, and 0.12 further on after each three. */
function countPlace(at: number, depth: number): { x: number; y: number } {
  const x =
    COLUMNS - (JUMP_LINE.gap + (at + 0.5) * 0.24 + Math.floor(at / 3) * 0.12);
  return { x, y: thirdsOf(depth).jumpLine };
}

/** Runs a board's frames until its shell's play is as asked, failing past a limit. */
function frameUntil(board: Board, reached: (play: RoundPlay) => boolean): void {
  for (let frame = 0; frame < 2000; frame++) {
    if (board.shell.play && reached(board.shell.play)) return;
    board.run.advance(16);
  }
  throw new Error("The play never got there.");
}

/** Returns where on the canvas a field row's foot runs, in the layout given. */
function rowFoot(metrics: FieldMetrics, row: number): number {
  return toCanvas(metrics, 0, row).y;
}

describe("WallScene", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("each frame", () => {
    it("hands the shell the time each frame took", async () => {
      const { shell, run } = await startBoard();

      run.advance(60, 20);

      expect(shell.ticks.slice(-3)).toEqual([20, 20, 20]);
    });

    it("hands the shell the steering, the aim straight up, no charge and nothing let fly before the player steers", async () => {
      const { shell } = await startBoard();

      expect(shell.steers.at(-1)).toEqual({
        aim: STRAIGHT_UP,
        charge: 0,
        release: false,
        fast: false,
        keyed: false,
      });
    });

    it("says it is ready once it has drawn its first frame", async () => {
      const { run } = await startBoard();

      expect(run.ready).toBe(true);
    });
  });

  describe("the layout", () => {
    it("tells the shell where the field lies", async () => {
      const { shell } = await startBoard();

      expect(shell.layouts).toEqual([metricsAt()]);
    });

    it("lays the field out again when the canvas changes size", async () => {
      const board = await startBoard();

      resizeTo(board, 600, 500);

      expect(board.shell.layouts.at(-1)).toEqual(metricsAt(600, 500));
    });

    it("lays the field out again in a new shape", async () => {
      const { shell, run } = await startBoard();
      const deeper = { ...shell.fieldShape, depth: 12 };

      shell.fieldShape = deeper;
      run.advance(16);

      expect(shell.layouts.at(-1)).toEqual(
        fieldMetrics(viewport(CANVAS.width, CANVAS.height, 1, INSETS), deeper),
      );
    });

    it("lays the field out again as the chrome over it changes, in the shape it has", async () => {
      const { shell, run } = await startBoard();
      const roomy = marginInsets(24);

      shell.chrome = roomy;
      run.advance(16);

      expect(shell.layouts.at(-1)).toEqual(
        fieldMetrics(
          viewport(CANVAS.width, CANVAS.height, 1, roomy),
          shell.fieldShape,
        ),
      );
    });

    it("lays the field out again on a canvas resized mid-flight, in the shape it has, and paints it there", async () => {
      const { shell, run, scene } = await startBoard();
      const metrics = fieldMetrics(
        viewport(440, 400, 1, INSETS),
        shell.fieldShape,
      );

      run.game.scale.resize(440, 400);
      run.advance(16);

      expect({
        layout: shell.layouts.at(-1),
        ground: rectOf(scene.field.ground),
      }).toEqual({
        layout: metrics,
        ground: {
          x: metrics.x,
          y: metrics.y,
          width: metrics.width,
          height: metrics.height + bandPixels(shell.fieldShape, metrics.unit),
        },
      });
    });

    it("bakes the atlas again at a new pixel ratio, though the unit stays", async () => {
      const shape = { ...shapeAt(CANVAS.width, CANVAS.height), unit: 29 };
      const { shell, run } = await startBoard((each) => {
        each.fieldShape = shape;
      });
      const baked = shell.bakes.length;

      run.game.scale.displayScale.set(2, 2);
      shell.fieldShape = { ...shape, pixelRatio: 2 };
      run.advance(16);

      expect({
        unit: shell.layouts.at(-1)?.unit,
        ratio: shell.layouts.at(-1)?.pixelRatio,
        bakes: shell.bakes.length - baked,
      }).toEqual({ unit: 29, ratio: 2, bakes: 1 });
    });

    it("lays a field reshaped in the shell's tick out that frame", async () => {
      const { shell, run, scene } = await startBoard();
      const deeper = { ...shell.fieldShape, depth: 12 };
      shell.shapeAsked = deeper;

      run.advance(16);

      expect(framesAt(scene, 11, 0)).toEqual([
        ...brickLayers(brickAt(PLAIN.start.wall, 6 * COLUMNS)),
      ]);
    });

    it("frames the camera on the field's frame, scrolled so the canvas's pixels are the world's, so nothing drawn shows past the frame", async () => {
      const { scene } = await startBoard();

      const frame = frameOf(scene);

      expect(cameraOf(scene)).toEqual({
        ...frame,
        scrollX: frame.x,
        scrollY: frame.y,
      });
    });

    it("frames the camera at the canvas's pixel ratio, around a frame as thick as the ratio makes it", async () => {
      const { shell, run, scene } = await startBoard();

      run.game.scale.displayScale.set(2, 2);
      shell.fieldShape = { ...shell.fieldShape, pixelRatio: 2 };
      run.advance(16);

      const frame = frameOf(scene);
      expect({
        frame: frame.width - (shell.layouts.at(-1)?.width ?? 0),
        camera: cameraOf(scene),
      }).toEqual({
        frame: 2 * framePixels(FRAME_CSS_PX, 2),
        camera: { ...frame, scrollX: frame.x, scrollY: frame.y },
      });
    });

    it("frames the camera again where the field is laid out again", async () => {
      const board = await startBoard();

      resizeTo(board, 600, 500);

      const frame = frameOf(board.scene);
      const { x, y, width, height, unit } = metricsAt(600, 500);
      const shape = shapeAt(600, 500);
      const lintel = lintelPixels(shape, unit);
      const band = bandPixels(shape, unit);
      expect({ frame, camera: cameraOf(board.scene) }).toEqual({
        frame: {
          x: x - FRAME_CSS_PX,
          y: y - lintel - FRAME_CSS_PX,
          width: width + 2 * FRAME_CSS_PX,
          height: lintel + height + band + 2 * FRAME_CSS_PX,
        },
        camera: { ...frame, scrollX: frame.x, scrollY: frame.y },
      });
    });

    it("lays the field out as it starts, on a canvas with no room yet too", async () => {
      const { shell } = await startBoard(undefined, { width: 20, height: 20 });

      expect(shell.layouts).toEqual([metricsAt(20, 20)]);
    });

    it("lays the field out once for a frame of no change", async () => {
      const { shell, run } = await startBoard();

      run.advance(48, 16);

      expect(shell.layouts).toHaveLength(1);
    });

    it("keeps its layout and its atlas while the canvas has no room inside its chrome", async () => {
      const board = await startBoard();
      const baked = board.shell.bakes.length;

      board.run.game.scale.resize(20, 20);
      board.run.advance(16);

      expect({
        layouts: board.shell.layouts,
        bakes: board.shell.bakes.length - baked,
      }).toEqual({ layouts: [metricsAt()], bakes: 0 });
    });

    it("lays the field out again once the canvas has room again", async () => {
      const board = await startBoard();
      board.run.game.scale.resize(20, 20);
      board.run.advance(16);

      resizeTo(board, 500, 500);

      expect(board.shell.layouts.at(-1)).toEqual(metricsAt(500, 500));
    });

    it("bakes the atlas again at a new unit", async () => {
      const board = await startBoard();

      resizeTo(board, 600, 600);

      expect(board.scene.textures.getFrame(ATLAS, "tile-0").width).toBe(
        metricsAt(600, 600).unit,
      );
    });

    it("has every image take up its frame anew at a new unit", async () => {
      const board = await startBoard();

      resizeTo(board, 600, 600);

      expect(
        imagesIn(board.scene)
          .filter(
            (image) =>
              image.width !== image.frame.width ||
              image.displayOriginX !== image.originX * image.frame.width,
          )
          .map((image) => image.frame.name),
      ).toEqual([]);
    });

    it("bakes once for a new unit and a new palette in the same frame", async () => {
      const board = await startBoard();
      const baked = board.shell.bakes.length;

      board.shell.colors = DARK;
      resizeTo(board, 600, 600);

      expect(board.shell.bakes.length - baked).toBe(1);
    });

    it("bakes the atlas at no more than its largest unit, and stamps a larger one's frames scaled up", async () => {
      const bakes = recordBakes();
      const board = await startBoard(undefined, { width: 1300, height: 1800 });
      const { unit } = metricsAt(1300, 1800);

      const [tile] = stampsIn(bakes(WALL_BAKE));

      expect({
        unit: unit > MOST_BAKED_UNIT,
        baked: board.scene.textures.getFrame(ATLAS, "tile-0").width,
        shown: (tile?.scale ?? 0) * MOST_BAKED_UNIT,
      }).toEqual({ unit: true, baked: MOST_BAKED_UNIT, shown: unit });
    });

    it("shows the field's dots scaled up with the wall's frames", async () => {
      const bakes = recordBakes();
      const { scene } = await startBoard(undefined, {
        width: 1300,
        height: 1800,
      });
      const scale = metricsAt(1300, 1800).unit / MOST_BAKED_UNIT;
      const [grid] = stampsIn(bakes(FIELD_BAKE));
      const [count] = scene.field.countDots;
      const edges = [
        grid?.x ?? Number.NaN,
        grid?.y ?? Number.NaN,
        ...(count
          ? [
              count.x - count.displayWidth / 2,
              count.x + count.displayWidth / 2,
              count.y - count.displayHeight / 2,
              count.y + count.displayHeight / 2,
            ]
          : []),
      ];

      // Baked at 128 px a unit, a grid dot is 7 px wide and a count's 18,
      // each shown scaled up to whole pixels, its edges on whole pixels.
      expect({
        scaledUp: scale > 1,
        sides: [grid?.scale, count?.displayWidth],
        offPixel: edges.filter((edge) => !Number.isInteger(edge)),
      }).toEqual({
        scaledUp: true,
        sides: [Math.round(7 * scale) / 7, Math.round(18 * scale)],
        offPixel: [],
      });
    });

    it("bakes nothing again for a new unit past its largest", async () => {
      const board = await startBoard(undefined, { width: 1300, height: 1800 });
      const baked = board.shell.bakes.length;

      resizeTo(board, 1400, 1900);

      expect({
        unit: metricsAt(1400, 1900).unit > metricsAt(1300, 1800).unit,
        bakes: board.shell.bakes.length - baked,
      }).toEqual({ unit: true, bakes: 0 });
    });

    it("stamps the whole wall afresh at a new unit past its largest, scaled up to it", async () => {
      const board = await startBoard(undefined, { width: 1300, height: 1800 });
      const bakes = recordBakes();

      resizeTo(board, 1400, 1900);

      const stamps = stampsIn(bakes(WALL_BAKE));
      expect({
        stamps: stamps.length,
        scales: [...new Set(stamps.map(({ scale }) => scale))],
      }).toEqual({
        stamps: wallStamps(PLAIN.start.wall, shapeAt(1400, 1900).depth),
        scales: [metricsAt(1400, 1900).unit / MOST_BAKED_UNIT],
      });
    });
  });

  describe("the atlas", () => {
    it("holds every frame of the view's art, and the scene's own", async () => {
      const { scene } = await startBoard();
      const art = atlasFrames(LIGHT, metricsAt());
      const names = [
        ...art,
        ...fieldFrames(LIGHT, metricsAt()),
        ...flightFrames(LIGHT, metricsAt()),
        ...pictureFrames(art, metricsAt()),
      ].map((frame) => frame.name);

      const missing = names.filter(
        (name) => !scene.textures.get(ATLAS).has(name),
      );

      expect(missing).toEqual([]);
    });

    it("bakes the cracks' frames empty under 30 CSS pixels a unit, and shows them", async () => {
      const worn = wallFrom(["2........"], { lowestRow: 1 });
      const hit = { ...brickAt(worn, 0), hits: 1 };
      const wall = { ...worn, bricks: [hit, ...worn.bricks.slice(1)] };

      const { scene } = await startBoard(
        (shell) => {
          shell.showWall(wall);
        },
        { width: 300, height: 300 },
      );

      expect({
        drawn: frameNamed(atlasFrames(LIGHT, metricsAt(300, 300)), "cracks-1")
          .commands,
        cracks: atlasHas(scene, "cracks-1"),
        shown: framesAt(scene, 1, 0),
      }).toEqual({
        drawn: [],
        cracks: true,
        shown: [...brickLayers(hit)],
      });
    });

    it("draws the atlas again once a lost WebGL context is restored", async () => {
      const { run, scene } = await startBoard();
      const atlas = scene.textures.get(ATLAS).getSourceImage();
      const uploaded: HTMLCanvasElement[] = [];
      await run.loseContext();
      watchUploads(scene, (canvas) => {
        uploaded.push(canvas);
      });

      await run.restoreContext();

      expect(uploaded).toContain(atlas);
    });

    it("draws a flight on through a lost context and its restore, every frame of its own in the atlas again", async () => {
      const { run, scene } = await startBoard((shell) => {
        shell.fly(PLAIN);
        shell.casting = () => ({ dots: [{ x: 3, y: 3 }], punched: [8] });
      });
      run.advance(48);
      const objects = objectsIn(scene);
      await run.loseContext();

      await run.restoreContext();
      run.advance(48);

      const missing = flightFrames(LIGHT, metricsAt())
        .map(({ name }) => name)
        .filter((name) => !atlasHas(scene, name));
      expect({
        missing,
        objects: objectsIn(scene),
        ball: scene.balls.bodies[0]?.frame.name,
        dot: scene.guide.dots[0]?.frame.name,
      }).toEqual({
        missing: [],
        objects,
        ball: FRAMES.fuzzball(PLAIN.shot.charge),
        dot: FRAMES.guideDot,
      });
    });
  });

  describe("the field", () => {
    it("is painted in the palette", async () => {
      const bakes = recordBakes();
      const { scene } = await startBoard();

      expect({
        ground: fillsIn(bakes(FIELD_BAKE)).map(({ color }) => color),
        rim: colorsOf(scene.field.rim),
      }).toEqual({
        ground: [LIGHT.field, LIGHT.band],
        rim: [LIGHT.band, LIGHT.line],
      });
    });

    it("is painted again in a new palette", async () => {
      const { shell, run, scene } = await startBoard();
      const bakes = recordBakes();

      shell.colors = DARK;
      run.advance(16);

      expect({
        ground: fillsIn(bakes(FIELD_BAKE)).map(({ color }) => color),
        rim: colorsOf(scene.field.rim),
      }).toEqual({
        ground: [DARK.field, DARK.band],
        rim: [DARK.band, DARK.line],
      });
    });

    it("fills its cells and the floor's band under them on its bake, shown at the cells' top left, and the lintel over them", async () => {
      const bakes = recordBakes();
      const { shell, scene } = await startBoard();
      const { x, y, width, height, unit } = metricsAt();
      const band = bandPixels(shell.fieldShape, unit);
      const lintel = lintelPixels(shell.fieldShape, unit);

      expect({
        ground: rectOf(scene.field.ground),
        baked: bakes(FIELD_BAKE).filter(({ kind }) => kind !== "stamp"),
        lintel: rectsIn(scene.field.rim, LIGHT.band),
      }).toEqual({
        ground: { x, y, width, height: height + band },
        baked: [
          { kind: "clear", rect: null },
          {
            kind: "fill",
            color: LIGHT.field,
            rect: { x: 0, y: 0, width, height },
          },
          {
            kind: "fill",
            color: LIGHT.band,
            rect: { x: 0, y: height, width, height: band },
          },
          { kind: "render" },
        ],
        lintel: [{ x, y: y - lintel, width, height: lintel }],
      });
    });

    it("frames them in the margin, and draws the ceiling along the lintel's foot", async () => {
      const { shell, scene } = await startBoard();
      const { x, y, width, height, unit } = metricsAt();
      const frame = framePixels(FRAME_CSS_PX, 1);
      const top = y - lintelPixels(shell.fieldShape, unit);
      const bottom = y + height + bandPixels(shell.fieldShape, unit);

      expect(rectsIn(scene.field.rim, LIGHT.line)).toEqual([
        { x, y: y - frame, width, height: frame },
        {
          x: x - frame,
          y: top - frame,
          width: width + 2 * frame,
          height: frame,
        },
        { x: x - frame, y: bottom, width: width + 2 * frame, height: frame },
        { x: x - frame, y: top, width: frame, height: bottom - top },
        { x: x + width, y: top, width: frame, height: bottom - top },
      ]);
    });

    it("draws its lintel, its ceiling and its frame over all the rest, so nothing that bursts from the wall or flies covers them", async () => {
      const { scene } = await startBoard();
      const [ring] = scene.effects.rings.all;
      const [hop] = scene.effects.hops.all;
      const [ball] = scene.balls.bodies;

      const rim = layerPlaceOf(scene, scene.field.rim);

      expect({
        last: rim === scene.children.length - 1,
        overShards: rim > layerPlaceOf(scene, scene.effects.shards),
        overRings: rim > layerPlaceOf(scene, ring?.image),
        overHops: rim > layerPlaceOf(scene, hop?.body),
        overBalls: rim > layerPlaceOf(scene, ball),
      }).toEqual({
        last: true,
        overShards: true,
        overRings: true,
        overHops: true,
        overBalls: true,
      });
    });

    it("draws its cells and the floor's band under the wall", async () => {
      const { scene } = await startBoard();

      const ground = layerPlaceOf(scene, scene.field.ground);

      expect(ground).toBeLessThan(layerPlaceOf(scene, scene.wall.image));
    });

    it("stamps a dot at each corner its cells share", async () => {
      const bakes = recordBakes();
      const { shell, scene } = await startBoard();
      const { unit } = metricsAt();
      const dots = stampsIn(bakes(FIELD_BAKE));
      const side = scene.textures.getFrame(ATLAS, FIELD_FRAMES.gridDot).width;
      const middleOf = (dot: (typeof dots)[number] | undefined): Place => ({
        x: (dot?.x ?? Number.NaN) + side / 2,
        y: (dot?.y ?? Number.NaN) + side / 2,
      });

      // At this unit a grid dot is as wide as it is baked, and an even
      // number of pixels, so its middle lies on the corner.
      expect({
        stamped: dots.length,
        frames: [...new Set(dots.map(({ frame }) => frame))],
        scales: [...new Set(dots.map(({ scale }) => scale))],
        first: middleOf(dots[0]),
        last: middleOf(dots.at(-1)),
      }).toEqual({
        stamped: (COLUMNS - 1) * (shell.fieldShape.depth - 1),
        frames: [FIELD_FRAMES.gridDot],
        scales: [1],
        first: { x: unit, y: unit },
        last: { x: 8 * unit, y: (shell.fieldShape.depth - 1) * unit },
      });
    });

    it("stamps more dots in a deeper field", async () => {
      const board = await startBoard();
      const bakes = recordBakes();

      resizeTo(board, 300, 700);

      expect(stampsIn(bakes(FIELD_BAKE))).toHaveLength(
        (COLUMNS - 1) * (shapeAt(300, 700).depth - 1),
      );
    });

    it("bakes its cells, its band and its dots again once a lost context is restored", async () => {
      const { run } = await startBoard();
      const bakes = recordBakes();
      await run.loseContext();
      await run.restoreContext();

      run.advance(16);

      expect({
        fills: fillsIn(bakes(FIELD_BAKE)).map(({ color }) => color),
        dots: stampsIn(bakes(FIELD_BAKE)).length,
      }).toEqual({
        fills: [LIGHT.field, LIGHT.band],
        dots: (COLUMNS - 1) * (11 - 1),
      });
    });

    it("bakes nothing again the frame after it bakes for a restored context", async () => {
      const { run } = await startBoard();
      await run.loseContext();
      await run.restoreContext();
      run.advance(16);
      const bakes = recordBakes();

      run.advance(16);

      expect({
        field: bakes(FIELD_BAKE),
        wall: bakes(WALL_BAKE),
      }).toEqual({ field: [], wall: [] });
    });

    it("bakes nothing again in a frame where nothing changed", async () => {
      const { run } = await startBoard();
      const bakes = recordBakes();

      run.advance(48, 16);

      expect({
        field: bakes(FIELD_BAKE),
        wall: bakes(WALL_BAKE),
      }).toEqual({ field: [], wall: [] });
    });
  });

  describe("the lines", () => {
    it("draw the jump line's dashes under the top third, in the jump line's color", async () => {
      const { shell, scene } = await startBoard();
      const metrics = metricsAt();
      const { jumpLine } = thirdsOf(shell.fieldShape.depth);
      // At 31 px a unit, the art's 2.4 and 14 of a cell of 40.
      const thick = 2;

      const dashes = rectsIn(scene.field.lines, LIGHT.jumpLine);

      expect({
        many: dashes.length > 5,
        rows: new Set(dashes.map(({ y, height }) => `${y} ${height}`)),
        from: (dashes[0]?.x ?? 0) - metrics.x,
        dash: dashes[0]?.width,
      }).toEqual({
        many: true,
        rows: new Set([
          `${rowFoot(metrics, jumpLine) - Math.floor(thick / 2)} ${thick}`,
        ]),
        // A gap of 6.2 px in from the left wall.
        from: 6,
        dash: 11,
      });
    });

    it("draw the danger line's dashes along the top of the floor's row, in the danger color", async () => {
      const { scene } = await startBoard();
      const metrics = metricsAt();
      // At 31 px a unit, the art's 2 and 8 of a cell of 40.
      const thick = 2;

      const dashes = rectsIn(scene.field.lines, LIGHT.dangerLine);

      expect({
        many: dashes.length > 5,
        rows: new Set(dashes.map(({ y, height }) => `${y} ${height}`)),
        dash: dashes[0]?.width,
        to:
          (dashes.at(-1)?.x ?? 0) + (dashes.at(-1)?.width ?? 0) <=
          metrics.x + metrics.width - DANGER_LINE.gap * metrics.unit + 1,
      }).toEqual({
        many: true,
        rows: new Set([
          `${rowFoot(metrics, 1) - Math.floor(thick / 2)} ${thick}`,
        ]),
        dash: 6,
        to: true,
      });
    });

    it("draw the jump line under the top third of a field reshaped deeper", async () => {
      const board = await startBoard();
      const metrics = metricsAt(300, 700);
      const { jumpLine } = thirdsOf(shapeAt(300, 700).depth);

      resizeTo(board, 300, 700);

      const dashes = rectsIn(board.scene.field.lines, LIGHT.jumpLine);
      expect(
        new Set(dashes.map(({ y, height }) => y + Math.floor(height / 2))),
      ).toEqual(new Set([rowFoot(metrics, jumpLine)]));
    });

    it("draw the lines across a field laid out anew as across one the scene started on", async () => {
      const board = await startBoard();
      const started = await startBoard(undefined, { width: 300, height: 700 });
      const lines = (scene: WallScene): unknown => ({
        jump: rectsIn(scene.field.lines, LIGHT.jumpLine),
        danger: rectsIn(scene.field.lines, LIGHT.dangerLine),
      });

      resizeTo(board, 300, 700);

      expect(lines(board.scene)).toEqual(lines(started.scene));
    });

    it("round each dash's ends to the nearest pixel, and thicken each line by its own width", async () => {
      const { scene } = await startBoard(undefined, {
        width: 550,
        height: 550,
      });
      const metrics = metricsAt(550, 550);
      const [jump] = rectsIn(scene.field.lines, LIGHT.jumpLine);
      const [danger] = rectsIn(scene.field.lines, LIGHT.dangerLine);

      // At 43 px a unit, the jump line's first dash runs from 8.6 px in to
      // 23.65 and is 2.58 thick; the danger line's from 8.6 to 17.2, 2.15
      // thick.
      expect({
        unit: metrics.unit,
        jump: [(jump?.x ?? 0) - metrics.x, jump?.width, jump?.height],
        danger: [(danger?.x ?? 0) - metrics.x, danger?.width, danger?.height],
      }).toEqual({ unit: 43, jump: [9, 15, 3], danger: [9, 8, 2] });
    });

    it("are painted again in a new palette", async () => {
      const { shell, run, scene } = await startBoard();

      shell.colors = DARK;
      run.advance(16);

      expect(colorsOf(scene.field.lines)).toEqual([
        DARK.jumpLine,
        DARK.dangerLine,
      ]);
    });

    it("count the bricks the level needs under the jump line, a dot each from its end, once nine or fewer are left", async () => {
      const { shell, scene } = await startBoard();
      const metrics = metricsAt();
      const { jumpLine } = thirdsOf(shell.fieldShape.depth);
      const end = metrics.x + metrics.width - JUMP_LINE.gap * metrics.unit;
      const [first, second] = scene.field.countDots;

      // The plain round's wall has a brick and a tough brick under the line.
      // At 31 px a unit, a dot is 4 px wide and 0.24 of a unit, 7.44 px,
      // from the next, each moved to stand on whole pixels.
      expect({
        end,
        shown: showing(scene.field.countDots),
        first: { x: first?.x, y: first?.y, frame: first?.frame.name },
        second: second?.x,
      }).toEqual({
        end: 332.8,
        shown: 2,
        first: {
          x: 329,
          y: rowFoot(metrics, jumpLine),
          frame: FIELD_FRAMES.countDot,
        },
        second: 322,
      });
    });

    it("group the count's dots in threes, further apart than the dots of a group", async () => {
      const { scene } = await startBoard((shell) => {
        shell.showWall(wallFrom(["oooo.oooo", "o........"], { lowestRow: 1 }));
      });

      const xs = scene.field.countDots.map((dot) => dot.x);

      // At 31 px a unit, 7.44 px apart in a group and 11.16 between groups,
      // each dot on whole pixels.
      expect(xs.slice(1).map((x, at) => (xs[at] ?? 0) - x)).toEqual([
        7, 8, 11, 7, 8, 11, 7, 8,
      ]);
    });

    it("stand the field's dots on whole pixels, so each stays as sharp as it is baked", async () => {
      const bakes = recordBakes();
      const { scene } = await startBoard(undefined, {
        width: 600,
        height: 600,
      });
      const grid = stampsIn(bakes(FIELD_BAKE));
      const counts = scene.field.countDots.filter((dot) => dot.visible);
      const offPixel = [
        ...grid.filter(
          ({ x, y }) => !Number.isInteger(x) || !Number.isInteger(y),
        ),
        ...counts.filter(
          (dot) =>
            !Number.isInteger(dot.x - dot.displayWidth / 2) ||
            !Number.isInteger(dot.y - dot.displayHeight / 2),
        ),
      ];

      // At 47 px a unit, a grid dot 3 px wide about a corner, or a count's
      // dot 7 px wide about the jump line, would stand half a pixel off; and
      // the plain round counts two bricks.
      expect({
        sides: [
          (grid[0]?.scale ?? 0) *
            scene.textures.getFrame(ATLAS, FIELD_FRAMES.gridDot).width,
          counts[0]?.displayWidth,
        ],
        counted: counts.length,
        offPixel,
      }).toEqual({
        sides: [3, 7],
        counted: 2,
        offPixel: [],
      });
    });

    // At 31 px a unit, the line's 16 dashes end at 77, 94, … 316 and 333,
    // and a count's dashes stop half a pitch, 3.72 px, short of its last dot.
    it.each([
      [1, 15],
      [4, 14],
      [9, 11],
    ])(
      "stop the jump line short of a count of %i, leaving off whole dashes where they stood, %i of them kept",
      async (left, kept) => {
        const { shell, run, scene } = await startBoard((each) => {
          each.showWall(wallFrom(["ooooooooo", "o........"], { lowestRow: 1 }));
        });
        const uncounted = rectsIn(scene.field.lines, LIGHT.jumpLine);

        shell.showWall(
          wallFrom(["o".repeat(left).padEnd(COLUMNS, ".")], { lowestRow: 1 }),
        );
        run.advance(16);

        const dots = scene.field.countDots.filter((dot) => dot.visible);
        const reach = Math.min(
          ...dots.map((dot) => dot.x - dot.displayWidth / 2),
        );
        const dashes = rectsIn(scene.field.lines, LIGHT.jumpLine);
        expect({
          shown: dots.length,
          short: Math.max(...dashes.map(({ x, width }) => x + width)) < reach,
          kept: dashes,
        }).toEqual({
          shown: left,
          short: true,
          kept: uncounted.slice(0, kept),
        });
      },
    );

    it("count again as the wall under the line changes", async () => {
      const { shell, run, scene } = await startBoard();

      shell.showWall(wallFrom(["o.o.o.o.o"], { lowestRow: 1 }));
      run.advance(16);

      expect(showing(scene.field.countDots)).toBe(5);
    });

    it("count no brick the level doesn't need", async () => {
      const { scene } = await startBoard((shell) => {
        shell.showWall(wallFrom(["#o#o#####"], { lowestRow: 1 }));
      });

      expect(showing(scene.field.countDots)).toBe(2);
    });

    it("count no brick over the jump line", async () => {
      const { shell, scene } = await startBoard((each) => {
        each.showWall(
          wallFrom(["ooooooooo", "o........"], {
            lowestRow: thirdsOf(each.fieldShape.depth).jumpLine - 1,
          }),
        );
      });

      expect({
        depth: shell.fieldShape.depth,
        shown: showing(scene.field.countDots),
      }).toEqual({ depth: 11, shown: 1 });
    });

    it("count as many as nine", async () => {
      const { scene } = await startBoard((shell) => {
        shell.showWall(wallFrom(["oooo.oooo", "o........"], { lowestRow: 1 }));
      });

      expect(showing(scene.field.countDots)).toBe(9);
    });

    it("show no count while more than nine are left, the dashes running on to the end", async () => {
      const { scene } = await startBoard((shell) => {
        shell.showWall(wallFrom(["ooooooooo", "o........"], { lowestRow: 1 }));
      });
      const metrics = metricsAt();
      const last = rectsIn(scene.field.lines, LIGHT.jumpLine).at(-1);

      expect({
        shown: showing(scene.field.countDots),
        to:
          (last?.x ?? 0) + (last?.width ?? 0) >
          metrics.x +
            metrics.width -
            (JUMP_LINE.gap + JUMP_LINE.dash) * metrics.unit,
      }).toEqual({ shown: 0, to: true });
    });

    it("show no count once none is left", async () => {
      const { scene } = await startBoard((shell) => {
        shell.showWall(wallFrom(["#########"], { lowestRow: 1 }));
      });

      expect(showing(scene.field.countDots)).toBe(0);
    });

    it("hold a dot for the most bricks counted, made once", async () => {
      const { scene } = await startBoard();

      expect(scene.field.countDots).toHaveLength(MOST_COUNTED);
    });

    it("draw the count over the guide, so an outline under it leaves its dots whole, and under what bursts from the wall", async () => {
      const { scene } = await startBoard();
      const [count] = scene.field.countDots;
      const [dot] = scene.guide.dots;
      const [punch] = scene.guide.punches;

      const counted = layerPlaceOf(scene, count);

      expect({
        overDot: counted > layerPlaceOf(scene, dot),
        overPunch: counted > layerPlaceOf(scene, punch),
        overLines: counted > layerPlaceOf(scene, scene.field.lines),
        underShards: counted < layerPlaceOf(scene, scene.effects.shards),
      }).toEqual({
        overDot: true,
        overPunch: true,
        overLines: true,
        underShards: true,
      });
    });
  });

  describe("the wall", () => {
    it("shows each brick in its cell, its frames stacked from the bottom up", async () => {
      const { scene } = await startBoard();
      const wall = PLAIN.start.wall;

      expect({
        brick: framesAt(scene, 5, 0),
        tough: framesAt(scene, 5, 8),
        gap: framesAt(scene, 5, 1),
        place: placeAt(scene, 5, 8),
      }).toEqual({
        brick: [...brickLayers(brickAt(wall, 0))],
        tough: [...brickLayers(brickAt(wall, 8))],
        gap: [],
        place: toCanvas(metricsAt(), 8.5, 5.5),
      });
    });

    it("stamps each brick about its cell's middle on its bake, shown at the cells' top left", async () => {
      const bakes = recordBakes();
      const { scene } = await startBoard();
      const { x, y, unit } = metricsAt();

      // The tough brick at wall cell 8 stands in field row 5, column 8, of
      // 11 rows.
      const tough = stampsIn(bakes(WALL_BAKE)).filter(
        (stamp) => stamp.x === 8.5 * unit && stamp.y === 5.5 * unit,
      );

      expect({
        image: { x: scene.wall.image.x, y: scene.wall.image.y },
        tough,
      }).toEqual({
        image: { x, y },
        tough: brickLayers(brickAt(PLAIN.start.wall, 8)).map((frame) => ({
          kind: "stamp",
          frame,
          x: 8.5 * unit,
          y: 5.5 * unit,
          scale: 1,
        })),
      });
    });

    it("hides the rows waiting over the ceiling, its bake as deep as the field", async () => {
      const { scene } = await startBoard();

      // The plain round's wall stands from row 5 to row 12, two rows over
      // the ceiling of a field 11 deep.
      expect({
        over: Array.from({ length: MOST_DEPTH - 11 }, (_, above) =>
          framesAt(scene, 11 + above, 0),
        ).flat(),
        height: scene.wall.image.height,
      }).toEqual({ over: [], height: 11 * metricsAt().unit });
    });

    it("shows a brick's frames anew as it takes a hit", async () => {
      const { shell, run, scene } = await startBoard();
      const next = PLAIN.round.next.wall;

      shell.showWall(next);
      run.advance(16);

      expect(framesAt(scene, 4, 8)).toEqual([...brickLayers(brickAt(next, 8))]);
    });

    it("stamps only the cell whose brick changed, cleared first", async () => {
      const { shell, run } = await startBoard();
      const bakes = recordBakes();
      const { unit } = metricsAt();
      const bricks = [...PLAIN.start.wall.bricks];
      const hit = { ...brickAt(PLAIN.start.wall, 8), hits: 1 };
      bricks[8] = hit;

      shell.showWall({ ...PLAIN.start.wall, bricks });
      run.advance(16);

      expect(bakes(WALL_BAKE)).toEqual([
        {
          kind: "clear",
          rect: { x: 8 * unit, y: 5 * unit, width: unit, height: unit },
        },
        ...brickLayers(hit).map((frame) => ({
          kind: "stamp",
          frame,
          x: 8.5 * unit,
          y: 5.5 * unit,
          scale: 1,
        })),
        { kind: "render" },
      ]);
    });

    it("stamps the whole wall afresh in a new palette", async () => {
      const { shell, run } = await startBoard();
      const bakes = recordBakes();

      shell.colors = DARK;
      run.advance(16);

      const baked = bakes(WALL_BAKE);
      expect({
        first: baked[0],
        stamps: stampsIn(baked).length,
      }).toEqual({
        first: { kind: "clear", rect: null },
        stamps: wallStamps(PLAIN.start.wall, 11),
      });
    });

    it("stamps the whole wall afresh once a lost context is restored", async () => {
      const { run } = await startBoard();
      const bakes = recordBakes();
      await run.loseContext();
      await run.restoreContext();

      run.advance(16);

      const baked = bakes(WALL_BAKE);
      expect({
        first: baked[0],
        stamps: stampsIn(baked).length,
      }).toEqual({
        first: { kind: "clear", rect: null },
        stamps: wallStamps(PLAIN.start.wall, 11),
      });
    });

    it("hides a brick once it breaks", async () => {
      const { shell, run, scene } = await startBoard();
      const wall = PLAIN.start.wall;

      shell.showWall({
        ...wall,
        bricks: [null, ...wall.bricks.slice(1)],
      });
      run.advance(16);

      expect(framesAt(scene, 5, 0)).toEqual([]);
    });

    it("shows the wall standing still in one image, and makes a stack of images for each brick that may swell at once", async () => {
      const { scene } = await startBoard();

      expect({
        image: scene.wall.image.texture.key,
        swells: scene.wall.swellings.map(({ images }) => images.length),
      }).toEqual({
        image: WALL_BAKE,
        swells: Array.from({ length: MOST_SWELLING }, () => MOST_LAYERS),
      });
    });

    it("stacks deep enough for every look a brick takes", () => {
      const deepest = Math.max(
        ...BRICK_KIND_IDS.flatMap((kind) =>
          looksOf(kind).map((look) => brickLayers(look).length),
        ),
      );

      expect(deepest).toBe(MOST_LAYERS);
    });

    it("stands where the wall came down at once, before it eases", async () => {
      const { shell, run, scene } = await startBoard();

      shell.bringDown(PLAIN.round.next.wall, 0);
      run.advance(16);

      // The tough brick ends in row 4, from row 5.
      expect(placeAt(scene, 4, 8)).toEqual(toCanvas(metricsAt(), 8.5, 5.5));
    });

    it("eases down as the view goes through the wall's step", async () => {
      const { shell, run, scene } = await startBoard();
      shell.bringDown(PLAIN.round.next.wall, 0);
      run.advance(16);

      shell.bringDown(PLAIN.round.next.wall, 0.5);
      run.advance(16);

      const end = toCanvas(metricsAt(), 8.5, 4.5);
      expect(placeAt(scene, 4, 8)).toEqual({
        x: end.x,
        y: end.y - Math.round(0.5 * metricsAt().unit),
      });
    });

    it("comes to rest where the view's step ends, and stays", async () => {
      const { shell, run, scene } = await startBoard();
      shell.bringDown(PLAIN.round.next.wall, 0.5);
      run.advance(16);
      shell.bringDown(PLAIN.round.next.wall, 1);
      run.advance(16);

      shell.bringDown(PLAIN.round.next.wall, 0);
      run.advance(16);

      expect(placeAt(scene, 4, 8)).toEqual(toCanvas(metricsAt(), 8.5, 4.5));
    });

    it("eases a jump down its rows", async () => {
      const { shell, run, scene } = await startBoard((each) => {
        each.showWall(ZAP.start.wall);
      });
      const unit = metricsAt().unit;
      shell.bringDown(ZAP.round.next.wall, 0, ZAP.round.outcome.rowsDown);
      run.advance(16);

      shell.bringDown(ZAP.round.next.wall, 0.5, ZAP.round.outcome.rowsDown);
      run.advance(16);

      // The steel at wall cell 2 ends in row 2, from row 5.
      expect(placeAt(scene, 2, 2).y).toBe(
        toCanvas(metricsAt(), 2.5, 2.5).y - Math.round(1.5 * unit),
      );
    });

    it("stands the wall it starts on where it is, however far the view says it has come down", async () => {
      const { scene } = await startBoard((shell) => {
        shell.bringDown(PLAIN.start.wall, 0);
      });

      expect(placeAt(scene, 5, 8)).toEqual(toCanvas(metricsAt(), 8.5, 5.5));
    });

    it("eases the wall the round leaves down from where the flight's stood, as the round played hands it over", async () => {
      const board = await startBoard((shell) => {
        shell.fly(PLAIN);
      });
      const { unit } = metricsAt();

      frameUntil(board, ({ view }) => view.wallDrop < 1);

      const { wallDrop } = board.shell.play?.view ?? { wallDrop: 1 };
      expect(placeAt(board.scene, 4, 8).y).toBe(
        toCanvas(metricsAt(), 8.5, 4.5).y - Math.round((1 - wallDrop) * unit),
      );
    });

    it("takes a step the view has gone past the end of as ended", async () => {
      const { shell, run, scene } = await startBoard();

      shell.bringDown(PLAIN.round.next.wall, 1.5);
      run.advance(16);

      expect(placeAt(scene, 4, 8)).toEqual(toCanvas(metricsAt(), 8.5, 4.5));
    });

    it("takes a step the view hasn't begun as not begun", async () => {
      const { shell, run, scene } = await startBoard();

      shell.bringDown(PLAIN.round.next.wall, -0.5);
      run.advance(16);

      expect(placeAt(scene, 4, 8)).toEqual(toCanvas(metricsAt(), 8.5, 5.5));
    });

    it("cuts as much off its bake's top as lies over the ceiling, as the rows come in", async () => {
      const { shell, run, scene } = await startBoard();
      // Phaser keeps the crop where its typings don't show it.
      const crop = vi.spyOn(scene.wall.image, "setCrop");
      const { width, height, unit } = metricsAt();
      const cut = Math.round(0.5 * unit);

      // Wall row 6 comes from row 11, over the ceiling, into row 10.
      shell.bringDown(PLAIN.round.next.wall, 0.5);
      run.advance(16);

      expect(crop).toHaveBeenLastCalledWith(0, cut, width, height - cut);
    });

    it("shows none of a row still wholly over the ceiling", async () => {
      const { shell, run, scene } = await startBoard();
      const crop = vi.spyOn(scene.wall.image, "setCrop");
      const { width, height, unit } = metricsAt();

      shell.bringDown(PLAIN.round.next.wall, 0);
      run.advance(16);

      expect(crop).toHaveBeenLastCalledWith(0, unit, width, height - unit);
    });

    it("cuts nothing off once the wall is in", async () => {
      const { shell, run, scene } = await startBoard();
      shell.bringDown(PLAIN.round.next.wall, 0.5);
      run.advance(16);

      shell.bringDown(PLAIN.round.next.wall, 1);
      run.advance(16);

      expect(scene.wall.image.isCropped).toBe(false);
    });

    it("comes down at once once the player turns motion off", async () => {
      const { shell, run, scene } = await startBoard();
      stillness(shell);

      shell.bringDown(PLAIN.round.next.wall, 0);
      run.advance(16);

      expect(placeAt(scene, 4, 8)).toEqual(toCanvas(metricsAt(), 8.5, 4.5));
    });

    it("comes down at once where the player prefers less motion", async () => {
      const { shell, run, scene } = await startBoard(stillness);

      shell.bringDown(PLAIN.round.next.wall, 0);
      run.advance(16);

      expect(placeAt(scene, 4, 8)).toEqual(toCanvas(metricsAt(), 8.5, 4.5));
    });

    it("stands a wall that rises where it is at once, as a new level's may", async () => {
      const { shell, run, scene } = await startBoard();
      const risen = { ...PLAIN.start.wall, lowestRow: 7 };

      shell.bringDown(risen, 0);
      run.advance(16);

      expect(placeAt(scene, 7, 8)).toEqual(toCanvas(metricsAt(), 8.5, 7.5));
    });

    it("shows the wall where a new layout puts it", async () => {
      const board = await startBoard();

      resizeTo(board, 600, 500);

      expect(placeAt(board.scene, 5, 8)).toEqual(
        toCanvas(metricsAt(600, 500), 8.5, 5.5),
      );
    });

    it("shows the rows a deeper field brings in", async () => {
      const { shell, run, scene } = await startBoard();

      shell.fieldShape = { ...shell.fieldShape, depth: 12 };
      run.advance(16);

      expect(framesAt(scene, 11, 0)).toEqual([
        ...brickLayers(brickAt(PLAIN.start.wall, 6 * COLUMNS)),
      ]);
    });
  });

  describe("the danger", () => {
    /** A wall whose row over the floor's holds bricks the level needs in columns 0, 2 and 4, and steel. */
    const ENDANGERING = wallFrom(["o#o.o.#.."], { lowestRow: 1 });

    it("frames each brick the level needs in the row over the floor's, and no other", async () => {
      const { scene } = await startBoard((shell) => {
        shell.showWall(ENDANGERING);
      });
      const first = scene.wall.warnings[COLUMNS];

      expect({
        framed: framedIn(scene),
        frame: first?.frame.name,
        place: { x: first?.x, y: first?.y },
      }).toEqual({
        framed: [
          [0, 1],
          [2, 1],
          [4, 1],
        ],
        frame: FIELD_FRAMES.warning,
        place: toCanvas(metricsAt(), 0.5, 1.5),
      });
    });

    it("frames none while only bricks the level doesn't need stand there", async () => {
      const { scene } = await startBoard((shell) => {
        shell.showWall(wallFrom(["ooo......", "###......"], { lowestRow: 1 }));
      });

      expect(framedIn(scene)).toEqual([]);
    });

    it("frames none while the wall stands higher", async () => {
      const { scene } = await startBoard();

      expect(framedIn(scene)).toEqual([]);
    });

    it("unframes a brick broken there", async () => {
      const { shell, run, scene } = await startBoard((each) => {
        each.showWall(ENDANGERING);
      });

      shell.showWall(wallFrom(["..o.o.#.."], { lowestRow: 1 }));
      run.advance(16);

      expect(framedIn(scene)).toEqual([
        [2, 1],
        [4, 1],
      ]);
    });

    it("brings the frames down with the wall as it eases", async () => {
      const { shell, run, scene } = await startBoard((each) => {
        each.showWall(wallFrom(["o#o.o.#.."], { lowestRow: 2 }));
      });

      shell.bringDown(ENDANGERING, 0.5);
      run.advance(16);

      // Halfway down a row of 31 px, 15.5 rounded.
      expect(scene.wall.warnings[COLUMNS]?.y).toBe(
        toCanvas(metricsAt(), 0.5, 1.5).y - 16,
      );
    });

    it("keeps the frames on the bricks, and the line lit, through the step that loses the level", async () => {
      const { shell, run, scene } = await startBoard((each) => {
        each.showWall(ENDANGERING);
      });

      shell.bringDown(wallFrom(["o#o.o.#.."], { lowestRow: 0 }), 0.5);
      run.advance(16);

      // Halfway down from the row over the floor's to the floor's.
      expect({
        framed: framedIn(scene),
        y: scene.wall.warnings[0]?.y,
        lit: rectsIn(scene.field.lines, LIGHT.dangerLine).length,
      }).toEqual({
        framed: [
          [0, 0],
          [2, 0],
          [4, 0],
        ],
        y: toCanvas(metricsAt(), 0.5, 0.5).y - 16,
        lit: 1,
      });
    });

    it("shows the frames over the wall and every swell", async () => {
      const { scene } = await startBoard((shell) => {
        shell.showWall(ENDANGERING);
      });
      const swells = scene.wall.swellings.flatMap(({ images }) => images);

      const under = Math.max(...placesInLayer([scene.wall.image, ...swells]));
      const firstFrame = Math.min(...placesInLayer(scene.wall.warnings));

      expect(firstFrame).toBeGreaterThan(under);
    });

    it("brightens the danger line, solid and twice as thick, while one stands in the row over the floor's", async () => {
      const { scene } = await startBoard((shell) => {
        shell.showWall(ENDANGERING);
      });
      const metrics = metricsAt();

      // At 31 px a unit, twice the dashes' 2 px.
      expect(rectsIn(scene.field.lines, LIGHT.dangerLine)).toEqual([
        {
          x: metrics.x,
          y: rowFoot(metrics, 1) - 2,
          width: metrics.width,
          height: 4,
        },
      ]);
    });

    it("brightens the danger line as the wall comes down into the row over the floor's, its count unchanged", async () => {
      const { shell, run, scene } = await startBoard((each) => {
        each.showWall(wallFrom(["o#o.o.#.."], { lowestRow: 2 }));
      });

      shell.bringDown(ENDANGERING, 0);
      run.advance(16);

      expect(rectsIn(scene.field.lines, LIGHT.dangerLine)).toHaveLength(1);
    });

    it("brightens the danger line for a brick in the last column alone", async () => {
      const { scene } = await startBoard((shell) => {
        shell.showWall(wallFrom(["........o"], { lowestRow: 1 }));
      });

      expect(rectsIn(scene.field.lines, LIGHT.dangerLine)).toHaveLength(1);
    });

    it("shows the frames scaled up with the wall's frames past the atlas's largest unit", async () => {
      const { scene } = await startBoard(
        (shell) => {
          shell.showWall(ENDANGERING);
        },
        { width: 1300, height: 1800 },
      );

      expect(scene.wall.warnings.at(-1)?.scale).toBe(
        metricsAt(1300, 1800).unit / MOST_BAKED_UNIT,
      );
    });

    it("dims the danger line again once none stands there", async () => {
      const { shell, run, scene } = await startBoard((each) => {
        each.showWall(ENDANGERING);
      });

      shell.showWall(wallFrom(["o#o.o.#.."], { lowestRow: 2 }));
      run.advance(16);

      expect(
        rectsIn(scene.field.lines, LIGHT.dangerLine).length,
      ).toBeGreaterThan(5);
    });
  });

  describe("the keys", () => {
    it("ask the run to pause and go on", async () => {
      const { shell, run } = await startBoard();

      run.key("keydown", "Escape", "Escape");
      run.key("keydown", "Enter", "Enter");
      run.advance(16);

      expect(shell.commands).toEqual<FieldCommand[]>(["pause", "go"]);
    });

    it.each<[string, string, FieldCommand]>([
      ["KeyP", "p", "toggle"],
      ["KeyX", "x", "skip"],
      ["KeyR", "r", "read"],
      ["NumpadEnter", "Enter", "go"],
    ])("ask what %s asks of the game", async (code, key, command) => {
      const { shell, run } = await startBoard();

      run.key("keydown", code, key);
      run.advance(16);

      expect(shell.commands).toEqual([command]);
    });

    it("ask nothing again as a key held repeats", async () => {
      const { shell, run } = await startBoard();

      run.key("keydown", "Escape", "Escape");
      run.key("keydown", "Escape", "Escape", { repeat: true });
      run.advance(16);

      expect(shell.commands).toEqual(["pause"]);
    });

    it("leave the browser its shortcuts", async () => {
      const { shell, run } = await startBoard();

      run.key("keydown", "Enter", "Enter", { ctrlKey: true });
      run.advance(16);

      expect(shell.commands).toEqual([]);
    });

    it("ask nothing of a key the game doesn't use", async () => {
      const { shell, run } = await startBoard();

      run.key("keydown", "Tab", "Tab");
      run.advance(16);

      expect(shell.commands).toEqual([]);
    });
  });

  describe("the pictures", () => {
    it("are none of them encoded as the atlas is baked", async () => {
      const encode = vi.spyOn(Textures.TextureManager.prototype, "getBase64");
      const { shell, run } = await startBoard();
      shell.colors = DARK;

      run.advance(16);

      expect(encode).not.toHaveBeenCalled();
    });

    it("hand over the atlas's picture of each kind of brick, one a kind, as the shell asks for them", async () => {
      const { shell, scene } = await startBoard();
      const baked = recordOf(BRICK_KIND_IDS, (kind) =>
        scene.textures.getBase64(ATLAS, PICTURE_FRAMES.bricks[kind]),
      );

      const pictures = shell.askPictures();

      expect(pictures).toEqual({ bricks: baked });
    });

    it.each(BRICK_KIND_IDS)(
      "picture a whole %s, of the fewest hits a level gives it, in the first tint, plated toward the floor if it is plated, as a v is",
      (kind) => {
        const { hits } = brickKind(kind);
        const full = hits === "never" ? 0 : hits;
        const plates = kind === "plated" ? FLOORWARD : 0;

        expect(PICTURE_LAYERS[kind]).toEqual(
          brickLayers({ kind, tint: 0, hits: full, full, plates }),
        );
      },
    );

    it("are kept until the atlas is baked again", async () => {
      const { shell, run } = await startBoard();
      const asked = shell.askPictures();
      run.advance(16);

      const again = shell.askPictures();

      expect(again).toBe(asked);
    });

    it("are encoded anew once the atlas is baked again, as in a new palette", async () => {
      const { shell, run } = await startBoard();
      const asked = shell.askPictures();
      shell.colors = DARK;
      run.advance(16);

      const again = shell.askPictures();

      expect(again).not.toBe(asked);
    });
  });

  describe("the sounds", () => {
    it("are the view's, in the sprite's order", () => {
      expect(Object.keys(spritemap.spritemap)).toEqual(SOUNDS);
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

    it("leave the field drawn where they can't be loaded", async () => {
      const { scene } = await startBoard();

      expect({
        loaded: scene.sounds.loaded,
        shown: framesAt(scene, 5, 0).length,
      }).toEqual({ loaded: false, shown: 1 });
    });
  });

  describe("drawing", () => {
    it("makes no game object after the first frame, through a step, a new layout and a new palette", async () => {
      const board = await startBoard();
      const first = objectsIn(board.scene);

      board.shell.bringDown(PLAIN.start.wall, 0.5);
      board.shell.colors = DARK;
      resizeTo(board, 600, 500);
      board.shell.bringDown(PLAIN.start.wall, 1);
      board.run.advance(16);

      expect(objectsIn(board.scene)).toBe(first);
    });

    it("makes no game object through 600 frames of a flight, its wall's jump and its rest", async () => {
      const { shell, run, scene } = await startBoard((each) => {
        each.aim(ZAP);
      });
      const before = objectsIn(scene);
      const shards = scene.effects.shards.getParticleCount();

      shell.play?.release(ZAP.round);
      run.advance(600 * 16);

      expect({
        objects: objectsIn(scene),
        shards: scene.effects.shards.getParticleCount(),
        settled: shell.play?.phase,
        rested: shell.play?.view.wall,
      }).toEqual({
        objects: before,
        shards,
        settled: "settling",
        rested: ZAP.round.next.wall,
      });
    });
  });

  describe("the steering", () => {
    it("turns the aim as an arrow key is pressed", async () => {
      const { shell, run } = await startBoard();

      run.key("keydown", "ArrowLeft", "ArrowLeft");
      run.advance(16);

      expect(shell.steers.at(-1)).toMatchObject({
        aim: STRAIGHT_UP + AIMS_PER_DEGREE,
        keyed: true,
      });
    });

    it("lets the shot fly as Space is pressed", async () => {
      const { shell, run } = await startBoard();

      run.key("keydown", "Space", " ");
      run.advance(16);

      expect(shell.steers.at(-1)?.release).toBe(true);
    });

    it("keeps the arrows and Space from the page, which would scroll", async () => {
      const { scene } = await startBoard();

      expect(scene.input.keyboard?.getCaptures()).toEqual(
        expect.arrayContaining([37, 38, 39, 40, 32]),
      );
    });

    it("calls off a charge building at Escape, which pauses nothing", async () => {
      const { shell, run } = await startBoard();
      run.key("keydown", "ArrowUp", "ArrowUp");
      run.advance(16);

      run.key("keydown", "Escape", "Escape");
      run.advance(16);

      expect({
        charge: shell.steers.at(-1)?.charge,
        commands: shell.commands,
      }).toEqual({ charge: 0, commands: [] });
    });

    it("hands the shell fast-forward while F is held, until it is let go", async () => {
      const { shell, run } = await startBoard();
      run.key("keydown", "KeyF", "f");
      run.advance(16);
      const held = shell.steers.at(-1)?.fast;

      run.key("keyup", "KeyF", "f");
      run.advance(16);

      expect({ held, let: shell.steers.at(-1)?.fast }).toEqual({
        held: true,
        let: false,
      });
    });

    it("follows two fingers, so a second press can call the shot off", async () => {
      const { scene } = await startBoard();

      expect(scene.input.manager.pointersTotal).toBe(MOST_FINGERS);
    });

    it("aims a pointing mouse from where the shell says the fuzzball waits", async () => {
      const { shell, run } = await startBoard((each) => {
        each.waiting = 2;
      });
      const at = toCanvas(metricsAt(), 6, 6);
      run.pointer("move", at.x, at.y);
      run.advance(16);
      const from2 = shell.steers.at(-1)?.aim;

      shell.waiting = 7;
      run.advance(32);

      expect({ from2, from7: shell.steers.at(-1)?.aim }).toEqual({
        from2: aimToward(4, 6 - RADIUS),
        from7: aimToward(-1, 6 - RADIUS),
      });
    });

    it("aims a pointer on the field as a new layout lays it out", async () => {
      const board = await startBoard((each) => {
        each.waiting = 2;
      });
      resizeTo(board, 600, 500);

      const at = toCanvas(metricsAt(600, 500), 6, 6);
      board.run.pointer("move", at.x, at.y);
      board.run.advance(16);

      expect(board.shell.steers.at(-1)?.aim).toBe(aimToward(4, 6 - RADIUS));
    });

    it("keeps aiming from where the fuzzball last waited while it flies", async () => {
      const { shell, run } = await startBoard((each) => {
        each.waiting = 2;
      });
      shell.waiting = null;
      run.advance(16);

      const at = toCanvas(metricsAt(), 6, 6);
      run.pointer("move", at.x, at.y);
      run.advance(16);

      expect(shell.steers.at(-1)?.aim).toBe(aimToward(4, 6 - RADIUS));
    });

    it("lets the shot fly as a mouse's press is let go", async () => {
      const { shell, run } = await startBoard((each) => {
        each.waiting = 4.5;
      });
      const at = toCanvas(metricsAt(), 4.5, 6);
      run.pointer("down", at.x, at.y);
      run.advance(300);

      run.pointer("up", at.x, at.y);
      run.advance(16);

      expect(shell.steers.at(-1)).toMatchObject({ release: true, charge: 1 });
    });

    it("aims a mouse pointing past the field's frame, where the camera shows nothing", async () => {
      const { shell, run, scene } = await startBoard((each) => {
        each.waiting = 4.5;
      });
      const metrics = metricsAt();
      const x = frameOf(scene).x - 4;
      const { y } = toCanvas(metrics, 0, 3);

      run.pointer("move", x, y);
      run.advance(16);

      expect(shell.steers.at(-1)?.aim).toBe(
        aimToward((x - metrics.x) / metrics.unit - 4.5, 3 - RADIUS),
      );
    });

    it("lets the shot fly as a mouse's press past the field's frame is let go", async () => {
      const { shell, run, scene } = await startBoard((each) => {
        each.waiting = 4.5;
      });
      const x = frameOf(scene).x - 4;
      const { y } = toCanvas(metricsAt(), 0, 6);
      run.pointer("down", x, y);
      run.advance(300);

      run.pointer("up", x, y);
      run.advance(16);

      expect(shell.steers.at(-1)).toMatchObject({ release: true, charge: 1 });
    });

    it("lets the shot fly as a mouse's press is let go past the canvas", async () => {
      const { shell, run } = await startBoard((each) => {
        each.waiting = 4.5;
      });
      const at = toCanvas(metricsAt(), 4.5, 6);
      run.pointer("down", at.x, at.y);
      run.advance(16);

      run.pointer("up", at.x, at.y, { on: document.body });
      run.advance(16);

      expect(shell.steers.at(-1)?.release).toBe(true);
    });

    it("turns the aim an aim each turn of the wheel", async () => {
      const { shell, run } = await startBoard();
      const at = toCanvas(metricsAt(), 4.5, 6);

      run.wheel(100, at.x, at.y);
      run.advance(16);

      expect(shell.steers.at(-1)?.aim).toBe(STRAIGHT_UP - 1);
    });

    it("calls a charge off at the mouse's right button, letting nothing fly as the press ends", async () => {
      const { shell, run } = await startBoard((each) => {
        each.waiting = 4.5;
      });
      const at = toCanvas(metricsAt(), 4.5, 6);
      run.pointer("down", at.x, at.y);
      run.advance(600);
      const built = shell.steers.at(-1)?.charge;

      run.pointer("down", at.x, at.y, { button: 2 });
      run.advance(16);
      run.pointer("up", at.x, at.y);
      run.advance(16);

      expect({
        built,
        charge: shell.steers.at(-1)?.charge,
        flown: shell.steers.some((steer) => steer.release),
      }).toEqual({ built: 2, charge: 0, flown: false });
    });

    it("charges a finger held still where it points, and lets the shot fly as it lifts", async () => {
      const { shell, run } = await startBoard((each) => {
        each.waiting = 2;
      });
      const at = toCanvas(metricsAt(), 6, 6);
      run.touch("start", at.x, at.y);
      run.advance(600);
      const held = shell.steers.at(-1)?.charge;

      run.touch("end", at.x, at.y);
      run.advance(16);
      const flown = shell.steers.find((steer) => steer.release);

      expect({ held, aim: flown?.aim, charge: flown?.charge }).toEqual({
        held: 2,
        aim: aimToward(4, 6 - RADIUS),
        charge: 2,
      });
    });

    it("calls a pulled shot off as the browser takes its touch away", async () => {
      const { shell, run } = await startBoard((each) => {
        each.waiting = 4.5;
        each.aimingSet = "pullBack";
      });
      const from = toCanvas(metricsAt(), 4.5, 8);
      const to = toCanvas(metricsAt(), 4.5, 5);
      run.touch("start", from.x, from.y);
      run.touch("move", to.x, to.y);
      run.advance(16);
      const pulled = shell.steers.at(-1)?.charge;

      run.touch("cancel", to.x, to.y);
      run.advance(16);

      expect({
        pulled,
        charge: shell.steers.at(-1)?.charge,
        flown: shell.steers.some((steer) => steer.release),
      }).toEqual({ pulled: 2, charge: 0, flown: false });
    });

    it("lets go of every key and the press as the player looks away", async () => {
      const { shell, run } = await startBoard((each) => {
        each.waiting = 4.5;
      });
      const at = toCanvas(metricsAt(), 4.5, 6);
      run.key("keydown", "KeyF", "f");
      run.pointer("down", at.x, at.y);
      run.advance(600);

      run.game.events.emit(Core.Events.BLUR);
      run.advance(16);
      run.pointer("up", at.x, at.y);
      run.advance(16);

      expect({
        fast: shell.steers.at(-1)?.fast,
        charge: shell.steers.at(-1)?.charge,
        flown: shell.steers.some((steer) => steer.release),
      }).toEqual({ fast: false, charge: 0, flown: false });
    });

    it("hands the steering how the mouse and fingers aim as the settings change", async () => {
      const { shell, run } = await startBoard((each) => {
        each.waiting = 2;
      });
      shell.aimingSet = "pullBack";
      run.advance(16);

      const at = toCanvas(metricsAt(), 6, 6);
      run.pointer("move", at.x, at.y);
      run.advance(16);

      expect(shell.steers.at(-1)?.aim).toBe(STRAIGHT_UP);
    });
  });

  describe("the fuzzballs", () => {
    it("draw the fuzzball waiting on the floor, its fur uncombed, its eyes looking along the aim", async () => {
      const { scene } = await startBoard((shell) => {
        shell.waiting = 3;
      });
      const [body] = scene.balls.bodies;
      const [eyes] = scene.balls.eyes;
      const place = toCanvas(metricsAt(), 3, RADIUS);
      const [dx, dy] = AIMS[STRAIGHT_UP] ?? [0, 0];

      expect({
        frame: body?.frame.name,
        place: { x: body?.x, y: body?.y },
        eyes: { x: eyes?.x, y: eyes?.y, frame: eyes?.frame.name },
      }).toEqual({
        frame: FRAMES.fuzzball(0),
        place,
        eyes: {
          x: place.x + FUZZBALL_LOOK.across * GRID * dx,
          y: place.y - FUZZBALL_LOOK.down * GRID * dy,
          frame: FRAMES.eyes,
        },
      });
    });

    it("comb the waiting fuzzball's fur as the charge rises", async () => {
      const { run, scene } = await startBoard((shell) => {
        shell.waiting = 3;
      });

      run.key("keydown", "ArrowUp", "ArrowUp");
      run.key("keydown", "ArrowUp", "ArrowUp");
      run.advance(16);

      expect(scene.balls.bodies[0]?.frame.name).toBe(FRAMES.fuzzball(2));
    });

    it("turn the waiting fuzzball's eyes as the aim turns", async () => {
      const { run, scene } = await startBoard((shell) => {
        shell.waiting = 3;
      });

      run.key("keydown", "ArrowRight", "ArrowRight", { shiftKey: true });
      run.advance(16);

      const [dx] = AIMS[STRAIGHT_UP - 1] ?? [0, 0];
      expect(scene.balls.eyes[0]?.x).toBe(
        toCanvas(metricsAt(), 3, RADIUS).x + FUZZBALL_LOOK.across * GRID * dx,
      );
    });

    it("show the waiting fuzzball as a hot shot while it carries that boon", async () => {
      const { scene } = await startBoard((shell) => {
        shell.waiting = 3;
        shell.carried = "hot";
      });

      expect(scene.balls.bodies[0]?.frame.name).toBe(FRAMES.hotShot);
    });

    it.each([
      [2, [3.4, 2.7, 2]],
      [7, [5.6, 6.3, 7]],
    ])(
      "wait at %s with a triple shot's two mates beside it, toward the floor's middle",
      async (waiting, places) => {
        const { scene } = await startBoard((shell) => {
          shell.waiting = waiting;
          shell.carried = "triple";
        });

        expect(
          scene.balls.bodies
            .filter((body) => body.visible)
            .map((body) => ({ x: body.x, frame: body.frame.name })),
        ).toEqual(
          places.map((x) => ({
            x: toCanvas(metricsAt(), x, RADIUS).x,
            frame: FRAMES.fuzzball(0),
          })),
        );
      },
    );

    it("flare the boon in as the wall jumps, from small, past its size, to its size", async () => {
      const { shell, run, scene } = await startBoard((each) => {
        each.waiting = 3;
        each.carried = "hot";
      });

      shell.beat("jump");
      run.advance(16);
      const first = scene.balls.bodies[0]?.scale ?? 0;
      run.advance(FLARE_MS / 2);
      const halfway = scene.balls.bodies[0]?.scale ?? 0;
      run.advance(FLARE_MS);

      expect({
        first: rounded(first),
        past: halfway > 1,
        last: scene.balls.bodies[0]?.scale,
      }).toEqual({ first: FLARE_FROM, past: true, last: 1 });
    });

    it("flare a triple shot's mates in beside the fuzzball as the wall jumps", async () => {
      const { shell, run, scene } = await startBoard((each) => {
        each.waiting = 3;
        each.carried = "triple";
      });

      shell.beat("jump");
      run.advance(16);

      // Each one's eyes as far over its middle as its size.
      const [, dy] = AIMS[STRAIGHT_UP] ?? [0, 0];
      const look = FUZZBALL_LOOK.down * GRID * dy;
      expect(
        scene.balls.bodies
          .filter((body) => body.visible)
          .map((body, at) => ({
            scale: rounded(body.scale),
            look: rounded(body.y - (scene.balls.eyes[at]?.y ?? 0)),
          })),
      ).toEqual([
        { scale: FLARE_FROM, look: rounded(look * FLARE_FROM) },
        { scale: FLARE_FROM, look: rounded(look * FLARE_FROM) },
        { scale: 1, look: rounded(look) },
      ]);
    });

    it("flare the eyes in with the boon, as far from its middle as its size", async () => {
      const { shell, run, scene } = await startBoard((each) => {
        each.waiting = 3;
        each.carried = "hot";
      });

      shell.beat("jump");
      run.advance(16);

      const place = toCanvas(metricsAt(), 3, RADIUS);
      const [, dy] = AIMS[STRAIGHT_UP] ?? [0, 0];
      expect(rounded(scene.balls.eyes[0]?.y ?? 0)).toBe(
        rounded(place.y - FUZZBALL_LOOK.down * GRID * FLARE_FROM * dy),
      );
    });

    it("draw each fuzzball in the air at its middle, at its charge, its eyes the way it flew off", async () => {
      const { shell, run, scene } = await startBoard((each) => {
        each.fly(PUNCH);
      });
      run.advance(48);

      const [ball] = shell.play?.view.balls ?? [];
      const [body] = scene.balls.bodies;
      const [eyes] = scene.balls.eyes;
      const place = toCanvas(metricsAt(), ball?.x ?? 0, ball?.y ?? 0);
      const { dx, dy } = launchOf(PUNCH);
      expect({
        frame: body?.frame.name,
        place: { x: body?.x, y: body?.y },
        eyes: { x: eyes?.x, y: eyes?.y },
      }).toEqual({
        frame: FRAMES.fuzzball(PUNCH.shot.charge),
        place,
        eyes: {
          x: place.x + FUZZBALL_LOOK.across * GRID * dx,
          y: place.y - FUZZBALL_LOOK.down * GRID * dy,
        },
      });
    });

    it("draw no fuzzball waiting while the player's is in the air", async () => {
      const { run, scene } = await startBoard((shell) => {
        shell.fly(PLAIN);
      });

      run.advance(48);

      expect(showing(scene.balls.bodies)).toBe(1);
    });

    it("draw a friend in its ink", async () => {
      const { run, scene } = await startBoard((shell) => {
        shell.fly(FRIEND);
      });

      run.advance(200);

      expect(
        scene.balls.bodies
          .filter((body) => body.visible)
          .map((body) => body.frame.name),
      ).toEqual([FRAMES.fuzzball(FRIEND.shot.charge), FRAMES.friend(2)]);
    });

    it("draw a friend in its ink round after round", async () => {
      const { shell, run, scene } = await startBoard((each) => {
        each.fly(FRIEND);
      });
      run.advance(10000);

      shell.play?.aim(FRIEND.start);
      shell.play?.release(FRIEND.round);
      run.advance(200);

      expect(
        scene.balls.bodies
          .filter((body) => body.visible)
          .map((body) => body.frame.name),
      ).toEqual([FRAMES.fuzzball(FRIEND.shot.charge), FRAMES.friend(2)]);
    });

    it("draw a hot shot in the air as one", async () => {
      const { run, scene } = await startBoard((shell) => {
        shell.fly(HOT_SHOT);
      });

      run.advance(48);

      expect(scene.balls.bodies[0]?.frame.name).toBe(FRAMES.hotShot);
    });

    it("turn a fuzzball's eyes as it turns, and down as it yawns", async () => {
      const { shell, run, scene } = await startBoard((each) => {
        each.round = { ...each.round, balls: [ballAt(0, 4, 4)] };
      });
      const place = toCanvas(metricsAt(), 4, 4);
      shell.reach([TURN_LEFT, []]);
      run.advance(16);
      const turned = scene.balls.eyes[0]?.x;

      shell.reach([YAWN, []]);
      run.advance(16);

      const eyes = scene.balls.eyes[0];
      expect({ turned, yawned: { x: eyes?.x, y: eyes?.y } }).toEqual({
        turned: place.x - FUZZBALL_LOOK.across * GRID,
        yawned: { x: place.x, y: place.y + FUZZBALL_LOOK.down * GRID },
      });
    });

    it("look up, as one that has not flown off yet", async () => {
      const { scene } = await startBoard((shell) => {
        shell.round = { ...shell.round, balls: [ballAt(3, 4, 4)] };
      });

      expect(scene.balls.eyes[0]?.y).toBe(
        toCanvas(metricsAt(), 4, 4).y - FUZZBALL_LOOK.down * GRID,
      );
    });

    it("hold a body and its eyes for the most fuzzballs in the air, made once", async () => {
      const { scene } = await startBoard();

      expect([scene.balls.bodies.length, scene.balls.eyes.length]).toEqual([
        MOST_FUZZBALLS,
        MOST_FUZZBALLS,
      ]);
    });

    it("show no more fuzzballs than the pool holds", async () => {
      const { scene } = await startBoard((shell) => {
        shell.waiting = 3;
        shell.round = {
          ...shell.round,
          balls: Array.from({ length: MOST_FUZZBALLS + 2 }, (_, ball) =>
            ballAt(ball, 4, 4),
          ),
        };
      });

      expect(showing(scene.balls.bodies)).toBe(MOST_FUZZBALLS);
    });

    it("draw each eye over its own body, and a later body over an earlier's eyes", async () => {
      const { scene } = await startBoard();
      const [body0, body1] = scene.balls.bodies;
      const [eyes0] = scene.balls.eyes;

      if (!body0 || !eyes0 || !body1) throw new Error("No fuzzball.");

      const [first, eyes, second] = placesInLayer([body0, eyes0, body1]);

      expect([eyes, second]).toEqual([(first ?? 0) + 1, (first ?? 0) + 2]);
    });
  });

  describe("the meter", () => {
    it("shows five pips in an arc under the waiting fuzzball, lit from the left as far as the charge", async () => {
      // A unit large enough that a pip a degree or two off its place
      // stands a pixel or more off it.
      const canvas = { width: 1300, height: 1800 } as const;
      const { run, scene } = await startBoard((shell) => {
        shell.waiting = 3;
      }, canvas);

      run.key("keydown", "ArrowUp", "ArrowUp");
      run.key("keydown", "ArrowUp", "ArrowUp");
      run.advance(16);

      // As the art draws them: 20.5 of a cell of 40 from the fuzzball's
      // middle, 58° and 29° either side of straight under it.
      const metrics = metricsAt(canvas.width, canvas.height);
      const middle = toCanvas(metrics, 3, RADIUS);
      const reach = (20.5 / 40) * metrics.unit;
      const places = [-58, -29, 0, 29, 58].map((degrees) => ({
        x: middle.x + reach * Math.sin((degrees * Math.PI) / 180),
        y: middle.y + reach * Math.cos((degrees * Math.PI) / 180),
      }));
      // Each on whole pixels, so within half a pixel of its place.
      expect(
        scene.meter.pips.map((pip, at) => ({
          frame: pip.frame.name,
          placed:
            Math.abs(pip.x - (places[at]?.x ?? 0)) <= 0.5 &&
            Math.abs(pip.y - (places[at]?.y ?? 0)) <= 0.5,
        })),
      ).toEqual(
        [0, 1, 2, 3, 4].map((at) => ({
          frame: at < 2 ? FRAMES.meterOn : FRAMES.meterOff,
          placed: true,
        })),
      );
    });

    it("stands its pips on whole pixels", async () => {
      const { scene } = await startBoard((shell) => {
        shell.waiting = 3.3;
      });

      expect(
        scene.meter.pips.every(
          (pip) =>
            Number.isInteger(pip.x - pip.displayWidth / 2) &&
            Number.isInteger(pip.y - pip.displayHeight / 2),
        ),
      ).toBe(true);
    });

    it("lights every pip for a hot shot, whose charge is full", async () => {
      const { scene } = await startBoard((shell) => {
        shell.waiting = 3;
        shell.carried = "hot";
      });

      expect(scene.meter.pips.map((pip) => pip.frame.name)).toEqual(
        Array.from({ length: MOST_CHARGE }, () => FRAMES.meterOn),
      );
    });

    it("hides while the fuzzball is in the air", async () => {
      const { scene } = await startBoard();

      expect(showing(scene.meter.pips)).toBe(0);
    });

    it("hides as the fuzzball flies off", async () => {
      const { shell, run, scene } = await startBoard((each) => {
        each.waiting = 3;
      });

      shell.waiting = null;
      run.advance(16);

      expect(showing(scene.meter.pips)).toBe(0);
    });

    it("shows again as the fuzzball waits where it flew from", async () => {
      const { shell, run, scene } = await startBoard((each) => {
        each.waiting = 3;
      });
      shell.waiting = null;
      run.advance(16);

      shell.waiting = 3;
      run.advance(16);

      expect(showing(scene.meter.pips)).toBe(MOST_CHARGE);
    });

    it("follows the fuzzball to where the next round waits", async () => {
      const { shell, run, scene } = await startBoard((each) => {
        each.waiting = 3;
      });

      shell.waiting = 5;
      run.advance(16);

      expect(middlePipUnder(scene, toCanvas(metricsAt(), 5, RADIUS))).toBe(
        true,
      );
    });

    it("moves with the field as the chrome over it changes", async () => {
      const { shell, run, scene } = await startBoard((each) => {
        each.waiting = 3;
      });
      const lopsided = { ...INSETS, left: 60 };

      shell.chrome = lopsided;
      run.advance(16);

      const metrics = fieldMetrics(
        viewport(CANVAS.width, CANVAS.height, 1, lopsided),
        shell.fieldShape,
      );
      expect(middlePipUnder(scene, toCanvas(metrics, 3, RADIUS))).toBe(true);
    });

    it("unlights its pips as the charge falls", async () => {
      const { run, scene } = await startBoard((shell) => {
        shell.waiting = 3;
      });
      run.key("keydown", "ArrowUp", "ArrowUp");
      run.key("keydown", "ArrowUp", "ArrowUp");
      run.advance(16);

      run.key("keydown", "ArrowDown", "ArrowDown");
      run.key("keydown", "ArrowDown", "ArrowDown");
      run.advance(16);

      expect(scene.meter.pips.map((pip) => pip.frame.name)).toEqual(
        Array.from({ length: MOST_CHARGE }, () => FRAMES.meterOff),
      );
    });
  });

  describe("the guide", () => {
    it("draws a dot at each of the guide's places, on whole pixels", async () => {
      const { scene } = await startBoard((shell) => {
        shell.casting = () => ({
          dots: [
            { x: 3.3, y: 2.2 },
            { x: 4.1, y: 3.7 },
          ],
          punched: [],
        });
      });

      expect(
        scene.guide.dots
          .filter((dot) => dot.visible)
          .map((dot) => ({
            frame: dot.frame.name,
            whole:
              Number.isInteger(dot.x - dot.displayWidth / 2) &&
              Number.isInteger(dot.y - dot.displayHeight / 2),
          })),
      ).toEqual([
        { frame: FRAMES.guideDot, whole: true },
        { frame: FRAMES.guideDot, whole: true },
      ]);
    });

    it("draws each dot at its place, to the pixel", async () => {
      const { scene } = await startBoard((shell) => {
        shell.casting = () => ({ dots: [{ x: 3.3, y: 2.2 }], punched: [] });
      });
      const place = toCanvas(metricsAt(), 3.3, 2.2);

      const [dot] = scene.guide.dots;

      expect({
        x: Math.abs((dot?.x ?? 0) - place.x) <= 0.5,
        y: Math.abs((dot?.y ?? 0) - place.y) <= 0.5,
      }).toEqual({ x: true, y: true });
    });

    it("outlines each brick the shot would punch through", async () => {
      const { scene } = await startBoard((shell) => {
        shell.casting = () => ({ dots: [], punched: [8, 7] });
      });

      expect(
        scene.guide.punches
          .filter((punch) => punch.visible)
          .map((punch) => ({
            x: punch.x,
            y: punch.y,
            frame: punch.frame.name,
          })),
      ).toEqual([
        { ...toCanvas(metricsAt(), 8.5, 5.5), frame: FRAMES.guidePunch },
        { ...toCanvas(metricsAt(), 7.5, 5.5), frame: FRAMES.guidePunch },
      ]);
    });

    it("outlines no brick waiting over the ceiling", async () => {
      const { scene } = await startBoard((shell) => {
        // Wall cell 54 stands in row 11, over the ceiling of a field 11 deep.
        shell.casting = () => ({ dots: [], punched: [54] });
      });

      expect(showing(scene.guide.punches)).toBe(0);
    });

    it("draws the guide the rules cast for the shot steered, a dot at each of its places", async () => {
      const { start } = PLAIN;
      const { run, scene } = await startBoard((shell) => {
        shell.waiting = start.x;
        shell.casting = ({ aim, charge }) =>
          guideOf(start, { aim, charge }, GUIDE_PAST_TURN);
      });

      run.key("keydown", "ArrowLeft", "ArrowLeft");
      run.advance(16);

      const { dots } = guideOf(
        start,
        { aim: STRAIGHT_UP + AIMS_PER_DEGREE, charge: 0 },
        GUIDE_PAST_TURN,
      );
      const drawn = scene.guide.dots.filter((dot) => dot.visible);
      // Each on whole pixels, so within half a pixel of its place.
      expect({
        shown: drawn.length > 0,
        count: drawn.length,
        placed: drawn.every((dot, at) => {
          const place = toCanvas(
            metricsAt(),
            dots[at]?.x ?? 0,
            dots[at]?.y ?? 0,
          );
          return (
            Math.abs(dot.x - place.x) <= 0.5 && Math.abs(dot.y - place.y) <= 0.5
          );
        }),
      }).toEqual({ shown: true, count: dots.length, placed: true });
    });

    it("follows the aim as the shell casts it anew", async () => {
      const { run, scene } = await startBoard((shell) => {
        shell.waiting = 4.5;
        shell.casting = ({ aim }) => {
          const [dx, dy] = AIMS[aim] ?? [0, 0];
          return {
            dots: [{ x: 4.5 + 3 * dx, y: RADIUS + 3 * dy }],
            punched: [],
          };
        };
      });

      run.key("keydown", "ArrowLeft", "ArrowLeft");
      run.advance(16);

      const [dx, dy] = AIMS[STRAIGHT_UP + AIMS_PER_DEGREE] ?? [0, 0];
      const place = toCanvas(metricsAt(), 4.5 + 3 * dx, RADIUS + 3 * dy);
      const [dot] = scene.guide.dots;
      expect(Math.abs((dot?.x ?? 0) - place.x) <= 0.5).toBe(true);
    });

    it("outlines the bricks anew as the wall moves under the same guide", async () => {
      const guide: Guide = { dots: [], punched: [8] };
      const { shell, run, scene } = await startBoard((each) => {
        each.casting = () => guide;
      });

      shell.showWall({ ...PLAIN.start.wall, lowestRow: 4 });
      run.advance(16);

      const [punch] = scene.guide.punches;
      expect({ x: punch?.x, y: punch?.y }).toEqual(
        toCanvas(metricsAt(), 8.5, 4.5),
      );
    });

    it("moves the same guide with the field as the chrome over it changes", async () => {
      const guide: Guide = { dots: [{ x: 3.3, y: 2.2 }], punched: [] };
      const { shell, run, scene } = await startBoard((each) => {
        each.casting = () => guide;
      });
      const lopsided = { ...INSETS, left: 60 };

      shell.chrome = lopsided;
      run.advance(16);

      const metrics = fieldMetrics(
        viewport(CANVAS.width, CANVAS.height, 1, lopsided),
        shell.fieldShape,
      );
      const place = toCanvas(metrics, 3.3, 2.2);
      const [dot] = scene.guide.dots;
      expect(Math.abs((dot?.x ?? 0) - place.x) <= 0.5).toBe(true);
    });

    it("hides the guide where none shows", async () => {
      const { shell, run, scene } = await startBoard((each) => {
        each.casting = () => ({ dots: [{ x: 3, y: 3 }], punched: [8] });
      });

      shell.casting = null;
      run.advance(16);

      expect([showing(scene.guide.dots), showing(scene.guide.punches)]).toEqual(
        [0, 0],
      );
    });

    it("leaves out a dot that would crowd a dot of the jump line's count, so the count reads alone", async () => {
      const { scene } = await startBoard((shell) => {
        const { x, y } = countPlace(0, shell.fieldShape.depth);
        shell.casting = () => ({
          dots: [
            { x, y },
            { x, y: y - 0.3 },
            { x, y: y - 0.5 },
          ],
          punched: [],
        });
      });

      // At 31 px a unit, a dot 4 px wide keeps its edge 0.22 of a unit,
      // 6.82 px, from a count's 4 px dot, so its middle 10.82 px from the
      // count's: one 9 px off, on whole pixels, is left out, one 16 px off
      // shown.
      expect({
        count: showing(scene.field.countDots),
        dots: scene.guide.dots.slice(0, 3).map((dot) => dot.visible),
      }).toEqual({ count: 2, dots: [false, false, true] });
    });

    it("shows a dot the count crowded once the count goes, under the same guide", async () => {
      const { shell, run, scene } = await startBoard((each) => {
        const guide: Guide = {
          dots: [countPlace(1, each.fieldShape.depth)],
          punched: [],
        };
        each.casting = () => guide;
      });
      const [dot] = scene.guide.dots;
      const before = dot?.visible;

      shell.showWall(wallFrom(["#########"], { lowestRow: 1 }));
      run.advance(16);

      expect({ before, after: dot?.visible }).toEqual({
        before: false,
        after: true,
      });
    });

    it("shows its dots and outlines scaled up past the atlas's largest unit", async () => {
      const { scene } = await startBoard(
        (shell) => {
          shell.casting = () => ({ dots: [{ x: 3, y: 3 }], punched: [8] });
        },
        { width: 1300, height: 1800 },
      );
      const scale = metricsAt(1300, 1800).unit / MOST_BAKED_UNIT;
      const [dot] = scene.guide.dots;
      const [punch] = scene.guide.punches;

      expect({
        dot: dot?.displayWidth,
        punch: punch?.scale,
      }).toEqual({
        dot: Math.round((dot?.width ?? 0) * scale),
        punch: scale,
      });
    });

    it("holds the most dots and outlines it shows, made once", async () => {
      const { scene } = await startBoard();

      expect([scene.guide.dots.length, scene.guide.punches.length]).toEqual([
        MOST_GUIDE_DOTS,
        MOST_PUNCHED,
      ]);
    });
  });

  describe("the flourishes", () => {
    it("swell a struck brick as the strike lands, and settle it back", async () => {
      const { shell, run, scene } = await startBoard();
      // The view hands over another wall as the strike wears the brick.
      const bricks = [...PLAIN.start.wall.bricks];
      bricks[8] = { ...brickAt(PLAIN.start.wall, 8), hits: 1 };
      shell.showWall({ ...PLAIN.start.wall, bricks });
      shell.reach([STRIKE_8, ["swell"]]);
      run.advance(16);
      const swollen = swellAt(scene, 5, 8)[0]?.scale ?? 0;

      run.advance(SWELL_MS);

      expect({
        swollen: rounded(swollen),
        settled: swellAt(scene, 5, 8),
      }).toEqual({ swollen: rounded(1 + SWELL), settled: [] });
    });

    it("swell a struck brick over its cell, cleared from the wall's bake while it swells, and stamped back once it settles", async () => {
      const { shell, run, scene } = await startBoard();
      const layers = [...brickLayers(brickAt(PLAIN.start.wall, 8))];
      shell.reach([STRIKE_8, ["swell"]]);
      run.advance(16);
      const swelling = {
        baked: framesAt(scene, 5, 8),
        swells: swellAt(scene, 5, 8).map((image) => image.frame.name),
        place: { x: swellAt(scene, 5, 8)[0]?.x, y: swellAt(scene, 5, 8)[0]?.y },
      };

      run.advance(SWELL_MS);

      expect({ swelling, settled: framesAt(scene, 5, 8) }).toEqual({
        swelling: {
          baked: [],
          swells: layers,
          place: toCanvas(metricsAt(), 8.5, 5.5),
        },
        settled: layers,
      });
    });

    it("swell as many bricks at once as it has places, the next struck taking the place of the first", async () => {
      const { shell, run, scene } = await startBoard((each) => {
        each.showWall(wallFrom(["ooooooooo", "ooooooooo"], { lowestRow: 5 }));
      });
      // Wall cells 0 to 16 stand in field rows 5 and 6.
      const strikes = Array.from(
        { length: MOST_SWELLING + 1 },
        (_, cell): ReachedEvent => [{ ...STRIKE_8, cell }, ["swell"]],
      );

      shell.reach(...strikes);
      run.advance(16);

      expect({
        first: swellAt(scene, 5, 0),
        last: swellAt(scene, 6, 7).length,
        swelling: scene.wall.swellings.filter(({ images }) =>
          images.some((image) => image.visible),
        ).length,
      }).toEqual({ first: [], last: 1, swelling: MOST_SWELLING });
    });

    it("stamp the first swell's brick back in the bake as a brick struck past the places in a later frame takes its place", async () => {
      const wall = wallFrom(["ooooooooo", "ooooooooo"], { lowestRow: 5 });
      const { shell, run, scene } = await startBoard((each) => {
        each.showWall(wall);
      });
      // Wall cells 0 to 16 stand in field rows 5 and 6, cell 0 swelling
      // first in the pool, cell 16 in field row 6, column 7.
      shell.reach(
        ...Array.from({ length: MOST_SWELLING }, (_, cell): ReachedEvent => [
          { ...STRIKE_8, cell },
          ["swell"],
        ]),
      );
      run.advance(16);

      shell.reach([{ ...STRIKE_8, cell: MOST_SWELLING }, ["swell"]]);
      run.advance(16);

      expect({
        first: framesAt(scene, 5, 0),
        last: framesAt(scene, 6, 7),
      }).toEqual({
        first: [...brickLayers(brickAt(wall, 0))],
        last: [],
      });
    });

    it("swell a brick struck as the wall eases down where the brick shows", async () => {
      const { shell, run, scene } = await startBoard();
      shell.bringDown(PLAIN.round.next.wall, 0);
      run.advance(16);
      shell.bringDown(PLAIN.round.next.wall, 0.5);

      // The tough brick at wall cell 8 stands in field row 4, from row 5.
      shell.reach([STRIKE_8, ["swell"]]);
      run.advance(16);

      expect(swellAt(scene, 4, 8)[0]?.y).toBe(placeAt(scene, 4, 8).y);
    });

    it("swell a brick struck again afresh, in the place it swells in", async () => {
      const { shell, run, scene } = await startBoard();
      shell.reach([STRIKE_8, ["swell"]]);
      run.advance(16);
      run.advance(SWELL_MS / 2);

      shell.reach([STRIKE_8, ["swell"]]);
      run.advance(16);

      expect({
        scale: rounded(swellAt(scene, 5, 8)[0]?.scale ?? 0),
        places: scene.wall.swellings.filter(
          ({ cell }) => cell === 5 * COLUMNS + 8,
        ).length,
      }).toEqual({ scale: rounded(1 + SWELL), places: 1 });
    });

    it("let a swell go as the wall that comes down is handed over, rather than swell the brick come into its row", async () => {
      const rows = ["ooooooooo", "ooooooooo"];
      const { shell, run, scene } = await startBoard((each) => {
        each.showWall(wallFrom(rows, { lowestRow: 5 }));
      });
      shell.reach([STRIKE_8, ["swell"]]);
      run.advance(16);
      const swollen = swellAt(scene, 5, 8).length > 0;
      // Wall cell 17, of the row over cell 8's, comes into field row 5.
      const down = wallFrom(rows, { lowestRow: 4 });

      shell.bringDown(down, 0);
      run.advance(16);

      expect({
        swollen,
        after: scene.wall.swellings.flatMap(({ images }) =>
          images.filter((image) => image.visible),
        ),
        baked: framesAt(scene, 5, 8),
      }).toEqual({
        swollen: true,
        after: [],
        baked: [...brickLayers(brickAt(down, 17))],
      });
    });

    it("burst a broken brick into shards of its color", async () => {
      const { shell, run, scene } = await startBoard();

      shell.reach([PLAIN_BREAK, ["shards"]]);
      run.advance(16);

      const tints: number[] = [];
      scene.effects.shards.forEachAlive((shard) => {
        tints.push(shard.tint);
      }, null);
      expect(tints).toEqual(
        Array.from({ length: SHARDS }, () =>
          brickColor(brickAt(PLAIN.start.wall, 0), LIGHT),
        ),
      );
    });

    it("show the shards scaled up past the atlas's largest unit", async () => {
      const canvas = { width: 1300, height: 1800 } as const;
      const { shell, run, scene } = await startBoard(undefined, canvas);
      const { unit } = metricsAt(canvas.width, canvas.height);

      shell.reach([PLAIN_BREAK, ["shards"]]);
      run.advance(16);

      const scales: number[] = [];
      scene.effects.shards.forEachAlive((shard) => {
        scales.push(shard.scaleX, shard.scaleY);
      }, null);
      expect({ unit: unit > MOST_BAKED_UNIT, scales }).toEqual({
        unit: true,
        scales: Array.from(
          { length: 2 * SHARDS },
          () => unit / MOST_BAKED_UNIT,
        ),
      });
    });

    it("throw no more shards at once than the pool made once holds", async () => {
      const { shell, run, scene } = await startBoard();
      const made = scene.effects.shards.getParticleCount();

      // Every brick of the plain round's wall, 38 of them, broken at once.
      shell.reach(
        ...PLAIN.start.wall.bricks.flatMap((brick, cell) =>
          brick ? [[{ ...PLAIN_BREAK, cell }, ["shards"]] as const] : [],
        ),
      );
      run.advance(16);

      expect({
        made,
        alive: scene.effects.shards.getAliveParticleCount(),
        after: scene.effects.shards.getParticleCount(),
      }).toEqual({
        made: MOST_SHARDS_FLYING,
        alive: MOST_SHARDS_FLYING,
        after: MOST_SHARDS_FLYING,
      });
    });

    it("throw the shards as fast and let them fall as fast as the field's unit has them, laid out anew", async () => {
      const board = await startBoard();

      resizeTo(board, 600, 500);

      const { unit } = metricsAt(600, 500);
      const { shards } = board.scene.effects;
      expect({
        speed: shards.ops.speedX.propertyValue,
        fall: shards.gravityY,
      }).toEqual({
        speed: { min: SHARD_SPEED.least * unit, max: SHARD_SPEED.most * unit },
        fall: SHARD_FALL * unit,
      });
    });

    it("throw no shards for a brick it never drew", async () => {
      const { shell, run, scene } = await startBoard();

      shell.reach([{ ...PLAIN_BREAK, cell: 80 }, ["shards"]]);
      run.advance(16);

      expect(scene.effects.shards.getAliveParticleCount()).toBe(0);
    });

    it("burst a brick broken since the last frame, as the wall drawn then held it", async () => {
      const { shell, run, scene } = await startBoard();
      const bricks = [...PLAIN.start.wall.bricks];
      bricks[0] = null;

      shell.showWall({ ...PLAIN.start.wall, bricks });
      shell.reach([PLAIN_BREAK, ["shards"]]);
      run.advance(16);

      expect(scene.effects.shards.getAliveParticleCount()).toBe(SHARDS);
    });

    it("draw a punch's streak through its brick, the way its fuzzball flew", async () => {
      const { shell, run, scene } = await startBoard();

      shell.reach([LAUNCH_LEFT, []], [STRIKE_8, ["streak"]]);
      run.advance(16);

      const [streak] = scene.effects.streaks.all.filter(
        ({ image }) => image.visible,
      );
      expect({
        x: streak?.image.x,
        y: streak?.image.y,
        rotation: streak?.image.rotation,
        frame: streak?.image.frame.name,
      }).toEqual({
        ...toCanvas(metricsAt(), 8.5, 5.5),
        rotation: Math.atan2(-0.6, -0.8),
        frame: FLIGHT_FRAMES.streak,
      });
    });

    it("draw the streak of a fuzzball the scene never saw fly off straight up", async () => {
      const { shell, run, scene } = await startBoard();

      shell.reach([STRIKE_8, ["streak"]]);
      run.advance(16);

      const [streak] = scene.effects.streaks.all.filter(
        ({ image }) => image.visible,
      );
      expect(streak?.image.rotation).toBe(-Math.PI / 2);
    });

    it("fade a punch's streak through its time, then hide it", async () => {
      const { shell, run, scene } = await startBoard();
      shell.reach([STRIKE_8, ["streak"]]);
      run.advance(16);
      run.advance(STREAK_MS / 2);
      const [streak] = scene.effects.streaks.all;
      const halfway = streak?.image.alpha ?? 0;

      run.advance(STREAK_MS);

      expect({
        halfway: Math.round(halfway * 10) / 10,
        after: streak?.image.visible,
      }).toEqual({ halfway: 0.5, after: false });
    });

    it("draw a zap's bolt along the row it reaches, a piece a cell, from the zapper's middle", async () => {
      const { shell, run, scene } = await startBoard();

      shell.reach([ROW_ZAP, ["bolt"]]);
      run.advance(16);

      expect(
        scene.effects.bolts.all
          .filter(({ image }) => image.visible)
          .map(({ image }) => ({ x: image.x, y: image.y }))
          .sort((a, b) => a.x - b.x),
      ).toEqual(
        [1, 2, 3, 4, 5, 6, 7, 8].map((x) => toCanvas(metricsAt(), x, 5.5)),
      );
    });

    it("draw a zap's bolt up its column, to the field's ceiling and no further", async () => {
      const { shell, run, scene } = await startBoard();

      shell.reach([COLUMN_ZAP, ["bolt"]]);
      run.advance(16);

      expect(
        scene.effects.bolts.all
          .filter(({ image }) => image.visible)
          .map(({ image }) => ({
            y: image.y,
            rotation: image.rotation,
          }))
          .sort((a, b) => b.y - a.y),
      ).toEqual(
        [6, 7, 8, 9, 10, 11].map((y) => ({
          y: toCanvas(metricsAt(), 0, y).y,
          rotation: -Math.PI / 2,
        })),
      );
    });

    it("draw a zap's bolt down its column, to the floor and no further", async () => {
      const { shell, run, scene } = await startBoard((each) => {
        // Rows of the wall under the floor, which the zapper's column
        // reaches down into from the floor's row.
        each.showWall(
          wallFrom(["o........", "o........", "o........"], { lowestRow: -2 }),
        );
      });

      shell.reach([
        { kind: "zap", at: 1, cell: 18, pattern: "column", reaches: [0, 9] },
        ["bolt"],
      ]);
      run.advance(16);

      expect(
        scene.effects.bolts.all
          .filter(({ image }) => image.visible)
          .map(({ image }) => image.y),
      ).toEqual([toCanvas(metricsAt(), 0, 0).y]);
    });

    it("draw a zap's bolt along the diagonals it reaches, each piece stretched across its cell's corners", async () => {
      const { shell, run, scene } = await startBoard();

      shell.reach([X_ZAP, ["bolt"]]);
      run.advance(16);

      const [piece] = scene.effects.bolts.all.filter(
        ({ image }) => image.visible,
      );
      expect({
        x: piece?.image.x,
        y: piece?.image.y,
        stretch: piece?.image.scaleX,
        rotation: rounded(piece?.image.rotation ?? 0),
      }).toEqual({
        ...toCanvas(metricsAt(), 5, 6),
        stretch: Math.SQRT2,
        rotation: rounded(-Math.PI / 4),
      });
    });

    it("fade a zap's bolt through its time, then hide it", async () => {
      const { shell, run, scene } = await startBoard();
      shell.reach([ROW_ZAP, ["bolt"]]);
      run.advance(16);
      run.advance(BOLT_MS / 2);
      const [piece] = scene.effects.bolts.all;
      const halfway = piece?.image.alpha ?? 0;

      run.advance(BOLT_MS);

      expect({
        halfway: Math.round(halfway * 10) / 10,
        after: piece?.image.visible,
      }).toEqual({ halfway: 0.5, after: false });
    });

    it("spread a blast's ring from the bomb", async () => {
      const { shell, run, scene } = await startBoard();

      shell.reach([BLAST, ["ring"]]);
      run.advance(16);

      const [ring] = scene.effects.rings.all.filter(
        ({ image }) => image.visible,
      );
      expect({
        x: ring?.image.x,
        y: ring?.image.y,
        scale: ring?.image.scale,
      }).toEqual({
        ...toCanvas(metricsAt(), 8.5, 5.5),
        scale: RING_FROM,
      });
    });

    it("fade a blast's ring as it spreads, then hide it", async () => {
      const { shell, run, scene } = await startBoard();
      shell.reach([BLAST, ["ring"]]);
      run.advance(16);
      run.advance(RING_MS / 2);
      const [ring] = scene.effects.rings.all;
      const halfway = ring?.image.alpha ?? 0;

      run.advance(RING_MS);

      expect({
        halfway: Math.round(halfway * 10) / 10,
        after: ring?.image.visible,
      }).toEqual({ halfway: 0.5, after: false });
    });

    it.each<
      [
        string,
        ReachedEvent,
        number,
        (scene: WallScene) => readonly GameObjects.Image[],
      ]
    >([
      [
        "streak",
        [STRIKE_8, ["streak"]],
        STREAK_MS,
        (scene) => scene.effects.streaks.all.map(({ image }) => image),
      ],
      [
        "bolt",
        [ROW_ZAP, ["bolt"]],
        BOLT_MS,
        (scene) => scene.effects.bolts.all.map(({ image }) => image),
      ],
      [
        "ring",
        [BLAST, ["ring"]],
        RING_MS,
        (scene) => scene.effects.rings.all.map(({ image }) => image),
      ],
      [
        "hop",
        [FREE, ["hop"]],
        HOP_MS,
        (scene) => scene.effects.hops.all.map(({ body }) => body),
      ],
    ])(
      "show a second %s through its own time, past the end of the first's, then hide it",
      async (_, reached, ms, imagesOf) => {
        const { shell, run, scene } = await startBoard();
        shell.reach(reached);
        run.advance(16);
        const one = showing(imagesOf(scene));
        run.advance(ms / 2);
        shell.reach(reached);
        run.advance(16);
        const both = showing(imagesOf(scene));
        run.advance(ms * 0.75);
        const second = showing(imagesOf(scene));

        run.advance(ms);

        expect({
          shown: one > 0,
          both,
          second,
          after: showing(imagesOf(scene)),
        }).toEqual({ shown: true, both: 2 * one, second: one, after: 0 });
      },
    );

    it("hop a freed friend from its cage down to the floor, then hide it", async () => {
      const { shell, run, scene } = await startBoard();
      shell.reach([FREE, ["hop"]]);
      run.advance(16);
      const [hop] = scene.effects.hops.all;
      const start = { y: hop?.body.y, frame: hop?.body.frame.name };
      run.advance(HOP_MS / 4);
      const risen = (hop?.body.y ?? 0) < (start.y ?? 0);

      run.advance(HOP_MS);

      expect({ start, risen, after: hop?.body.visible }).toEqual({
        start: {
          y: toCanvas(metricsAt(), 8.5, 5.5).y,
          frame: FRAMES.friend(3),
        },
        risen: true,
        after: false,
      });
    });

    it("flash the jump line as the wall jumps, then fade it", async () => {
      const { shell, run, scene } = await startBoard();
      shell.beat("jump");
      run.advance(16);
      const metrics = metricsAt();
      const flash = {
        y: scene.effects.flash.y,
        width: scene.effects.flash.width,
        alpha: scene.effects.flash.fillAlpha,
        color: scene.effects.flash.fillColor,
      };
      run.advance(FLASH_MS / 2);
      const halfway = scene.effects.flash.fillAlpha;

      run.advance(FLASH_MS);

      expect({
        flash,
        halfway: rounded(halfway),
        after: scene.effects.flash.visible,
      }).toEqual({
        flash: {
          y: metrics.y + thirdsOf(11).jump * metrics.unit,
          width: metrics.width,
          alpha: FLASH_ALPHA,
          color: LIGHT.jumpLine,
        },
        halfway: rounded(FLASH_ALPHA / 2),
        after: false,
      });
    });

    it("shake the field as the level is lost, moving the camera's viewport by whole pixels, the world it looks at still", async () => {
      const { shell, run, scene } = await startBoard();
      const rest = cameraOf(scene);
      shell.beat("lost");
      run.advance(16);

      run.advance(16);

      const shaken = cameraOf(scene);
      expect({
        moved: shaken.x !== rest.x || shaken.y !== rest.y,
        whole: Number.isInteger(shaken.x) && Number.isInteger(shaken.y),
        scrolled: [shaken.scrollX, shaken.scrollY],
      }).toEqual({
        moved: true,
        whole: true,
        scrolled: [rest.scrollX, rest.scrollY],
      });
    });

    it("still the field once the shake is over, the viewport back at rest", async () => {
      const { shell, run, scene } = await startBoard();
      const rest = cameraOf(scene);
      shell.beat("lost");
      run.advance(32);

      run.advance(SHAKE_MS);

      expect(cameraOf(scene)).toEqual(rest);
    });

    it("still a shaken field where it is laid out again before the shake is over", async () => {
      const board = await startBoard();
      board.shell.beat("lost");
      board.run.advance(16);
      resizeTo(board, 600, 500);

      board.run.advance(SHAKE_MS);

      const frame = frameOf(board.scene);
      expect(cameraOf(board.scene)).toEqual({
        ...frame,
        scrollX: frame.x,
        scrollY: frame.y,
      });
    });

    it("play a flight's last flourishes where their bricks still show, as the wall that comes down is handed over", async () => {
      const { shell, run, scene } = await startBoard();

      // The frame that reaches the flight's last events hands over the
      // wall the round leaves, a row lower, drawn where the flight's stood.
      shell.bringDown(PLAIN.round.next.wall, 0);
      shell.reach([ROW_ZAP, ["bolt", "ring"]]);
      run.advance(16);

      const middle = toCanvas(metricsAt(), 4.5, 5.5).y;
      const rows = scene.effects.bolts.all
        .filter(({ image }) => image.visible)
        .map(({ image }) => image.y);
      expect({
        bolts: [...new Set(rows)],
        ring: scene.effects.rings.all.find(({ image }) => image.visible)?.image
          .y,
      }).toEqual({ bolts: [middle], ring: middle });
    });

    it("play none where the player prefers less motion", async () => {
      const { shell, run, scene } = await startBoard(stillness);

      shell.reach([STRIKE_8, ["swell"]], [PLAIN_BREAK, ["shards"]]);
      shell.beat("jump", "lost");
      // A shake moves nothing the frame it starts, so a frame after it.
      run.advance(32);

      const frame = frameOf(scene);
      expect({
        swollen: swellAt(scene, 5, 8),
        shards: scene.effects.shards.getAliveParticleCount(),
        flash: scene.effects.flash.visible,
        camera: cameraOf(scene),
      }).toEqual({
        swollen: [],
        shards: 0,
        flash: false,
        camera: { ...frame, scrollX: frame.x, scrollY: frame.y },
      });
    });

    it("play none an event has no place for", async () => {
      const { shell, run, scene } = await startBoard();

      shell.reach([
        LANDING,
        ["swell", "shards", "streak", "bolt", "ring", "hop"],
      ]);
      run.advance(16);

      expect({
        swollen: swellAt(scene, 5, 8),
        shards: scene.effects.shards.getAliveParticleCount(),
        bursts: [
          ...scene.effects.streaks.all,
          ...scene.effects.bolts.all,
          ...scene.effects.rings.all,
        ].filter(({ image }) => image.visible).length,
        hops: scene.effects.hops.all.filter(({ body }) => body.visible).length,
      }).toEqual({ swollen: [], shards: 0, bursts: 0, hops: 0 });
    });

    it("leave the flourishes of the events and the beats the view reached before the scene began unplayed", async () => {
      const { scene } = await startBoard((shell) => {
        shell.reach([BLAST, ["ring"]]);
        shell.beat("jump");
      });

      expect({
        rings: scene.effects.rings.all.filter(({ image }) => image.visible)
          .length,
        flash: scene.effects.flash.visible,
      }).toEqual({ rings: 0, flash: false });
    });
  });

  describe("the sounds of a round", () => {
    it("play each sound the frame's events call for once, at the most it rose", async () => {
      const { shell, run, scene } = await startBoard();
      const played = vi.spyOn(scene.sounds, "playRisen");

      shell.reach(
        [{ ...PLAIN_BREAK, streak: 3 }, [], "break"],
        [{ ...PLAIN_BREAK, streak: 2 }, [], "break"],
        [STRIKE_8, [], "strike"],
      );
      run.advance(16);

      expect(played.mock.calls).toEqual([
        ["strike", 0],
        ["break", 200],
      ]);
    });

    it("play each beat's sound", async () => {
      const { shell, run, scene } = await startBoard();
      const played = vi.spyOn(scene.sounds, "playRisen");

      shell.beat("step", "danger");
      run.advance(16);

      expect(played.mock.calls).toEqual([
        ["step", 0],
        ["danger", 0],
      ]);
    });

    it("play the sounds of a flight as it reaches them", async () => {
      const { run, scene } = await startBoard((shell) => {
        shell.fly(PLAIN);
      });
      const played = vi.spyOn(scene.sounds, "playRisen");

      run.advance(10000);

      expect(played.mock.calls.map(([name]) => name)).toEqual(
        expect.arrayContaining(["knock", "strike", "land", "step"]),
      );
    });

    it("tick a notch as the charge rises and falls, but not to none, while the fuzzball waits", async () => {
      const { run, scene } = await startBoard((shell) => {
        shell.waiting = 3;
      });
      const played = vi.spyOn(scene.sounds, "playRisen");

      run.key("keydown", "ArrowUp", "ArrowUp");
      run.advance(16);
      run.key("keydown", "ArrowUp", "ArrowUp");
      run.advance(16);
      run.key("keydown", "ArrowDown", "ArrowDown");
      run.advance(16);
      run.key("keydown", "ArrowDown", "ArrowDown");
      run.advance(16);

      expect(played.mock.calls).toEqual([
        ["notch", 0],
        ["notch", 0],
        ["notch", 0],
      ]);
    });

    it.each<[string, (shell: FakeShell) => void]>([
      ["while the fuzzball flies", () => undefined],
      [
        "for a hot shot, whose charge is full",
        (shell) => {
          shell.waiting = 3;
          shell.carried = "hot";
        },
      ],
    ])("tick no notch %s", async (_, setUp) => {
      const { run, scene } = await startBoard(setUp);
      const played = vi.spyOn(scene.sounds, "playRisen");

      run.key("keydown", "ArrowUp", "ArrowUp");
      run.advance(16);

      expect(played).not.toHaveBeenCalled();
    });

    it("play the events of another play's log as it reaches them, from its first", async () => {
      const { shell, run, scene } = await startBoard((each) => {
        each.reach([STRIKE_8, [], "strike"]);
      });
      const played = vi.spyOn(scene.sounds, "playRisen");
      shell.aim(PLAIN);
      run.advance(16);

      shell.play?.release(PLAIN.round);
      run.advance(16);

      expect(played.mock.calls).toEqual([["release", 0]]);
    });
  });

  describe("once it ends", () => {
    it("calls the shell no more, and turns no key into a command", async () => {
      const { shell, run, scene } = await startBoard();
      const calls = (): number =>
        shell.ticks.length + shell.layouts.length + shell.bakes.length;

      run.game.scene.stop(scene.key);
      const before = calls();
      run.advance(48);
      run.key("keydown", "Escape", "Escape");
      run.advance(16);

      expect({ calls: calls() - before, commands: shell.commands }).toEqual({
        calls: 0,
        commands: [],
      });
    });
  });
});

describe("bakedScaleOf", () => {
  it("bakes at a field's unit and pixel ratio", () => {
    expect(bakedScaleOf({ unit: 62, pixelRatio: 2 })).toEqual({
      unit: 62,
      pixelRatio: 2,
    });
  });

  it("bakes at no more than the largest unit, at the field's pixel ratio", () => {
    expect(bakedScaleOf({ unit: 291, pixelRatio: 3 })).toEqual({
      unit: MOST_BAKED_UNIT,
      pixelRatio: 3,
    });
  });
});

describe("flightFrames", () => {
  /** The scale of a unit of 40 CSS pixels at a pixel to one, the art's mock of a phone's. */
  const PHONE = { unit: 40, pixelRatio: 1 } as const;

  /** The frames at that scale, in the light palette. */
  const FRAMED = flightFrames(LIGHT, PHONE);

  it("draws the meter's lit pip in the meter's on, as wide as the art's", () => {
    const pip = frameNamed(FRAMED, FRAMES.meterOn);

    expect({ side: [pip.width, pip.height], commands: pip.commands }).toEqual({
      side: [6, 6],
      commands: [
        { kind: "circle", x: 3, y: 3, radius: 3, color: LIGHT.meter.on },
      ],
    });
  });

  it("draws the meter's unlit pip as wide, a dot of the field's color in a rim of the meter's off", () => {
    const pip = frameNamed(FRAMED, FRAMES.meterOff);

    expect({ side: [pip.width, pip.height], commands: pip.commands }).toEqual({
      side: [6, 6],
      commands: [
        { kind: "circle", x: 3, y: 3, radius: 3, color: LIGHT.field },
        {
          kind: "ring",
          x: 3,
          y: 3,
          radius: 2.5,
          width: 1,
          color: LIGHT.meter.off,
        },
      ],
    });
  });

  it("draws the guide's dot in the guide's color, as wide as the art's", () => {
    const dot = frameNamed(FRAMED, FRAMES.guideDot);

    expect(dot.commands).toEqual([
      { kind: "circle", x: 2.5, y: 2.5, radius: 2.5, color: LIGHT.guide },
    ]);
  });

  it("outlines a cell for the guide, in its color, as the art does, inside the cell", () => {
    const punch = frameNamed(FRAMED, FRAMES.guidePunch);

    // At 40 px a unit, a line of 2.2 px is 2, its middle a pixel in, as
    // the art's 0.9 would put half of it outside.
    expect(punch).toEqual({
      name: FRAMES.guidePunch,
      width: 40,
      height: 40,
      commands: [
        outlineRoundRect({ x: 1, y: 1, width: 38, height: 38 }, 6.4, {
          color: LIGHT.guide,
          width: 2,
        }),
      ],
    });
  });

  it("draws a shard in white, for its brick's color to tint", () => {
    const shard = frameNamed(FRAMED, FLIGHT_FRAMES.shard);

    expect({
      side: [shard.width, shard.height],
      colors: shard.commands.map((command) => command.color),
    }).toEqual({ side: [12, 12], colors: [0xffffff] });
  });

  it("draws a streak a cell long, in the fuzzball's color", () => {
    const streak = frameNamed(FRAMED, FLIGHT_FRAMES.streak);

    expect({
      width: streak.width,
      colors: streak.commands.map((command) => command.color),
    }).toEqual({ width: 40, colors: [LIGHT.fuzzball] });
  });

  it("draws a piece of bolt from the middle of a cell's side to the middle of the other, in the sparks' color", () => {
    const bolt = frameNamed(FRAMED, FLIGHT_FRAMES.bolt);
    const lines = bolt.commands.filter((command) => command.kind === "line");

    // A cell of 40 across, its line 3 wide, its ends round, so 2 px and
    // more past either end, and the zigzag swinging 4.8 px either way.
    expect({
      side: [bolt.width, bolt.height],
      from: lines[0]?.from,
      to: lines.at(-1)?.to,
      colors: [...new Set(bolt.commands.map((command) => command.color))],
    }).toEqual({
      side: [44, 14],
      from: { x: 2, y: 7 },
      to: { x: 42, y: 7 },
      colors: [LIGHT.spark],
    });
  });

  it("draws a blast's ring at its widest round the eight cells about the bomb's, in the danger line's color", () => {
    const ring = frameNamed(FRAMED, FLIGHT_FRAMES.ring);

    expect(ring).toEqual({
      name: FLIGHT_FRAMES.ring,
      width: 120,
      height: 120,
      commands: [
        {
          kind: "ring",
          x: 60,
          y: 60,
          radius: 58,
          width: 4,
          color: LIGHT.dangerLine,
        },
      ],
    });
  });

  it("names of the art's frames only those the art leaves to the scene, the meter's and the guide's", () => {
    const names = FRAMED.map(({ name }) => name);

    expect(
      names.filter((name) => (FRAME_NAMES as readonly string[]).includes(name)),
    ).toEqual([
      FRAMES.meterOn,
      FRAMES.meterOff,
      FRAMES.guideDot,
      FRAMES.guidePunch,
    ]);
  });

  it("names no frame the field names", () => {
    const field = fieldFrames(LIGHT, PHONE).map(({ name }) => name);

    expect(FRAMED.filter(({ name }) => field.includes(name))).toEqual([]);
  });
});

describe("fieldFrames", () => {
  /** The scale of a unit of 40 CSS pixels at a pixel to one, the art's mock of a phone's. */
  const PHONE = { unit: 40, pixelRatio: 1 } as const;

  it("draws the grid's dot in the field's line, as wide as the art's", () => {
    const dot = frameNamed(fieldFrames(LIGHT, PHONE), FIELD_FRAMES.gridDot);

    expect({
      side: [dot.width, dot.height],
      drawn: drawnIn(dot, "circle", LIGHT.line),
    }).toEqual({
      side: [2, 2],
      drawn: [{ kind: "circle", x: 1, y: 1, radius: 1, color: LIGHT.line }],
    });
  });

  it("draws the count's dot in the jump line's color, wider than the grid's", () => {
    const dot = frameNamed(fieldFrames(LIGHT, PHONE), FIELD_FRAMES.countDot);

    expect({
      side: [dot.width, dot.height],
      drawn: drawnIn(dot, "circle", LIGHT.jumpLine),
    }).toEqual({
      side: [6, 6],
      drawn: [{ kind: "circle", x: 3, y: 3, radius: 3, color: LIGHT.jumpLine }],
    });
  });

  it("draws each dot a CSS pixel wide at least", () => {
    const frames = fieldFrames(LIGHT, { unit: 1, pixelRatio: 1 });

    expect(
      [FIELD_FRAMES.gridDot, FIELD_FRAMES.countDot].map(
        (name) => frameNamed(frames, name).width,
      ),
    ).toEqual([1, 1]);
  });

  it("draws the warning frame a cell wide: a band of the danger line's color in from its edge, and a seam of the field's inside it", () => {
    const frame = frameNamed(fieldFrames(LIGHT, PHONE), FIELD_FRAMES.warning);

    // At 40 px a unit, a band of 3.2 px is 3, a seam of 1.2 is 1, and the
    // corners 0.18 of the cell round at its edge, less as each is further in.
    expect(frame).toEqual({
      name: FIELD_FRAMES.warning,
      width: 40,
      height: 40,
      commands: [
        outlineRoundRect(
          { x: 1.5, y: 1.5, width: 37, height: 37 },
          0.18 * 40 - 1.5,
          {
            color: LIGHT.dangerLine,
            width: 3,
          },
        ),
        outlineRoundRect(
          { x: 3.5, y: 3.5, width: 33, height: 33 },
          0.18 * 40 - 3.5,
          {
            color: LIGHT.field,
            width: 1,
          },
        ),
      ],
    });
  });

  it("draws the warning frame's band and seam a CSS pixel wide at least", () => {
    const frame = frameNamed(
      fieldFrames(LIGHT, { unit: 4, pixelRatio: 1 }),
      FIELD_FRAMES.warning,
    );

    // At 4 px a unit, a band of 0.32 px and a seam of 0.12 are 1 each.
    expect(frame.commands).toEqual([
      outlineRoundRect({ x: 0.5, y: 0.5, width: 3, height: 3 }, 0.22, {
        color: LIGHT.dangerLine,
        width: 1,
      }),
      outlineRoundRect({ x: 1.5, y: 1.5, width: 1, height: 1 }, 0, {
        color: LIGHT.field,
        width: 1,
      }),
    ]);
  });

  it("names no frame the art names", () => {
    const names = fieldFrames(LIGHT, metricsAt()).map(({ name }) => name);

    expect(
      names.filter((name) => (FRAME_NAMES as readonly string[]).includes(name)),
    ).toEqual([]);
  });
});

describe("pictureFrames", () => {
  /** The scale of a unit of 40 CSS pixels at a pixel to one, the art's mock of a phone's. */
  const PHONE = { unit: 40, pixelRatio: 1 } as const;

  it("draws a whole brick of each kind in a cell, its layers one over another from the bottom up", () => {
    const art = atlasFrames(LIGHT, PHONE);

    const tough = frameNamed(
      pictureFrames(art, PHONE),
      PICTURE_FRAMES.bricks.tough,
    );

    expect({ ...tough, many: PICTURE_LAYERS.tough.length }).toEqual({
      name: PICTURE_FRAMES.bricks.tough,
      width: 40,
      height: 40,
      commands: PICTURE_LAYERS.tough.flatMap(
        (layer) => frameNamed(art, layer).commands,
      ),
      many: 2,
    });
  });

  it("draws one for each kind", () => {
    const names = pictureFrames(atlasFrames(LIGHT, PHONE), PHONE).map(
      ({ name }) => name,
    );

    expect(names).toEqual(Object.values(PICTURE_FRAMES.bricks));
  });

  it("names no frame the art or the field names", () => {
    const named = [
      ...FRAME_NAMES,
      ...fieldFrames(LIGHT, PHONE).map(({ name }) => name),
      ...flightFrames(LIGHT, PHONE).map(({ name }) => name),
    ];

    expect(
      Object.values(PICTURE_FRAMES.bricks).filter((name) =>
        named.includes(name),
      ),
    ).toEqual([]);
  });
});

/** Returns whether the atlas holds a frame of a name. */
function atlasHas(scene: WallScene, name: string): boolean {
  return scene.textures.get(ATLAS).has(name);
}
