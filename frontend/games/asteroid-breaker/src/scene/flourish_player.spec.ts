import { easeOutCubic } from "@fz/core/math";
import { commandsOf } from "@fz/phaser/testing";
import type { GameObjects } from "phaser";
import { FieldEventLog } from "../rules/field/events";
import { NOSE } from "../rules/ship/shots";
import { ROCK_RADIUS, STRAY_RADIUS } from "../rules/tuning";
import { ART_PALETTE } from "../testing/art_frames";
import {
  type Band,
  type Board,
  type FakeShell,
  MIDDLE,
  metricsOf,
  bandsOf,
  linesOf,
  onCanvas,
  roundsOf,
  scrolledBy,
  shardTints,
  shownAt,
  startBoard,
  toMillionths,
  withShip,
} from "../testing/belt_board";
import { loggedOn, placeRock } from "../testing/field_picture";
import { energyOf } from "../view/art/energy";
import { ADRIFT_FRAMES } from "../view/art/pilot_art";
import { breakOf, impactOf, shardPushOf, rimToward } from "../view/art/breaks";
import { RESCUE_RING, SPRING } from "../view/effects/rescue";
import { RINGS, ringOf } from "../view/effects/flourish";
import {
  BOULDER_HOLD_MS,
  BURST_SHARDS,
  RESCUE_MS,
  FLASH_GAP_MS,
  RING_MS,
  SHAKE_MS,
  SLOWED_MS,
  SLOW_MS,
  STILL_MARK_MS,
} from "../view/effects/timing";
import { type FieldEvent, shipAt } from "../view/field/frame";
import { Steering } from "../view/steering/steering";
import type { BeltScene } from "./belt_scene";
import { FlourishPlayer } from "./flourish_player";
import type { PaintContext } from "./painters/painter";

/** When the spec's flourishes play, in the scene's time. */
const NOW = 5_000;

/** Returns the event a log of the spec's own records as `add` writes it. */
function eventOf(add: (log: FieldEventLog) => void): FieldEvent {
  const events = new FieldEventLog();
  add(events);
  const [event] = loggedOn({ events });
  if (!event) throw new Error("Nothing was logged.");
  return event;
}

/**
 * Starts a board, set up as a spec says, and a player of flourishes on its
 * scene's painters and its field's camera.
 */
async function startPlayer(
  setup?: (shell: FakeShell) => void,
): Promise<Board & { readonly player: FlourishPlayer }> {
  const board = await startBoard(setup);
  const { scene } = board;
  const player = new FlourishPlayer({
    debris: scene.kit.debris,
    boulders: scene.kit.boulders,
    blasts: scene.kit.blasts,
    rings: scene.kit.rings,
    trail: scene.kit.trail,
    rocks: scene.kit.rocks,
    points: scene.kit.points,
    strays: scene.kit.strays,
    muzzle: scene.kit.muzzle,
    tow: scene.kit.tow,
    camera: scene.kit.fieldCamera,
  });
  return { ...board, player };
}

/**
 * Returns what the painters draw from at a time: the shell's field, laid out
 * on the spec's canvas, in its palette.
 */
function contextAt(shell: FakeShell, now: number): PaintContext {
  return {
    field: shell.field,
    alpha: 0,
    shipDrawn: shipAt(shell.field, 0, { x: 0, y: 0, angle: 0 }),
    seed: shell.seed,
    constellation: null,
    place: shell.place,
    endsSector: false,
    deck: null,
    steering: new Steering(metricsOf(shell), null, shell.setting),
    metrics: metricsOf(shell),
    palette: shell.colors,
    font: shell.typeface,
    zoom: 1,
    now,
    motion: true,
  };
}

/** Returns what the painters draw from at a time, as {@link contextAt} does, on a sector's last wave. */
function sectorEndAt(shell: FakeShell, now: number): PaintContext {
  return { ...contextAt(shell, now), endsSector: true };
}

/** Returns the tint and the scale of each shard alive. */
function shardsOf(scene: BeltScene): {
  readonly tints: readonly number[];
  readonly scales: readonly number[];
} {
  const scales: number[] = [];
  scene.kit.debris.shards.forEachAlive((shard) => {
    scales.push(shard.scaleX);
  }, null);
  return { tints: shardTints(scene), scales };
}

