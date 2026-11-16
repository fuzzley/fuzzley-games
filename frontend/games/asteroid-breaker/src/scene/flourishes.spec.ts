import { easeOutCubic } from "@fz/core/math";
import { cssHex } from "@fz/phaser/color";
import {
  type SceneRun,
  canvasTexture,
  commandsOf,
  objectsIn,
  watchUploads,
} from "@fz/phaser/testing";
import { GameObjects, Textures } from "phaser";
import type { Field } from "../rules/field/field";
import { type Rock, hitRock } from "../rules/rocks/rocks";
import { wrap } from "../rules/torus";
import { NOSE } from "../rules/ship/shots";
import { ROCK_RADIUS } from "../rules/tuning";
import { ART_PALETTE } from "../testing/art_frames";
import {
  DARK,
  MIDDLE,
  SHELL_FONT,
  WIDER,
  bandsOf,
  type Band,
  type FakeShell,
  type FilledRound,
  type StrokedLine,
  layersOf,
  linesOf,
  metricsOf,
  onCanvas,
  pointsZoomOf,
  roundsOf,
  scrolledBy,
  shardTints,
  shownAt,
  slotOf,
  startBoard,
  stepping,
  stillness,
  toMillionths,
  trianglesOf,
  withShip,
  zoomOf,
} from "../testing/belt_board";
import {
  KEEPER,
  PICTURE_TORUS,
  fieldFrom,
  placeRock,
  placeStray,
  shipOf,
} from "../testing/field_picture";
import { FLOURISH } from "../view/art/art";
import { burrInk } from "../view/art/things";
import {
  type Broken,
  GLINT_POINTS,
  HELD_REACH,
  type Placed,
  type Round,
  type Streak,
  breakOf,
  dustAt,
  glintAt,
  impactOf,
  impactTickAt,
  puffAt,
  shardPushOf,
  rimToward,
  shardAt,
  sparkAt,
  towardShip,
  wholeAt,
} from "../view/art/breaks";
import { MUZZLE_BEATS, energyOf, muzzleHalo } from "../view/art/energy";
import { BLAST_EMBERS, blastInks } from "../view/effects/blast";
import {
  PEN_STEPS,
  POINTS_TEXT,
  type PointsLettering,
  layOutPoints,
  letteringUnit,
  packPoints,
  pointsLayout,
} from "../view/art/points_art";
import { ADRIFT_FRAMES, eyesFrame, eyesShift } from "../view/art/pilot_art";
import {
  ENGINES,
  PUFF,
  puffAlpha,
  puffColors,
  puffRadius,
} from "../view/art/pod_art";
import { rockFrame } from "../view/art/rock_art";
import { bakedScale } from "../view/art/shapes";
import { STRUCK_LIGHT } from "../view/colors/rock_light";
import {
  BAIL_OUT_SPEED,
  FLASH_MOST,
  LOST_RING_REACH,
  SHIELD_RING_REACH,
  MOST_POINTS_CHARACTERS,
  RINGS,
  bailOutWayOf,
  trailAlpha,
  trailLaidAfter,
  trailReach,
} from "../view/effects/flourish";
import {
  BAIL_OUT_BLINK_MS,
  BAIL_OUT_MS,
  BLAST_FLASH_MS,
  BLAST_MS,
  BLAST_RING_MS,
  BOULDER_HOLD_MS,
  BOULDER_THROW_MS,
  BREAK_MS,
  CLEARED_MS,
  BURST_SHARDS,
  RESCUE_MS,
  EXHAUST_MS,
  FLASH_MS,
  HELD_MS,
  KICK_MS,
  POINTS_MS,
  POD_FLASH_MS,
  POP_SHARDS,
  RING_MS,
  SHAKE_MS,
  SLOW_MS,
  STILL_MARK_MS,
  TRAIL_MS,
  ZAP_MS,
} from "../view/effects/timing";
import { CRACK_REACH, boulderInks } from "../view/effects/boulder";
import { RESCUE_RING, SPRING } from "../view/effects/rescue";
import { ZAP_LIGHT, podFlashTone } from "../view/effects/pod_glow";
import { farthestCorner } from "../view/effects/cleared";
import type { BeltScene } from "./belt_scene";
import { MOST_SHARDS_FLYING } from "./painters/debris_painter";
import { MOST_EXHAUST } from "./painters/exhaust_painter";
import { MOST_BLASTS } from "./painters/blast_painter";
import { POINTS_SHEET, type Scored } from "./painters/points_painter";
import { RING_WIDTH } from "./painters/ring_painter";
import { BAIL_OUT_SCALE } from "./painters/stray_painter";
import { POINTS_ATLAS } from "./points_atlas";

/** Returns the rock in a field's first slot, the keeper's large stone. */
function keeperOf(field: Field): Rock {
  const [rock] = field.rocks;
  if (!rock?.live) throw new Error("No keeper on the field.");
  return rock;
}

/** Returns the serial of the last event logged on a shell's field. */
function lastSerial(shell: FakeShell): number {
  return shell.field.events.latest;
}

/** Returns what a spec reads of the scene at each frame over a time, a frame's time apart. */
function overTime<T>(
  run: SceneRun<BeltScene>,
  ms: number,
  frameMs: number,
  read: () => T,
): readonly T[] {
  return Array.from({ length: Math.round(ms / frameMs) }, () => {
    run.advance(frameMs, frameMs);
    return read();
  });
}

/** Returns whether each of a run of numbers is more than the one before. */
function rising(values: readonly number[]): boolean {
  return values.every((value, i) => i === 0 || value > (values[i - 1] ?? 0));
}

/** Returns whether each of a run of numbers is less than the one before. */
function falling(values: readonly number[]): boolean {
  return rising(values.map((value) => -value));
}

/** Returns how many of some images show. */
function shownCount(images: readonly GameObjects.Components.Visible[]): number {
  return images.filter((image) => image.visible).length;
}

/** Returns a rock's break as the scene plays it: from the outline it is drawn in, turned as it lies, pushed by a blow along a way. */
function brokenOf(rock: Rock, wayX = 0, wayY = 0): Broken {
  return {
    made: breakOf(rock),
    turn: rock.angle,
    push: shardPushOf(wayX, wayY, rock.angle, { x: 0, y: 0 }),
  };
}

/** Returns a record a polygon of a break is written into. */
function placedRecord(): Placed {
  return { x: 0, y: 0, turn: 0, scale: 0, color: 0, alpha: 0 };
}

/** Returns a record a break's dust is written into. */
function roundRecord(): Round {
  return { x: 0, y: 0, radius: 0, width: 0, color: 0, alpha: 0 };
}

/** Returns a record a spark's line is written into. */
function streakRecord(): Streak {
  return { fromX: 0, fromY: 0, toX: 0, toY: 0, width: 0, color: 0, alpha: 0 };
}

/** Returns a line of a spark written about a middle on the canvas, as the scene strokes it. */
function streakAbout(
  { fromX, fromY, toX, toY, width, color, alpha }: Readonly<Streak>,
  middle: { readonly x: number; readonly y: number },
): Readonly<Record<string, number>> {
  return {
    fromX: middle.x + fromX,
    fromY: middle.y + fromY,
    toX: middle.x + toX,
    toY: middle.y + toY,
    width,
    color,
    alpha,
  };
}

/**
 * Returns the corners of the outline a broken rock is drawn whole in, the
 * frame it breaks, on a shell's canvas, as text: its kind and size's
 * outline of a number, turned by an angle.
 */
function outlineCorners(
  shell: FakeShell,
  rock: Pick<Rock, "kind" | "size" | "x" | "y">,
  outline: number,
  angle: number,
): ReadonlySet<string> {
  const metrics = metricsOf(shell);
  const middle = onCanvas(metrics, rock.x, rock.y);
  const pixels = ROCK_RADIUS[rock.size] * metrics.unit;
  const corners = breakOf({ ...rock, outline }).shape.outline.map(
    ({ x, y }) => ({
      points: [
        middle.x + (x * Math.cos(angle) - y * Math.sin(angle)) * pixels,
        middle.y + (x * Math.sin(angle) + y * Math.cos(angle)) * pixels,
      ],
    }),
  );
  return cornersOf(corners, 0);
}

/** Returns how far each corner of some triangles lies from a middle on the canvas, as text, rounded to a millionth of a pixel. */
function reachesOf(
  triangles: readonly { readonly points: readonly number[] }[],
  middle: { readonly x: number; readonly y: number },
): ReadonlySet<string> {
  return new Set(
    triangles.flatMap(({ points }) =>
      [0, 2, 4].map((corner) =>
        Math.hypot(
          (points[corner] ?? Number.NaN) - middle.x,
          (points[corner + 1] ?? Number.NaN) - middle.y,
        ).toFixed(6),
      ),
    ),
  );
}

/** Returns the corner each of some triangles is fanned from, as text, rounded to a millionth of a pixel. */
function cornersOf(
  triangles: readonly { readonly points: readonly number[] }[],
  corner: number,
): ReadonlySet<string> {
  return new Set(
    triangles.map(({ points }) =>
      points
        .slice(corner * 2, corner * 2 + 2)
        .map((value) => value.toFixed(6))
        .join(),
    ),
  );
}

/** Returns what each label of points that shows reads. */
function pointsShown(scene: BeltScene): readonly string[] {
  return scene.kit.points.scored.all
    .filter(({ image }) => image.visible)
    .map(({ label }) => label);
}

/** Returns where each puff of exhaust alive is, and how fast it streams across. */
function exhaustOf(scene: BeltScene): readonly {
  readonly x: number;
  readonly y: number;
  readonly across: number;
}[] {
  const specks: { x: number; y: number; across: number }[] = [];
  scene.kit.exhaust.specks.forEachAlive((speck) => {
    specks.push({ x: speck.x, y: speck.y, across: speck.velocityX });
  }, null);
  return specks;
}

/**
 * Returns how far a place on the canvas lies from a place on the field, and the
 * way, in radians.
 */
function fromPlace(
  shell: FakeShell,
  at: { readonly x: number; readonly y: number } | null,
  x: number,
  y: number,
): { readonly distance: number; readonly way: number } {
  const middle = onCanvas(metricsOf(shell), x, y);
  if (!at) return { distance: Number.NaN, way: Number.NaN };
  return {
    distance: Math.hypot(at.x - middle.x, at.y - middle.y),
    way: Math.atan2(at.y - middle.y, at.x - middle.x),
  };
}

/** Returns an angle as `Math.atan2()` gives it, between −π and π. */
function normalized(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

/**
 * Breaks a rock on a shell's field as the rules do, taking it off the field
 * before its break is logged, the blow from a way.
 */
function logBreak(
  shell: FakeShell,
  rock: Rock,
  wayX: number,
  wayY: number,
): void {
  rock.live = false;
  shell.field.events.addBreak(rock, 1, wayX, wayY);
}

/** Logs a boulder broken in the middle of a shell's field, struck from above. */
function logBoulderBreak(shell: FakeShell): void {
  const boulder = placeRock(
    shell.field,
    "boulder",
    MIDDLE.x,
    MIDDLE.y,
    "boulder",
  );
  logBreak(shell, boulder, 0, 1);
}

/** Logs a ship lost in the middle of a shell's field, its pilot the third color. */
function logShipLost(shell: FakeShell): void {
  shell.field.events.addPilot("lost", MIDDLE.x, MIDDLE.y, 2, shell.field.crew);
}

/** Describes what the flourishes that move show at a moment. */
interface Shown {
  readonly shards: number;
  readonly breaks: number;
  readonly sparks: number;
  readonly flash: number;
  readonly rings: number;
  readonly blasts: number;
  readonly blastLit: boolean;
  readonly boulders: number;
  readonly trail: boolean;
  readonly bailing: boolean;
  readonly scrolled: { readonly x: number; readonly y: number };
}

/** What the flourishes that move show while none plays. */
const NOTHING_PLAYING: Shown = {
  shards: 0,
  breaks: 0,
  sparks: 0,
  flash: 0,
  rings: 0,
  blasts: 0,
  blastLit: false,
  boulders: 0,
  trail: false,
  bailing: false,
  scrolled: { x: 0, y: 0 },
};

/** Returns what the flourishes that move show in a scene, as it now draws. */
function playingIn(scene: BeltScene, shell: FakeShell): Shown {
  return {
    shards: scene.kit.debris.shards.getAliveParticleCount(),
    breaks:
      commandsOf(scene.kit.debris.dustGraphics).length +
      commandsOf(scene.kit.debris.breakGraphics).length,
    sparks: commandsOf(scene.kit.debris.sparkGraphics).length,
    flash: shownCount(scene.kit.rocks.flashes),
    rings: bandsOf(scene.kit.rings.graphics).length,
    blasts: roundsOf(scene.kit.blasts.graphics).length,
    blastLit: scene.kit.blasts.light.visible,
    boulders: commandsOf(scene.kit.boulders.graphics).length,
    trail: scene.kit.trail.outlines
      .flatMap(({ images }) => images)
      .some((image) => image.visible),
    bailing: scene.kit.strays.bailing.bubble.visible,
    scrolled: scrolledBy(scene, shell),
  };
}

/** Logs one of every event that plays a flourish on a shell's field, the keeper's. */
function logEveryFlourish(shell: FakeShell): void {
  const { events } = shell.field;
  const rock = keeperOf(shell.field);
  const boulder = placeRock(shell.field, "boulder", 10, 10, "boulder");
  events.addBreak(rock, 1, 1, 0);
  events.addBreak(boulder, 1, 0, 1);
  events.addRock("hit", rock);
  events.addRock("blast", rock, 6);
  events.addDash(MIDDLE.x, MIDDLE.y, 0);
  events.addStep(MIDDLE.x, MIDDLE.y, 2, false);
  events.addPilot("joined", MIDDLE.x, MIDDLE.y, 3, shell.field.crew);
  logShipLost(shell);
  events.addScore(MIDDLE.x, MIDDLE.y, 40, 1);
  events.add("cleared", MIDDLE.x, MIDDLE.y);
}

describe("the events", () => {
  it("plays each event once, as it is logged", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.addScore(MIDDLE.x, MIDDLE.y, 40, 1);

    run.advance(48);

    expect(pointsShown(scene)).toHaveLength(1);
  });

  it("plays a new field's from its first, stopping what the last set off", async () => {
    const { shell, run, scene } = await startBoard();
    logEveryFlourish(shell);
    run.advance(16);
    shell.field = fieldFrom(KEEPER);
    shell.field.events.addScore(10, 10, 80, 1);

    run.advance(BOULDER_HOLD_MS + 32, 16);

    expect({
      ...playingIn(scene, shell),
      points: pointsShown(scene),
    }).toEqual({ ...NOTHING_PLAYING, points: ["+80"] });
  });

  it("plays nothing that moves where motion isn't welcome, but shows the points and the still marks, a blast's and a dash's", async () => {
    const { shell, run, scene } = await startBoard((board) => {
      withShip(board);
      stillness(board);
    });
    logEveryFlourish(shell);

    run.advance(48);

    // The blast's still ring, about the keeper in the field's corner, is
    // drawn on each side of both edges; the dash's start keeps a still
    // ring, in the middle.
    expect({
      ...playingIn(scene, shell),
      points: pointsShown(scene).length,
    }).toEqual({ ...NOTHING_PLAYING, blasts: 4, rings: 1, points: 1 });
  });

  it("makes every particle as the scene starts, and none as they play", async () => {
    const { shell, run, scene } = await startBoard(withShip);
    shipOf(shell.field).held.thrust = 1;
    const { shards } = scene.kit.debris;
    const { specks } = scene.kit.exhaust;
    const before = [shards.getParticleCount(), specks.getParticleCount()];

    for (let i = 0; i < 20; i++) {
      logEveryFlourish(shell);
      run.advance(16);
    }

    expect({
      before,
      after: [shards.getParticleCount(), specks.getParticleCount()],
    }).toEqual({
      before: [MOST_SHARDS_FLYING, MOST_EXHAUST],
      after: [MOST_SHARDS_FLYING, MOST_EXHAUST],
    });
  });

  it("makes no game object as they play", async () => {
    const { shell, run, scene } = await startBoard(withShip);
    shipOf(shell.field).held.thrust = 1;
    const before = objectsIn(scene);

    for (let i = 0; i < 20; i++) {
      logEveryFlourish(shell);
      run.advance(16);
    }

    expect(objectsIn(scene)).toBe(before);
  });
});

