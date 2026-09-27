import { Point } from "@/engine/core/common/point";

/** Describes the area the board is laid out within, in device pixels. */
export interface Viewport {
  /** Available width in device pixels. */
  width: number;
  /** Available height in device pixels. */
  height: number;
  /**
   * Device pixels per CSS pixel, which converts a measurement taken from the
   * DOM, such as the header's height, to match the canvas.
   */
  pixelRatio: number;
}

/** Describes the placeholder a pile is drawn over, fixed for a board's life. */
export interface PileBackgroundSpec {
  /** The pile it sits beneath. */
  readonly pileId: string;
  /** The artwork key it is drawn from. */
  readonly frame: string;
  /** Whether pressing the empty slot does something, making it clickable. */
  readonly actionable: boolean;
}

/** Describes a rectangle in screen coordinates. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Describes the screen rectangle a pile occupies. */
export interface PileGeometry extends Rect {
  /** The unique id of the pile this geometry belongs to. */
  pileId: string;
}

/** Describes how one card should look for one frame. */
export interface CardView {
  /** The card's unique id. */
  cardId: string;
  /** Absolute target x in screen pixels. */
  x: number;
  /** Absolute target y in screen pixels. */
  y: number;
  /**
   * Sprite scale from atlas texels to device pixels: the layout scale divided
   * by `CARD_ART_SCALE`.
   */
  scale: number;
  /** Render depth (higher draws on top). */
  depth: number;
  /** The atlas frame to display: the face key when face up, else the back. */
  frame: string;
  /** The hover cursor to show over the card. */
  cursor: "pointer" | "default";
  /** Whether the card can currently be dragged. */
  draggable: boolean;
  /** Whether to jump straight to the target instead of easing. */
  snap: boolean;
}

/** Describes how a pile's empty placeholder should look for one frame. */
export interface PileBackgroundView {
  /** The unique id of the pile the background belongs to. */
  pileId: string;
  /** Absolute target x in screen pixels. */
  x: number;
  /** Absolute target y in screen pixels. */
  y: number;
  /** Uniform sprite scale factor, mapping atlas texels to device pixels. */
  scale: number;
  /** Render depth (backgrounds sit below their cards). */
  depth: number;
  /** The hover cursor to show over the background, when meaningful. */
  cursor?: "pointer" | "default";
}

/** Says what a highlight border is drawn around. */
export type HighlightAnchor =
  /** Follows a card's sprite, wherever it currently is. */
  | { kind: "card"; cardId: string }
  /** A fixed top-left corner, for borders drawn around a pile slot. */
  | { kind: "point"; x: number; y: number };

/** Describes a highlight border to draw for one frame. */
export interface HighlightView {
  /** What the border is drawn around. */
  anchor: HighlightAnchor;
  /** Border width in screen pixels. */
  width: number;
  /** Border height in screen pixels. */
  height: number;
  /** The layout scale, used to size the border thickness and radius. */
  scale: number;
  /** Render depth (higher draws on top). */
  depth: number;
  /**
   * Whether to leave the bottom edge open, so the border does not cross a card
   * stacked on top.
   */
  openBottom: boolean;
}

/** Describes how the whole board should look for one frame. */
export interface TableViewState {
  /** Target transforms for every pile background placeholder. */
  backgrounds: PileBackgroundView[];
  /** Target presentation for every card. */
  cards: CardView[];
  /** The highlight borders to draw, back to front. */
  highlights: HighlightView[];
}

/** Describes the stack being dragged and where the grabbed card is. */
export interface DragInteraction {
  /** The dragged card ids, primary (grabbed) card first, then those above it. */
  cardIds: string[];
  /** The current absolute position of the primary dragged card. */
  primary: Point;
}

/**
 * Names a stack easing across the board to the pile it was just moved to, so
 * it is drawn above the board until it lands.
 */
export interface FlightInteraction {
  /** The flying card ids, bottom card of the moved stack first. */
  cardIds: string[];
}

/**
 * Holds the pointer-driven state that, with the model, decides the
 * {@link TableViewState}.
 */
export interface TableInteractionState {
  /** The card under the mouse or last touched by a finger, or null. */
  hoveredCardId: string | null;
  /** The pile whose background placeholder is hovered, or null. */
  hoveredBackgroundPileId: string | null;
  /** The active drag, or null when nothing is being dragged. */
  drag: DragInteraction | null;
  /** The stacks still crossing the board, oldest first. */
  flights: readonly FlightInteraction[];
  /**
   * Whether every card snaps to its target this frame instead of easing, as
   * after a reset or resize.
   */
  snapAll: boolean;
}
