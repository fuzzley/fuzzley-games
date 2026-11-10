import type { CssRect } from "@fz/phaser/layout";
import type { ArtScale } from "@fz/phaser/shapes";

/**
 * Says what shape of field a room holds: its unit and its depth, and how
 * thick its floor's band and its lintel are, worked out between rounds.
 */
export interface FieldShape {
  /** A field unit, in whole device pixels. */
  readonly unit: number;
  /** How many rows the field is deep, 11 to 22. */
  readonly depth: number;
  /** How thick the floor's band is, in units: 0.6 to 1.1. */
  readonly band: number;
  /** How thick the lintel over the ceiling is, in units: 0.5 at least. */
  readonly lintel: number;
  /** Whether the room has space for a panel either side of the field. */
  readonly panels: boolean;
  /** Device pixels to a CSS pixel. */
  readonly pixelRatio: number;
}

/**
 * Says where the field lies on the canvas: its cells, nine units across and
 * its depth's down, from the ceiling to the floor, with the floor's band
 * under them and the lintel over them, as its shape says, and the panels
 * beside it.
 */
export interface FieldMetrics extends ArtScale {
  /** The cells' left edge, in whole device pixels. */
  readonly x: number;
  /** The cells' top edge, the ceiling, in whole device pixels. */
  readonly y: number;
  /** The cells' width, in device pixels. */
  readonly width: number;
  /** The cells' height, in device pixels. */
  readonly height: number;
  /** The cells, in CSS pixels. */
  readonly css: CssRect;
  /** Where the two panels lie, in CSS pixels, or null where the room has no space for them. */
  readonly panels: { readonly left: CssRect; readonly right: CssRect } | null;
}
