import { easeOutCubic } from "@fz/core/math";
import { strokesOf } from "@fz/phaser/testing";
import { FieldEventLog } from "../rules/field/events";
import { ROCK_RADIUS } from "../rules/tuning";
import { ART_PALETTE } from "../testing/art_frames";
import {
  type Board,
  type FakeShell,
  MIDDLE,
  metricsOf,
  onCanvas,
  scrolledBy,
  shardTints,
  shownAt,
  startBoard,
} from "../testing/belt_board";
import { loggedOn, placeRock } from "../testing/field_picture";
import { ADRIFT_FRAMES } from "../view/art/pilot_art";
import { breakOf, impactOf, shardPushOf, rimToward } from "../view/art/breaks";
import { ringReachOf } from "../view/effects/flourish";
import {
  BOULDER_HOLD_MS,
  BURST_SHARDS,
  FLASH_GAP_MS,
  RING_MS,
  SHAKE_MS,
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
 * Starts a board, and a player of flourishes on its scene's painters and its
 * field's camera.
 */
async function startPlayer(): Promise<
  Board & { readonly player: FlourishPlayer }
> {
  const board = await startBoard();
  const { scene } = board;
  const player = new FlourishPlayer({
    debris: scene.kit.debris,
    rings: scene.kit.rings,
    trail: scene.kit.trail,
    rocks: scene.kit.rocks,
    points: scene.kit.points,
    strays: scene.kit.strays,
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

/** Returns the hit a medium rock placed on a shell's field held, at a place. */
function hitAt(shell: FakeShell, x: number, y: number): FieldEvent {
  const rock = placeRock(shell.field, "medium", x, y);
  return eventOf((log) => {
    log.addRock("hit", rock);
  });
}

/** Returns so many of a value. */
function times<T>(count: number, value: T): readonly T[] {
  return Array.from({ length: count }, () => value);
}

describe("FlourishPlayer", () => {
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

  it("flashes a rock as a new field starts, however lately the last flashed", async () => {
    const { shell, scene, player } = await startPlayer();
    player.play("flash", hitAt(shell, 20, 20), contextAt(shell, NOW));
    const later = contextAt(shell, NOW + FLASH_GAP_MS - 1);
    player.start();

    player.play("flash", hitAt(shell, MIDDLE.x, MIDDLE.y), later);
    scene.kit.rocks.draw(later);

    expect(scene.kit.rocks.flashes[0].visible).toBe(true);
  });

  it("sweeps a blast's ring out from where it went off, toward its reach, in the flame's color", async () => {
    const { shell, scene, player } = await startPlayer();
    const rock = placeRock(shell.field, "medium", MIDDLE.x, MIDDLE.y);
    const context = contextAt(shell, NOW + RING_MS / 2);
    const event = eventOf((log) => {
      log.addRock("blast", rock, 6);
    });

    player.play("ring", event, contextAt(shell, NOW));
    scene.kit.rings.draw(context);

    const [ring] = strokesOf(scene.kit.rings.graphics);
    expect(
      ring && { x: ring.x, y: ring.y, radius: ring.radius, color: ring.color },
    ).toEqual({
      ...onCanvas(context.metrics, MIDDLE.x, MIDDLE.y),
      radius: ringReachOf(event) * easeOutCubic(1 / 2) * context.metrics.unit,
      color: ART_PALETTE.flame,
    });
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
