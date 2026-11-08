import { cssHex } from "@fz/phaser/color";
import type { SceneRun } from "@fz/phaser/testing";
import { GameObjects, Textures, TintModes } from "phaser";
import type { Field } from "../rules/field/field";
import type { Rock } from "../rules/rocks/rocks";
import { ROCK_RADIUS } from "../rules/tuning";
import { ART_PALETTE } from "../testing/art_frames";
import {
  DARK,
  MIDDLE,
  SHELL_FONT,
  WIDER,
  type FakeShell,
  layersOf,
  metricsOf,
  objectsIn,
  onCanvas,
  pointsZoomOf,
  scrolledBy,
  shardTints,
  shownAt,
  startBoard,
  stepping,
  stillness,
  strokesOf,
  withShip,
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
import {
  PEN_STEPS,
  POINTS_TEXT,
  type PointsLettering,
  layOutPoints,
  letteringUnit,
  packPoints,
  pointsLayout,
} from "../view/art/points_art";
import { LOOK, PILOT_SIZES, pilotFrame } from "../view/art/pilot_art";
import { rockFrame } from "../view/art/rock_art";
import { bakedScale } from "../view/art/shapes";
import { flameTip } from "../view/art/ship_art";
import {
  BAIL_OUT_SPEED,
  FLASH_MOST,
  LOST_RING_REACH,
  MOST_POINTS_CHARACTERS,
  SPARK_REACH,
  shardCount,
  spread,
  trailAlpha,
  trailLaidAfter,
  trailReach,
  wayOf,
} from "../view/effects/flourish";
import {
  BAIL_OUT_BLINK_MS,
  BAIL_OUT_MS,
  BURST_SHARDS,
  DUST_MS,
  EXHAUST_MS,
  FLASH_MS,
  KICK_MS,
  POINTS_MS,
  RING_MS,
  SHAKE_DELAY_MS,
  SHAKE_MS,
  SPARK_MS,
  TRAIL_MS,
} from "../view/effects/timing";
import type { BeltScene } from "./belt_scene";
import { MOST_SHARDS_FLYING } from "./painters/debris_painter";
import { MOST_EXHAUST } from "./painters/exhaust_painter";
import { POINTS_SHEET, type Scored } from "./painters/points_painter";
import { RING_WIDTH } from "./painters/ring_painter";
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

/** Returns each puff of dust's image where it is, its copy past no edge. */
function puffsOf(scene: BeltScene): readonly GameObjects.Image[] {
  return scene.kit.debris.puffs.all.flatMap(({ copies }) =>
    copies.images.slice(0, 1),
  );
}

/** Returns each spark's image where it is, its copy past no edge. */
function sparksOf(scene: BeltScene): readonly GameObjects.Image[] {
  return scene.kit.debris.sparks.all.flatMap(({ copies }) =>
    copies.images.slice(0, 1),
  );
}

/** Returns what each label of points that shows reads. */
function pointsShown(scene: BeltScene): readonly string[] {
  return scene.kit.points.scored.all
    .filter(({ image }) => image.visible)
    .map(({ label }) => label);
}

/** Returns how fast each shard alive flies. */
function shardSpeeds(scene: BeltScene): readonly number[] {
  const speeds: number[] = [];
  scene.kit.debris.shards.forEachAlive((shard) => {
    speeds.push(Math.hypot(shard.velocityX, shard.velocityY));
  }, null);
  return speeds;
}

/** Returns where each exhaust speck alive is, and how fast it streams across. */
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

/** Logs a ship lost in the middle of a shell's field, its pilot the third color. */
function logShipLost(shell: FakeShell): void {
  shell.field.events.addPilot("lost", MIDDLE.x, MIDDLE.y, 2, shell.field.crew);
}

/** Describes what the flourishes that move show at a moment. */
interface Shown {
  readonly shards: number;
  readonly puffs: number;
  readonly sparks: number;
  readonly flash: number;
  readonly rings: number;
  readonly trail: boolean;
  readonly bailing: boolean;
  readonly scrolled: { readonly x: number; readonly y: number };
}

/** What the flourishes that move show while none plays. */
const NOTHING_PLAYING: Shown = {
  shards: 0,
  puffs: 0,
  sparks: 0,
  flash: 0,
  rings: 0,
  trail: false,
  bailing: false,
  scrolled: { x: 0, y: 0 },
};

/** Returns what the flourishes that move show in a scene, as it now draws. */
function playingIn(scene: BeltScene, shell: FakeShell): Shown {
  return {
    shards: scene.kit.debris.shards.getAliveParticleCount(),
    puffs: shownCount(puffsOf(scene)),
    sparks: shownCount(sparksOf(scene)),
    flash: shownCount(scene.kit.rocks.flash.images),
    rings: strokesOf(scene.kit.rings.graphics).length,
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
  events.addBreak(rock, 1, 1, 0);
  events.addRock("hit", rock);
  events.addRock("blast", rock, 6);
  events.addDash(MIDDLE.x, MIDDLE.y, 0);
  logShipLost(shell);
  events.addScore(MIDDLE.x, MIDDLE.y, 40, 1);
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

    run.advance(SHAKE_DELAY_MS, 16);

    expect({
      ...playingIn(scene, shell),
      points: pointsShown(scene),
    }).toEqual({ ...NOTHING_PLAYING, points: ["+80"] });
  });

  it("plays nothing that moves where motion isn't welcome, but shows the points", async () => {
    const { shell, run, scene } = await startBoard((board) => {
      withShip(board);
      stillness(board);
    });
    logEveryFlourish(shell);

    run.advance(48);

    expect({
      ...playingIn(scene, shell),
      points: pointsShown(scene).length,
    }).toEqual({ ...NOTHING_PLAYING, points: 1 });
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

describe("a broken rock", () => {
  it.each([
    ["an ice rock's in ice's ink", "ice", "ice"],
    ["a crystal's in a stone's, not its gem's", "crystal", "stone"],
  ] as const)(
    "throws its shards in its body's color: %s",
    async (_, kind, body) => {
      const { shell, run, scene } = await startBoard();
      const rock = placeRock(shell.field, "medium", MIDDLE.x, MIDDLE.y, kind);
      shell.field.events.addBreak(rock, 1, 0, -1);

      run.advance(16);

      expect(shardTints(scene)).toEqual(
        Array.from(
          { length: shardCount(lastSerial(shell)) },
          () => ART_PALETTE.rocks[body],
        ),
      );
    },
  );

  it("throws its shards in the palette the frame it breaks on changed to", async () => {
    const { shell, run, scene } = await startBoard();
    shell.colors = DARK;
    shell.field.events.addBreak(keeperOf(shell.field), 1, 0, -1);

    run.advance(16);

    expect(shardTints(scene)).toEqual(
      Array.from(
        { length: shardCount(lastSerial(shell)) },
        () => DARK.rocks.stone,
      ),
    );
  });

  it("throws them flying from the first frame, before the field is first drawn", async () => {
    const { scene } = await startBoard((shell) => {
      shell.field.events.addBreak(keeperOf(shell.field), 1, 0, -1);
    });

    const speeds = shardSpeeds(scene);
    expect({
      some: speeds.length > 0,
      flying: speeds.every((speed) => speed > 0),
    }).toEqual({ some: true, flying: true });
  });

  it("puffs dust at its middle", async () => {
    const { shell, run, scene } = await startBoard();
    const rock = keeperOf(shell.field);
    shell.field.events.addBreak(rock, 1, 0, -1);

    run.advance(16);

    const [puff] = puffsOf(scene);
    expect(puff && shownAt(puff)).toEqual(
      onCanvas(metricsOf(shell), rock.x, rock.y),
    );
  });

  it.each([
    ["an ice rock's in ice's ink", "ice", "ice"],
    ["a crystal's in a stone's, not its gem's", "crystal", "stone"],
  ] as const)(
    "puffs its dust in its body's color: %s",
    async (_, kind, body) => {
      const { shell, run, scene } = await startBoard();
      const rock = placeRock(shell.field, "medium", MIDDLE.x, MIDDLE.y, kind);
      shell.field.events.addBreak(rock, 1, 0, -1);

      run.advance(16);

      const [puff] = puffsOf(scene);
      expect(puff?.tintTopLeft).toBe(ART_PALETTE.rocks[body]);
    },
  );

  it("spreads the dust out to the rock's radius as it fades", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.addBreak(keeperOf(shell.field), 1, 0, -1);
    run.advance(16);
    const [puff] = puffsOf(scene);

    const { unit } = metricsOf(shell);
    // The puff's frame is a circle of its radius at the baked unit.
    const baked = FLOURISH.puff * bakedScale(metricsOf(shell)).unit;

    const looks = overTime(run, DUST_MS - 100, 50, () => ({
      radius: (puff?.scaleX ?? 0) * baked,
      alpha: puff?.alpha ?? 0,
    }));

    const last = looks.at(-1)?.radius ?? 0;
    expect({
      spreads: rising(looks.map(({ radius }) => radius)),
      within: last < ROCK_RADIUS.large * unit,
      near: last > 0.9 * ROCK_RADIUS.large * unit,
      fades: falling(looks.map(({ alpha }) => alpha)),
    }).toEqual({ spreads: true, within: true, near: true, fades: true });
  });

  it("puffs dust on both sides of an edge it reaches across", async () => {
    const { shell, run, scene } = await startBoard();
    const rock = placeRock(shell.field, "medium", 1, MIDDLE.y);
    shell.field.events.addBreak(rock, 1, 0, -1);

    run.advance(100, 25);

    const [puff] = scene.kit.debris.puffs.all;
    const metrics = metricsOf(shell);
    expect(puff?.copies.images.slice(0, 2).map(shownAt)).toEqual([
      onCanvas(metrics, 1, MIDDLE.y),
      onCanvas(metrics, 1 + PICTURE_TORUS.width, MIDDLE.y),
    ]);
  });

  it("puts the dust away once it has faded", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.addBreak(keeperOf(shell.field), 1, 0, -1);

    run.advance(DUST_MS + 32);

    expect(shownCount(puffsOf(scene))).toBe(0);
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
    shell.field.events.addBreak(rock, 1, 1, 0);

    run.advance(16);

    expect(scrolledBy(scene, shell)).toEqual({ x: 0, y: 0 });
  });
});

describe("a held hit", () => {
  it("draws its flash in a layer of its own", async () => {
    const { scene } = await startBoard();

    const drawn = layersOf(scene).get("flash")?.getChildren();

    expect(drawn).toEqual(scene.kit.rocks.flash.images);
  });

  it("flashes its rock over it, its frame filled light", async () => {
    const { shell, run, scene } = await startBoard();
    const rock = placeRock(shell.field, "medium", MIDDLE.x, MIDDLE.y);
    placeRock(shell.field, "small", 50, 30);
    shell.field.events.addRock("hit", rock);

    run.advance(16);

    const [flash] = scene.kit.rocks.flash.images;
    expect({
      at: flash && shownAt(flash),
      frame: flash?.frame.name,
      mode: flash?.tintMode,
      tint: flash?.tintTopLeft,
      alpha: flash?.alpha,
    }).toEqual({
      at: onCanvas(metricsOf(shell), rock.x, rock.y),
      frame: rockFrame(rock),
      mode: TintModes.FILL,
      tint: ART_PALETTE.glint,
      alpha: FLASH_MOST,
    });
  });

  it("puts the flash away once it is over", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.addRock("hit", keeperOf(shell.field));

    run.advance(FLASH_MS + 32);

    expect(shownCount(scene.kit.rocks.flash.images)).toBe(0);
  });

  it("flashes no sooner after the last flash than is safe, but sparks each time", async () => {
    const { shell, run, scene } = await startBoard();
    const second = placeRock(shell.field, "medium", MIDDLE.x, MIDDLE.y);
    shell.field.events.addRock("hit", keeperOf(shell.field));
    run.advance(FLASH_MS + 32);
    shell.field.events.addRock("hit", second);

    run.advance(16);

    expect({
      flash: shownCount(scene.kit.rocks.flash.images),
      sparks: shownCount(sparksOf(scene)),
    }).toEqual({ flash: 0, sparks: 2 });
  });

  it("flashes a new field's first held hit, however lately the last field flashed", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.addRock("hit", keeperOf(shell.field));
    run.advance(FLASH_MS + 32);
    shell.field = fieldFrom(KEEPER);
    shell.field.events.addRock("hit", keeperOf(shell.field));

    run.advance(16);

    expect(scene.kit.rocks.flash.images[0]?.visible).toBe(true);
  });

  it("flies a spark off its edge the way the event's serial says, in the warning color", async () => {
    const { shell, run, scene } = await startBoard();
    const rock = placeRock(shell.field, "medium", MIDDLE.x, MIDDLE.y);
    shell.field.events.addRock("hit", rock);

    run.advance(16);

    const [spark] = sparksOf(scene);
    const { distance, way } = fromPlace(
      shell,
      spark ? shownAt(spark) : null,
      rock.x,
      rock.y,
    );
    expect([
      distance >= ROCK_RADIUS.medium * metricsOf(shell).unit - 1e-9,
      way,
      spark?.tintTopLeft,
    ]).toEqual([
      true,
      expect.closeTo(normalized(wayOf(lastSerial(shell))), 6),
      ART_PALETTE.flame,
    ]);
  });

  it("brings a spark flown off an edge in at the far side", async () => {
    const { shell, run, scene } = await startBoard();
    const rock = placeRock(shell.field, "small", 0.5, MIDDLE.y);
    // A spark whose event's serial sends it off the left edge.
    while (Math.cos(wayOf(lastSerial(shell) + 1)) > -0.7) {
      shell.field.events.add("fired", 0, 0);
    }
    shell.field.events.addRock("hit", rock);

    run.advance(16);

    const [spark] = sparksOf(scene);
    const metrics = metricsOf(shell);
    expect((spark?.x ?? 0) > metrics.x + metrics.width / 2).toBe(true);
  });

  it("flies the spark out as it fades, within its reach", async () => {
    const { shell, run, scene } = await startBoard();
    const rock = placeRock(shell.field, "medium", MIDDLE.x, MIDDLE.y);
    shell.field.events.addRock("hit", rock);
    run.advance(16);
    const [spark] = sparksOf(scene);

    const looks = overTime(run, SPARK_MS - 50, 25, () => ({
      out: fromPlace(shell, spark ? shownAt(spark) : null, rock.x, rock.y)
        .distance,
      alpha: spark?.alpha ?? 0,
    }));

    expect({
      out: rising(looks.map(({ out }) => out)),
      within:
        (looks.at(-1)?.out ?? Infinity) <
        (ROCK_RADIUS.medium + SPARK_REACH) * metricsOf(shell).unit,
      fades: falling(looks.map(({ alpha }) => alpha)),
    }).toEqual({ out: true, within: true, fades: true });
  });
});