/** Logs a shot fired by a shell's ship, from its middle, as the field logs one. */
function logFired(shell: FakeShell): void {
  const ship = shipOf(shell.field);
  shell.field.events.addFired(ship.x, ship.y, "gun");
}

/** Describes the muzzle's flash as it shows: where on the canvas and the way it points, rounded, how opaque and how large. */
interface MuzzleShown {
  readonly at: { readonly x: number; readonly y: number };
  readonly way: { readonly x: number; readonly y: number };
  readonly alpha: number;
  readonly scale: number;
}

/** Returns the muzzle's flash as it shows, or null while it is out. */
function muzzleOf(scene: BeltScene): MuzzleShown | null {
  const [star] = scene.kit.muzzle.star.images;
  return star?.visible
    ? {
        at: rounded(star),
        way: wayAlong(star.rotation),
        alpha: star.alpha,
        scale: star.scaleX,
      }
    : null;
}

/** Returns the way an angle points, rounded, a −0 as 0, whichever turn of it Phaser keeps. */
function wayAlong(angle: number): { readonly x: number; readonly y: number } {
  const { x, y } = rounded({ x: Math.cos(angle), y: Math.sin(angle) });
  return { x: x + 0, y: y + 0 };
}

/** Returns where the muzzle's flash of a shell's ship shows on the canvas, rounded: at its nose. */
function noseOf(shell: FakeShell): { readonly x: number; readonly y: number } {
  const ship = shipOf(shell.field);
  return rounded(
    onCanvas(
      metricsOf(shell),
      ship.x + Math.cos(ship.angle) * NOSE,
      ship.y + Math.sin(ship.angle) * NOSE,
    ),
  );
}

/** Returns where each halo shows in a color, those that do, as its x and y on the canvas. */
function halosIn(scene: BeltScene, color: number): readonly number[][] {
  return scene.kit.halos.halos.flatMap(({ images: [image] }) =>
    image?.visible && image.tintTopLeft === color ? [[image.x, image.y]] : [],
  );
}

describe("a shot leaving", () => {
  it.each([
    ["whole, the frame the shot leaves", 1, 0],
    ["smaller and fainter the next", 2, 1],
  ] as const)(
    "flashes at the pod's nose, turned as it points, %s",
    async (_, frames, beat) => {
      const { shell, run, scene } = await startBoard(withShip);
      logFired(shell);

      run.advance(16 * frames, 16);

      const { size, alpha } = MUZZLE_BEATS[beat];
      expect(muzzleOf(scene)).toEqual({
        at: noseOf(shell),
        way: wayAlong(shipOf(shell.field).angle),
        alpha,
        scale: zoomOf(shell) * size,
      });
    },
  );

  it("is out by the frame after its two beats", async () => {
    const { shell, run, scene } = await startBoard(withShip);
    logFired(shell);

    run.advance(48, 16);

    expect(muzzleOf(scene)).toBeNull();
  });

  it("glows in the accent ahead of the pod's nose as it flashes", async () => {
    const { shell, run, scene } = await startBoard(withShip);
    logFired(shell);
    const ship = shipOf(shell.field);
    const ahead = NOSE + muzzleHalo(MUZZLE_BEATS[0]).ahead;

    run.advance(16);

    const middle = onCanvas(
      metricsOf(shell),
      ship.x + Math.cos(ship.angle) * ahead,
      ship.y + Math.sin(ship.angle) * ahead,
    );
    expect(halosIn(scene, shell.colors.accent)).toEqual([
      [expect.closeTo(middle.x, 9), expect.closeTo(middle.y, 9)],
    ]);
  });

  it("shows nothing where motion isn't welcome, as it only dresses the shot", async () => {
    const { shell, run, scene } = await startBoard((board) => {
      withShip(board);
      stillness(board);
    });
    logFired(shell);

    run.advance(16);

    expect({
      muzzle: muzzleOf(scene),
      halos: halosIn(scene, shell.colors.accent),
    }).toEqual({ muzzle: null, halos: [] });
  });
});

describe("a broken rock", () => {
  it("draws the rock whole, flashing, about where it broke, the frame it breaks", async () => {
    const { shell, run, scene } = await startBoard();
    const rock = placeRock(shell.field, "large", MIDDLE.x, MIDDLE.y);
    logBreak(shell, rock, 0, -1);

    run.advance(16);

    const whole = placedRecord();
    wholeAt(brokenOf(rock, 0, -1), 0, ART_PALETTE, metricsOf(shell), whole);
    const triangles = trianglesOf(scene.kit.debris.breakGraphics);
    const middle = onCanvas(metricsOf(shell), rock.x, rock.y);
    expect({
      triangles: triangles.length,
      colors: new Set(triangles.map(({ color }) => color)),
      from: cornersOf(triangles, 0),
    }).toEqual({
      triangles: breakOf(rock).shape.outline.length,
      colors: new Set([whole.color]),
      from: cornersOf([{ points: [middle.x, middle.y] }], 0),
    });
  });

  it("draws it whole in the palette the frame it breaks on changed to", async () => {
    const { shell, run, scene } = await startBoard();
    shell.colors = DARK;
    const rock = placeRock(shell.field, "large", MIDDLE.x, MIDDLE.y);
    logBreak(shell, rock, 0, -1);

    run.advance(16);

    const whole = placedRecord();
    wholeAt(brokenOf(rock, 0, -1), 0, DARK, metricsOf(shell), whole);
    const triangles = trianglesOf(scene.kit.debris.breakGraphics);
    expect(new Set(triangles.map(({ color }) => color))).toEqual(
      new Set([whole.color]),
    );
  });

  it("draws a break logged before the field is first drawn", async () => {
    const { scene } = await startBoard((shell) => {
      shell.field.events.addBreak(keeperOf(shell.field), 1, 0, -1);
    });

    expect(trianglesOf(scene.kit.debris.breakGraphics).length).toBeGreaterThan(
      0,
    );
  });

  it("throws the rock's own facets once it comes apart, each lit and flashing as the view colors it", async () => {
    const { shell, run, scene } = await startBoard();
    const rock = placeRock(shell.field, "large", MIDDLE.x, MIDDLE.y);
    logBreak(shell, rock, 0, -1);

    run.advance(48, 16);

    const broken = brokenOf(rock, 0, -1);
    const shard = placedRecord();
    const colors = broken.made.shards.flatMap((each) =>
      shardAt(each, broken, 32, ART_PALETTE, metricsOf(shell), shard)
        ? Array.from(
            { length: each.points.length === 3 ? 1 : each.points.length },
            () => shard.color,
          )
        : [],
    );
    expect(
      trianglesOf(scene.kit.debris.breakGraphics).map(({ color }) => color),
    ).toEqual(colors);
  });

  it.each([
    ["an ice rock's in ice's ink", "ice"],
    ["a crystal's in a stone's, not its gem's", "crystal"],
  ] as const)(
    "spreads its dust in a ring about its middle, a band as wide as its line, in its kind's dust: %s",
    async (_, kind) => {
      const { shell, run, scene } = await startBoard();
      const rock = placeRock(shell.field, "medium", MIDDLE.x, MIDDLE.y, kind);
      logBreak(shell, rock, 0, -1);

      run.advance(48, 16);

      const ring = roundRecord();
      dustAt(brokenOf(rock), 32, ART_PALETTE, metricsOf(shell), ring);
      const middle = onCanvas(metricsOf(shell), rock.x, rock.y);
      const triangles = trianglesOf(scene.kit.debris.dustGraphics);
      expect({
        colors: new Set(triangles.map(({ color }) => color)),
        reaches: reachesOf(
          triangles.filter(({ alpha }) => alpha === ring.alpha),
          middle,
        ),
      }).toEqual({
        colors: new Set([ring.color]),
        reaches: new Set([
          (ring.radius - ring.width / 2).toFixed(6),
          (ring.radius + ring.width / 2).toFixed(6),
        ]),
      });
    },
  );

  it("puffs its dust on the ring as it spreads, each a round about its own middle, fanned from its corner on the right", async () => {
    const { shell, run, scene } = await startBoard();
    const rock = placeRock(shell.field, "large", MIDDLE.x, MIDDLE.y);
    logBreak(shell, rock, 0, -1);

    run.advance(48, 16);

    const broken = brokenOf(rock, 0, -1);
    const middle = onCanvas(metricsOf(shell), rock.x, rock.y);
    const ring = roundRecord();
    dustAt(broken, 32, ART_PALETTE, metricsOf(shell), ring);
    const puff = roundRecord();
    const puffs = broken.made.puffs.flatMap((each) =>
      puffAt(each, broken, 32, ART_PALETTE, metricsOf(shell), puff)
        ? [
            {
              points: [middle.x + puff.x + puff.radius, middle.y + puff.y],
              alpha: puff.alpha,
            },
          ]
        : [],
    );
    const fans = trianglesOf(scene.kit.debris.dustGraphics).filter(
      ({ alpha }) => alpha !== ring.alpha,
    );
    expect({
      some: puffs.length > 0,
      alphas: new Set(fans.map(({ alpha }) => alpha)),
      rights: cornersOf(fans, 0),
    }).toEqual({
      some: true,
      alphas: new Set(puffs.map(({ alpha }) => alpha)),
      rights: cornersOf(puffs, 0),
    });
  });

  it("throws its sparks from near its middle, in the flame's tones", async () => {
    const { shell, run, scene } = await startBoard();
    const rock = placeRock(shell.field, "large", MIDDLE.x, MIDDLE.y, "iron");
    logBreak(shell, rock, 0, -1);

    run.advance(176, 16);

    const broken = brokenOf(rock, 0, -1);
    const energy = energyOf(ART_PALETTE.flame, ART_PALETTE);
    const middle = onCanvas(metricsOf(shell), rock.x, rock.y);
    const body = streakRecord();
    const hot = streakRecord();
    const lines = broken.made.sparks.flatMap((tick) =>
      sparkAt(tick, broken, 160, energy, metricsOf(shell), body, hot)
        ? [streakAbout(body, middle), streakAbout(hot, middle)]
        : [],
    );
    expect({
      some: lines.length > 0,
      lines: linesOf(scene.kit.debris.sparkGraphics),
    }).toEqual({ some: true, lines });
  });

  it("throws an ice rock's glints about it, each a star fanned from its own middle", async () => {
    const { shell, run, scene } = await startBoard();
    const rock = placeRock(shell.field, "large", MIDDLE.x, MIDDLE.y, "ice");
    logBreak(shell, rock, 0, -1);

    run.advance(176, 16);

    const broken = brokenOf(rock, 0, -1);
    const middle = onCanvas(metricsOf(shell), rock.x, rock.y);
    const glint = placedRecord();
    const stars = broken.made.glints.flatMap((each) =>
      glintAt(each, broken, 160, ART_PALETTE, metricsOf(shell), glint)
        ? GLINT_POINTS.map(() => ({
            color: glint.color,
            from: `${(middle.x + glint.x).toFixed(6)},${(middle.y + glint.y).toFixed(6)}`,
          }))
        : [],
    );
    expect({
      some: stars.length > 0,
      stars: trianglesOf(scene.kit.debris.sparkGraphics).map(
        ({ color, points }) => ({
          color,
          from: points
            .slice(0, 2)
            .map((value) => value.toFixed(6))
            .join(),
        }),
      ),
    }).toEqual({ some: true, stars });
  });

  it("draws its dust and shards under the rocks, and its sparks over them", async () => {
    const { scene } = await startBoard();

    const layers = layersOf(scene);
    const { dustGraphics, breakGraphics, sparkGraphics } = scene.kit.debris;
    expect({
      breaks: layers.get("breaks")?.getChildren(),
      effects: layers.get("effects")?.getChildren().includes(sparkGraphics),
    }).toEqual({ breaks: [dustGraphics, breakGraphics], effects: true });
  });

  it("draws a break on both sides of an edge it reaches across, as far as it reaches past its rock", async () => {
    const { shell, run, scene } = await startBoard();
    const x = ROCK_RADIUS.medium + 0.5;
    const rock = placeRock(shell.field, "medium", x, MIDDLE.y);
    logBreak(shell, rock, 0, -1);

    run.advance(160, 16);

    const metrics = metricsOf(shell);
    const ring = roundRecord();
    dustAt(brokenOf(rock), 144, ART_PALETTE, metrics, ring);
    const triangles = trianglesOf(scene.kit.debris.dustGraphics).filter(
      ({ alpha }) => alpha === ring.alpha,
    );
    const half = triangles.length / 2;
    const band = new Set([
      (ring.radius - ring.width / 2).toFixed(6),
      (ring.radius + ring.width / 2).toFixed(6),
    ]);
    expect([
      reachesOf(triangles.slice(0, half), onCanvas(metrics, x, MIDDLE.y)),
      reachesOf(
        triangles.slice(half),
        onCanvas(metrics, x + PICTURE_TORUS.width, MIDDLE.y),
      ),
    ]).toEqual([band, band]);
  });

  it("draws a break on all four sides of a corner it reaches across", async () => {
    const { shell, run, scene } = await startBoard();
    const at = ROCK_RADIUS.medium + 0.5;
    const rock = placeRock(shell.field, "medium", at, at);
    logBreak(shell, rock, 0, -1);

    run.advance(160, 16);

    const metrics = metricsOf(shell);
    const ring = roundRecord();
    dustAt(brokenOf(rock), 144, ART_PALETTE, metrics, ring);
    const triangles = trianglesOf(scene.kit.debris.dustGraphics).filter(
      ({ alpha }) => alpha === ring.alpha,
    );
    const quarter = triangles.length / 4;
    const { width, height } = PICTURE_TORUS;
    const band = new Set([
      (ring.radius - ring.width / 2).toFixed(6),
      (ring.radius + ring.width / 2).toFixed(6),
    ]);
    expect(
      [
        onCanvas(metrics, at, at),
        onCanvas(metrics, at + width, at),
        onCanvas(metrics, at, at + height),
        onCanvas(metrics, at + width, at + height),
      ].map((middle, copy) =>
        reachesOf(
          triangles.slice(copy * quarter, (copy + 1) * quarter),
          middle,
        ),
      ),
    ).toEqual([band, band, band, band]);
  });

  it.each([
    ["of another size", "medium"],
    ["of its own kind and size", "large"],
  ] as const)(
    "breaks a rock in the outline and the turn it was drawn in, once a piece %s has taken its slot",
    async (_, size) => {
      const { shell, run, scene } = await startBoard();
      const rock = placeRock(shell.field, "large", MIDDLE.x, MIDDLE.y);
      Object.assign(rock, { outline: 3, angle: 1.2 });
      run.advance(16);
      const logged = { ...rock };
      Object.assign(rock, { size, outline: 0, angle: 0 });
      shell.field.events.addBreak(logged, 1, 0, 0);

      run.advance(16);

      expect(cornersOf(trianglesOf(scene.kit.debris.breakGraphics), 2)).toEqual(
        outlineCorners(shell, logged, 3, 1.2),
      );
    },
  );

  it("breaks a rock never drawn, whose slot another has taken, in its first outline, unturned", async () => {
    const { shell, run, scene } = await startBoard();
    const rock = placeRock(shell.field, "large", MIDDLE.x, MIDDLE.y);
    Object.assign(rock, { outline: 3, angle: 1.2 });
    run.advance(16);
    const logged = { ...rock, size: "small" } as const;
    shell.field.events.addBreak(logged, 1, 0, 0);

    run.advance(16);

    expect(cornersOf(trianglesOf(scene.kit.debris.breakGraphics), 2)).toEqual(
      outlineCorners(shell, logged, 0, 0),
    );
  });

  it("puts the break away once it is over", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.addBreak(keeperOf(shell.field), 1, 0, -1);

    run.advance(BREAK_MS + 32, 16);

    const { dustGraphics, breakGraphics, sparkGraphics } = scene.kit.debris;
    expect(
      [dustGraphics, breakGraphics, sparkGraphics].map((graphics) =>
        commandsOf(graphics),
      ),
    ).toEqual([[], [], []]);
  });

  it("kicks the field the way the blow came as a large rock breaks", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.addBreak(keeperOf(shell.field), 1, 0, -1);

    run.advance(16);

    // The field moves the blow's way, so its camera scrolls the other.
    const { x, y } = scrolledBy(scene, shell);
    expect({ across: x, against: y > 0 }).toEqual({ across: 0, against: true });
  });

  it("settles the field once its kick is over", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.addBreak(keeperOf(shell.field), 1, 1, 0);

    run.advance(KICK_MS + 32);

    expect(scrolledBy(scene, shell)).toEqual({ x: 0, y: 0 });
  });

  it("kicks nothing as a small rock breaks", async () => {
    const { shell, run, scene } = await startBoard();
    const rock = placeRock(shell.field, "small", MIDDLE.x, MIDDLE.y);
    logBreak(shell, rock, 1, 0);

    run.advance(16);

    expect(scrolledBy(scene, shell)).toEqual({ x: 0, y: 0 });
  });

  it("holds the field still, unkicked, for a boulder's first beat", async () => {
    const { shell, run, scene } = await startBoard();
    logBoulderBreak(shell);

    const scrolls = overTime(run, BOULDER_HOLD_MS - 16, 16, () =>
      scrolledBy(scene, shell),
    );

    expect(scrolls.filter(({ x, y }) => x !== 0 || y !== 0)).toEqual([]);
  });

  it("shakes the field along a boulder's blow, both ways, once its first beat is past", async () => {
    const { shell, run, scene } = await startBoard();
    logBoulderBreak(shell);
    run.advance(BOULDER_HOLD_MS, 16);

    const scrolls = overTime(run, SHAKE_MS - BOULDER_HOLD_MS, 16, () =>
      scrolledBy(scene, shell),
    );

    // The blow came straight down, so the field shakes up and down alone.
    expect({
      across: scrolls.filter(({ x }) => x !== 0),
      down: scrolls.some(({ y }) => y > 0),
      up: scrolls.some(({ y }) => y < 0),
    }).toEqual({ across: [], down: true, up: true });
  });

  it("rests the field within 0.3 s of a boulder's blow", async () => {
    const { shell, run, scene } = await startBoard();
    logBoulderBreak(shell);
    run.advance(16);

    run.advance(SHAKE_MS, 16);

    expect(scrolledBy(scene, shell)).toEqual({ x: 0, y: 0 });
  });
});

