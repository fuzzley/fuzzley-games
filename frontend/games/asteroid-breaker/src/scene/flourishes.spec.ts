import { cssHex } from "@fz/phaser/color";
import type { SceneRun } from "@fz/phaser/testing";
import { type GameObjects, TintModes } from "phaser";
import type { Field } from "../rules/field/field";
import type { Rock } from "../rules/rocks/rocks";
import { ROCK_RADIUS } from "../rules/tuning";
import { ART_PALETTE } from "../testing/art_frames";
import {
  WIDER,
  type FakeShell,
  metricsOf,
  objectsIn,
  onCanvas,
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
  BAIL_OUT_SPEED,
  FLASH_MOST,
  LOST_RING_REACH,
  SPARK_REACH,
  shardCount,
  trailAlpha,
  trailLaidAfter,
  trailReach,
  wayOf,
} from "../view/effects/flourish";
import { LOOK, PILOT_SIZES, pilotFrame } from "../view/art/pilot_art";
import { rockFrame } from "../view/art/rock_art";
import { bakedScale } from "../view/art/shapes";
import { flameTip } from "../view/art/ship_art";
import {
  BAIL_OUT_BLINK_MS,
  BAIL_OUT_MS,
  BURST_SHARDS,
  DUST_MS,
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
import {
  EXHAUST_MS,
  MOST_EXHAUST,
  MOST_SHARDS_FLYING,
} from "./painters/effects_painter";

/** A place on the field away from its edges and the keeper, where a spec's events happen. */
const MIDDLE = { x: 30, y: 20 } as const;

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
  return scene.effects.puffs.all.flatMap(({ copies }) =>
    copies.images.slice(0, 1),
  );
}

/** Returns each spark's image where it is, its copy past no edge. */
function sparksOf(scene: BeltScene): readonly GameObjects.Image[] {
  return scene.effects.sparks.all.flatMap(({ copies }) =>
    copies.images.slice(0, 1),
  );
}

/** Returns the points' labels. */
function labelsOf(scene: BeltScene): readonly GameObjects.Text[] {
  return scene.points.scored.all.map(({ label }) => label);
}

/** Returns how fast each shard alive flies. */
function shardSpeeds(scene: BeltScene): readonly number[] {
  const speeds: number[] = [];
  scene.effects.shards.forEachAlive((shard) => {
    speeds.push(Math.hypot(shard.velocityX, shard.velocityY));
  }, null);
  return speeds;
}

/** Returns the tint of each shard alive. */
function shardTints(scene: BeltScene): readonly number[] {
  const tints: number[] = [];
  scene.effects.shards.forEachAlive((shard) => {
    tints.push(shard.tint);
  }, null);
  return tints;
}

/** Returns where each exhaust speck alive is, and how fast it streams across. */
function exhaustOf(scene: BeltScene): readonly {
  readonly x: number;
  readonly y: number;
  readonly across: number;
}[] {
  const specks: { x: number; y: number; across: number }[] = [];
  scene.effects.exhaust.forEachAlive((speck) => {
    specks.push({ x: speck.x, y: speck.y, across: speck.velocityX });
  }, null);
  return specks;
}

/** Returns how far the field's camera is scrolled from where it rests, in the canvas's pixels. */
function scrolledBy(
  scene: BeltScene,
  shell: FakeShell,
): { readonly x: number; readonly y: number } {
  const metrics = metricsOf(shell);
  const camera = scene.cameras.main;
  return { x: camera.scrollX - metrics.x, y: camera.scrollY - metrics.y };
}

/** Returns how far a place on the canvas lies from a place on the field, and the way, in radians. */
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

/** Logs one of every event that plays a flourish on a shell's field, the keeper's. */
function logEveryFlourish(shell: FakeShell): void {
  const { events } = shell.field;
  const rock = keeperOf(shell.field);
  events.addBreak(rock, 1, 1, 0);
  events.addRock("hit", rock);
  events.addRock("blast", rock, 6);
  events.addDash(MIDDLE.x, MIDDLE.y, 0);
  events.addPilot("lost", MIDDLE.x, MIDDLE.y, 2, shell.field.crew);
  events.addScore(MIDDLE.x, MIDDLE.y, 40, 1);
}

