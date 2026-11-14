import { atlasFrameOf, bakeTexture } from "@fz/phaser/scene";
import type { GameObjects, Scene } from "phaser";
import type { Place } from "../../rules/levels/levels";
import type { BricksPalette } from "../../view/colors/palette";
import type { FieldMetrics } from "../../view/field/field_metrics";
import { PLACE_ART, fieldInks, placeTile } from "../../view/places/places";
import type { PaintContext, Painter } from "./painter";

/** The texture a place's tile is baked into, which the field is tiled with. */
export const PLACE_TEXTURE = "bricks-place";

/** Says what a place's tile was last baked for: the place, the scale and the palette. */
interface TileBake {
  readonly place: Place;
  readonly unit: number;
  readonly pixelRatio: number;
  readonly palette: BricksPalette;
}

/**
 * Tiles the field with its set's place, under the bricks, from the field's
 * top left corner: the tile baked at full strength and washed over the
 * field as strongly as the place shows there, so what the field's layer
 * draws under it, as the net, only takes a tint of it. It is baked again
 * only for a new place, a new unit or pixel ratio, or a new palette, and
 * laid again only as the field is laid out anew. It never moves of itself.
 */
export class PlacePainter implements Painter {
  readonly tiles: GameObjects.TileSprite;
  private baked: TileBake | null = null;
  private metrics: FieldMetrics | null = null;

  constructor(
    private readonly scene: Scene,
    layer: GameObjects.Layer,
  ) {
    // Phaser's empty texture, which draws nothing, until the first frame
    // bakes the tile.
    this.tiles = scene.add.tileSprite(0, 0, 0, 0, "__DEFAULT").setOrigin(0);
    layer.add(this.tiles);
  }

  /** Tiles the field with the place the frame is in, baking its tile again where it changed. */
  draw({ place, metrics, palette }: Readonly<PaintContext>): void {
    const { unit, pixelRatio } = metrics;
    const baked = this.baked;
    if (
      baked?.place !== place ||
      baked.unit !== unit ||
      baked.pixelRatio !== pixelRatio ||
      baked.palette !== palette
    ) {
      this.bake({ place, unit, pixelRatio, palette });
    }
    if (metrics !== this.metrics) {
      this.metrics = metrics;
      this.tiles
        .setPosition(metrics.x, metrics.y)
        .setSize(metrics.width, metrics.height);
    }
  }

  /**
   * Bakes a place's tile at a scale, in a palette's inks, into a texture
   * of its own, and has the tiles show it as strongly as the place shows
   * over the field.
   *
   * The texture is made anew, rather than drawn over, as Phaser's canvas
   * renderer copies a tile sprite's frame only when it is handed another.
   */
  private bake(bake: TileBake): void {
    this.baked = bake;
    const tile = placeTile(bake.place, bake, fieldInks(bake.palette));
    const { draw } = atlasFrameOf({ name: PLACE_TEXTURE, ...tile });
    const { textures } = this.scene;
    if (textures.exists(PLACE_TEXTURE)) textures.remove(PLACE_TEXTURE);
    bakeTexture(this.scene, PLACE_TEXTURE, tile.width, tile.height, draw);
    this.tiles.setTexture(PLACE_TEXTURE).setAlpha(PLACE_ART[bake.place].field);
  }
}