/** Describes a held hit's flash as it shows: where it stands on the canvas, how high and far it reaches, how strong it is and its color. */
interface FlashShown {
  readonly at: { readonly x: number; readonly y: number };
  readonly z: number;
  readonly radius: number;
  readonly intensity: number;
  readonly color: readonly number[];
}

/** Returns a scene's held hit's flash at its rock's edge as it shows, its place rounded, or null while it is out. */
function flashOf(scene: BeltScene): FlashShown | null {
  const [flash] = scene.kit.rocks.flashes;
  if (!flash.visible) return null;
  return {
    at: rounded(flash),
    z: flash.z,
    radius: flash.radius,
    intensity: flash.intensity,
    color: [flash.color.r, flash.color.g, flash.color.b],
  };
}

/** Returns a place on the canvas rounded to a millionth of a pixel, so one worked out two ways reads the same. */
function rounded({ x, y }: { readonly x: number; readonly y: number }): {
  readonly x: number;
  readonly y: number;
} {
  return { x: Math.round(x * 1e6) / 1e6, y: Math.round(y * 1e6) / 1e6 };
}

/** Returns where each of a scene's held hit's flashes shows, rounded, those that do. */
function flashesShown(
  scene: BeltScene,
): readonly { readonly x: number; readonly y: number }[] {
  return scene.kit.rocks.flashes
    .filter((flash) => flash.visible)
    .map((flash) => rounded(flash));
}

/**
 * Returns where on the canvas a rock's edge is toward a way, its radius from
 * its middle, rounded.
 */
function edgeToward(
  shell: FakeShell,
  rock: Rock,
  way: { readonly x: number; readonly y: number },
): { readonly x: number; readonly y: number } {
  const reach = ROCK_RADIUS[rock.size] / Math.hypot(way.x, way.y);
  return rounded(
    onCanvas(metricsOf(shell), rock.x + way.x * reach, rock.y + way.y * reach),
  );
}

describe("a held hit", () => {
  it("keeps its rock's crack where motion isn't welcome, flashing and sparking nothing", async () => {
    const { shell, run, scene } = await startBoard(stillness);
    const rock = placeRock(shell.field, "large", MIDDLE.x, MIDDLE.y, "iron");
    hitRock(shell.field, rock, 0, 0);

    run.advance(16);

    const body = scene.kit.rocks.bodies[slotOf(shell.field, rock)];
    expect({
      crack: body?.images[0]?.frame.name,
      ...playingIn(scene, shell),
    }).toEqual({ crack: rockFrame(rock), ...NOTHING_PLAYING });
  });

  it("lights its flash among the lights the rocks are lit by", async () => {
    const { scene } = await startBoard();
    const { lights } = scene.lights;

    expect(
      scene.kit.rocks.flashes.every((flash) => lights.includes(flash)),
    ).toBe(true);
  });

  it("lights its rock's struck faces from its edge toward the field's light while no ship flies, in the glint, at the flash's height", async () => {
    const { shell, run, scene } = await startBoard();
    const rock = placeRock(shell.field, "medium", MIDDLE.x, MIDDLE.y);
    placeRock(shell.field, "small", 50, 30);
    shell.field.events.addRock("hit", rock);

    run.advance(16);

    const pixels = ROCK_RADIUS.medium * metricsOf(shell).unit;
    expect(flashOf(scene)).toEqual({
      at: edgeToward(shell, rock, ART_PALETTE.rockLight.way),
      z: STRUCK_LIGHT.height * pixels,
      radius: STRUCK_LIGHT.reach * pixels,
      intensity: STRUCK_LIGHT.strength * FLASH_MOST,
      color: [1, 1, 1],
    });
  });

  it("lights its rock's struck faces from its edge toward the ship", async () => {
    const { shell, run, scene } = await startBoard(withShip);
    const rock = placeRock(shell.field, "medium", MIDDLE.x, MIDDLE.y);
    const ship = shipOf(shell.field);
    shell.field.events.addRock("hit", rock);

    run.advance(16);

    expect(flashOf(scene)?.at).toEqual(
      edgeToward(shell, rock, { x: ship.x - rock.x, y: ship.y - rock.y }),
    );
  });

  it.each([
    ["past the field's edge, on both copies of the rock", 0.5, [true, true]],
    ["on the field, with one light", ROCK_RADIUS.medium + 0.5, [true, false]],
  ] as const)(
    "lights the struck faces of a rock whose edge toward the ship lies %s",
    async (_, inFromEdge, lit) => {
      const { shell, run, scene } = await startBoard(withShip);
      const ship = shipOf(shell.field);
      const { width } = shell.field.torus;
      const rock = placeRock(shell.field, "medium", width - inFromEdge, ship.y);
      // The ship lies across the field's right edge from the rock.
      Object.assign(ship, { x: 1.5, lastX: 1.5 });
      shell.field.events.addRock("hit", rock);

      run.advance(16);

      const edge = width - inFromEdge + ROCK_RADIUS.medium;
      const metrics = metricsOf(shell);
      expect(flashesShown(scene)).toEqual(
        [
          rounded(onCanvas(metrics, edge, ship.y)),
          rounded(onCanvas(metrics, edge - width, ship.y)),
        ].filter((_place, i) => lit[i]),
      );
    },
  );

  it("puts the flash away once it is over", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.addRock("hit", keeperOf(shell.field));

    run.advance(FLASH_MS + 32);

    expect(shownCount(scene.kit.rocks.flashes)).toBe(0);
  });

  it("flashes no sooner after the last flash than is safe, but sparks each time", async () => {
    const { shell, run, scene } = await startBoard();
    const second = placeRock(shell.field, "medium", MIDDLE.x, MIDDLE.y);
    shell.field.events.addRock("hit", keeperOf(shell.field));
    run.advance(FLASH_MS + 32);
    shell.field.events.addRock("hit", second);

    run.advance(16);

    expect({
      flash: shownCount(scene.kit.rocks.flashes),
      sparks: scene.kit.debris.heldHits.all.filter(({ at }) => at > -Infinity)
        .length,
    }).toEqual({ flash: 0, sparks: 2 });
  });

  it("flashes a new field's first held hit, however lately the last field flashed", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.addRock("hit", keeperOf(shell.field));
    run.advance(FLASH_MS + 32);
    shell.field = fieldFrom(KEEPER);
    shell.field.events.addRock("hit", keeperOf(shell.field));

    run.advance(16);

    expect(scene.kit.rocks.flashes[0].visible).toBe(true);
  });

  it.each([
    ["toward the ship", withShip],
    ["toward the field's light while no ship flies", () => undefined],
  ] as const)(
    "throws a held hit's spark from its rock's rim %s",
    async (_, setUp) => {
      const { shell, run, scene } = await startBoard(setUp);
      const rock = placeRock(shell.field, "medium", MIDDLE.x, MIDDLE.y);
      shell.field.events.addRock("hit", rock);

      run.advance(16);

      const toward = towardShip(shell.field, rock.x, rock.y, ART_PALETTE);
      const rim = rimToward(rock, toward);
      const at = onCanvas(
        metricsOf(shell),
        rock.x + Math.cos(toward) * rim,
        rock.y + Math.sin(toward) * rim,
      );
      expect(cornersOf(trianglesOf(scene.kit.debris.sparkGraphics), 0)).toEqual(
        cornersOf([{ points: [at.x, at.y] }], 0),
      );
    },
  );

  it.each([
    ["a lodestone's hit", "lodestone", "hit"],
    ["iron's ring, more of them", "iron", "rung"],
  ] as const)(
    "throws a held hit's sparks in the flame's tones: %s",
    async (_, kind, rung) => {
      const { shell, run, scene } = await startBoard();
      const rock = placeRock(shell.field, "large", MIDDLE.x, MIDDLE.y, kind);
      shell.field.events.addRock(rung, rock);

      run.advance(32, 16);

      const energy = energyOf(ART_PALETTE.flame, ART_PALETTE);
      const lines = linesOf(scene.kit.debris.sparkGraphics);
      expect({
        lines: lines.length,
        colors: new Set(lines.map(({ color }) => color)),
      }).toEqual({
        lines: impactOf(kind, lastSerial(shell)).length * 2,
        colors: new Set([energy.body, energy.hot]),
      });
    },
  );

  it("fans a held hit's sparks back the way the shot came, from where it struck", async () => {
    const { shell, run, scene } = await startBoard(withShip);
    const rock = placeRock(shell.field, "large", MIDDLE.x, MIDDLE.y);
    shell.field.events.addRock("hit", rock);

    run.advance(32, 16);

    const metrics = metricsOf(shell);
    const toward = towardShip(shell.field, rock.x, rock.y, ART_PALETTE);
    const rim = rimToward(rock, toward);
    const struck = onCanvas(
      metrics,
      rock.x + Math.cos(toward) * rim,
      rock.y + Math.sin(toward) * rim,
    );
    const energy = energyOf(ART_PALETTE.flame, ART_PALETTE);
    const body = streakRecord();
    const hot = streakRecord();
    const lines = impactOf("stone", lastSerial(shell)).flatMap((tick) =>
      impactTickAt(tick, toward, 16, energy, metrics, body, hot)
        ? [streakAbout(body, struck), streakAbout(hot, struck)]
        : [],
    );
    expect({
      some: lines.length > 0,
      lines: linesOf(scene.kit.debris.sparkGraphics),
    }).toEqual({ some: true, lines });
  });

  it("throws a held hit's spark struck near an edge in at the far side too, as far as it reaches", async () => {
    const { shell, run, scene } = await startBoard();
    const rock = placeRock(shell.field, "medium", MIDDLE.x, MIDDLE.y);
    const toward = towardShip(shell.field, rock.x, rock.y, ART_PALETTE);
    const rim = rimToward(rock, toward);
    const struck = {
      x: HELD_REACH - 0.1,
      y: rock.y + Math.sin(toward) * rim,
    };
    rock.x = wrap(struck.x - Math.cos(toward) * rim, PICTURE_TORUS.width);
    shell.field.events.addRock("hit", rock);

    run.advance(16);

    const metrics = metricsOf(shell);
    const near = onCanvas(metrics, struck.x, struck.y);
    const far = onCanvas(metrics, struck.x + PICTURE_TORUS.width, struck.y);
    expect(cornersOf(trianglesOf(scene.kit.debris.sparkGraphics), 0)).toEqual(
      cornersOf([{ points: [near.x, near.y] }, { points: [far.x, far.y] }], 0),
    );
  });

  it("puts a held hit's spark away once it is over", async () => {
    const { shell, run, scene } = await startBoard();
    const rock = placeRock(shell.field, "medium", MIDDLE.x, MIDDLE.y);
    shell.field.events.addRock("hit", rock);

    run.advance(HELD_MS + 32, 16);

    expect(commandsOf(scene.kit.debris.sparkGraphics)).toEqual([]);
  });
});

