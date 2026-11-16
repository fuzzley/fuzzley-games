import { type Playing, Turns } from "@fz/core/turns";
import type { Point } from "@fz/phaser/shapes";
import type { GameObjects, Scene } from "phaser";
import type { RockKindId, RockSize } from "../../rules/catalog/rocks";
import type { Rock } from "../../rules/rocks/rocks";
import { type Moving, type Torus, copyOffsets, wrap } from "../../rules/torus";
import { ROCK_RADIUS } from "../../rules/tuning";
import { FRAMES } from "../../view/art/art";
import {
  type Break,
  type Broken,
  GLINT_POINTS,
  HELD_REACH,
  IMPACT_POINTS,
  type Placed,
  ROUND_SAG,
  type Round,
  type Streak,
  type Tick,
  breakOf,
  dustAt,
  glintAt,
  impactFlashAt,
  impactOf,
  impactTickAt,
  puffAt,
  shardPushOf,
  rimToward,
  roundOf,
  shardAt,
  sparkAt,
  towardShip,
  wholeAt,
} from "../../view/art/breaks";
import { type Energy, energyOf } from "../../view/art/energy";
import type { BeltPalette } from "../../view/colors/palette";
import { BREAK_MS, HELD_MS, BURST_MS } from "../../view/effects/timing";
import { type FieldMetrics, toCanvas } from "../../view/field/field_metrics";
import {
  type FieldEvent,
  type FieldView,
  rockKindOf,
  rockSizeOf,
} from "../../view/field/frame";
import { ATLAS } from "../atlas";
import type { PaintContext, Painter } from "./painter";

/**
 * How many rocks' breaks may play at once: a blast breaks a crowd of rocks
 * at once, and the oldest is cut short past them.
 */
const BREAKS = 32;

/** How many held hits' sparks may play at once. */
const HELD_HITS = 8;

/** How fast a lost ship's shard flies off, in field units a second, at least and at most. */
const SHARD_SPEED = { least: 5, most: 11 } as const;

/**
 * How many of a lost ship's shards may fly at once. Each is made as the
 * scene starts, and one past them is left out rather than made in play.
 * A burr's pop throws them too: a lost ship's burst, a dash shaking off
 * three burrs and a shot popping one at once fill them.
 */
export const MOST_SHARDS_FLYING = 32;

/** Describes a rock's break as it plays: how it breaks, how far it had turned, and how the blow pushes its shards. */
export interface BreakPlaying extends Playing, Broken {
  made: Break;
  turn: number;
  readonly push: Moving;
}

/** Describes a held hit's spark as it plays, from the rim of the rock it struck: its sparks, and the way back toward the shot. */
export interface HeldHitPlaying extends Playing {
  ticks: readonly Tick[];
  /** The way the shot came from, in radians. */
  toward: number;
}

/**
 * Describes the rock last drawn in a slot, which a break finds the outline
 * and the turn of once a piece has taken its slot.
 */
interface SlotSeen {
  kind: RockKindId | null;
  size: RockSize | null;
  outline: number;
  angle: number;
}

/** Describes where a thing is drawn on the canvas, about its middle, and whether it is drawn there. */
interface Middle {
  x: number;
  y: number;
  shown: boolean;
}

/** Where a thing on the field is drawn: itself, and its copies past the edge across, the edge down, and both. */
type Middles = readonly [Middle, Middle, Middle, Middle];

/**
 * Draws what flies off a thing as it is hit: a broken rock's break, its own
 * facets thrown as shards with its dust under the rocks and its sparks and
 * glints over them, a held hit's spark at the rock's rim, and a lost ship's
 * burst of shards. Each is drawn again each frame from records made once,
 * and the scene plays them only where motion is welcome.
 */
