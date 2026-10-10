import type { GameObjects, Scene } from "phaser";

import { RenderLayer, depthFor } from "../../view/render_layers";

/**
 * The light that falls on the felt: full above the middle of the board, where
 * the cards are, and darkening towards its edges.
 */
export const TABLE_LIGHT = {
  /** Where the light centres, as fractions of the board's width and height. */
  centre: { x: 0.5, y: 0.32 },
  /**
   * The radii of the ellipse it fades across, as fractions of the board's
   * width and height.
   */
  radii: { x: 1.25, y: 1.05 },
  /**
   * How far towards the ellipse the felt stays fully lit, as a fraction of the
   * way there.
   */
  litTo: 0.38,
  /** How dark the felt is at the ellipse and beyond: black at this opacity. */
  rimAlpha: 0.38,
} as const;

/** The gradient's shape modes and repeat modes, as Phaser numbers them. */
const RADIAL = 2;
const EXTEND = 0;

/**
 * Paints the light on the felt beneath everything on the table, so it darkens
 * the felt but never a card or a placeholder.
 */
export class TableLight {
  private readonly gradient: GameObjects.Gradient;

  /** Creates the light in a scene; it covers nothing until {@link fit}. */
  constructor(scene: Pick<Scene, "add">) {
    const transparent = [0, 0, 0, 0];
    this.gradient = scene.add.gradient(
      {
        bands: [
          { start: 0, end: TABLE_LIGHT.litTo, colorStart: transparent },
          {
            start: TABLE_LIGHT.litTo,
            end: 1,
            colorStart: transparent,
            colorEnd: [0, 0, 0, TABLE_LIGHT.rimAlpha],
          },
        ],
        shapeMode: RADIAL,
        repeatMode: EXTEND,
        // A circle in the gradient's own coordinates, reaching its quad's edge.
        start: { x: 0.5, y: 0.5 },
        shape: { x: 0.5, y: 0 },
        // A darkening this gentle would otherwise band.
        dither: true,
      },
      0,
      0,
      0,
      0,
    );
    this.gradient.setOrigin(0.5, 0.5);
    this.gradient.setDepth(depthFor(RenderLayer.TABLE_LIGHT));
  }

  /** Spreads the light over a board of a size, in device pixels. */
  fit(width: number, height: number): void {
    const { centre, radii } = TABLE_LIGHT;
    // The gradient is a circle in its quad's coordinates, so a quad twice the
    // ellipse's radii on each axis stretches it into the ellipse.
    this.gradient.setPosition(centre.x * width, centre.y * height);
    this.gradient.setSize(2 * radii.x * width, 2 * radii.y * height);
    // Phaser works the origin out in pixels when it is set, not on a resize.
    this.gradient.updateDisplayOrigin();
  }

  /** Removes the light, and the colour ramp it drew from, from the scene. */
  destroy(): void {
    this.gradient.destroy();
  }
}
