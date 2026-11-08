import { clamp } from "@fz/core/math";
import { onContextRestored } from "@fz/phaser/scene";
import { type GameObjects, type Scene, Textures } from "phaser";
import type { Moving } from "../../rules/torus";
import {
  type PointsFont,
  type PointsLayout,
  type PointsLettering,
  type PointsSheet,
  layOutPoints,
  letteringUnit,
  pointsLayout,
  pointsSheet,
} from "../../view/art/points_art";
import type { BeltPalette } from "../../view/colors/palette";
import {
  MOST_POINTS_CHARACTERS,
  fadeAlpha,
  pointsLabel,
  riseOf,
  shareDone,
} from "../../view/effects/flourish";
import { POINTS_MS } from "../../view/effects/timing";
import { toCanvas } from "../../view/field/field_metrics";
import type { FieldEvent } from "../../view/field/frame";
import { POINTS_ATLAS, PointsAtlas } from "../points_atlas";
import type { PaintContext, Painter } from "./painter";
import { type Playing, Turns } from "./turns";

/** How many points may show at once: a blast scores a crowd of rocks at once. */
const POOL = 12;

/** The sheet's texture key, which each label of points is stamped on and shown from. */
export const POINTS_SHEET = "belt-points-labels";

/** How a character's frame is stamped on the sheet: from its top left corner. */
const STAMP = { originX: 0, originY: 0 } as const;

/** Describes points scored, showing from a time at the place they were scored. */
export interface Scored extends Playing {
  /** What they read, as "+40 ×2", or nothing before they first show. */
  label: string;
  /** Whether they wait to be stamped on the sheet, as they show or the points are lettered anew. */
  unstamped: boolean;
  /** Where each of its characters lies, as last stamped. */
  readonly layout: PointsLayout;
  /** Where its middle lies on the canvas, written each frame it shows. */
  readonly middle: Moving;
  /** Its room on the sheet, by its place in the sheet's rooms. */
  readonly room: number;
  /** Names the sheet's frame it shows: its box in its room. */
  readonly frame: string;
  /** Shows it, the label whole, stamped on the sheet. */
  readonly image: GameObjects.Image;
}

/**
 * Draws the points scored where they were scored, in the page's font,
 * outlined in the field's color so they read over whatever lies under them,
 * rising as they fade where motion is welcome, and kept whole inside the
 * field.
 *
 * Each label is stamped once, as it shows, from the points' atlas onto a
 * room of its own on a sheet, every outline and then every fill, as a canvas
 * strokes a line and then fills it, so it shows and fades as one picture, as
 * a `Text` does, though no canvas is drawn or uploaded.
 */
export class PointsPainter implements Painter {
  readonly scored: Turns<Scored>;

  /** Letters the points into their atlas. */
  private readonly atlas: PointsAtlas;
  /** The texture each label is stamped on. */
  private readonly sheet: Textures.DynamicTexture;
  /** How the sheet is laid out, for the points as last lettered. */
  private sheetPlan: PointsSheet | null = null;
  /** How the points were last lettered, or null where they must be lettered anew. */
  private lettered: PointsLettering | null = null;
  /** The font and the palette they were last lettered in. */
  private letteredFor: PointsFont | null = null;
  private letteredIn: BeltPalette | null = null;

  constructor(scene: Scene, layer: GameObjects.Layer) {
    this.atlas = new PointsAtlas(scene);
    this.sheet = dynamicTexture(scene, POINTS_SHEET);
    let rooms = 0;
    this.scored = new Turns(POOL, () => {
      const room = rooms++;
      return {
        label: "",
        unstamped: false,
        layout: pointsLayout(MOST_POINTS_CHARACTERS),
        middle: { x: 0, y: 0 },
        room,
        frame: `points-label-${String(room)}`,
        image: scene.add.image(0, 0, POINTS_SHEET).setVisible(false),
        at: -Infinity,
        x: 0,
        y: 0,
      };
    });
    layer.add(this.scored.all.map(({ image }) => image));
    // The sheet's stamps go with a lost context; the atlas is written anew.
    onContextRestored(scene, () => {
      this.lettered = null;
    });
  }

  /** How the points were last lettered, or null before they first are. */
  get lettering(): PointsLettering | null {
    return this.lettered;
  }

  /** Shows the points an event scored where it scored them, stamped as the frame draws. */
  show(event: Readonly<FieldEvent>, now: number): void {
    const scored = this.scored.play(event.x, event.y, now);
    scored.label = pointsLabel(event);
    scored.unstamped = true;
  }

  /** Hides every label, as a new field starts. */
  start(): void {
    for (const scored of this.scored.all) scored.at = -Infinity;
  }