export class DebrisPainter implements Painter {
  /** Each break's dust, under its shards and the rocks, drawn again each frame. */
  readonly dustGraphics: GameObjects.Graphics;
  /** Each break's rock whole and its shards, under the rocks, drawn again each frame. */
  readonly breakGraphics: GameObjects.Graphics;
  /** Each break's sparks and glints and each held hit's spark, over all that moves, under the rings, drawn again each frame. */
  readonly sparkGraphics: GameObjects.Graphics;
  /** Throws the shards of a lost ship, tinted as it was. */
  readonly shards: GameObjects.Particles.ParticleEmitter;
  /** The breaks, each played in turn. */
  readonly breaks = new Turns<BreakPlaying>(BREAKS, () => ({
    at: -Infinity,
    x: 0,
    y: 0,
    made: breakOf({ kind: "stone", size: "small", outline: 0 }),
    turn: 0,
    push: { x: 0, y: 0 },
  }));
  /** The held hits' sparks, each played in turn. */
  readonly heldHits = new Turns<HeldHitPlaying>(HELD_HITS, () => ({
    at: -Infinity,
    x: 0,
    y: 0,
    ticks: [],
    toward: 0,
  }));

  /** The rock last drawn in each slot. */
  private readonly seen: SlotSeen[] = [];
  /** A rock's kind, size and outline, written as a break looks its break up. */
  private readonly breaking: {
    kind: RockKindId;
    size: RockSize;
    outline: number;
  } = { kind: "stone", size: "small", outline: 0 };
  /** The tones the sparks are drawn in, and the palette they were worked out for. */
  private energy: Energy | null = null;
  private energyPalette: BeltPalette | null = null;
  /** The field's unit and zoom as shards were last thrown at, which they fly and are sized by. */
  private unit = 0;
  private zoom = 1;
  /** Where a lost ship's shards are thrown from on the canvas, written as they are thrown. */
  private readonly at: Moving = { x: 0, y: 0 };
  /** How far a thing's copies past the edges are from it on the field, written as each is drawn. */
  private readonly offsets: Moving = { x: 0, y: 0 };
  /** Where the thing being drawn and its copies are on the canvas, written as each is drawn. */
  private readonly middles: Middles = [
    { x: 0, y: 0, shown: false },
    { x: 0, y: 0, shown: false },
    { x: 0, y: 0, shown: false },
    { x: 0, y: 0, shown: false },
  ];
  /** What each piece is drawn as, written as each is drawn. */
  private readonly placed: Placed = {
    x: 0,
    y: 0,
    turn: 0,
    scale: 0,
    color: 0,
    alpha: 0,
  };
  private readonly round: Round = {
    x: 0,
    y: 0,
    radius: 0,
    width: 0,
    color: 0,
    alpha: 0,
  };
  private readonly body: Streak = streak();
  private readonly hot: Streak = streak();

  constructor(
    scene: Scene,
    breaksLayer: GameObjects.Layer,
    effectsLayer: GameObjects.Layer,
  ) {
    this.dustGraphics = scene.add.graphics();
    this.breakGraphics = scene.add.graphics();
    breaksLayer.add([this.dustGraphics, this.breakGraphics]);
    this.shards = scene.add.particles(0, 0, ATLAS, {
      frame: FRAMES.shard,
      emitting: false,
      maxAliveParticles: MOST_SHARDS_FLYING,
      lifespan: BURST_MS,
      alpha: { start: 1, end: 0 },
      rotate: { min: 0, max: 360 },
      speed: () =>
        this.unit *
        (SHARD_SPEED.least +
          Math.random() * (SHARD_SPEED.most - SHARD_SPEED.least)),
      scale: () => this.zoom,
    });
    this.shards.reserve(MOST_SHARDS_FLYING);
    // Built back to front, as `layers.ts` lists the effects layer's
    // flourishes.
    effectsLayer.add(this.shards);
    this.sparkGraphics = scene.add.graphics();
    effectsLayer.add(this.sparkGraphics);
  }

  /**
   * Throws so many shards from a place on the field, in a color, at the
   * field's unit and zoom as it is now laid out, which a frame's events may
   * come before it is drawn at.
   */
  shatter(
    x: number,
    y: number,
    color: number,
    count: number,
    metrics: FieldMetrics,
    zoom: number,
  ): void {
    this.unit = metrics.unit;
    this.zoom = zoom;
    toCanvas(metrics, x, y, this.at);
    this.shards.setParticleTint(color).explode(count, this.at.x, this.at.y);
  }