/** Logs the blast of a medium volatile rock on a shell's field, reaching 4, and returns the rock. */
function logBlast(
  shell: FakeShell,
  x: number = MIDDLE.x,
  y: number = MIDDLE.y,
): Rock {
  const rock = placeRock(shell.field, "medium", x, y, "volatile");
  shell.field.events.addRock("blast", rock, 4);
  return rock;
}

/** Returns whether a round is a disc, its corners all as far from its middle. */
function isDisc({ inner, outer }: FilledRound): boolean {
  return outer - inner < 1e-6;
}

/** Returns each band a blast fills, its ring's lines or its still ring, as where its middle is on the canvas, how far out it runs, and its color. */
function blastRings(
  scene: BeltScene,
): readonly { x: number; y: number; radius: number; color: number }[] {
  return roundsOf(scene.kit.blasts.graphics)
    .filter((round) => !isDisc(round))
    .map(({ x, y, inner, outer, color }) => ({
      x,
      y,
      radius: (inner + outer) / 2,
      color,
    }));
}

/** Returns whether a blast fills a disc in a color. */
function discIn(scene: BeltScene, color: number): boolean {
  return roundsOf(scene.kit.blasts.graphics).some(
    (round) => isDisc(round) && round.color === color,
  );
}

/** Returns whether two places on the canvas are the same, but for rounding. */
function isAt(
  { x, y }: { readonly x: number; readonly y: number },
  at: { readonly x: number; readonly y: number },
): boolean {
  return Math.abs(x - at.x) < 1e-6 && Math.abs(y - at.y) < 1e-6;
}

/** Sets a shell up to color its field in a dark palette. */
function darkly(shell: FakeShell): void {
  shell.colors = DARK;
}

/** Each palette's mode a blast's specs color the field in, and how a shell is set up for it. */
const MODES = [
  ["light", (): void => undefined],
  ["dark", darkly],
] as const;

describe("a blast", () => {
  it.each(MODES)(
    "sweeps its ring out from where it went off in a %s palette: two soft bands outside it, its middle in the rock's ink, and a hot inner edge",
    async (_, setUp) => {
      const { shell, run, scene } = await startBoard(setUp);
      logBlast(shell);

      run.advance(16);

      const { ink, soft, hot } = blastInks(shell.colors);
      const at = onCanvas(metricsOf(shell), MIDDLE.x, MIDDLE.y);
      const rings = blastRings(scene);
      expect({
        at: rings.every((ring) => isAt(ring, at)),
        colors: rings.map(({ color }) => color),
        outsideIn: falling(rings.map(({ radius }) => radius)),
      }).toEqual({ at: true, colors: [soft, soft, ink, hot], outsideIn: true });
    },
  );

  it("spreads its ring toward its reach as it goes, never past it", async () => {
    const { shell, run, scene } = await startBoard();
    logBlast(shell);
    run.advance(16);

    const radii = overTime(
      run,
      BLAST_RING_MS - 50,
      25,
      () => blastRings(scene)[2]?.radius ?? 0,
    );

    expect({
      spreads: rising(radii),
      within: (radii.at(-1) ?? Infinity) < 4 * metricsOf(shell).unit,
    }).toEqual({ spreads: true, within: true });
  });

  it.each(MODES)(
    "flashes a disc and glows in its soft light as it goes off in a %s palette, both gone once its flash has faded",
    async (_, setUp) => {
      const { shell, run, scene } = await startBoard(setUp);
      logBlast(shell);
      const { hot, soft } = blastInks(shell.colors);
      const flash = (): readonly [boolean, number] => [
        discIn(scene, hot),
        halosIn(scene, soft).length,
      ];
      run.advance(16);
      const flashing = flash();

      run.advance(BLAST_FLASH_MS, 16);

      expect([flashing, flash()]).toEqual([
        [true, 1],
        [false, 0],
      ]);
    },
  );

  it("throws embers that fly out and are gone within its time", async () => {
    const { shell, run, scene } = await startBoard();
    logBlast(shell);
    run.advance(100, 25);
    const streaks = (): number =>
      commandsOf(scene.kit.blasts.graphics).filter(
        ({ kind }) => kind === "lineTo",
      ).length;
    const flying = streaks();

    run.advance(BLAST_MS, 25);

    expect([flying, streaks()]).toEqual([BLAST_EMBERS, 0]);
  });

  it("throws each ember outward from where it went off, its streak trailing its head, in the ember's color", async () => {
    const { shell, run, scene } = await startBoard();
    logBlast(shell);

    run.advance(100, 25);

    const at = onCanvas(metricsOf(shell), MIDDLE.x, MIDDLE.y);
    const streaks = linesOf(scene.kit.blasts.graphics);
    expect({
      outward: streaks.every(
        ({ fromX, fromY, toX, toY }) =>
          Math.hypot(toX - at.x, toY - at.y) >
          Math.hypot(fromX - at.x, fromY - at.y),
      ),
      colors: new Set(streaks.map(({ color }) => color)),
    }).toEqual({
      outward: true,
      colors: new Set([blastInks(shell.colors).ember]),
    });
  });

  it.each(MODES)(
    "lights the rocks near it in its soft light in a %s palette, where it went off, fading as its ring sweeps out",
    async (_, setUp) => {
      const { shell, run, scene } = await startBoard(setUp);
      logBlast(shell);
      const { light } = scene.kit.blasts;
      const at = onCanvas(metricsOf(shell), MIDDLE.x, MIDDLE.y);
      run.advance(16);
      const first = { x: light.x, y: light.y, intensity: light.intensity };

      const later = overTime(
        run,
        BLAST_RING_MS - 50,
        25,
        () => light.intensity,
      );
      run.advance(100, 25);

      expect({
        at: [first.x, first.y],
        color: [light.color.r, light.color.g, light.color.b].map((c) =>
          Math.round(c * 255),
        ),
        fading: falling([first.intensity, ...later]),
        out: light.visible,
      }).toEqual({
        at: [at.x, at.y],
        color: [
          (blastInks(shell.colors).soft >> 16) & 0xff,
          (blastInks(shell.colors).soft >> 8) & 0xff,
          blastInks(shell.colors).soft & 0xff,
        ],
        fading: true,
        out: false,
      });
    },
  );

  it("is among the lights the rocks are lit by, with its light past an edge", async () => {
    const { scene } = await startBoard();

    expect(scene.lights.lights).toEqual(
      expect.arrayContaining([scene.kit.blasts.light, scene.kit.blasts.beyond]),
    );
  });

  it("lights the rocks past an edge its light reaches across, where its copy there went off", async () => {
    const { shell, run, scene } = await startBoard();
    logBlast(shell, 1, MIDDLE.y);

    run.advance(16);

    const { light, beyond } = scene.kit.blasts;
    const metrics = metricsOf(shell);
    expect({
      light: [light.visible, light.x],
      beyond: [beyond.visible, beyond.x, beyond.y, beyond.intensity],
    }).toEqual({
      light: [true, onCanvas(metrics, 1, MIDDLE.y).x],
      beyond: [
        true,
        onCanvas(metrics, 1 + PICTURE_TORUS.width, MIDDLE.y).x,
        onCanvas(metrics, 1, MIDDLE.y).y,
        light.intensity,
      ],
    });
  });

  it.each([
    [1, 3, 1 + PICTURE_TORUS.width, 3],
    [3, 1, 3, 1 + PICTURE_TORUS.height],
  ])(
    "lights the rocks past the nearer edge only of a blast in a corner, at (%d, %d)",
    async (x, y, beyondX, beyondY) => {
      const { shell, run, scene } = await startBoard();
      logBlast(shell, x, y);

      run.advance(16);

      const { beyond } = scene.kit.blasts;
      const at = onCanvas(metricsOf(shell), beyondX, beyondY);
      expect([beyond.x, beyond.y]).toEqual([at.x, at.y]);
    },
  );

  it("lights nothing past an edge its light doesn't reach", async () => {
    const { shell, run, scene } = await startBoard();
    logBlast(shell);

    run.advance(16);

    expect(scene.kit.blasts.beyond.visible).toBe(false);
  });

  it("shows as many blasts at once as a chain of volatile rocks sets off", async () => {
    const { shell, run, scene } = await startBoard();
    for (let i = 0; i < MOST_BLASTS; i++) {
      logBlast(shell, 8 + 4 * i, MIDDLE.y);
    }

    run.advance(16);

    const middles = new Set(blastRings(scene).map(({ x }) => Math.round(x)));
    expect(middles.size).toBe(MOST_BLASTS);
  });

  it("neither flashes nor lights the rocks within the gap after a held hit's flash, but sweeps its ring", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.addRock("hit", keeperOf(shell.field));
    run.advance(FLASH_MS + 32);
    logBlast(shell);

    run.advance(16);

    const { soft } = blastInks(shell.colors);
    expect({
      lit: scene.kit.blasts.light.visible,
      glow: halosIn(scene, soft).length,
      ring: blastRings(scene).length > 0,
    }).toEqual({ lit: false, glow: 0, ring: true });
  });

  it("shows one still ring at its reach in the rock's ink where motion isn't welcome, lighting nothing", async () => {
    const { shell, run, scene } = await startBoard(stillness);
    logBlast(shell);

    run.advance(100, 25);

    const metrics = metricsOf(shell);
    const at = onCanvas(metrics, MIDDLE.x, MIDDLE.y);
    expect({
      rings: blastRings(scene).map(({ x, y, radius, color }) => [
        x,
        y,
        radius,
        color,
      ]),
      rounds: roundsOf(scene.kit.blasts.graphics).length,
      lit: scene.kit.blasts.light.visible,
    }).toEqual({
      rings: [
        [
          expect.closeTo(at.x, 6),
          expect.closeTo(at.y, 6),
          expect.closeTo(4 * metrics.unit, 6),
          blastInks(shell.colors).ink,
        ],
      ],
      rounds: 1,
      lit: false,
    });
  });

  it("puts its still ring away once it is over", async () => {
    const { shell, run, scene } = await startBoard(stillness);
    logBlast(shell);

    run.advance(BLAST_MS + 32, 16);

    expect(commandsOf(scene.kit.blasts.graphics)).toEqual([]);
  });

  it("draws its ring on both sides of an edge it reaches across", async () => {
    const { shell, run, scene } = await startBoard();
    logBlast(shell, 1, MIDDLE.y);

    run.advance(16);

    const metrics = metricsOf(shell);
    const middles = new Set(
      blastRings(scene).map(({ x }) => Math.round(x * 1000) / 1000),
    );
    expect([...middles]).toEqual(
      [
        onCanvas(metrics, 1, MIDDLE.y).x,
        onCanvas(metrics, 1 + PICTURE_TORUS.width, MIDDLE.y).x,
      ].map((x) => Math.round(x * 1000) / 1000),
    );
  });

  it("puts everything away once it is over", async () => {
    const { shell, run, scene } = await startBoard();
    logBlast(shell);

    run.advance(BLAST_MS + 32, 16);

    expect({
      drawn: commandsOf(scene.kit.blasts.graphics),
      lit: [scene.kit.blasts.light.visible, scene.kit.blasts.beyond.visible],
    }).toEqual({ drawn: [], lit: [false, false] });
  });
});

describe("a boulder's break", () => {
  /** Returns the lines a boulder's cracks are drawn in. */
  function cracksIn(scene: BeltScene): readonly StrokedLine[] {
    return linesOf(scene.kit.boulders.graphics);
  }

  it("cracks it from its middle toward its rim as it breaks, in a soft line, its core and a hot line", async () => {
    const { shell, run, scene } = await startBoard();
    logBoulderBreak(shell);

    run.advance(32, 16);

    const { glow, core, hot } = boulderInks(shell.colors);
    const at = onCanvas(metricsOf(shell), MIDDLE.x, MIDDLE.y);
    const radius = ROCK_RADIUS.boulder * metricsOf(shell).unit;
    const cracks = cracksIn(scene);
    expect({
      colors: new Set(cracks.map(({ color }) => color)),
      fromMiddle: cracks.every(
        ({ fromX, fromY }) =>
          Math.hypot(fromX - at.x, fromY - at.y) < 0.15 * radius,
      ),
      outward: cracks.every(
        ({ fromX, fromY, toX, toY }) =>
          Math.hypot(toX - at.x, toY - at.y) >
          Math.hypot(fromX - at.x, fromY - at.y),
      ),
    }).toEqual({
      colors: new Set([glow, core, hot]),
      fromMiddle: true,
      outward: true,
    });
  });

  it("runs its cracks out to its rim while the field holds still", async () => {
    const { shell, run, scene } = await startBoard();
    logBoulderBreak(shell);
    const at = onCanvas(metricsOf(shell), MIDDLE.x, MIDDLE.y);
    const longest = (): number =>
      Math.max(
        ...cracksIn(scene).map(({ toX, toY }) =>
          Math.hypot(toX - at.x, toY - at.y),
        ),
      );
    run.advance(32, 16);
    const early = longest();

    run.advance(BOULDER_HOLD_MS, 16);

    expect([early < longest(), longest()]).toEqual([
      true,
      expect.closeTo(
        CRACK_REACH * ROCK_RADIUS.boulder * metricsOf(shell).unit,
        6,
      ),
    ]);
  });

  it("glows about it in its glow's color as it cracks", async () => {
    const { shell, run, scene } = await startBoard();
    logBoulderBreak(shell);

    run.advance(48, 16);

    expect(halosIn(scene, boulderInks(shell.colors).glow)).toHaveLength(1);
  });

  it("throws a ring out from it in its core once the field moves on, and none before", async () => {
    const { shell, run, scene } = await startBoard();
    logBoulderBreak(shell);
    run.advance(16);
    const before = trianglesOf(scene.kit.boulders.graphics).length;

    run.advance(BOULDER_HOLD_MS + 100, 16);

    const ring = roundsOf(scene.kit.boulders.graphics);
    const at = onCanvas(metricsOf(shell), MIDDLE.x, MIDDLE.y);
    expect({
      before,
      ring: ring.map((round) => [isAt(round, at), round.color]),
      outside:
        (ring[0]?.inner ?? 0) >
        ROCK_RADIUS.boulder * metricsOf(shell).unit * 0.9,
    }).toEqual({
      before: 0,
      ring: [[true, boulderInks(shell.colors).core]],
      outside: true,
    });
  });

  it("puts it all away once its beats are over", async () => {
    const { shell, run, scene } = await startBoard();
    logBoulderBreak(shell);

    run.advance(BOULDER_HOLD_MS + BOULDER_THROW_MS + 32, 16);

    expect({
      drawn: commandsOf(scene.kit.boulders.graphics),
      glow: halosIn(scene, boulderInks(shell.colors).glow).length,
    }).toEqual({ drawn: [], glow: 0 });
  });
});

