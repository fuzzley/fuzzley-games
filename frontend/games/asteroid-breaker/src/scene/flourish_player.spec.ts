import { easeOutCubic } from "@fz/core/math";
import type { GameObjects } from "phaser";
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
  strokesOf,
} from "../testing/belt_board";
import { loggedOn, placeRock } from "../testing/field_picture";
import { pilotFrame } from "../view/art/pilot_art";
import { ringReachOf, shardCount, wayOf } from "../view/effects/flourish";
import {
  BURST_SHARDS,
  RING_MS,
  SHAKE_DELAY_MS,
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

/** Returns so many of a value. */
function times<T>(count: number, value: T): readonly T[] {
  return Array.from({ length: count }, () => value);
}

/**
 * Returns the tint of the image of a thing's copies where it is, its copy
 * past no edge.
 */
function tintOf(images: readonly GameObjects.Image[]): number | undefined {
  return images[0]?.tintTopLeft;
}

describe("FlourishPlayer", () => {
  it("throws a broken rock's shards, as many as its serial says, in its body's color, at the field's zoom", async () => {
    const { shell, scene, player } = await startPlayer();
    const rock = placeRock(shell.field, "medium", MIDDLE.x, MIDDLE.y, "ice");
    const event = eventOf((log) => {
      log.addBreak(rock, 1, 0, -1);
    });

    player.play("shards", event, { ...contextAt(shell, NOW), zoom: 2 });

    const count = shardCount(event.serial);
    expect(shardsOf(scene)).toEqual({
      tints: times(count, ART_PALETTE.rocks.ice),
      scales: times(count, 2),
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

  it("puffs a broken rock's dust from its middle, out to its radius, in its body's color", async () => {
    const { shell, scene, player } = await startPlayer();
    const rock = placeRock(shell.field, "medium", MIDDLE.x, MIDDLE.y, "ice");
    const event = eventOf((log) => {
      log.addBreak(rock, 1, 0, -1);
    });

    player.play("dust", event, contextAt(shell, NOW));

    const puff = scene.kit.debris.puffs.all.find(({ at }) => at === NOW);
    expect(
      puff && {
        x: puff.x,
        y: puff.y,
        radius: puff.radius,
        tint: tintOf(puff.copies.images),
      },
    ).toEqual({
      ...MIDDLE,
      radius: ROCK_RADIUS.medium,
      tint: ART_PALETTE.rocks.ice,
    });
  });

  it("flies a held hit's spark off its rock's edge, the way its serial says, in the flame's color", async () => {
    const { shell, scene, player } = await startPlayer();
    const rock = placeRock(shell.field, "large", MIDDLE.x, MIDDLE.y);
    const event = eventOf((log) => {
      log.addRock("hit", rock);
    });

    player.play("spark", event, contextAt(shell, NOW));

    const spark = scene.kit.debris.sparks.all.find(({ at }) => at === NOW);
    expect(
      spark && {
        x: spark.x,
        y: spark.y,
        radius: spark.radius,
        wayX: spark.wayX,
        wayY: spark.wayY,
        tint: tintOf(spark.copies.images),
      },
    ).toEqual({
      ...MIDDLE,
      radius: ROCK_RADIUS.large,
      wayX: Math.cos(wayOf(event.serial)),
      wayY: Math.sin(wayOf(event.serial)),
      tint: ART_PALETTE.flame,
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

    const [flash] = scene.kit.rocks.flash.images;
    expect(flash && shownAt(flash)).toEqual(
      onCanvas(context.metrics, MIDDLE.x, MIDDLE.y),
    );
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

  it("shakes the field's camera once the moment after a ship is lost is past", async () => {
    const { shell, scene, player } = await startPlayer();
    const event = eventOf((log) => {
      log.addPilot("lost", MIDDLE.x, MIDDLE.y, 2, shell.field.crew);
    });

    player.play("shake", event, contextAt(shell, NOW));
    scene.kit.fieldCamera.draw(
      contextAt(shell, NOW + SHAKE_DELAY_MS + SHAKE_MS / 4),
    );

    expect(scrolledBy(scene, shell)).not.toEqual({ x: 0, y: 0 });
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

  it("bails a lost ship's pilot out where it was lost, in its ink", async () => {
    const { shell, scene, player } = await startPlayer();
    const context = contextAt(shell, NOW);
    const event = eventOf((log) => {
      log.addPilot("lost", MIDDLE.x, MIDDLE.y, 2, shell.field.crew);
    });

    player.play("bailout", event, context);
    scene.kit.strays.draw(context);

    const { bubble, pilot } = scene.kit.strays.bailing;
    expect([shownAt(bubble), pilot.frame.name]).toEqual([
      onCanvas(context.metrics, MIDDLE.x, MIDDLE.y),
      pilotFrame(2, "adrift"),
    ]);
  });

  it("bails no pilot out of a ship lost with none at its controls", async () => {
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