/** Returns a boulder's break in the middle of a shell's field, its blow coming a way. */
function boulderBrokenFrom(
  shell: FakeShell,
  wayX: number,
  wayY: number,
): FieldEvent {
  const boulder = placeRock(
    shell.field,
    "boulder",
    MIDDLE.x,
    MIDDLE.y,
    "boulder",
  );
  return eventOf((log) => {
    log.addBreak(boulder, 1, wayX, wayY);
  });
}

/** Returns the blast of a medium volatile rock placed in the middle of a shell's field, reaching 4. */
function blastFrom(shell: FakeShell): FieldEvent {
  const rock = placeRock(shell.field, "medium", MIDDLE.x, MIDDLE.y, "volatile");
  return eventOf((log) => {
    log.addRock("blast", rock, 4);
  });
}

/** Returns the wave's clearing, logged at a place away from the middle. */
function clearedOn(): FieldEvent {
  return eventOf((log) => {
    log.add("cleared", 10, 30);
  });
}

/** Returns whether the ring painter fills its rings about a place on the field. */
function ringsAbout(
  scene: BeltScene,
  shell: FakeShell,
  x: number,
  y: number,
): boolean {
  const points = commandsOf(scene.kit.rings.graphics).flatMap((command) =>
    command.kind === "fillTriangle" ? [command.points] : [],
  );
  const xs = points.flatMap((each) => each.filter((_, i) => i % 2 === 0));
  const ys = points.flatMap((each) => each.filter((_, i) => i % 2 === 1));
  const at = onCanvas(metricsOf(shell), x, y);
  return (
    xs.length > 0 &&
    Math.abs((Math.min(...xs) + Math.max(...xs)) / 2 - at.x) < 1e-6 &&
    Math.abs((Math.min(...ys) + Math.max(...ys)) / 2 - at.y) < 1e-6
  );
}

/** Returns each ring the ring painter fills, as where its middle is, how far out it runs and its color. */
function ringsOf(scene: BeltScene): readonly Omit<Band, "alpha">[] {
  return bandsOf(scene.kit.rings.graphics).map(({ x, y, radius, color }) => ({
    x,
    y,
    radius,
    color,
  }));
}

/** Returns the hit a medium rock placed on a shell's field held, at a place. */
function hitAt(shell: FakeShell, x: number, y: number): FieldEvent {
  const rock = placeRock(shell.field, "medium", x, y);
  return eventOf((log) => {
    log.addRock("hit", rock);
  });
}

/** Returns the image of the muzzle's flash's star where it is, failing if it has none. */
function starOf(scene: BeltScene): GameObjects.Image {
  const [star] = scene.kit.muzzle.star.images;
  if (!star) throw new Error("The muzzle's painter made no star.");
  return star;
}

/** Returns so many of a value. */
function times<T>(count: number, value: T): readonly T[] {
  return Array.from({ length: count }, () => value);
}