describe("the wave's clearing", () => {
  /** Logs a stone broken at a place on a shell's field, then the wave cleared. */
  function logClearing(shell: FakeShell, x: number, y: number): void {
    logBreak(shell, placeRock(shell.field, "small", x, y), 1, 0);
    shell.field.events.add("cleared", MIDDLE.x, MIDDLE.y);
  }

  /** Sets a shell up to play its sector's last wave. */
  function endingSector(shell: FakeShell): void {
    shell.endsSector = true;
  }

  /** Returns the wave's ring's line, the last band the ring painter fills, or null with none. */
  function waveRing(scene: BeltScene): FilledRound | null {
    return roundsOf(scene.kit.rings.graphics).at(-1) ?? null;
  }

  /**
   * Returns how far a wave's last points have risen a while after they are
   * scored, the wave cleared or not, and its sector's last or not.
   */
  async function risen(cleared: boolean, endsSector: boolean): Promise<number> {
    const { shell, run, scene } = await startBoard((board) => {
      board.endsSector = endsSector;
    });
    shell.field.events.addScore(MIDDLE.x, MIDDLE.y, 40, 1);
    if (cleared) shell.field.events.add("cleared", MIDDLE.x, MIDDLE.y);
    run.advance(16);
    const [points] = scene.kit.points.scored.all;
    const scored = points?.image.y ?? 0;
    run.advance(SLOW_MS - 50, 16);
    return scored - (points?.image.y ?? 0);
  }

  it("slows the flourishes to a third for a moment at a sector's last rock, its last points rising at a third of their pace", async () => {
    const slowed = await risen(true, true);
    const paced = await risen(false, true);

    expect(slowed / paced).toBeCloseTo(1 / 3, 2);
  });

  it("keeps the flourishes' pace at any other wave's last rock, its last points rising at theirs", async () => {
    const cleared = await risen(true, false);
    const paced = await risen(false, false);

    expect(cleared / paced).toBeCloseTo(1, 2);
  });

  it("has the wave's ring wait as long as the slow would last, unslowed, at any other wave's last rock", async () => {
    const { shell, run, scene } = await startBoard();
    logClearing(shell, 20, 12);
    run.advance(16);

    run.advance(SLOW_MS - 50, 16);
    const waiting = waveRing(scene);
    run.advance(100, 16);

    expect([waiting, waveRing(scene) === null]).toEqual([null, false]);
  });

  it("has the wave's ring wait out the slow", async () => {
    const { shell, run, scene } = await startBoard(endingSector);
    logClearing(shell, 20, 12);
    run.advance(16);

    run.advance(SLOW_MS - 50, 16);
    const slowed = waveRing(scene);
    run.advance(100, 16);

    expect([slowed, waveRing(scene) === null]).toEqual([null, false]);
  });

  it("crosses the field with the wave's ring from where its last rock went, in the accent, toward the farthest corner", async () => {
    const { shell, run, scene } = await startBoard(endingSector);
    logClearing(shell, 20, 12);
    run.advance(SLOW_MS + 50, 16);
    const at = onCanvas(metricsOf(shell), 20, 12);
    const radius = (): number => {
      const ring = waveRing(scene);
      return ring === null ? 0 : (ring.inner + ring.outer) / 2;
    };
    const first = radius();

    run.advance(200, 16);

    const ring = waveRing(scene);
    expect({
      at: ring !== null && isAt(ring, at),
      color: ring?.color,
      crosses: radius() > first,
      within:
        radius() <
        farthestCorner(20, 12, PICTURE_TORUS) * metricsOf(shell).unit,
    }).toEqual({
      at: true,
      color: energyOf(ART_PALETTE.accent, ART_PALETTE).body,
      crosses: true,
      within: true,
    });
  });

  it("crosses it from where the clearing is logged with no rock broken", async () => {
    const { shell, run, scene } = await startBoard(endingSector);
    shell.field.events.add("cleared", MIDDLE.x, MIDDLE.y);

    run.advance(SLOW_MS + 50, 16);

    const ring = waveRing(scene);
    expect(
      ring !== null &&
        isAt(ring, onCanvas(metricsOf(shell), MIDDLE.x, MIDDLE.y)),
    ).toBe(true);
  });

  it("draws the wave's ring with its sides within half a pixel of its circle, however far it has crossed", async () => {
    const { shell, run, scene } = await startBoard(endingSector);
    logClearing(shell, 1, 1);

    run.advance(CLEARED_MS - 60, 16);

    const kinds = commandsOf(scene.kit.rings.graphics).map(({ kind }) => kind);
    const last = kinds.lastIndexOf("fillStyle");
    const sides =
      kinds.slice(last).filter((kind) => kind === "fillTriangle").length / 2;
    const ring = waveRing(scene);
    const { pixelRatio } = metricsOf(shell);
    expect(
      (ring?.outer ?? Infinity) * (1 - Math.cos(Math.PI / sides)),
    ).toBeLessThanOrEqual(0.5 * pixelRatio);
  });

  it("is gone as the Cleared card opens", async () => {
    const { shell, run, scene } = await startBoard(endingSector);
    logClearing(shell, 20, 12);

    run.advance(CLEARED_MS + 32, 16);

    expect(trianglesOf(scene.kit.rings.graphics)).toEqual([]);
  });
});

describe("the still marks", () => {
  it.each([
    [
      "a dash's start",
      (shell: FakeShell): void => {
        shell.field.events.addDash(MIDDLE.x, MIDDLE.y, 0);
      },
      RINGS.dashed.reach,
    ],
    [
      "a spent Shield",
      (shell: FakeShell): void => {
        shell.field.events.add("shielded", MIDDLE.x, MIDDLE.y);
      },
      RINGS.shielded.reach,
    ],
  ] as const)(
    "marks %s with a ring standing still at its reach where motion isn't welcome, for its time",
    async (_, log, reach) => {
      const { shell, run, scene } = await startBoard(stillness);
      log(shell);
      run.advance(48, 16);
      const early = bandsOf(scene.kit.rings.graphics);
      run.advance(STILL_MARK_MS / 2, 16);
      const later = bandsOf(scene.kit.rings.graphics);

      run.advance(STILL_MARK_MS, 16);

      const ring: Band = {
        ...rounded(onCanvas(metricsOf(shell), MIDDLE.x, MIDDLE.y)),
        radius: toMillionths(reach * metricsOf(shell).unit),
        color: ART_PALETTE.accent,
        alpha: 0.9,
      };
      expect([early, later, bandsOf(scene.kit.rings.graphics)]).toEqual([
        [ring],
        [ring],
        [],
      ]);
    },
  );

  it("marks no dash's start where motion is welcome", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.addDash(MIDDLE.x, MIDDLE.y, 0);

    run.advance(48, 16);

    expect(bandsOf(scene.kit.rings.graphics)).toEqual([]);
  });
});

describe("the sights", () => {
  it.each([
    [
      "a pickup let go from a rock",
      (shell: FakeShell): void => {
        shell.field.events.addPickup("dropped", 30, 20, "spread");
      },
    ],
    [
      "a pickup fading out",
      (shell: FakeShell): void => {
        shell.field.events.addPickup("faded", 30, 20, "spread");
      },
    ],
    [
      "a stray drifting in",
      (shell: FakeShell): void => {
        shell.field.events.addPilot("strayed", 30, 20, 3, shell.field.crew);
      },
    ],
  ] as const)(
    "sweeps a ring out from %s, in the accent, as its sound plays",
    async (_, log) => {
      const { shell, run, scene } = await startBoard();
      log(shell);
      run.advance(48, 16);
      const [first] = bandsOf(scene.kit.rings.graphics);

      run.advance(100, 16);

      const [ring] = bandsOf(scene.kit.rings.graphics);
      expect({
        at: ring && { x: ring.x, y: ring.y, color: ring.color },
        spreads: (ring?.radius ?? 0) > (first?.radius ?? Infinity),
      }).toEqual({
        at: {
          ...rounded(onCanvas(metricsOf(shell), 30, 20)),
          color: ART_PALETTE.accent,
        },
        spreads: true,
      });
    },
  );

  it("sweeps a stray's ring out once at the edge it comes in by, not past it", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.addPilot("strayed", 0, MIDDLE.y, 3, shell.field.crew);

    run.advance(48, 16);

    expect(
      bandsOf(scene.kit.rings.graphics).map(({ x, y }) => ({ x, y })),
    ).toEqual([rounded(onCanvas(metricsOf(shell), 0, MIDDLE.y))]);
  });
});

describe("the rings", () => {
  it("sweeps a spent Shield's ring out from where it was spent, in the accent", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.add("shielded", MIDDLE.x, MIDDLE.y);

    run.advance(48, 16);

    const [ring] = bandsOf(scene.kit.rings.graphics);
    expect(ring && { x: ring.x, y: ring.y, color: ring.color }).toEqual({
      ...rounded(onCanvas(metricsOf(shell), MIDDLE.x, MIDDLE.y)),
      color: ART_PALETTE.accent,
    });
  });

  it("spreads a ring toward its reach as it goes", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.add("shielded", MIDDLE.x, MIDDLE.y);
    run.advance(16);

    const radii = overTime(
      run,
      RING_MS - 50,
      25,
      () => bandsOf(scene.kit.rings.graphics)[0]?.radius ?? 0,
    );

    expect({
      spreads: rising(radii),
      within:
        (radii.at(-1) ?? Infinity) < SHIELD_RING_REACH * metricsOf(shell).unit,
    }).toEqual({ spreads: true, within: true });
  });

  it("fills a ring as a band of triangles as wide as a ring is, its sides within half a pixel of its circle, drawing no circle", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.add("shielded", MIDDLE.x, MIDDLE.y);

    run.advance(RING_MS - 50, 16);

    const { unit, pixelRatio } = metricsOf(shell);
    const commands = commandsOf(scene.kit.rings.graphics);
    const sides =
      commands.filter(({ kind }) => kind === "fillTriangle").length / 2;
    const [ring] = roundsOf(scene.kit.rings.graphics);
    const outer = ring?.outer ?? Infinity;
    expect({
      width: toMillionths((outer - (ring?.inner ?? 0)) / unit),
      within: outer * (1 - Math.cos(Math.PI / sides)) <= 0.5 * pixelRatio,
      circles: commands.filter(({ kind }) => kind === "arc").length,
    }).toEqual({ width: RING_WIDTH, within: true, circles: 0 });
  });

  it("puts a ring away once it is over", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.add("shielded", MIDDLE.x, MIDDLE.y);

    run.advance(RING_MS + 32);

    expect(bandsOf(scene.kit.rings.graphics)).toEqual([]);
  });

  it("sweeps a lost ship's ring out in the accent, to a lost ship's reach", async () => {
    const { shell, run, scene } = await startBoard();
    logShipLost(shell);
    run.advance(16);

    const radii = overTime(
      run,
      RING_MS - 50,
      25,
      () => bandsOf(scene.kit.rings.graphics)[0]?.radius ?? 0,
    );

    expect({
      color: bandsOf(scene.kit.rings.graphics)[0]?.color,
      within:
        (radii.at(-1) ?? Infinity) < LOST_RING_REACH * metricsOf(shell).unit,
      past: (radii.at(-1) ?? 0) > (LOST_RING_REACH / 2) * metricsOf(shell).unit,
    }).toEqual({ color: ART_PALETTE.accent, within: true, past: true });
  });

  it("sweeps a ring across an edge on both sides", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.add("shielded", 1, MIDDLE.y);

    run.advance(100, 25);

    const metrics = metricsOf(shell);
    expect(
      bandsOf(scene.kit.rings.graphics).map(({ x, y }) => ({ x, y })),
    ).toEqual([
      rounded(onCanvas(metrics, 1, MIDDLE.y)),
      rounded(onCanvas(metrics, 1 + PICTURE_TORUS.width, MIDDLE.y)),
    ]);
  });

  it("sweeps a ring across an edge once its band reaches across it, before its middle line does", async () => {
    const { shell, run, scene } = await startBoard();
    // Two frames after the Shield is spent, the ring's middle line stops a quarter of
    // its band's width short of the edge.
    const x = SHIELD_RING_REACH * easeOutCubic(32 / RING_MS) + RING_WIDTH / 4;
    shell.field.events.add("shielded", x, MIDDLE.y);

    run.advance(48);

    const metrics = metricsOf(shell);
    expect(
      bandsOf(scene.kit.rings.graphics).map(({ x, y }) => ({ x, y })),
    ).toEqual([
      rounded(onCanvas(metrics, x, MIDDLE.y)),
      rounded(onCanvas(metrics, x + PICTURE_TORUS.width, MIDDLE.y)),
    ]);
  });
});

describe("static stepping up", () => {
  it("sweeps a ring out from the pod, in the accent, as static rises to a step", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.addStep(MIDDLE.x, MIDDLE.y, 2, false);
    run.advance(48, 16);
    const [first] = bandsOf(scene.kit.rings.graphics);

    run.advance(100, 16);

    const [ring] = bandsOf(scene.kit.rings.graphics);
    expect({
      at: ring && { x: ring.x, y: ring.y, color: ring.color },
      spreads: (ring?.radius ?? 0) > (first?.radius ?? Infinity),
      within:
        (ring?.radius ?? Infinity) <=
        RINGS.stepped.reach * metricsOf(shell).unit,
    }).toEqual({
      at: {
        ...rounded(onCanvas(metricsOf(shell), MIDDLE.x, MIDDLE.y)),
        color: ART_PALETTE.accent,
      },
      spreads: true,
      within: true,
    });
  });

  it("sweeps no ring as static falls to a step, which the fur shows", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.addStep(MIDDLE.x, MIDDLE.y, 1, true);

    run.advance(48, 16);

    expect(bandsOf(scene.kit.rings.graphics)).toEqual([]);
  });

  it("sweeps no ring where motion isn't welcome, where the fur's lift is its still form", async () => {
    const { shell, run, scene } = await startBoard(stillness);
    shell.field.events.addStep(MIDDLE.x, MIDDLE.y, 2, false);

    run.advance(48, 16);

    expect(bandsOf(scene.kit.rings.graphics)).toEqual([]);
  });
});