  /**
   * Letters the points anew on a new font, palette or whole unit, stamps the
   * labels that wait, and moves each label on to the scene's time, rising
   * and fading, or hides it once it is over.
   */
  draw({ metrics, palette, font, now, motion }: Readonly<PaintContext>): void {
    const unit = letteringUnit(metrics.unit);
    const lettering =
      this.lettered?.unit === unit &&
      palette === this.letteredIn &&
      font === this.letteredFor
        ? this.lettered
        : this.letter(font, unit, palette);
    const zoom = metrics.unit / unit;
    let stamped = false;
    for (const scored of this.scored.all) {
      const { layout, middle, image } = scored;
      const done = shareDone(scored.at, now, POINTS_MS);
      image.setVisible(done < 1);
      if (done === 1) continue;
      if (scored.unstamped) {
        this.stamp(scored, lettering);
        stamped = true;
      }
      toCanvas(metrics, scored.x, scored.y - riseOf(done, motion), middle);
      const width = layout.width * zoom;
      const height = layout.height * zoom;
      middle.x = within(middle.x, width, metrics.x, metrics.width);
      middle.y = within(middle.y, height, metrics.y, metrics.height);
      image
        .setPosition(middle.x, middle.y)
        // Its frame is its box cut to whole pixels, as a `Text`'s canvas is,
        // and stretched back to its box, as a `Text`'s is.
        .setDisplaySize(width, height)
        .setAlpha(fadeAlpha(done));
    }
    if (stamped) this.sheet.render();
  }

  /**
   * Letters the points in a font at a unit, in a palette, lays the sheet out
   * for them, and has every label stamped anew.
   */
  private letter(
    font: PointsFont,
    unit: number,
    palette: BeltPalette,
  ): PointsLettering {
    const lettering = this.atlas.bake(font.family, unit, palette);
    const plan = pointsSheet(lettering, POOL, MOST_POINTS_CHARACTERS);
    this.sheet.setSize(plan.width, plan.height);
    this.sheetPlan = plan;
    this.lettered = lettering;
    this.letteredFor = font;
    this.letteredIn = palette;
    for (const scored of this.scored.all) {
      scored.unstamped = true;
      // Each takes up its frame again, as every image does after a bake, so
      // none keeps a size its frame no longer has: one never stamped shows
      // the sheet whole.
      scored.image.setFrame(scored.image.frame.name);
    }
    return lettering;
  }

  /**
   * Stamps a label on its room of the sheet: every character's outline, then
   * every fill, from the atlas, and has its image show its box.
   */
  private stamp(scored: Scored, lettering: PointsLettering): void {
    const { sheetPlan, sheet } = this;
    const room = sheetPlan?.rooms[scored.room];
    if (!sheetPlan || !room) {
      throw new RangeError("The sheet has no room for it.");
    }
    const { layout } = scored;
    layOutPoints(scored.label, lettering, layout);
    const left = room.x + sheetPlan.boxX;
    const top = room.y + sheetPlan.boxY;
    sheet.clear(room.x, room.y, room.width, room.height);
    stampEach(sheet, layout.outlines, layout, left, top);
    stampEach(sheet, layout.fills, layout, left, top);
    const height = Math.floor(layout.height);
    if (sheet.has(scored.frame)) {
      sheet.get(scored.frame).setSize(layout.width, height, left, top);
    } else {
      sheet.add(scored.frame, 0, left, top, layout.width, height);
    }
    scored.image.setFrame(scored.frame);
    scored.unstamped = false;
  }
}

/**
 * Stamps a frame of the points' atlas for each of a label's characters that
 * has one, where its layout lays it from its box's top left corner.
 */
function stampEach(
  sheet: Textures.DynamicTexture,
  frames: readonly (string | null)[],
  { length, xs, ys }: Readonly<PointsLayout>,
  left: number,
  top: number,
): void {
  for (let i = 0; i < length; i++) {
    const frame = frames[i];
    if (!frame) continue;
    sheet.stamp(
      POINTS_ATLAS,
      frame,
      left + (xs[i] ?? 0),
      top + (ys[i] ?? 0),
      STAMP,
    );
  }
}

/**
 * Returns the dynamic texture of a key: the one there, which an earlier scene
 * of the game may have made, or a new one.
 */
function dynamicTexture(scene: Scene, key: string): Textures.DynamicTexture {
  const textures = scene.textures;
  const existing = textures.exists(key) ? textures.get(key) : null;
  if (existing instanceof Textures.DynamicTexture) return existing;
  if (existing) textures.remove(key);
  const made = textures.addDynamicTexture(key, 2, 2);
  if (!made) throw new Error(`The texture "${key}" could not be made.`);
  return made;
}

/**
 * Returns where a label's middle lies along an axis, moved in from an edge so
 * all of it, so long, lies within a span from a start.
 */
function within(
  middle: number,
  length: number,
  start: number,
  span: number,
): number {
  return clamp(middle, start + length / 2, start + span - length / 2);
}