describe("the events", () => {
  it("plays each event once, as it is logged", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.addScore(MIDDLE.x, MIDDLE.y, 40, 1);

    run.advance(48);

    expect(shownCount(labelsOf(scene))).toBe(1);
  });

  it("plays a new field's from its first, stopping what the last set off", async () => {
    const { shell, run, scene } = await startBoard();
    logEveryFlourish(shell);
    run.advance(16);
    shell.field = fieldFrom(KEEPER);
    shell.field.events.addScore(10, 10, 80, 1);

    run.advance(SHAKE_DELAY_MS, 16);

    expect({
      shards: scene.effects.shards.getAliveParticleCount(),
      puffs: shownCount(puffsOf(scene)),
      sparks: shownCount(sparksOf(scene)),
      rings: strokesOf(scene.effects.rings).length,
      trail: scene.effects.trail
        .flatMap(({ images }) => images)
        .some((image) => image.visible),
      bailing: scene.strays.bailing.bubble.visible,
      scrolled: scrolledBy(scene, shell),
      points: labelsOf(scene)
        .filter((label) => label.visible)
        .map((label) => label.text),
    }).toEqual({
      shards: 0,
      puffs: 0,
      sparks: 0,
      rings: 0,
      trail: false,
      bailing: false,
      scrolled: { x: 0, y: 0 },
      points: ["+80"],
    });
  });

  it("plays nothing that moves where motion isn't welcome, but shows the points", async () => {
    const { shell, run, scene } = await startBoard((board) => {
      withShip(board);
      stillness(board);
    });
    logEveryFlourish(shell);

    run.advance(48);

    expect({
      shards: scene.effects.shards.getAliveParticleCount(),
      puffs: shownCount(puffsOf(scene)),
      sparks: shownCount(sparksOf(scene)),
      flash: shownCount(scene.rocks.flash.images),
      rings: strokesOf(scene.effects.rings).length,
      trail: scene.effects.trail
        .flatMap(({ images }) => images)
        .some((image) => image.visible),
      bailing: scene.strays.bailing.bubble.visible,
      scrolled: scrolledBy(scene, shell),
      points: shownCount(labelsOf(scene)),
    }).toEqual({
      shards: 0,
      puffs: 0,
      sparks: 0,
      flash: 0,
      rings: 0,
      trail: false,
      bailing: false,
      scrolled: { x: 0, y: 0 },
      points: 1,
    });
  });

  it("makes every particle as the scene starts, and none as they play", async () => {
    const { shell, run, scene } = await startBoard(withShip);
    shipOf(shell.field).held.thrust = 1;
    const { shards, exhaust } = scene.effects;
    const before = [shards.getParticleCount(), exhaust.getParticleCount()];

    for (let i = 0; i < 20; i++) {
      logEveryFlourish(shell);
      run.advance(16);
    }

    expect({
      before,
      after: [shards.getParticleCount(), exhaust.getParticleCount()],
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
  it("throws its shards in its ink", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.addBreak(keeperOf(shell.field), 1, 0, -1);

    run.advance(16);

    expect(shardTints(scene)).toEqual(
      Array.from(
        { length: shardCount(lastSerial(shell)) },
        () => ART_PALETTE.rocks.stone,
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

  it("puffs dust in its ink at its middle", async () => {
    const { shell, run, scene } = await startBoard();
    const rock = keeperOf(shell.field);
    shell.field.events.addBreak(rock, 1, 0, -1);

    run.advance(16);

    const [puff] = puffsOf(scene);
    expect([puff && shownAt(puff), puff?.tintTopLeft]).toEqual([
      onCanvas(metricsOf(shell), rock.x, rock.y),
      ART_PALETTE.rocks.stone,
    ]);
  });

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

    const [puff] = scene.effects.puffs.all;
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
  it("flashes its rock over it, its frame filled light", async () => {
    const { shell, run, scene } = await startBoard();
    const rock = placeRock(shell.field, "medium", MIDDLE.x, MIDDLE.y);
    placeRock(shell.field, "small", 50, 30);
    shell.field.events.addRock("hit", rock);

    run.advance(16);

    const [flash] = scene.rocks.flash.images;
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

    expect(shownCount(scene.rocks.flash.images)).toBe(0);
  });

  it("flashes no sooner after the last flash than is safe, but sparks each time", async () => {
    const { shell, run, scene } = await startBoard();
    const second = placeRock(shell.field, "medium", MIDDLE.x, MIDDLE.y);
    shell.field.events.addRock("hit", keeperOf(shell.field));
    run.advance(FLASH_MS + 32);
    shell.field.events.addRock("hit", second);

    run.advance(16);

    expect({
      flash: shownCount(scene.rocks.flash.images),
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

    expect(scene.rocks.flash.images[0]?.visible).toBe(true);
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

    const [ring] = strokesOf(scene.effects.rings);
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
      () => strokesOf(scene.effects.rings)[0]?.radius ?? 0,
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

    expect(strokesOf(scene.effects.rings)).toEqual([]);
  });

  it("sweeps a lost ship's ring out in the accent, to a lost ship's reach", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.addPilot(
      "lost",
      MIDDLE.x,
      MIDDLE.y,
      2,
      shell.field.crew,
    );
    run.advance(16);

    const radii = overTime(
      run,
      RING_MS - 50,
      25,
      () => strokesOf(scene.effects.rings)[0]?.radius ?? 0,
    );

    expect({
      color: strokesOf(scene.effects.rings)[0]?.color,
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
      strokesOf(scene.effects.rings).map(({ x, y }) => ({ x, y })),
    ).toEqual([
      onCanvas(metrics, 1, MIDDLE.y),
      onCanvas(metrics, 1 + PICTURE_TORUS.width, MIDDLE.y),
    ]);
  });
});

describe("the points", () => {
  it("shows the points scored where they were scored, in the field's text stroked in its color", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.addScore(MIDDLE.x, MIDDLE.y, 40, 2);

    run.advance(16);

    const [label] = labelsOf(scene);
    expect({
      text: label?.text,
      at: label && { x: label.x, y: label.y },
      color: label?.style.color,
      stroke: label?.style.stroke,
    }).toEqual({
      text: "+40 ×2",
      at: onCanvas(metricsOf(shell), MIDDLE.x, MIDDLE.y),
      color: cssHex(ART_PALETTE.shot),
      stroke: cssHex(ART_PALETTE.outline),
    });
  });

  it("raises them as they fade where motion is welcome", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.addScore(MIDDLE.x, MIDDLE.y, 40, 1);
    run.advance(16);
    const [label] = labelsOf(scene);

    const looks = overTime(run, POINTS_MS - 100, 50, () => ({
      y: label?.y ?? 0,
      alpha: label?.alpha ?? 0,
    }));

    expect({
      rises: falling(looks.map(({ y }) => y)),
      fades: falling(looks.map(({ alpha }) => alpha)),
    }).toEqual({ rises: true, fades: true });
  });

  it("holds them where they were scored where motion isn't welcome, fading", async () => {
    const { shell, run, scene } = await startBoard(stillness);
    shell.field.events.addScore(MIDDLE.x, MIDDLE.y, 40, 1);
    run.advance(16);
    const [label] = labelsOf(scene);

    const looks = overTime(run, POINTS_MS - 100, 50, () => ({
      y: label?.y ?? 0,
      alpha: label?.alpha ?? 0,
    }));

    expect({
      ys: new Set(looks.map(({ y }) => y)),
      fades: falling(looks.map(({ alpha }) => alpha)),
    }).toEqual({
      ys: new Set([onCanvas(metricsOf(shell), MIDDLE.x, MIDDLE.y).y]),
      fades: true,
    });
  });

  it("puts them away once they have faded", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.addScore(MIDDLE.x, MIDDLE.y, 40, 1);

    run.advance(POINTS_MS + 32);

    expect(shownCount(labelsOf(scene))).toBe(0);
  });

  it("writes them anew at the field's new unit as it is laid out again", async () => {
    const { shell, run, scene } = await startBoard();
    run.game.scale.resize(WIDER.width, WIDER.height);
    shell.field.events.addScore(MIDDLE.x, MIDDLE.y, 40, 1);

    run.advance(16);

    const [label] = labelsOf(scene);
    expect(label?.style.fontSize).toBe(
      `${String(0.95 * metricsOf(shell, WIDER).unit)}px`,
    );
  });

  it("keeps them whole inside the field at its edge", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.addScore(0, 0, 40, 1);

    run.advance(16);

    const [label] = labelsOf(scene);
    const metrics = metricsOf(shell);
    expect(
      label && {
        left: label.x - label.width / 2,
        top: label.y - label.height / 2,
      },
    ).toEqual({ left: metrics.x, top: metrics.y });
  });
});

describe("a dash", () => {
  it("lays its first outline where it started, as it starts, turned the way the ship heads", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.addDash(MIDDLE.x, MIDDLE.y, Math.PI / 2);

    run.advance(16);

    const outlines = scene.effects.trail.map(({ images }) => images[0]);
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

    const last = scene.effects.trail.at(-1)?.images[0];
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

    expect(scene.effects.trail.map(({ images }) => images[0]?.visible)).toEqual(
      [true, false, false],
    );
  });

  it("fades each outline from as it is laid, the nearest the ship the most opaque", async () => {
    const { shell, run, scene } = await startBoard(stepping);
    shell.field.events.addDash(MIDDLE.x, MIDDLE.y, 0);
    run.advance(trailLaidAfter(2) + 16);
    const last = scene.effects.trail.at(-1)?.images[0];
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
      scene.effects.trail.map(({ images }) => images[0] && shownAt(images[0])),
    ).toEqual([onCanvas(metricsOf(shell), 10, 10), null, null]);
  });

  it("puts the trail away once its last outline has faded", async () => {
    const { shell, run, scene } = await startBoard(stepping);
    shell.field.events.addDash(MIDDLE.x, MIDDLE.y, 0);

    run.advance(trailLaidAfter(2) + 300);

    expect(
      scene.effects.trail
        .flatMap(({ images }) => images)
        .some((image) => image.visible),
    ).toBe(false);
  });
});

describe("the exhaust", () => {
  /** Returns what sets a shell up with a ship heading right on a field that steps, thrusting so hard. */
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
    shell.field.events.addPilot(
      "lost",
      MIDDLE.x,
      MIDDLE.y,
      2,
      shell.field.crew,
    );

    run.advance(16);

    expect(shardTints(scene)).toEqual(
      Array.from({ length: BURST_SHARDS }, () => ART_PALETTE.accent),
    );
  });

  it("holds the field still for a moment", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.addPilot(
      "lost",
      MIDDLE.x,
      MIDDLE.y,
      2,
      shell.field.crew,
    );

    const scrolls = overTime(run, SHAKE_DELAY_MS - 16, 16, () =>
      scrolledBy(scene, shell),
    );

    expect(scrolls.filter(({ x, y }) => x !== 0 || y !== 0)).toEqual([]);
  });

  it("shakes the field once the moment is past", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.addPilot(
      "lost",
      MIDDLE.x,
      MIDDLE.y,
      2,
      shell.field.crew,
    );
    run.advance(SHAKE_DELAY_MS);

    const scrolls = overTime(run, SHAKE_MS - 50, 16, () =>
      scrolledBy(scene, shell),
    );

    expect(scrolls.some(({ x, y }) => x !== 0 && y !== 0)).toBe(true);
  });

  it("rests the field once the shake has died away", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.addPilot(
      "lost",
      MIDDLE.x,
      MIDDLE.y,
      2,
      shell.field.crew,
    );

    run.advance(SHAKE_DELAY_MS + SHAKE_MS + 32);

    expect(scrolledBy(scene, shell)).toEqual({ x: 0, y: 0 });
  });

  it("pops its pilot out in a bubble where it was lost, in its ink", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.addPilot(
      "lost",
      MIDDLE.x,
      MIDDLE.y,
      2,
      shell.field.crew,
    );

    run.advance(16);

    const { bubble, pilot } = scene.strays.bailing;
    expect([shownAt(bubble), pilot.frame.name]).toEqual([
      onCanvas(metricsOf(shell), MIDDLE.x, MIDDLE.y),
      pilotFrame(2, "adrift"),
    ]);
  });

  it("floats the pilot off the way the event's serial says", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.addPilot(
      "lost",
      MIDDLE.x,
      MIDDLE.y,
      2,
      shell.field.crew,
    );
    run.advance(16);

    run.advance(500, 25);

    const { distance, way } = fromPlace(
      shell,
      shownAt(scene.strays.bailing.bubble),
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
    shell.field.events.addPilot(
      "lost",
      MIDDLE.x,
      MIDDLE.y,
      2,
      shell.field.crew,
    );

    run.advance(16);

    const { pilot, eyes } = scene.strays.bailing;
    const way = wayOf(lastSerial(shell));
    const { unit } = metricsOf(shell);
    expect([(eyes.x - pilot.x) / unit, (eyes.y - pilot.y) / unit]).toEqual([
      expect.closeTo(Math.cos(way) * LOOK.across * PILOT_SIZES.adrift, 9),
      expect.closeTo(Math.sin(way) * LOOK.down * PILOT_SIZES.adrift, 9),
    ]);
  });

  it("shows the pilot steadily, then blinks it as it goes", async () => {
    const { shell, run, scene } = await startBoard();
    shell.field.events.addPilot(
      "lost",
      MIDDLE.x,
      MIDDLE.y,
      2,
      shell.field.crew,
    );
    const { bubble } = scene.strays.bailing;

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
    shell.field.events.addPilot(
      "lost",
      MIDDLE.x,
      MIDDLE.y,
      2,
      shell.field.crew,
    );

    run.advance(BAIL_OUT_MS + 32);

    expect(shownCount(scene.strays.bailing.parts)).toBe(0);
  });
});

describe("the pilots' eyes", () => {
  /** Returns how far open a pilot's eyes are drawn over a few seconds' frames, as a share of their size. */
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

    const seen = openings(run, scene.ship.eyes.images[0]);

    expect({ open: seen.has(1), shut: Math.min(...seen) < 0.5 }).toEqual({
      open: true,
      shut: true,
    });
  });

  it("blink adrift too", async () => {
    const { shell, run, scene } = await startBoard();
    placeStray(shell.field, MIDDLE.x, MIDDLE.y);

    const seen = openings(run, scene.strays.adrift.eyes);

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

    expect(openings(run, scene.ship.eyes.images[0])).toEqual(new Set([1]));
  });
});