describe("a fuzzball caught", () => {
  /** Returns the soft ring's bands a scene fills, each where it lies and in its color. */
  function softRingIn(
    scene: BeltScene,
  ): readonly Pick<Band, "x" | "y" | "color">[] {
    return bandsOf(scene.kit.rings.graphics).map(({ x, y, color }) => ({
      x,
      y,
      color,
    }));
  }

  it.each([
    ["joins the line", "joined"],
    ["is caught again", "recaught"],
    ["goes straight home", "home"],
  ] as const)(
    "opens a soft ring where one caught %s, its soft outside under its line, in the accent's energy",
    async (_, kind) => {
      const { shell, run, scene } = await startBoard();
      shell.field.events.addPilot(kind, 30, 20, 3, shell.field.crew);

      run.advance(48, 16);

      const at = rounded(onCanvas(metricsOf(shell), 30, 20));
      const { halo, body } = energyOf(ART_PALETTE.accent, ART_PALETTE);
      expect(softRingIn(scene)).toEqual([
        { ...at, color: halo },
        { ...at, color: body },
      ]);
    },
  );

  it("opens it from a stray's bubble's rim, wider as it goes, fading", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.addPilot("joined", 30, 20, 3, shell.field.crew);
    run.advance(32, 16);
    const [first] = bandsOf(scene.kit.rings.graphics);

    run.advance(64, 16);

    const [soft] = bandsOf(scene.kit.rings.graphics);
    const { unit } = metricsOf(shell);
    expect({
      outside: (first?.radius ?? 0) > RESCUE_RING.from * unit,
      spreads: (soft?.radius ?? 0) > (first?.radius ?? Infinity),
      fades: (soft?.alpha ?? 1) < (first?.alpha ?? 0),
      within:
        (soft?.radius ?? Infinity) <
        (RESCUE_RING.from + RESCUE_RING.opens) * unit,
    }).toEqual({ outside: true, spreads: true, fades: true, within: true });
  });

  it("opens its ring on both sides of an edge it reaches across", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.addPilot("joined", 1, MIDDLE.y, 3, shell.field.crew);

    run.advance(48, 16);

    const across = rounded(onCanvas(metricsOf(shell), 1, MIDDLE.y));
    const past = rounded(
      onCanvas(metricsOf(shell), 1 + PICTURE_TORUS.width, MIDDLE.y),
    );
    expect(softRingIn(scene).map(({ x, y }) => ({ x, y }))).toEqual([
      across,
      across,
      past,
      past,
    ]);
  });

  it("puts its ring away once its time is over", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.addPilot("joined", 30, 20, 3, shell.field.crew);

    run.advance(RESCUE_MS + 32, 16);

    expect(bandsOf(scene.kit.rings.graphics)).toEqual([]);
  });

  it.each([
    ["joins it", "joined"],
    ["is caught again into it", "recaught"],
  ] as const)(
    "springs the line in tow as one %s, bowing it aside",
    async (_, kind) => {
      const { shell, run, scene } = await startBoard(withShip);
      const ship = shipOf(shell.field);
      shell.field.events.addPilot(kind, ship.x, ship.y, 3, shell.field.crew);

      run.advance(48, 16);

      const lines = linesOf(scene.kit.tow.line);
      const atX = onCanvas(metricsOf(shell), ship.x, ship.y).x;
      const aside = lines.map(({ toX }) => Math.abs(toX - atX));
      expect({
        steps: lines.length,
        bows: Math.max(...aside) > 0.01,
        within: Math.max(...aside) <= SPRING.reach * metricsOf(shell).unit,
      }).toEqual({ steps: 2 * SPRING.steps, bows: true, within: true });
    },
  );

  it("draws the line in tow straight again within its time", async () => {
    const { shell, run, scene } = await startBoard(withShip);
    const ship = shipOf(shell.field);
    shell.field.events.addPilot("joined", ship.x, ship.y, 3, shell.field.crew);

    run.advance(RESCUE_MS + 32, 16);

    expect(linesOf(scene.kit.tow.line)).toHaveLength(2);
  });

  it("springs nothing as a stray caught goes straight home", async () => {
    const { shell, run, scene } = await startBoard(withShip);
    const ship = shipOf(shell.field);
    shell.field.events.addPilot("home", ship.x, ship.y, 3, shell.field.crew);

    run.advance(48, 16);

    expect(linesOf(scene.kit.tow.line)).toHaveLength(2);
  });

  it("stops the line springing as a new field starts", async () => {
    const { shell, run, scene } = await startBoard(withShip);
    const ship = shipOf(shell.field);
    shell.field.events.addPilot("joined", ship.x, ship.y, 3, shell.field.crew);
    run.advance(16);
    withShip(shell);

    run.advance(32, 16);

    expect(linesOf(scene.kit.tow.line)).toHaveLength(2);
  });

  it("opens no ring and springs nothing where motion isn't welcome, where the line and the bar tell it", async () => {
    const { shell, run, scene } = await startBoard((board) => {
      withShip(board);
      stillness(board);
    });
    const ship = shipOf(shell.field);
    shell.field.events.addPilot("joined", ship.x, ship.y, 3, shell.field.crew);

    run.advance(48, 16);

    expect({
      rings: bandsOf(scene.kit.rings.graphics).length,
      lines: linesOf(scene.kit.tow.line).length,
    }).toEqual({ rings: 0, lines: 2 });
  });
});

/** Logs one of the crew knocked loose at the pod on a shell's field, the blow coming straight down. */
function logKnocked(shell: FakeShell): void {
  const ship = shipOf(shell.field);
  shell.field.events.addKnocked(ship.x, ship.y, 3, shell.field.crew, 0, 1);
}

/** Logs the pod zapping on a shell's field. */
function logZap(shell: FakeShell): void {
  const ship = shipOf(shell.field);
  shell.field.events.addZap(ship.x, ship.y, ship.angle);
}

/** Returns where each halo shows in a color, those that do, rounded. */
function glowsIn(
  scene: BeltScene,
  color: number,
): readonly { readonly x: number; readonly y: number }[] {
  return halosIn(scene, color).map(([x = NaN, y = NaN]) => rounded({ x, y }));
}

/** Returns where the pod is drawn on a shell's canvas, rounded. */
function podOn(shell: FakeShell): { readonly x: number; readonly y: number } {
  const ship = shipOf(shell.field);
  return rounded(onCanvas(metricsOf(shell), ship.x, ship.y));
}

describe("a fuzzball knocked loose", () => {
  it("flashes the pod, a disc under it in the accent lifted toward white, with its glow", async () => {
    const { shell, run, scene } = await startBoard(withShip);
    logKnocked(shell);

    run.advance(32, 16);

    const { halo } = energyOf(ART_PALETTE.accent, ART_PALETTE);
    expect({
      discs: roundsOf(scene.kit.podGlow.graphics).map((round) => ({
        ...rounded(round),
        disc: isDisc(round),
        color: round.color,
      })),
      glows: glowsIn(scene, halo),
    }).toEqual({
      discs: [
        { ...podOn(shell), disc: true, color: podFlashTone(ART_PALETTE) },
      ],
      glows: [podOn(shell)],
    });
  });

  it("flashes the pod on both sides of an edge its disc reaches across", async () => {
    const { shell, run, scene } = await startBoard(withShip);
    const ship = shipOf(shell.field);
    ship.x = 0.5;
    ship.lastX = 0.5;
    logKnocked(shell);

    run.advance(32, 16);

    const { unit } = metricsOf(shell);
    const xs = roundsOf(scene.kit.podGlow.graphics).map(({ x }) => x);
    expect(xs.map((x) => toMillionths(x - (xs[0] ?? 0)))).toEqual([
      0,
      toMillionths(PICTURE_TORUS.width * unit),
    ]);
  });

  it("puts its flash and the zap's glow and light out as a new field starts", async () => {
    const { shell, run, scene } = await startBoard(withShip);
    logKnocked(shell);
    logZap(shell);
    run.advance(16);
    withShip(shell);

    run.advance(16);

    expect({
      discs: roundsOf(scene.kit.podGlow.graphics).length,
      glows: halosIn(scene, ART_PALETTE.accent).length,
      lit: scene.kit.podGlow.light.visible,
    }).toEqual({ discs: 0, glows: 0, lit: false });
  });

  it("puts the flash out once it is over", async () => {
    const { shell, run, scene } = await startBoard(withShip);
    logKnocked(shell);

    run.advance(POD_FLASH_MS + 32, 16);

    const { halo } = energyOf(ART_PALETTE.accent, ART_PALETTE);
    expect({
      discs: roundsOf(scene.kit.podGlow.graphics).length,
      glows: halosIn(scene, halo).length,
    }).toEqual({ discs: 0, glows: 0 });
  });

  it("shakes the field along the blow, both ways", async () => {
    const { shell, run, scene } = await startBoard(withShip);
    logKnocked(shell);
    run.advance(16);

    const scrolls = overTime(run, SHAKE_MS, 16, () => scrolledBy(scene, shell));

    // The blow came straight down, so the field shakes up and down alone.
    expect({
      across: scrolls.filter(({ x }) => x !== 0),
      down: scrolls.some(({ y }) => y > 0),
      up: scrolls.some(({ y }) => y < 0),
    }).toEqual({ across: [], down: true, up: true });
  });

  it("rests the field within 0.3 s of the blow", async () => {
    const { shell, run, scene } = await startBoard(withShip);
    logKnocked(shell);
    run.advance(16);

    run.advance(SHAKE_MS, 16);

    expect(scrolledBy(scene, shell)).toEqual({ x: 0, y: 0 });
  });

  it("flashes no sooner after the last flash than is safe, but shakes", async () => {
    const { shell, run, scene } = await startBoard(withShip);
    shell.field.events.addRock("hit", keeperOf(shell.field));
    run.advance(FLASH_MS + 32);
    logKnocked(shell);

    const frames = overTime(run, SHAKE_MS, 16, () => ({
      discs: roundsOf(scene.kit.podGlow.graphics).length,
      scrolled: scrolledBy(scene, shell),
    }));

    expect({
      flashes: frames.some(({ discs }) => discs > 0),
      shakes: frames.some(({ scrolled }) => scrolled.y !== 0),
    }).toEqual({ flashes: false, shakes: true });
  });

  it("neither flashes nor shakes where motion isn't welcome, where its bubble flying and the guard's ring tell it", async () => {
    const { shell, run, scene } = await startBoard((board) => {
      withShip(board);
      stillness(board);
    });
    logKnocked(shell);

    const frames = overTime(run, SHAKE_MS, 16, () => ({
      discs: roundsOf(scene.kit.podGlow.graphics).length,
      scrolled: scrolledBy(scene, shell),
    }));

    expect({
      flashes: frames.some(({ discs }) => discs > 0),
      shakes: frames.some(
        ({ scrolled }) => scrolled.x !== 0 || scrolled.y !== 0,
      ),
    }).toEqual({ flashes: false, shakes: false });
  });
});

describe("a zap", () => {
  it("glows at the pod in the accent, and lights the rocks about it as strongly as it lights at first, while the field holds still", async () => {
    const { shell, run, scene } = await startBoard(withShip);
    logZap(shell);

    run.advance(32, 16);

    const { light } = scene.kit.podGlow;
    const { unit } = metricsOf(shell);
    expect({
      glows: glowsIn(scene, ART_PALETTE.accent),
      light: {
        ...rounded(light),
        visible: light.visible,
        radius: light.radius,
        intensity: light.intensity,
      },
    }).toEqual({
      glows: [podOn(shell)],
      light: {
        ...podOn(shell),
        visible: true,
        radius: ZAP_LIGHT.reach * unit,
        intensity: ZAP_LIGHT.strength,
      },
    });
  });

  it("lights the rocks past the edge the pod lies nearest, should its light reach across it", async () => {
    const { shell, run, scene } = await startBoard(withShip);
    const ship = shipOf(shell.field);
    ship.x = 1;
    ship.lastX = 1;
    logZap(shell);

    run.advance(32, 16);

    const { light, beyond } = scene.kit.podGlow;
    expect({
      visible: beyond.visible,
      apart: toMillionths(beyond.x - light.x),
      level: beyond.y === light.y,
    }).toEqual({
      visible: true,
      apart: toMillionths(PICTURE_TORUS.width * metricsOf(shell).unit),
      level: true,
    });
  });

  it("dies away once the field moves on", async () => {
    const { shell, run, scene } = await startBoard(withShip);
    logZap(shell);
    run.advance(16);

    const intensities = overTime(
      run,
      ZAP_MS - 64,
      16,
      () => scene.kit.podGlow.light.intensity,
    );

    expect(falling(intensities.slice(8))).toBe(true);
  });

  it("puts its glow and light out by its time", async () => {
    const { shell, run, scene } = await startBoard(withShip);
    logZap(shell);

    run.advance(ZAP_MS + 32, 16);

    expect({
      glows: halosIn(scene, ART_PALETTE.accent).length,
      lit: scene.kit.podGlow.light.visible,
    }).toEqual({ glows: 0, lit: false });
  });

  it("glows but lights nothing within the gap after a held hit's flash", async () => {
    const { shell, run, scene } = await startBoard(withShip);
    shell.field.events.addRock("hit", keeperOf(shell.field));
    run.advance(FLASH_MS + 32);
    logZap(shell);

    run.advance(16);

    expect({
      glows: halosIn(scene, ART_PALETTE.accent).length,
      lit: scene.kit.podGlow.light.visible,
    }).toEqual({ glows: 1, lit: false });
  });

  it("neither glows nor lights where motion isn't welcome, where its arcs, held, are its still form", async () => {
    const { shell, run, scene } = await startBoard((board) => {
      withShip(board);
      stillness(board);
    });
    logZap(shell);

    run.advance(32, 16);

    expect({
      glows: halosIn(scene, ART_PALETTE.accent).length,
      lit: scene.kit.podGlow.light.visible,
    }).toEqual({ glows: 0, lit: false });
  });
});

describe("a set piece's vent and the piece it sheds", () => {
  it("vents a blast from its heart, sweeping no ring of its own", async () => {
    const { shell, run, scene } = await startBoard();
    const boulder = placeRock(shell.field, "boulder", 30, 20, "stormheart");
    shell.field.events.addRock("vented", boulder, 6);

    run.advance(48, 16);

    expect({
      blast: roundsOf(scene.kit.blasts.graphics).length > 0,
      rings: bandsOf(scene.kit.rings.graphics).length,
    }).toEqual({ blast: true, rings: 0 });
  });

  it("keeps a blast's still ring at the vent's reach where motion isn't welcome", async () => {
    const { shell, run, scene } = await startBoard(stillness);
    const boulder = placeRock(shell.field, "boulder", 30, 20, "stormheart");
    shell.field.events.addRock("vented", boulder, 6);

    run.advance(48, 16);

    const { unit } = metricsOf(shell);
    expect(
      roundsOf(scene.kit.blasts.graphics).map(({ inner, outer }) =>
        toMillionths((inner + outer) / 2 / unit),
      ),
    ).toEqual([6]);
  });

  it("throws a ring from a piece knocked off, in its boulder's core", async () => {
    const { shell, run, scene } = await startBoard();
    const piece = placeRock(shell.field, "medium", 30, 20, "iron");
    shell.field.events.addRock("shed", piece);

    run.advance(48, 16);

    const [ring] = bandsOf(scene.kit.rings.graphics);
    expect(ring && { x: ring.x, y: ring.y, color: ring.color }).toEqual({
      ...rounded(onCanvas(metricsOf(shell), 30, 20)),
      color: boulderInks(ART_PALETTE).core,
    });
  });

  it("vents its blast from a small rock's heart, its ring starting within a medium one", async () => {
    const { shell, run, scene } = await startBoard();
    const boulder = placeRock(shell.field, "boulder", 30, 20, "stormheart");
    shell.field.events.addRock("vented", boulder, 6);

    run.advance(16);

    const { unit } = metricsOf(shell);
    expect(
      blastRings(scene).every(
        ({ radius }) => radius < ROCK_RADIUS.medium * unit,
      ),
    ).toBe(true);
  });

  it("flashes the vent's blast, lighting the rocks near it, where its held hit flashes nothing", async () => {
    const { shell, run, scene } = await startBoard();
    const boulder = placeRock(shell.field, "boulder", 30, 20, "stormheart");
    shell.field.events.addRock("hit", boulder);
    shell.field.events.addRock("vented", boulder, 6);

    run.advance(16);

    expect({
      lit: scene.kit.blasts.light.visible,
      held: flashOf(scene),
    }).toEqual({ lit: true, held: null });
  });
});

