import type { Moving } from "../rules/torus";
import { farthestCorner } from "../view/effects/cleared";
import { type Flourish, holdMsOf } from "../view/effects/effects";
import {
  bailOutWayOf,
  flashDue,
  ringColorOf,
  ringOf,
} from "../view/effects/flourish";
import { FlourishClock } from "../view/effects/flourish_clock";
import { BURST_SHARDS, SLOWED_MS, SLOW_MS } from "../view/effects/timing";
import type { FieldEvent } from "../view/field/frame";
import type { FieldCamera } from "./field_camera";
import type { BlastPainter } from "./painters/blast_painter";
import type { BoulderPainter } from "./painters/boulder_painter";
import type { DebrisPainter } from "./painters/debris_painter";
import type { MuzzlePainter } from "./painters/muzzle_painter";
import type { PaintContext } from "./painters/painter";
import type { PointsPainter } from "./painters/points_painter";
import type { RingPainter } from "./painters/ring_painter";
import type { RockPainter } from "./painters/rock_painter";
import type { StrayPainter } from "./painters/stray_painter";
import type { TrailPainter } from "./painters/trail_painter";

/** Holds what the flourishes play on: the painters that draw them, and the field's camera. */
export interface FlourishPainters {
  readonly debris: DebrisPainter;
  readonly boulders: BoulderPainter;
  readonly blasts: BlastPainter;
  readonly rings: RingPainter;
  readonly trail: TrailPainter;
  readonly rocks: RockPainter;
  readonly points: PointsPainter;
  readonly strays: StrayPainter;
  readonly muzzle: MuzzlePainter;
  readonly camera: FieldCamera;
}

/**
 * Says what a flourish plays from: the field it happened on, how the field
 * is laid out and painted, the scene's time, and whether the wave is its
 * sector's last, as the scene's `PaintContext` has them.
 */
export type FlourishStage = Pick<
  PaintContext,
  "field" | "metrics" | "palette" | "zoom" | "now" | "motion" | "endsSector"
>;

/**
 * Plays each flourish on what shows it: the painter that draws it from then
 * on, frame by frame, the field's camera, or the flourishes' own clock,
 * which it keeps; and keeps the field's flashes apart, whatever flashes:
 * one each `FLASH_GAP_MS` at most.
 */
export class FlourishPlayer {
  /** The flourishes' time, which the scene takes each frame from the page's. */
  readonly clock = new FlourishClock();
  /** When the field last flashed, in milliseconds, or −Infinity before it first did. */
  private flashedAt = -Infinity;
  /** Where the field's last rock broke, which the wave's ring crosses the field from. */
  private readonly broke: Moving = { x: 0, y: 0 };
  /** Whether a rock has broken on the field. */
  private hasBroken = false;

  constructor(private readonly painters: FlourishPainters) {}

  /** Forgets the last flash and the last break, and ends a slow, as a new field starts. */
  start(): void {
    this.flashedAt = -Infinity;
    this.hasBroken = false;
    this.clock.start();
  }

  /** Returns whether the field may flash now, the last flash far enough past, and if so notes that it flashes. */
  private flashes(now: number): boolean {
    if (!flashDue(this.flashedAt, now)) return false;
    this.flashedAt = now;
    return true;
  }

  /** Plays one of an event's flourishes, as the stage stands. */
  play(
    flourish: Flourish,
    event: Readonly<FieldEvent>,
    {
      field,
      metrics,
      palette,
      zoom,
      now,
      motion,
      endsSector,
    }: Readonly<FlourishStage>,
  ): void {
    const {
      debris,
      boulders,
      blasts,
      rings,
      trail,
      rocks,
      points,
      strays,
      muzzle,
      camera,
    } = this.painters;
    const { x, y } = event;
    switch (flourish) {
      case "muzzle":
        muzzle.fire(now);
        return;
      case "break":
        debris.breakRock(event, field, now);
        this.broke.x = x;
        this.broke.y = y;
        this.hasBroken = true;
        return;
      case "boulder":
        boulders.breakBoulder(event, now);
        return;
      case "slow":
        if (endsSector) this.clock.slow();
        return;
      case "wave": {
        const from = this.hasBroken ? this.broke : event;
        // The ring starts as long after the last rock as the slow lasts,
        // slowed or not, so it is gone as the Cleared card opens.
        rings.wave(
          from.x,
          from.y,
          farthestCorner(from.x, from.y, field.torus),
          now + (endsSector ? SLOWED_MS : SLOW_MS),
        );
        return;
      }
      case "kick":
        camera.kick(event.wayX, event.wayY, now);
        return;
      case "flash":
        if (this.flashes(now)) rocks.flashSlot(event.slot, now);
        return;
      case "blast":
        blasts.blast(event, motion && this.flashes(now), now);
        return;
      case "spark":
        debris.holdHit(event, field, palette, now);
        return;
      case "ring": {
        const { reach, wraps } = ringOf(event);
        rings.ring(x, y, reach, ringColorOf(event, palette), wraps, now);
        return;
      }
      case "mark":
        rings.mark(x, y, ringOf(event).reach, palette.accent, now);
        return;
      case "points":
        points.show(event, now);
        return;
      case "trail":
        trail.lay(x, y, event.wayX, event.wayY, field.steps);
        return;
      case "burst":
        debris.shatter(x, y, palette.accent, BURST_SHARDS, metrics, zoom);
        return;
      case "bailout":
        if (event.pilot !== null) {
          strays.bailOut(x, y, event.pilot, bailOutWayOf(event.serial), now);
        }
        return;
      case "shake":
        camera.shake(event.wayX, event.wayY, holdMsOf(event), now);
        return;
    }
  }
}
