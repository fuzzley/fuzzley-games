import { ROCK_RADIUS } from "../rules/tuning";
import { rockColor } from "../view/art/rock_art";
import { type Flourish, rockKindOf, rockSizeOf } from "../view/effects/effects";
import {
  ringColorOf,
  ringReachOf,
  shardCount,
  wayOf,
} from "../view/effects/flourish";
import { BURST_SHARDS } from "../view/effects/timing";
import type { FieldEvent } from "../view/field/frame";
import type { FieldCamera } from "./field_camera";
import type { DebrisPainter } from "./painters/debris_painter";
import type { PaintContext } from "./painters/painter";
import type { PointsPainter } from "./painters/points_painter";
import type { RingPainter } from "./painters/ring_painter";
import type { RockPainter } from "./painters/rock_painter";
import type { StrayPainter } from "./painters/stray_painter";
import type { TrailPainter } from "./painters/trail_painter";

/** Holds what the flourishes play on: the painters that draw them, and the field's camera. */
export interface FlourishPainters {
  readonly debris: DebrisPainter;
  readonly rings: RingPainter;
  readonly trail: TrailPainter;
  readonly rocks: RockPainter;
  readonly points: PointsPainter;
  readonly strays: StrayPainter;
  readonly camera: FieldCamera;
}

/**
 * Says what a flourish plays from: the field it happened on, how the field
 * is laid out and painted, and the scene's time, as the scene's
 * `PaintContext` has them.
 */
export type FlourishStage = Pick<
  PaintContext,
  "field" | "metrics" | "palette" | "zoom" | "now"
>;

/**
 * Plays each flourish on what shows it: the painter that draws it from then
 * on, frame by frame, or the field's camera.
 */
export class FlourishPlayer {
  constructor(private readonly painters: FlourishPainters) {}

  /** Plays one of an event's flourishes, as the stage stands. */
  play(
    flourish: Flourish,
    event: Readonly<FieldEvent>,
    { field, metrics, palette, zoom, now }: Readonly<FlourishStage>,
  ): void {
    const { debris, rings, trail, rocks, points, strays, camera } =
      this.painters;
    const { x, y } = event;
    switch (flourish) {
      case "shards":
        debris.shatter(
          x,
          y,
          rockColor(rockKindOf(event), palette),
          shardCount(event.serial),
          metrics,
          zoom,
        );
        return;
      case "dust":
        debris.puff(
          x,
          y,
          ROCK_RADIUS[rockSizeOf(event)],
          rockColor(rockKindOf(event), palette),
          now,
        );
        return;
      case "kick":
        camera.kick(event.wayX, event.wayY, now);
        return;
      case "flash":
        rocks.flashSlot(event.slot, now);
        return;
      case "spark":
        debris.spark(
          x,
          y,
          ROCK_RADIUS[rockSizeOf(event)],
          wayOf(event.serial),
          palette.flame,
          now,
        );
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
        camera.shake(now);
        return;
    }
  }
}