describe("the rings", () => {
  it("sweeps a blast's ring out from where it went off, in the warning color", async () => {
    const { shell, run, scene } = await startBoard();
    const rock = placeRock(shell.field, "medium", MIDDLE.x, MIDDLE.y);
    shell.field.events.addRock("blast", rock, 6);

    run.advance(16);

    const [ring] = strokesOf(scene.kit.rings.graphics);
    expect(ring && { x: ring.x, y: ring.y, color: ring.color }).toEqual({
      ...onCanvas(metricsOf(shell), MIDDLE.x, MIDDLE.y),
      color: ART_PALETTE.flame,
    });
  });

  it("spreads a ring toward its reach as it goes", async () => {
    const { shell, run, scene } = await startBoard();
    const rock = placeRock(shell.field, "medium", MIDDLE.x, MIDDLE.y);
    shell.field.events.addRock("blast", rock, 6);
    run.advance(16);

    const radii = overTime(
      run,
      RING_MS - 50,
      25,
      () => strokesOf(scene.kit.rings.graphics)[0]?.radius ?? 0,
    );

    expect({
      spreads: rising(radii),
      within: (radii.at(-1) ?? Infinity) < 6 * metricsOf(shell).unit,
    }).toEqual({ spreads: true, within: true });
  });

  it("puts a ring away once it is over", async () => {
    const { shell, run, scene } = await startBoard();
    const rock = placeRock(shell.field, "medium", MIDDLE.x, MIDDLE.y);
    shell.field.events.addRock("blast", rock, 6);

    run.advance(RING_MS + 32);

    expect(strokesOf(scene.kit.rings.graphics)).toEqual([]);
  });

  it("sweeps a lost ship's ring out in the accent, to a lost ship's reach", async () => {
    const { shell, run, scene } = await startBoard();
    logShipLost(shell);
    run.advance(16);

    const radii = overTime(
      run,
      RING_MS - 50,
      25,
      () => strokesOf(scene.kit.rings.graphics)[0]?.radius ?? 0,
    );

    expect({
      color: strokesOf(scene.kit.rings.graphics)[0]?.color,
      within:
        (radii.at(-1) ?? Infinity) < LOST_RING_REACH * metricsOf(shell).unit,
      past: (radii.at(-1) ?? 0) > (LOST_RING_REACH / 2) * metricsOf(shell).unit,
    }).toEqual({ color: ART_PALETTE.accent, within: true, past: true });
  });

  it("sweeps a ring across an edge on both sides", async () => {
    const { shell, run, scene } = await startBoard();
    const rock = placeRock(shell.field, "medium", 1, MIDDLE.y);
    shell.field.events.addRock("blast", rock, 6);

    run.advance(100, 25);

    const metrics = metricsOf(shell);
    expect(
      strokesOf(scene.kit.rings.graphics).map(({ x, y }) => ({ x, y })),
    ).toEqual([
      onCanvas(metrics, 1, MIDDLE.y),
      onCanvas(metrics, 1 + PICTURE_TORUS.width, MIDDLE.y),
    ]);
  });

  it("sweeps a ring across an edge once its stroke reaches across it, before its middle line does", async () => {
    const { shell, run, scene } = await startBoard();
    // Two frames after the blast, the ring's middle line stops a quarter of
    // its stroke's width short of the edge.
    const x = 6 * spread(32 / RING_MS) + RING_WIDTH / 4;
    const rock = placeRock(shell.field, "medium", x, MIDDLE.y);
    shell.field.events.addRock("blast", rock, 6);

    run.advance(48);

    const metrics = metricsOf(shell);
    expect(
      strokesOf(scene.kit.rings.graphics).map(({ x, y }) => ({ x, y })),
    ).toEqual([
      onCanvas(metrics, x, MIDDLE.y),
      onCanvas(metrics, x + PICTURE_TORUS.width, MIDDLE.y),
    ]);
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

  /** Records each character the points' atlas writes as it is lettered, and how. */
  function recordWrites(scene: BeltScene): readonly Written[] {
    const atlas = scene.textures.get(POINTS_ATLAS);
    if (!(atlas instanceof Textures.CanvasTexture)) {
      throw new Error("No canvas for the points' atlas.");
    }
    const context = atlas.getContext();
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

  it("streams specks from the flame's tip, back the way the ship heads, as it thrusts", async () => {
    const { shell, run, scene } = await startBoard(thrusting(1));

    run.advance(200);

    const ship = shipOf(shell.field);
    const tip = onCanvas(metricsOf(shell), ship.lastX - flameTip(1), 0).x;
    const specks = exhaustOf(scene);
    expect({
      some: specks.length > 0,
      fromTip: specks.every(({ x }) => x <= tip + 1e-6),
      back: specks.every(({ across }) => across < 0),
    }).toEqual({ some: true, fromTip: true, back: true });
  });

  it("streams them from the far side as the flame's tip lies past an edge", async () => {
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

  it("holds the field still for a moment", async () => {
    const { shell, run, scene } = await startBoard();
    logShipLost(shell);

    const scrolls = overTime(run, SHAKE_DELAY_MS - 16, 16, () =>
      scrolledBy(scene, shell),
    );

    expect(scrolls.filter(({ x, y }) => x !== 0 || y !== 0)).toEqual([]);
  });

  it("shakes the field once the moment is past", async () => {
    const { shell, run, scene } = await startBoard();
    logShipLost(shell);
    run.advance(SHAKE_DELAY_MS);

    const scrolls = overTime(run, SHAKE_MS - 50, 16, () =>
      scrolledBy(scene, shell),
    );

    expect(scrolls.some(({ x, y }) => x !== 0 && y !== 0)).toBe(true);
  });

  it("rests the field once the shake has died away", async () => {
    const { shell, run, scene } = await startBoard();
    logShipLost(shell);

    run.advance(SHAKE_DELAY_MS + SHAKE_MS + 32);

    expect(scrolledBy(scene, shell)).toEqual({ x: 0, y: 0 });
  });

  it("pops its pilot out in a bubble where it was lost, in its ink", async () => {
    const { shell, run, scene } = await startBoard();
    logShipLost(shell);

    run.advance(16);

    const { bubble, pilot } = scene.kit.strays.bailing;
    expect([shownAt(bubble), pilot.frame.name]).toEqual([
      onCanvas(metricsOf(shell), MIDDLE.x, MIDDLE.y),
      pilotFrame(2, "adrift"),
    ]);
  });

  it("floats the pilot off the way the event's serial says", async () => {
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
      expect.closeTo(normalized(wayOf(lastSerial(shell))), 6),
    ]);
  });

  it("turns the pilot's eyes the way it floats off", async () => {
    const { shell, run, scene } = await startBoard();
    logShipLost(shell);

    run.advance(16);

    const { pilot, eyes } = scene.kit.strays.bailing;
    const way = wayOf(lastSerial(shell));
    const { unit } = metricsOf(shell);
    expect([(eyes.x - pilot.x) / unit, (eyes.y - pilot.y) / unit]).toEqual([
      expect.closeTo(Math.cos(way) * LOOK.across * PILOT_SIZES.adrift, 9),
      expect.closeTo(Math.sin(way) * LOOK.down * PILOT_SIZES.adrift, 9),
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
  /**
   * Returns how far open a pilot's eyes are drawn over a few seconds' frames,
   * as a share of their size.
   */
  function openings(
    run: SceneRun<BeltScene>,
    eyes: GameObjects.Image | undefined,
  ): ReadonlySet<number> {
    return new Set(
      overTime(run, 4200, 20, () =>
        Number(((eyes?.scaleY ?? 0) / (eyes?.scaleX ?? 1)).toFixed(2)),
      ),
    );
  }

  it("blink every few seconds at the controls where motion is welcome", async () => {
    const { run, scene } = await startBoard(withShip);

    const seen = openings(run, scene.kit.ship.eyes.images[0]);

    expect({ open: seen.has(1), shut: Math.min(...seen) < 0.5 }).toEqual({
      open: true,
      shut: true,
    });
  });

  it("blink adrift too", async () => {
    const { shell, run, scene } = await startBoard();
    placeStray(shell.field, MIDDLE.x, MIDDLE.y);

    const seen = openings(run, scene.kit.strays.adrift.eyes);

    expect({ open: seen.has(1), shut: Math.min(...seen) < 0.5 }).toEqual({
      open: true,
      shut: true,
    });
  });

  it("stay open where motion isn't welcome", async () => {
    const { run, scene } = await startBoard((board) => {
      withShip(board);
      stillness(board);
    });

    expect(openings(run, scene.kit.ship.eyes.images[0])).toEqual(new Set([1]));
  });
});