describe("FlourishPlayer", () => {
  it("flashes the muzzle at the nose of the pod as it is drawn, turned as it points, whole at first", async () => {
    const { shell, scene, player } = await startPlayer();
    const context = {
      ...contextAt(shell, NOW),
      shipDrawn: { x: MIDDLE.x, y: MIDDLE.y, angle: -Math.PI / 2 },
    };
    const event = eventOf((log) => {
      log.addFired(MIDDLE.x, MIDDLE.y, "gun");
    });

    player.play("muzzle", event, context);
    scene.kit.muzzle.draw(context);

    const { visible, x, y, rotation, scaleX, alpha } = starOf(scene);
    const nose = onCanvas(context.metrics, MIDDLE.x, MIDDLE.y - NOSE);
    expect([visible, x, y, rotation, scaleX, alpha]).toEqual([
      true,
      expect.closeTo(nose.x, 9),
      expect.closeTo(nose.y, 9),
      expect.closeTo(-Math.PI / 2, 9),
      1,
      1,
    ]);
  });

  it("breaks a rock where it broke, from the outline it is drawn in, turned as it lies, pushed the way the blow came", async () => {
    const { shell, scene, player } = await startPlayer();
    const rock = placeRock(shell.field, "medium", MIDDLE.x, MIDDLE.y, "ice");
    Object.assign(rock, { outline: 2, angle: 0.8, live: false });
    const event = eventOf((log) => {
      log.addBreak(rock, 1, 0, -1);
    });

    player.play("break", event, contextAt(shell, NOW));

    const play = scene.kit.debris.breaks.all.find(({ at }) => at === NOW);
    expect(
      play && {
        x: play.x,
        y: play.y,
        made: play.made,
        turn: play.turn,
        push: play.push,
      },
    ).toEqual({
      ...MIDDLE,
      made: breakOf(rock),
      turn: 0.8,
      push: shardPushOf(0, -1, 0.8, { x: 0, y: 0 }),
    });
  });

  it("bursts a lost ship into shards in the accent, at the field's zoom", async () => {
    const { shell, scene, player } = await startPlayer();
    const event = eventOf((log) => {
      log.addPilot("lost", MIDDLE.x, MIDDLE.y, 2, shell.field.crew);
    });

    player.play("burst", event, { ...contextAt(shell, NOW), zoom: 2 });

    expect(shardsOf(scene)).toEqual({
      tints: times(BURST_SHARDS, ART_PALETTE.accent),
      scales: times(BURST_SHARDS, 2),
    });
  });

  it("throws a held hit's spark from its rock's rim toward the field's light while no ship flies, its sparks the shape its serial picks", async () => {
    const { shell, scene, player } = await startPlayer();
    const rock = placeRock(shell.field, "large", MIDDLE.x, MIDDLE.y);
    const context = contextAt(shell, NOW);
    const event = eventOf((log) => {
      log.addRock("hit", rock);
    });

    player.play("spark", event, context);

    const play = scene.kit.debris.heldHits.all.find(({ at }) => at === NOW);
    const { way } = context.palette.rockLight;
    const toward = Math.atan2(way.y, way.x);
    const rim = rimToward(rock, toward);
    expect(
      play && {
        x: play.x.toFixed(9),
        y: play.y.toFixed(9),
        toward: play.toward,
        ticks: play.ticks,
      },
    ).toEqual({
      x: (MIDDLE.x + Math.cos(toward) * rim).toFixed(9),
      y: (MIDDLE.y + Math.sin(toward) * rim).toFixed(9),
      toward,
      ticks: impactOf("stone", event.serial),
    });
  });

  it("flashes the rock in the slot that held a hit", async () => {
    const { shell, scene, player } = await startPlayer();
    const rock = placeRock(shell.field, "medium", MIDDLE.x, MIDDLE.y);
    const context = contextAt(shell, NOW);
    const event = eventOf((log) => {
      log.addRock("hit", rock);
    });

    player.play("flash", event, context);
    scene.kit.rocks.draw(context);

    // The keeper's field has no ship, so the flash stands toward the field's light.
    const { way } = context.palette.rockLight;
    const reach = ROCK_RADIUS.medium / Math.hypot(way.x, way.y);
    const edge = onCanvas(
      context.metrics,
      MIDDLE.x + way.x * reach,
      MIDDLE.y + way.y * reach,
    );
    const [flash] = scene.kit.rocks.flashes;
    expect([flash.visible, flash.x, flash.y]).toEqual([
      true,
      expect.closeTo(edge.x, 9),
      expect.closeTo(edge.y, 9),
    ]);
  });

  it("kicks the field's camera the way the blow came", async () => {
    const { shell, scene, player } = await startPlayer();
    const rock = placeRock(shell.field, "large", MIDDLE.x, MIDDLE.y);
    const context = contextAt(shell, NOW);
    const event = eventOf((log) => {
      log.addBreak(rock, 1, 0, -1);
    });

    player.play("kick", event, context);
    scene.kit.fieldCamera.draw(context);

    // The field moves the blow's way, so its camera scrolls the other.
    const { x, y } = scrolledBy(scene, shell);
    expect({ across: x, against: y > 0 }).toEqual({ across: 0, against: true });
  });

  it.each([
    [
      "holds the field's camera still for a boulder's first beat",
      BOULDER_HOLD_MS / 2,
      false,
    ],
    [
      "shakes it along the blow once the beat is past",
      BOULDER_HOLD_MS + (SHAKE_MS - BOULDER_HOLD_MS) / 8,
      true,
    ],
  ] as const)("%s", async (_, sinceMs, shaken) => {
    const { shell, scene, player } = await startPlayer();
    const event = boulderBrokenFrom(shell, 1, 0);

    player.play("shake", event, contextAt(shell, NOW));
    scene.kit.fieldCamera.draw(contextAt(shell, NOW + sinceMs));

    const { x, y } = scrolledBy(scene, shell);
    expect({ shaken: x !== 0, along: y === 0 }).toEqual({
      shaken,
      along: true,
    });
  });

  it("flashes no rock within the gap after the field last flashed, whatever flashed", async () => {
    const { shell, scene, player } = await startPlayer();
    player.play("flash", hitAt(shell, 20, 20), contextAt(shell, NOW));
    const later = contextAt(shell, NOW + FLASH_GAP_MS - 1);

    player.play("flash", hitAt(shell, MIDDLE.x, MIDDLE.y), later);
    scene.kit.rocks.draw(later);

    expect(scene.kit.rocks.flashes[0].visible).toBe(false);
  });

  it("flashes a rock again once the gap is past", async () => {
    const { shell, scene, player } = await startPlayer();
    player.play("flash", hitAt(shell, 20, 20), contextAt(shell, NOW));
    const later = contextAt(shell, NOW + FLASH_GAP_MS);

    player.play("flash", hitAt(shell, MIDDLE.x, MIDDLE.y), later);
    scene.kit.rocks.draw(later);

    expect(scene.kit.rocks.flashes[0].visible).toBe(true);
  });

  it("breaks a boulder in its beats where it broke", async () => {
    const { shell, scene, player } = await startPlayer();
    const context = contextAt(shell, NOW);

    player.play("boulder", boulderBrokenFrom(shell, 0, 1), context);
    scene.kit.boulders.draw(contextAt(shell, NOW + 30));

    const at = onCanvas(context.metrics, MIDDLE.x, MIDDLE.y);
    const radius = ROCK_RADIUS.boulder * context.metrics.unit;
    const starts = commandsOf(scene.kit.boulders.graphics).flatMap((command) =>
      command.kind === "moveTo" ? [command] : [],
    );
    expect({
      cracks: starts.length > 0,
      fromMiddle: starts.every(
        ({ x, y }) => Math.hypot(x - at.x, y - at.y) < 0.15 * radius,
      ),
    }).toEqual({ cracks: true, fromMiddle: true });
  });

  it("slows its clock to a third as a sector's last wave is cleared", async () => {
    const { shell, player } = await startPlayer();
    player.clock.at(NOW);

    player.play("slow", clearedOn(), sectorEndAt(shell, NOW));

    expect(player.clock.at(NOW + 30)).toBeCloseTo(NOW + 10, 9);
  });

  it("keeps its clock's pace as any other wave is cleared", async () => {
    const { shell, player } = await startPlayer();
    player.clock.at(NOW);

    player.play("slow", clearedOn(), contextAt(shell, NOW));

    expect(player.clock.at(NOW + 30)).toBe(NOW + 30);
  });

  it("ends a slow as a new field starts", async () => {
    const { shell, player } = await startPlayer();
    player.clock.at(NOW);
    player.play("slow", clearedOn(), sectorEndAt(shell, NOW));

    player.start();

    expect(player.clock.at(NOW + 30)).toBe(NOW + 30);
  });

  it("crosses the field with the wave's ring from where the last rock broke, once the slow is over at a sector's end", async () => {
    const { shell, scene, player } = await startPlayer();
    const context = sectorEndAt(shell, NOW);
    player.play("break", boulderBrokenFrom(shell, 0, 1), context);

    player.play("wave", clearedOn(), context);
    scene.kit.rings.draw(contextAt(shell, NOW + SLOWED_MS - 1));
    const waiting = commandsOf(scene.kit.rings.graphics).length;
    scene.kit.rings.draw(contextAt(shell, NOW + SLOWED_MS + 50));

    expect([waiting, ringsAbout(scene, shell, MIDDLE.x, MIDDLE.y)]).toEqual([
      0,
      true,
    ]);
  });

  it("crosses the field with the wave's ring as long after the last rock as the slow would last, unslowed, as any other wave is cleared", async () => {
    const { shell, scene, player } = await startPlayer();
    const context = contextAt(shell, NOW);
    player.play("break", boulderBrokenFrom(shell, 0, 1), context);

    player.play("wave", clearedOn(), context);
    scene.kit.rings.draw(contextAt(shell, NOW + SLOW_MS - 1));
    const waiting = commandsOf(scene.kit.rings.graphics).length;
    scene.kit.rings.draw(contextAt(shell, NOW + SLOW_MS + 50));

    expect([waiting, ringsAbout(scene, shell, MIDDLE.x, MIDDLE.y)]).toEqual([
      0,
      true,
    ]);
  });

  it("forgets the last break as a new field starts, crossing the field from where the clearing is logged", async () => {
    const { shell, scene, player } = await startPlayer();
    const context = contextAt(shell, NOW);
    player.play("break", hitAt(shell, 20, 12), context);
    player.start();

    player.play("wave", clearedOn(), context);
    scene.kit.rings.draw(contextAt(shell, NOW + SLOW_MS + 50));

    expect(ringsAbout(scene, shell, 10, 30)).toBe(true);
  });

  it("flashes a rock as a new field starts, however lately the last flashed", async () => {
    const { shell, scene, player } = await startPlayer();
    player.play("flash", hitAt(shell, 20, 20), contextAt(shell, NOW));
    const later = contextAt(shell, NOW + FLASH_GAP_MS - 1);
    player.start();

    player.play("flash", hitAt(shell, MIDDLE.x, MIDDLE.y), later);
    scene.kit.rocks.draw(later);

    expect(scene.kit.rocks.flashes[0].visible).toBe(true);
  });

  it("sweeps a spent Shield's ring out from where it was spent, toward its reach, in the accent", async () => {
    const { shell, scene, player } = await startPlayer();
    const context = contextAt(shell, NOW + RING_MS / 2);
    const event = eventOf((log) => {
      log.add("shielded", MIDDLE.x, MIDDLE.y);
    });

    player.play("ring", event, contextAt(shell, NOW));
    scene.kit.rings.draw(context);

    const at = onCanvas(context.metrics, MIDDLE.x, MIDDLE.y);
    expect(ringsOf(scene)).toEqual([
      {
        x: toMillionths(at.x),
        y: toMillionths(at.y),
        radius: toMillionths(
          ringOf(event).reach * easeOutCubic(1 / 2) * context.metrics.unit,
        ),
        color: ART_PALETTE.accent,
      },
    ]);
  });

  it("fills nothing for a ring the frame it is played, before it has swept out at all", async () => {
    const { shell, scene, player } = await startPlayer();
    const context = contextAt(shell, NOW);
    const event = eventOf((log) => {
      log.add("shielded", MIDDLE.x, MIDDLE.y);
    });

    player.play("ring", event, context);
    scene.kit.rings.draw(context);

    expect(ringsOf(scene)).toEqual([]);
  });

  it("marks where a dash started with a ring standing still at its reach", async () => {
    const { shell, scene, player } = await startPlayer();
    const context = contextAt(shell, NOW + STILL_MARK_MS / 2);
    const event = eventOf((log) => {
      log.addDash(MIDDLE.x, MIDDLE.y, 0);
    });

    player.play("mark", event, contextAt(shell, NOW));
    scene.kit.rings.draw(context);

    const at = onCanvas(context.metrics, MIDDLE.x, MIDDLE.y);
    expect(ringsOf(scene)).toEqual([
      {
        x: toMillionths(at.x),
        y: toMillionths(at.y),
        radius: toMillionths(RINGS.dashed.reach * context.metrics.unit),
        color: ART_PALETTE.accent,
      },
    ]);
  });

  it("opens a fuzzball caught's soft ring about where it was caught, its soft outside under its line, in the accent's energy", async () => {
    const { shell, scene, player } = await startPlayer();
    const context = contextAt(shell, NOW + RESCUE_MS / 2);
    const event = eventOf((log) => {
      log.addPilot("joined", MIDDLE.x, MIDDLE.y, 3, shell.field.crew);
    });

    player.play("rescue", event, contextAt(shell, NOW));
    scene.kit.rings.draw(context);

    const at = onCanvas(context.metrics, MIDDLE.x, MIDDLE.y);
    const ring = {
      x: toMillionths(at.x),
      y: toMillionths(at.y),
      radius: toMillionths(
        (STRAY_RADIUS + RESCUE_RING.opens * (7 / 8)) * context.metrics.unit,
      ),
    };
    const { halo, body } = energyOf(ART_PALETTE.accent, ART_PALETTE);
    expect(bandsOf(scene.kit.rings.graphics)).toEqual([
      { ...ring, color: halo, alpha: RESCUE_RING.softAlpha / 2 },
      { ...ring, color: body, alpha: RESCUE_RING.alpha / 2 },
    ]);
  });

  it("fills a fuzzball caught's soft outside as wide as the kit's, narrowing as it opens, and its line as wide as the kit's", async () => {
    const { shell, scene, player } = await startPlayer();
    const context = contextAt(shell, NOW + RESCUE_MS / 2);
    const event = eventOf((log) => {
      log.addPilot("joined", MIDDLE.x, MIDDLE.y, 3, shell.field.crew);
    });

    player.play("rescue", event, contextAt(shell, NOW));
    scene.kit.rings.draw(context);

    const { unit } = context.metrics;
    expect(
      roundsOf(scene.kit.rings.graphics).map(({ inner, outer }) =>
        toMillionths((outer - inner) / unit),
      ),
    ).toEqual([
      toMillionths(RESCUE_RING.softWidth * (3 / 4)),
      RESCUE_RING.width,
    ]);
  });

  it("puts a fuzzball caught's soft ring away once its time is over", async () => {
    const { shell, scene, player } = await startPlayer();
    const event = eventOf((log) => {
      log.addPilot("joined", MIDDLE.x, MIDDLE.y, 3, shell.field.crew);
    });

    player.play("rescue", event, contextAt(shell, NOW));
    scene.kit.rings.draw(contextAt(shell, NOW + RESCUE_MS));

    expect(bandsOf(scene.kit.rings.graphics)).toEqual([]);
  });

  it("springs the line in tow as one joins it, each stretch drawn in steps as it bows", async () => {
    const { shell, scene, player } = await startPlayer(withShip);
    const event = eventOf((log) => {
      log.addPilot("joined", MIDDLE.x, MIDDLE.y, 3, shell.field.crew);
    });

    player.play("spring", event, contextAt(shell, NOW));
    scene.kit.tow.draw(contextAt(shell, NOW + RESCUE_MS / 12));

    expect(linesOf(scene.kit.tow.line)).toHaveLength(2 * SPRING.steps);
  });

  it("draws the line in tow straight once its spring is over", async () => {
    const { shell, scene, player } = await startPlayer(withShip);
    const event = eventOf((log) => {
      log.addPilot("joined", MIDDLE.x, MIDDLE.y, 3, shell.field.crew);
    });

    player.play("spring", event, contextAt(shell, NOW));
    scene.kit.tow.draw(contextAt(shell, NOW + RESCUE_MS));

    expect(linesOf(scene.kit.tow.line)).toHaveLength(2);
  });

  it("sets a blast off where its rock went off, lighting the rocks near it", async () => {
    const { shell, scene, player } = await startPlayer();
    const context = contextAt(shell, NOW);

    player.play("blast", blastFrom(shell), context);
    scene.kit.blasts.draw(context);

    const { light } = scene.kit.blasts;
    const at = onCanvas(context.metrics, MIDDLE.x, MIDDLE.y);
    expect({
      ring: commandsOf(scene.kit.blasts.graphics).length > 0,
      lit: [light.visible, light.x, light.y],
    }).toEqual({ ring: true, lit: [true, at.x, at.y] });
  });

  it("sets a blast off with no light within the gap after the field last flashed", async () => {
    const { shell, scene, player } = await startPlayer();
    player.play("flash", hitAt(shell, 20, 20), contextAt(shell, NOW));
    const later = contextAt(shell, NOW + FLASH_GAP_MS - 1);

    player.play("blast", blastFrom(shell), later);
    scene.kit.blasts.draw(later);

    expect(scene.kit.blasts.light.visible).toBe(false);
  });

  it("keeps the field's flashes apart after a blast, as after a held hit", async () => {
    const { shell, scene, player } = await startPlayer();
    player.play("blast", blastFrom(shell), contextAt(shell, NOW));
    const later = contextAt(shell, NOW + FLASH_GAP_MS - 1);

    player.play("flash", hitAt(shell, 20, 20), later);
    scene.kit.rocks.draw(later);

    expect(scene.kit.rocks.flashes[0].visible).toBe(false);
  });

  it("takes no turn of the field's flashes for a blast where motion isn't welcome", async () => {
    const { shell, scene, player } = await startPlayer();
    player.play("blast", blastFrom(shell), {
      ...contextAt(shell, NOW),
      motion: false,
    });
    const later = contextAt(shell, NOW + 1);

    player.play("flash", hitAt(shell, 20, 20), later);
    scene.kit.rocks.draw(later);

    expect(scene.kit.rocks.flashes[0].visible).toBe(true);
  });

  it("shows the points an event scored where it scored them", async () => {
    const { shell, scene, player } = await startPlayer();
    const event = eventOf((log) => {
      log.addScore(MIDDLE.x, MIDDLE.y, 40, 2);
    });

    player.play("points", event, contextAt(shell, NOW));

    const scored = scene.kit.points.scored.all.find(({ at }) => at === NOW);
    expect(scored && { x: scored.x, y: scored.y, text: scored.label }).toEqual({
      ...MIDDLE,
      text: "+40 ×2",
    });
  });

  it("lays a dash's trail from where it started, from the step the field is at", async () => {
    const { shell, scene, player } = await startPlayer();
    // A field that stepped a while, then stopped as its dash began.
    shell.field.steps = 100;
    const context = contextAt(shell, NOW);
    const event = eventOf((log) => {
      log.addDash(MIDDLE.x, MIDDLE.y, 0);
    });

    player.play("trail", event, context);
    scene.kit.trail.draw(context);

    const shownOutlines = scene.kit.trail.outlines.map(
      ({ images: [image] }) => image && shownAt(image),
    );
    expect(shownOutlines).toEqual([
      onCanvas(context.metrics, MIDDLE.x, MIDDLE.y),
      null,
      null,
    ]);
  });

  it("bails a lost pod's pilot out where it was lost, in its ink", async () => {
    const { shell, scene, player } = await startPlayer();
    const context = contextAt(shell, NOW);
    const event = eventOf((log) => {
      log.addPilot("lost", MIDDLE.x, MIDDLE.y, 2, shell.field.crew);
    });

    player.play("bailout", event, context);
    scene.kit.strays.draw(context);

    const { bubble, pilot } = scene.kit.strays.bailing;
    expect([shownAt(bubble), pilot.frame.name, pilot.tintTopLeft]).toEqual([
      onCanvas(context.metrics, MIDDLE.x, MIDDLE.y),
      ADRIFT_FRAMES.puffed,
      context.palette.pilots[2],
    ]);
  });

  it("bails no pilot out of a pod lost with none at its controls", async () => {
    const { shell, scene, player } = await startPlayer();
    const context = contextAt(shell, NOW);
    const lost = eventOf((log) => {
      log.addPilot("lost", MIDDLE.x, MIDDLE.y, 2, shell.field.crew);
    });

    player.play("bailout", { ...lost, pilot: null }, context);
    scene.kit.strays.draw(context);

    expect(scene.kit.strays.bailing.bubble.visible).toBe(false);
  });
});