  /**
   * Breaks a rock as its event says, where it broke: its own facets thrown
   * from the outline it was drawn in, turned as it lay, pushed the way the
   * blow came.
   */
  breakRock(event: Readonly<FieldEvent>, field: FieldView, now: number): void {
    const breaking = this.breaking;
    breaking.kind = rockKindOf(event);
    breaking.size = rockSizeOf(event);
    const was = this.lookUp(field, event.slot, breaking.kind, breaking.size);
    breaking.outline = was?.outline ?? 0;
    const turn = was?.angle ?? 0;
    const play = this.breaks.play(event.x, event.y, now);
    play.made = breakOf(breaking);
    play.turn = turn;
    shardPushOf(event.wayX, event.wayY, turn, play.push);
  }

  /**
   * Throws a held hit's sparks as its event says, from its rock's rim
   * toward the ship, the way the shot came, or toward the field's light
   * while none flies.
   */
  holdHit(
    event: Readonly<FieldEvent>,
    field: FieldView,
    palette: BeltPalette,
    now: number,
  ): void {
    const kind = rockKindOf(event);
    const size = rockSizeOf(event);
    const toward = towardShip(field, event.x, event.y, palette);
    const rock = field.rocks[event.slot];
    const rim = isOf(rock, kind, size)
      ? rimToward(rock, toward)
      : ROCK_RADIUS[size];
    const { width, height } = field.torus;
    const play = this.heldHits.play(
      wrap(event.x + Math.cos(toward) * rim, width),
      wrap(event.y + Math.sin(toward) * rim, height),
      now,
    );
    play.ticks = impactOf(kind, event.serial);
    play.toward = toward;
  }

  /** Draws each break and each held hit's spark as it stands at the scene's time, and notes each slot's rock. */
  draw({ field, metrics, palette, now }: Readonly<PaintContext>): void {
    this.dustGraphics.clear();
    this.breakGraphics.clear();
    this.sparkGraphics.clear();
    const energy = this.energyIn(palette);
    const { torus } = field;
    for (const play of this.breaks.all) {
      const since = now - play.at;
      if (since >= BREAK_MS) continue;
      this.placeMiddles(play.x, play.y, play.made.reach, torus, metrics);
      this.drawBreak(play, since, metrics, palette, energy);
    }
    for (const play of this.heldHits.all) {
      const since = now - play.at;
      if (since >= HELD_MS) continue;
      this.placeMiddles(play.x, play.y, HELD_REACH, torus, metrics);
      this.drawHeldHit(play, since, metrics, energy);
    }
    this.note(field.rocks);
  }

  /**
   * Stops every break, held hit and shard, and makes a note for each slot
   * of a new field's the last didn't have.
   */
  start(field: FieldView): void {
    this.shards.killAll();
    for (const play of this.breaks.all) play.at = -Infinity;
    for (const play of this.heldHits.all) play.at = -Infinity;
    for (const seen of this.seen) seen.kind = null;
    while (this.seen.length < field.rocks.length) {
      this.seen.push({ kind: null, size: null, outline: 0, angle: 0 });
    }
  }

  /** Returns the tones the sparks are drawn in, in a palette, worked out once for each. */
  private energyIn(palette: BeltPalette): Energy {
    if (this.energy === null || this.energyPalette !== palette) {
      this.energy = energyOf(palette.flame, palette);
      this.energyPalette = palette;
    }
    return this.energy;
  }

  /**
   * Returns the rock of a kind and size that broke in a slot, as it was
   * drawn, or none for a rock never drawn.
   *
   * That is the slot's own rock while it is still the broken one, off the
   * field, or the one last drawn in the slot once a piece has taken it: the
   * rules lay a piece in the first free slot, so a whole rock in the slot,
   * even of the broken one's kind and size, is another.
   */
  private lookUp(
    field: FieldView,
    slot: number,
    kind: RockKindId,
    size: RockSize,
  ): Readonly<Pick<SlotSeen, "outline" | "angle">> | undefined {
    const rock = field.rocks[slot];
    if (isOf(rock, kind, size) && !rock.live) return rock;
    const seen = this.seen[slot];
    return isOf(seen, kind, size) ? seen : undefined;
  }