describe("a burr", () => {
  it("pops into shards in its ink as a shot pops it", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.addBurr("popped", 30, 20);

    run.advance(32, 16);

    expect(shardTints(scene)).toEqual(
      Array.from({ length: POP_SHARDS }, () => burrInk(ART_PALETTE)),
    );
  });

  it("pops each burr a dash shakes off", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.addShaken(30, 20, 0, 2);

    run.advance(32, 16);

    expect(shardTints(scene)).toHaveLength(2 * POP_SHARDS);
  });

  it("is simply gone where motion isn't welcome", async () => {
    const { shell, run, scene } = await startBoard(stillness);
    shell.field.events.addBurr("popped", 30, 20);
    shell.field.events.addShaken(30, 20, 0, 2);

    run.advance(32, 16);

    expect(shardTints(scene)).toEqual([]);
  });

  it("plays nothing as one comes in, which it shows", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.addBurr("burred", 30, 20);

    run.advance(32, 16);

    expect(playingIn(scene, shell)).toEqual(NOTHING_PLAYING);
  });

  it("plays nothing as one clings, which it shows", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.addClung(30, 20, 1);

    run.advance(32, 16);

    expect(playingIn(scene, shell)).toEqual(NOTHING_PLAYING);
  });
});

describe("the points", () => {
  /** A canvas on which the field's unit passes the cap the atlas is baked under. */
  const ROOMY = { width: 3000, height: 1500 } as const;

  /** Returns the points a spec scored first, the first a scene shows. */
  function firstScored(scene: BeltScene): Scored {
    const [scored] = scene.kit.points.scored.all;
    if (!scored) throw new Error("No points to show.");
    return scored;
  }

  /** Returns how the scene last lettered the points. */
  function letteringOf(scene: BeltScene): PointsLettering {
    const { lettering } = scene.kit.points;
    if (!lettering) throw new Error("The points aren't lettered.");
    return lettering;
  }

  /** Returns the sheet each label of points is stamped on. */
  function sheetOf(scene: BeltScene): Textures.DynamicTexture {
    const sheet = scene.textures.get(POINTS_SHEET);
    if (!(sheet instanceof Textures.DynamicTexture)) {
      throw new Error("No sheet for the points.");
    }
    return sheet;
  }

  /** Records each frame of the points' atlas stamped on the sheet from now on, and where. */
  function recordStamps(scene: BeltScene): readonly Stamp[] {
    const sheet = sheetOf(scene);
    const stamp = sheet.stamp.bind(sheet);
    const stamps: Stamp[] = [];
    sheet.stamp = (key, frame, x = 0, y = 0, config) => {
      stamps.push({ frame: `${key}/${String(frame)}`, x, y });
      return stamp(key, frame, x, y, config);
    };
    return stamps;
  }

  /**
   * Returns the stamps that spell out a label as the font as last lettered
   * sets it, from its box's corner on the sheet: every outline, then every
   * fill, none for a space.
   */
  function stampsOf(scene: BeltScene, scored: Scored): readonly Stamp[] {
    const layout = pointsLayout(MOST_POINTS_CHARACTERS);
    layOutPoints(scored.label, letteringOf(scene), layout);
    const box = sheetOf(scene).get(scored.frame);
    const stampsFrom = (frames: readonly (string | null)[]): Stamp[] =>
      frames.slice(0, layout.length).flatMap((frame, i) =>
        frame
          ? [
              {
                frame: `${POINTS_ATLAS}/${frame}`,
                x: box.cutX + (layout.xs[i] ?? 0),
                y: box.cutY + (layout.ys[i] ?? 0),
              },
            ]
          : [],
      );
    return [...stampsFrom(layout.outlines), ...stampsFrom(layout.fills)];
  }

  /** Describes a frame of the points' atlas stamped on the sheet. */
  interface Stamp {
    readonly frame: string;
    readonly x: number;
    readonly y: number;
  }

  /**
   * Records each character the points' atlas writes as it is lettered, and
   * how, until the test finishes.
   */
  function recordWrites(scene: BeltScene): readonly Written[] {
    const context = canvasTexture(scene, POINTS_ATLAS).getContext();
    const written: Written[] = [];
    const style = (): Omit<Written, "text" | "how" | "x" | "y"> => ({
      font: context.font,
      fill: colorOf(context.fillStyle),
      stroke: colorOf(context.strokeStyle),
      width: context.lineWidth,
      join: context.lineJoin,
    });
    context.fillText = (text, x, y) => {
      written.push({ text, how: "fill", x, y, ...style() });
    };
    context.strokeText = (text, x, y) => {
      written.push({ text, how: "stroke", x, y, ...style() });
    };
    // The canvas goes back to Phaser's pool, for the next texture made.
    onTestFinished(() => {
      for (const name of ["fillText", "strokeText"]) {
        Reflect.deleteProperty(context, name);
      }
    });
    return written;
  }

  /** Returns the color a context fills or strokes in, or nothing for a gradient or a pattern. */
  function colorOf(style: string | CanvasGradient | CanvasPattern): string {
    return typeof style === "string" ? style : "";
  }

  /** Describes a character the points' atlas wrote, and how. */
  interface Written {
    readonly text: string;
    readonly how: "fill" | "stroke";
    /** Where its pen started, on the atlas's canvas. */
    readonly x: number;
    readonly y: number;
    readonly font: string;
    readonly fill: string;
    readonly stroke: string;
    readonly width: number;
    readonly join: CanvasLineJoin;
  }

  it("shows the points scored about where they were scored", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.addScore(MIDDLE.x, MIDDLE.y, 40, 2);

    run.advance(16);

    const scored = firstScored(scene);
    expect({ label: scored.label, middle: { ...scored.middle } }).toEqual({
      label: "+40 ×2",
      middle: onCanvas(metricsOf(shell), MIDDLE.x, MIDDLE.y),
    });
  });

  it("stamps every character's outline on the sheet, then every fill, from the points' atlas, as the font sets them, none for a space", async () => {
    const { shell, run, scene } = await startBoard();
    const stamps = recordStamps(scene);
    shell.field.events.addScore(MIDDLE.x, MIDDLE.y, 40, 2);

    run.advance(16);

    expect({ stamps, inked: stamps.length }).toEqual({
      stamps: stampsOf(scene, firstScored(scene)),
      inked: 2 * "+40×2".length,
    });
  });

  it("stamps a label once, as it first shows", async () => {
    const { shell, run, scene } = await startBoard();
    const stamps = recordStamps(scene);
    shell.field.events.addScore(MIDDLE.x, MIDDLE.y, 40, 1);

    for (let i = 0; i < 5; i++) run.advance(16);

    expect(stamps).toHaveLength(2 * "+40".length);
  });

  it("shows each label as one image of its box on the sheet, cut to whole pixels and drawn at its size at the points' zoom", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.addScore(MIDDLE.x, MIDDLE.y, 200, 4);

    run.advance(16);

    const { image, frame, layout } = firstScored(scene);
    const zoom = pointsZoomOf(shell);
    const shown = layersOf(scene)
      .get("points")
      ?.getChildren()
      .filter(
        (object) => object instanceof GameObjects.Image && object.visible,
      );
    expect({
      shown: shown?.length,
      frame: `${image.texture.key}/${image.frame.name}`,
      box: { width: image.frame.width, height: image.frame.height },
      size: { width: image.displayWidth, height: image.displayHeight },
    }).toEqual({
      shown: 1,
      frame: `${POINTS_SHEET}/${frame}`,
      box: { width: layout.width, height: Math.floor(layout.height) },
      size: { width: layout.width * zoom, height: layout.height * zoom },
    });
  });

  it("letters them at the field's whole unit above the atlas's cap, zooming them by no more than a pixel in a unit", async () => {
    const { shell, run, scene } = await startBoard(undefined, ROOMY);
    shell.field.events.addScore(MIDDLE.x, MIDDLE.y, 40, 2);

    run.advance(16);

    const { unit } = metricsOf(shell, ROOMY);
    const zoom = firstScored(scene).image.scaleX;
    expect({
      capped: unit > bakedScale(metricsOf(shell, ROOMY)).unit,
      lettered: letteringOf(scene).unit,
      zoom: zoom >= 1 && zoom <= 1 + 1 / unit,
    }).toEqual({ capped: true, lettered: Math.floor(unit), zoom: true });
  });

  it("writes each character into the points' atlas in the shell's font at the lettered unit, filled in the shots' color and outlined in the field's, at each step of a pixel", async () => {
    const { shell, run, scene } = await startBoard();
    const written = recordWrites(scene);
    shell.colors = DARK;

    run.advance(16);

    const unit = letteringUnit(metricsOf(shell).unit);
    const font = `700 ${String(POINTS_TEXT.size * unit)}px ${SHELL_FONT}`;
    const fill = cssHex(DARK.shot);
    const stroke = cssHex(DARK.outline);
    const width = POINTS_TEXT.outline * unit;
    expect(
      written
        .filter(({ text }) => text === "4")
        .map(({ how, font, fill, stroke, width, join }) =>
          how === "fill"
            ? { how, font, fill }
            : { how, font, stroke, width, join },
        ),
    ).toEqual([
      ...Array.from({ length: PEN_STEPS }, () => ({
        how: "fill",
        font,
        fill,
      })),
      ...Array.from({ length: PEN_STEPS }, () => ({
        how: "stroke",
        font,
        stroke,
        width,
        join: "round",
      })),
    ]);
  });

  it("writes each character into the points' atlas at its pen in the frame packed for it, and names each frame's rectangle there", async () => {
    const { shell, run, scene } = await startBoard();
    const written = recordWrites(scene);
    shell.colors = DARK;

    run.advance(16);

    const { frames } = packPoints(letteringOf(scene));
    const atlas = scene.textures.get(POINTS_ATLAS);
    expect({
      writes: written.map(({ text, how, x, y }) => ({ text, how, x, y })),
      frames: frames.map(({ name }) => {
        const frame = atlas.get(name);
        return {
          name: frame.name,
          x: frame.cutX,
          y: frame.cutY,
          width: frame.cutWidth,
          height: frame.cutHeight,
        };
      }),
    }).toEqual({
      writes: frames.map(({ character, outlined, penX, penY }) => ({
        text: character,
        how: outlined ? "stroke" : "fill",
        x: penX,
        y: penY,
      })),
      frames: frames.map(({ name, x, y, width, height }) => ({
        name,
        x,
        y,
        width,
        height,
      })),
    });
  });

  it("letters them anew, and stamps the points showing again, as the page loads a face of the font late", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.addScore(MIDDLE.x, MIDDLE.y, 40, 2);
    run.advance(16);
    const lettering = letteringOf(scene);
    const stamps = recordStamps(scene);
    shell.typeface = { family: SHELL_FONT };

    run.advance(16);

    expect({
      anew: letteringOf(scene) !== lettering,
      stamps,
    }).toEqual({ anew: true, stamps: stampsOf(scene, firstScored(scene)) });
  });

  it("raises them as they fade where motion is welcome", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.addScore(MIDDLE.x, MIDDLE.y, 40, 1);
    run.advance(16);
    const { image } = firstScored(scene);

    const looks = overTime(run, POINTS_MS - 100, 50, () => ({
      x: image.x,
      y: image.y,
      alpha: image.alpha,
    }));

    const scoredAt = onCanvas(metricsOf(shell), MIDDLE.x, MIDDLE.y);
    expect({
      xs: new Set(looks.map(({ x }) => x)),
      above: looks.every(({ y }) => y < scoredAt.y),
      rises: falling(looks.map(({ y }) => y)),
      fades: falling(looks.map(({ alpha }) => alpha)),
    }).toEqual({
      xs: new Set([scoredAt.x]),
      above: true,
      rises: true,
      fades: true,
    });
  });

  it("holds them where they were scored where motion isn't welcome, fading", async () => {
    const { shell, run, scene } = await startBoard(stillness);
    shell.field.events.addScore(MIDDLE.x, MIDDLE.y, 40, 1);
    run.advance(16);
    const { image } = firstScored(scene);

    const looks = overTime(run, POINTS_MS - 100, 50, () => ({
      x: image.x,
      y: image.y,
      alpha: image.alpha,
    }));

    const scoredAt = onCanvas(metricsOf(shell), MIDDLE.x, MIDDLE.y);
    expect({
      places: new Set(looks.map(({ x, y }) => `${String(x)},${String(y)}`)),
      fades: falling(looks.map(({ alpha }) => alpha)),
    }).toEqual({
      places: new Set([`${String(scoredAt.x)},${String(scoredAt.y)}`]),
      fades: true,
    });
  });

  it("puts them away once they have faded", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.addScore(MIDDLE.x, MIDDLE.y, 40, 1);

    run.advance(POINTS_MS + 32);

    expect(firstScored(scene).image.visible).toBe(false);
  });

  it("draws them from the points' atlas and sheet alone at the new unit as the field is laid out again, adding no texture", async () => {
    const { shell, run, scene } = await startBoard();
    const textures = scene.textures.getTextureKeys();
    run.game.scale.resize(WIDER.width, WIDER.height);
    shell.field.events.addScore(MIDDLE.x, MIDDLE.y, 40, 1);

    run.advance(16);

    expect({
      textures: scene.textures.getTextureKeys(),
      zoom: firstScored(scene).image.scaleX,
    }).toEqual({ textures, zoom: pointsZoomOf(shell, WIDER) });
  });

  it("stamps the points showing anew as the field is laid out at a new whole unit", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.addScore(MIDDLE.x, MIDDLE.y, 40, 1);
    run.advance(16);
    const stamps = recordStamps(scene);
    run.game.scale.resize(WIDER.width, WIDER.height);

    run.advance(16);

    expect({
      lettered: letteringOf(scene).unit,
      stamps,
    }).toEqual({
      lettered: letteringUnit(metricsOf(shell, WIDER).unit),
      stamps: stampsOf(scene, firstScored(scene)),
    });
  });

  it("uploads the atlas once, every character written, as it letters them anew at a new size", async () => {
    const { run, scene } = await startBoard();
    const atlas = canvasTexture(scene, POINTS_ATLAS);
    const before = { width: atlas.width, height: atlas.height };
    const written = recordWrites(scene);
    const uploads: number[] = [];
    watchUploads(scene, (canvas) => {
      if (canvas === atlas.canvas) uploads.push(written.length);
    });
    run.game.scale.resize(WIDER.width, WIDER.height);

    run.advance(16);

    expect({
      resized: atlas.width !== before.width || atlas.height !== before.height,
      uploads,
    }).toEqual({
      resized: true,
      uploads: [packPoints(letteringOf(scene)).frames.length],
    });
  });

  it("stamps the points showing anew once a lost context is restored", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.addScore(MIDDLE.x, MIDDLE.y, 40, 1);
    run.advance(16);
    const stamps = recordStamps(scene);
    await run.loseContext();
    await run.restoreContext();

    run.advance(16);

    expect(stamps).toEqual(stampsOf(scene, firstScored(scene)));
  });

  it("keeps them whole inside the field at its edge", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.addScore(0, 0, 40, 1);

    run.advance(16);

    const bounds = firstScored(scene).image.getBounds();
    const metrics = metricsOf(shell);
    expect({
      left: bounds.left,
      top: bounds.top,
      drawn: bounds.width > 0 && bounds.height > 0,
    }).toEqual({
      left: metrics.x,
      top: metrics.y,
      drawn: true,
    });
  });
});

