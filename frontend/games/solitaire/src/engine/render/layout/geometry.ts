/** Represents a 2D point on the board. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Holds a width and height in design units. */
export interface Size {
  width: number;
  height: number;
}

/** Describes a rectangle in screen coordinates. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