  /**
   * Writes where a thing about a place on the field is drawn on the canvas:
   * there, and again past each edge it reaches across, as far as it
   * reaches, in field units.
   */
  private placeMiddles(
    x: number,
    y: number,
    reach: number,
    torus: Torus,
    metrics: FieldMetrics,
  ): void {
    const { x: across, y: down } = copyOffsets(
      x,
      y,
      reach,
      torus,
      this.offsets,
    );
    const [itself, sideways, upright, aslant] = this.middles;
    placeMiddle(itself, metrics, x, y, true);
    placeMiddle(sideways, metrics, x + across, y, across !== 0);
    placeMiddle(upright, metrics, x, y + down, down !== 0);
    placeMiddle(
      aslant,
      metrics,
      x + across,
      y + down,
      across !== 0 && down !== 0,
    );
  }

  /** Notes the kind, size, outline and turn of each whole rock, as it is drawn. */
  private note(rocks: readonly Readonly<Rock>[]): void {
    for (const rock of rocks) {
      const seen = this.seen[rock.slot];
      if (!rock.live || seen === undefined) continue;
      seen.kind = rock.kind;
      seen.size = rock.size;
      seen.outline = rock.outline;
      seen.angle = rock.angle;
    }
  }

  /**
   * Draws a break about each of its middles: its dust, its rock whole or
   * its shards under the rocks, and its sparks and glints over them, each
   * piece worked out once.
   */
  private drawBreak(
    play: BreakPlaying,
    since: number,
    metrics: FieldMetrics,
    palette: BeltPalette,
    energy: Energy,
  ): void {
    const { made } = play;
    const { middles, placed, round, body, hot } = this;
    const dust = this.dustGraphics;
    const breaks = this.breakGraphics;
    const sparks = this.sparkGraphics;
    const { pixelRatio } = metrics;
    if (dustAt(play, since, palette, metrics, round)) {
      strokeRound(dust, round, pixelRatio, middles);
      for (const puff of made.puffs) {
        if (puffAt(puff, play, since, palette, metrics, round)) {
          fillRound(dust, round, pixelRatio, middles);
        }
      }
    }
    if (wholeAt(play, since, palette, metrics, placed)) {
      fillAbout(breaks, made.shape.outline, placed, middles);
    } else {
      for (const shard of made.shards) {
        if (shardAt(shard, play, since, palette, metrics, placed)) {
          fillAbout(breaks, shard.points, placed, middles);
        }
      }
    }
    for (const tick of made.sparks) {
      if (sparkAt(tick, play, since, energy, metrics, body, hot)) {
        strokeStreak(sparks, body, middles);
        strokeStreak(sparks, hot, middles);
      }
    }
    for (const glint of made.glints) {
      if (glintAt(glint, play, since, palette, metrics, placed)) {
        fillAbout(sparks, GLINT_POINTS, placed, middles);
      }
    }
  }

  /** Draws a held hit's spark about each of its middles: its sparks and its four-point spark. */
  private drawHeldHit(
    play: HeldHitPlaying,
    since: number,
    metrics: FieldMetrics,
    energy: Energy,
  ): void {
    const { middles, placed, body, hot } = this;
    const sparks = this.sparkGraphics;
    for (const tick of play.ticks) {
      if (impactTickAt(tick, play.toward, since, energy, metrics, body, hot)) {
        strokeStreak(sparks, body, middles);
        strokeStreak(sparks, hot, middles);
      }
    }
    if (impactFlashAt(play.toward, since, energy, metrics, placed)) {
      fillAbout(sparks, IMPACT_POINTS, placed, middles);
    }
  }
}

/** Writes where a thing is drawn on the canvas, from a place on the field, and whether it is drawn there. */
function placeMiddle(
  middle: Middle,
  metrics: FieldMetrics,
  x: number,
  y: number,
  shown: boolean,
): void {
  toCanvas(metrics, x, y, middle);
  middle.shown = shown;
}

/** Returns a record a spark's line is written into. */
function streak(): Streak {
  return { fromX: 0, fromY: 0, toX: 0, toY: 0, width: 0, color: 0, alpha: 0 };
}

/** Returns whether a slot's rock, or the one last drawn in it, is of a kind and size. */
function isOf<T extends Pick<SlotSeen, "kind" | "size">>(
  rock: T | undefined,
  kind: RockKindId,
  size: RockSize,
): rock is T {
  return rock?.kind === kind && rock.size === size;
}