describe("a dash", () => {
  it("lays its first outline where it started, as it starts, turned the way the ship heads", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.addDash(MIDDLE.x, MIDDLE.y, Math.PI / 2);

    run.advance(16);

    const outlines = scene.kit.trail.outlines.map(({ images }) => images[0]);
    expect(
      outlines.map(
        (image) =>
          image?.visible && {
            ...shownAt(image),
            rotation: image.rotation,
            alpha: image.alpha,
          },
      ),
    ).toEqual([
      {
        ...onCanvas(metricsOf(shell), MIDDLE.x, MIDDLE.y),
        rotation: Math.PI / 2,
        alpha: trailAlpha(0),
      },
      false,
      false,
    ]);
  });

  it("lays each after it as the field steps the ship past where it lies, along the way it went", async () => {
    const { shell, run, scene } = await startBoard(stepping);
    shell.field.events.addDash(MIDDLE.x, MIDDLE.y, Math.PI / 2);

    run.advance(trailLaidAfter(2) + 16);

    const last = scene.kit.trail.outlines.at(-1)?.images[0];
    const at = last && shownAt(last);
    const metrics = metricsOf(shell);
    expect(at && { x: at.x, y: Math.round(at.y) }).toEqual({
      x: onCanvas(metrics, MIDDLE.x, 0).x,
      y: Math.round(onCanvas(metrics, 0, MIDDLE.y + trailReach(2)).y),
    });
  });

  it("lays none ahead of a field that stands still", async () => {
    const { shell, run, scene } = await startBoard();
    // A field that stepped a while, then stopped as its dash began.
    shell.field.steps = 100;
    shell.field.events.addDash(MIDDLE.x, MIDDLE.y, 0);

    run.advance(trailLaidAfter(2) + 16);

    expect(
      scene.kit.trail.outlines.map(({ images }) => images[0]?.visible),
    ).toEqual([true, false, false]);
  });

  it("lays a dash on a new field's first frame from that field's step, not the last field's", async () => {
    const { shell, run, scene } = await startBoard((shell) => {
      shell.field.steps = 100;
    });
    shell.field = fieldFrom(KEEPER);
    shell.field.events.addDash(MIDDLE.x, MIDDLE.y, 0);

    run.advance(16);

    expect(
      scene.kit.trail.outlines.map(({ images }) => images[0]?.visible),
    ).toEqual([true, false, false]);
  });

  it("fades each outline from as it is laid, the nearest the ship the most opaque", async () => {
    const { shell, run, scene } = await startBoard(stepping);
    shell.field.events.addDash(MIDDLE.x, MIDDLE.y, 0);
    run.advance(trailLaidAfter(2) + 16);
    const last = scene.kit.trail.outlines.at(-1)?.images[0];
    const laid = last?.alpha ?? 0;

    const alphas = overTime(run, TRAIL_MS - 100, 25, () => last?.alpha ?? 0);

    expect({
      laid: laid > 0.9 * trailAlpha(2),
      fades: falling([laid, ...alphas]),
    }).toEqual({ laid: true, fades: true });
  });

  it("lays a new dash's trail afresh, from where it started", async () => {
    const { shell, run, scene } = await startBoard(stepping);
    shell.field.events.addDash(MIDDLE.x, MIDDLE.y, 0);
    run.advance(trailLaidAfter(2) + 16);
    shell.field.events.addDash(10, 10, 0);

    run.advance(16);

    expect(
      scene.kit.trail.outlines.map(
        ({ images }) => images[0] && shownAt(images[0]),
      ),
    ).toEqual([onCanvas(metricsOf(shell), 10, 10), null, null]);
  });

  it("puts the trail away once its last outline has faded", async () => {
    const { shell, run, scene } = await startBoard(stepping);
    shell.field.events.addDash(MIDDLE.x, MIDDLE.y, 0);

    run.advance(trailLaidAfter(2) + 300);

    expect(
      scene.kit.trail.outlines
        .flatMap(({ images }) => images)
        .some((image) => image.visible),
    ).toBe(false);
  });
});

describe("the exhaust", () => {
  /**
   * Returns what sets a shell up with a ship heading right on a field that
   * steps, thrusting so hard.
   */
  function thrusting(thrust: number): (shell: FakeShell) => void {
    return (shell) => {
      withShip(shell);
      stepping(shell);
      const ship = shipOf(shell.field);
      ship.angle = 0;
      ship.lastAngle = 0;
      shell.field.steer.thrust = thrust;
    };
  }

  it("streams puffs from behind each engine in turn, back the way the pod heads, as it thrusts", async () => {
    const { shell, run, scene } = await startBoard(thrusting(1));

    run.advance(200);

    const ship = shipOf(shell.field);
    const [engine] = ENGINES;
    const metrics = metricsOf(shell);
    const behind = onCanvas(
      metrics,
      ship.lastX + (engine?.at.x ?? 0) - PUFF.behind,
      ship.lastY,
    );
    const specks = exhaustOf(scene);
    expect({
      some: specks.length > 0,
      behind: specks.every(({ x }) => x <= behind.x + 1e-6),
      back: specks.every(({ across }) => across < 0),
      sides: new Set(specks.map(({ y }) => Math.sign(y - behind.y))),
    }).toEqual({
      some: true,
      behind: true,
      back: true,
      sides: new Set([-1, 1]),
    });
  });

  it("streams them from the far side as the engines lie past an edge", async () => {
    const { shell, run, scene } = await startBoard((board) => {
      thrusting(1)(board);
      const ship = shipOf(board.field);
      ship.x = 0.5;
      ship.lastX = 0.5;
    });

    run.advance(100);

    const metrics = metricsOf(shell);
    const specks = exhaustOf(scene);
    expect({
      some: specks.length > 0,
      within: specks.every(
        ({ x }) => x >= metrics.x && x <= metrics.x + metrics.width,
      ),
    }).toEqual({ some: true, within: true });
  });

  /** Describes a puff alive: how far through its life it is, and its tint, alpha and scale. */
  interface Puff {
    readonly life: number;
    readonly tint: number;
    readonly alpha: number;
    readonly scale: number;
  }

  /** Returns each puff alive. */
  function puffsAlive(scene: BeltScene): readonly Puff[] {
    const puffs: Puff[] = [];
    scene.kit.exhaust.specks.forEachAlive((puff) => {
      puffs.push({
        life: puff.lifeT,
        tint: puff.tint,
        alpha: puff.alpha,
        scale: puff.scaleX,
      });
    }, null);
    return puffs;
  }

  /** Returns whether each channel of a color lies between the same channels of two others, give or take one for a rounding. */
  function isBetween(color: number, one: number, other: number): boolean {
    return [16, 8, 0].every((shift) => {
      const [c = 0, a = 0, b = 0] = [color, one, other].map(
        (each) => (each >> shift) & 0xff,
      );
      return c >= Math.min(a, b) - 1 && c <= Math.max(a, b) + 1;
    });
  }

  /** Returns a number rounded to six places, so two worked out alike compare equal. */
  function nearly(value: number): number {
    return Number(value.toFixed(6));
  }

  it("swells and fades each puff over its life", async () => {
    const { shell, run, scene } = await startBoard(thrusting(1));

    run.advance(200);

    const puffs = puffsAlive(scene);
    const zoom = zoomOf(shell);
    expect(
      puffs.map(({ alpha, scale }) => [nearly(alpha), nearly(scale)]),
    ).toEqual(
      puffs.map(({ life }) => [
        nearly(puffAlpha(life)),
        nearly((zoom * puffRadius(life)) / FLOURISH.puff),
      ]),
    );
  });

  it("starts each puff in the flame's hot middle, in the palette in play", async () => {
    const { shell, run, scene } = await startBoard(thrusting(1));
    run.advance(200);
    shell.colors = DARK;

    run.advance(32);

    const born = puffsAlive(scene).filter(({ life }) => life === 0);
    expect({
      some: born.length > 0,
      tints: new Set(born.map(({ tint }) => tint)),
    }).toEqual({ some: true, tints: new Set([puffColors(DARK)[0]]) });
  });

  it("fades each puff from the flame's body toward the field's muted text past its first fifth", async () => {
    const { run, scene } = await startBoard(thrusting(1));

    run.advance(200);

    const body = puffColors(ART_PALETTE)[1] ?? 0;
    const old = puffsAlive(scene).filter(({ life }) => life > 0.2);
    expect({
      some: old.length > 0,
      off: old.filter(({ tint }) => !isBetween(tint, body, ART_PALETTE.muted)),
    }).toEqual({ some: true, off: [] });
  });

  it("streams more the harder the ship thrusts", async () => {
    const full = await startBoard(thrusting(1));
    full.run.advance(200);
    const fully = exhaustOf(full.scene).length;
    const half = await startBoard(thrusting(0.5));

    half.run.advance(200);

    expect(exhaustOf(half.scene).length).toBeLessThan(fully);
  });

  it("streams no more once the field stands still, as its wave is cleared", async () => {
    const { shell, run, scene } = await startBoard(thrusting(1));
    run.advance(200);
    shell.field.cleared = true;

    run.advance(EXHAUST_MS + 50);

    expect(exhaustOf(scene)).toEqual([]);
  });

  it("counts a new field's steps from its own first frame", async () => {
    const { shell, run, scene } = await startBoard(thrusting(1));
    run.advance(200);
    // A field taken up far into its wave, its ship thrusting as it comes.
    thrusting(1)(shell);
    shell.field.steps = 10_000;

    run.advance(16);

    expect(exhaustOf(scene).length).toBeLessThanOrEqual(1);
  });

  it("streams none while the ship doesn't thrust", async () => {
    const { run, scene } = await startBoard(thrusting(0));

    run.advance(200);

    expect(exhaustOf(scene)).toEqual([]);
  });

  it("streams none where motion isn't welcome", async () => {
    const { run, scene } = await startBoard((board) => {
      thrusting(1)(board);
      stillness(board);
    });

    run.advance(200);

    expect(exhaustOf(scene)).toEqual([]);
  });
});

describe("a lost ship", () => {
  it("bursts into shards in the accent", async () => {
    const { shell, run, scene } = await startBoard();
    logShipLost(shell);

    run.advance(16);

    expect(shardTints(scene)).toEqual(
      Array.from({ length: BURST_SHARDS }, () => ART_PALETTE.accent),
    );
  });

  it("pops its pilot out in a bubble where it was lost, in its ink", async () => {
    const { shell, run, scene } = await startBoard();
    logShipLost(shell);

    run.advance(16);

    const { bubble, pilot, eyes } = scene.kit.strays.bailing;
    expect([
      shownAt(bubble),
      pilot.frame.name,
      pilot.tintTopLeft,
      eyes.frame.name,
      bubble.scale,
    ]).toEqual([
      onCanvas(metricsOf(shell), MIDDLE.x, MIDDLE.y),
      ADRIFT_FRAMES.puffed,
      ART_PALETTE.pilots[2],
      eyesFrame("adrift", "eep"),
      zoomOf(shell) * BAIL_OUT_SCALE,
    ]);
  });

  it("floats the pilot up the field, leaning the way the event's serial says", async () => {
    const { shell, run, scene } = await startBoard();
    logShipLost(shell);
    run.advance(16);

    run.advance(500, 25);

    const { distance, way } = fromPlace(
      shell,
      shownAt(scene.kit.strays.bailing.bubble),
      MIDDLE.x,
      MIDDLE.y,
    );
    expect([distance, way]).toEqual([
      expect.closeTo(BAIL_OUT_SPEED * 0.5 * metricsOf(shell).unit, 6),
      expect.closeTo(normalized(bailOutWayOf(lastSerial(shell))), 6),
    ]);
  });

  it("turns the pilot's eyes back at where its pod was lost as it floats off", async () => {
    const { shell, run, scene } = await startBoard();
    logShipLost(shell);

    run.advance(16);

    const { pilot, eyes } = scene.kit.strays.bailing;
    const back = bailOutWayOf(lastSerial(shell)) + Math.PI;
    const shift = eyesShift(
      { x: Math.cos(back), y: Math.sin(back) },
      "adrift",
      { x: 0, y: 0 },
    );
    const { unit } = metricsOf(shell);
    expect([(eyes.x - pilot.x) / unit, (eyes.y - pilot.y) / unit]).toEqual([
      expect.closeTo(shift.x * BAIL_OUT_SCALE, 9),
      expect.closeTo(shift.y * BAIL_OUT_SCALE, 9),
    ]);
  });

  it("shows the pilot steadily, then blinks it as it goes", async () => {
    const { shell, run, scene } = await startBoard();
    logShipLost(shell);
    const { bubble } = scene.kit.strays.bailing;

    const steady = overTime(
      run,
      BAIL_OUT_BLINK_MS - 50,
      25,
      () => bubble.visible,
    );
    run.advance(50);
    const going = overTime(
      run,
      BAIL_OUT_MS - BAIL_OUT_BLINK_MS - 50,
      25,
      () => bubble.visible,
    );

    expect([new Set(steady), new Set(going)]).toEqual([
      new Set([true]),
      new Set([true, false]),
    ]);
  });

  it("puts the pilot away once it has gone", async () => {
    const { shell, run, scene } = await startBoard();
    logShipLost(shell);

    run.advance(BAIL_OUT_MS + 32);

    expect(shownCount(scene.kit.strays.bailing.parts)).toBe(0);
  });
});

describe("the pilots' eyes", () => {
  /** Returns the frames a pilot's eyes are drawn in over a few seconds' frames of a field that steps. */
  function facesOver(
    run: SceneRun<BeltScene>,
    eyes: GameObjects.Image | undefined,
  ): ReadonlySet<string | undefined> {
    return new Set(overTime(run, 4200, 20, () => eyes?.frame.name));
  }

  it("blink every few seconds at the controls where motion is welcome", async () => {
    const { run, scene } = await startBoard((board) => {
      withShip(board);
      stepping(board);
    });

    const seen = facesOver(run, scene.kit.ship.eyes.images[0]);

    expect(seen).toEqual(
      new Set([eyesFrame("pod", "rest"), eyesFrame("pod", "blink")]),
    );
  });

  it("blink adrift too", async () => {
    const { shell, run, scene } = await startBoard(stepping);
    placeStray(shell.field, MIDDLE.x, MIDDLE.y);

    const seen = facesOver(run, scene.kit.strays.adrift.eyes);

    expect(seen).toEqual(
      new Set([eyesFrame("adrift", "plead"), eyesFrame("adrift", "blink")]),
    );
  });

  it("stay open where motion isn't welcome", async () => {
    const { run, scene } = await startBoard((board) => {
      withShip(board);
      stepping(board);
      stillness(board);
    });

    expect(facesOver(run, scene.kit.ship.eyes.images[0])).toEqual(
      new Set([eyesFrame("pod", "rest")]),
    );
  });
});
