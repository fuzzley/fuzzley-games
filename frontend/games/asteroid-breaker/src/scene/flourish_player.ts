import { type Flourish, holdMsOf } from "../view/effects/effects";
import {
  flashDue,
  ringColorOf,
  ringReachOf,
  wayOf,
} from "../view/effects/flourish";
import { BURST_SHARDS } from "../view/effects/timing";
import type { FieldEvent } from "../view/field/frame";
import type { FieldCamera } from "./field_camera";
import type { BlastPainter } from "./painters/blast_painter";
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
 * is laid out and painted, and the scene's time, as the scene's
 * `PaintContext` has them.
 */
export type FlourishStage = Pick<
  PaintContext,
  "field" | "metrics" | "palette" | "zoom" | "now" | "motion"
>;

/**
 * Plays each flourish on what shows it: the painter that draws it from then
 * on, frame by frame, or the field's camera, and keeps the field's flashes
 * apart, whatever flashes: one each `FLASH_GAP_MS` at most.
 */
export class FlourishPlayer {
  /** When the field last flashed, in milliseconds, or −Infinity before it first did. */
  private flashedAt = -Infinity;

  constructor(private readonly painters: FlourishPainters) {}

  /** Forgets the last flash, as a new field starts. */
  start(): void {
    this.flashedAt = -Infinity;
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
    { field, metrics, palette, zoom, now, motion }: Readonly<FlourishStage>,
  ): void {
    const {
      debris,
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
        return;
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
      case "ring":
        rings.ring(x, y, ringReachOf(event), ringColorOf(event, palette), now);
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
          strays.bailOut(x, y, event.pilot, wayOf(event.serial), now);
        }
        return;
      case "shake":
        camera.shake(event.wayX, event.wayY, holdMsOf(event), now);
        return;
    }
  }
}