/**
 * Fills a polygon placed about each middle on the canvas it is shown at, as
 * triangles fanned from its own middle, each corner turned and scaled as it
 * is placed: a triangle as itself, and any other in triangles that meet
 * without overlapping, so one at part alpha blends once.
 */
function fillAbout(
  graphics: GameObjects.Graphics,
  points: readonly Point[],
  { x, y, turn, scale, color, alpha }: Readonly<Placed>,
  middles: Middles,
): void {
  graphics.fillStyle(color, alpha);
  const cos = Math.cos(turn) * scale;
  const sin = Math.sin(turn) * scale;
  const [a, b, c] = points;
  const triangle = points.length === 3 && a && b && c;
  for (const middle of middles) {
    if (!middle.shown) continue;
    const originX = middle.x + x;
    const originY = middle.y + y;
    if (triangle) {
      graphics.fillTriangle(
        originX + a.x * cos - a.y * sin,
        originY + a.x * sin + a.y * cos,
        originX + b.x * cos - b.y * sin,
        originY + b.x * sin + b.y * cos,
        originX + c.x * cos - c.y * sin,
        originY + c.x * sin + c.y * cos,
      );
      continue;
    }
    let last = points[points.length - 1];
    for (const point of points) {
      if (last) {
        graphics.fillTriangle(
          originX,
          originY,
          originX + last.x * cos - last.y * sin,
          originY + last.x * sin + last.y * cos,
          originX + point.x * cos - point.y * sin,
          originY + point.x * sin + point.y * cos,
        );
      }
      last = point;
    }
  }
}

/**
 * Fills a round placed about each middle on the canvas it is shown at, as
 * triangles that meet without overlapping, so one at part alpha blends
 * once.
 */
function fillRound(
  graphics: GameObjects.Graphics,
  { x, y, radius, color, alpha }: Readonly<Round>,
  pixelRatio: number,
  middles: Middles,
): void {
  graphics.fillStyle(color, alpha);
  const { fan } = roundOf(radius, ROUND_SAG.puff, pixelRatio);
  for (const middle of middles) {
    if (!middle.shown) continue;
    const originX = middle.x + x;
    const originY = middle.y + y;
    for (const [a, b, c] of fan) {
      graphics.fillTriangle(
        originX + a.x * radius,
        originY + a.y * radius,
        originX + b.x * radius,
        originY + b.y * radius,
        originX + c.x * radius,
        originY + c.y * radius,
      );
    }
  }
}

/**
 * Strokes a round placed about each middle on the canvas it is shown at, as
 * a band of triangles as wide as its line, centred on its radius as a
 * stroke is, that meet without overlapping.
 */
function strokeRound(
  graphics: GameObjects.Graphics,
  { x, y, radius, width, color, alpha }: Readonly<Round>,
  pixelRatio: number,
  middles: Middles,
): void {
  graphics.fillStyle(color, alpha);
  const outer = radius + width / 2;
  const inner = Math.max(0, radius - width / 2);
  const { sides } = roundOf(outer, ROUND_SAG.ring, pixelRatio);
  for (const middle of middles) {
    if (!middle.shown) continue;
    const originX = middle.x + x;
    const originY = middle.y + y;
    for (const [from, to] of sides) {
      const innerFromX = originX + from.x * inner;
      const innerFromY = originY + from.y * inner;
      const outerToX = originX + to.x * outer;
      const outerToY = originY + to.y * outer;
      graphics.fillTriangle(
        originX + from.x * outer,
        originY + from.y * outer,
        outerToX,
        outerToY,
        innerFromX,
        innerFromY,
      );
      graphics.fillTriangle(
        innerFromX,
        innerFromY,
        outerToX,
        outerToY,
        originX + to.x * inner,
        originY + to.y * inner,
      );
    }
  }
}

/** Strokes a spark's line about each middle on the canvas it is shown at. */
function strokeStreak(
  graphics: GameObjects.Graphics,
  { fromX, fromY, toX, toY, width, color, alpha }: Readonly<Streak>,
  middles: Middles,
): void {
  graphics.lineStyle(width, color, alpha);
  for (const middle of middles) {
    if (!middle.shown) continue;
    graphics.lineBetween(
      middle.x + fromX,
      middle.y + fromY,
      middle.x + toX,
      middle.y + toY,
    );
  }
}
