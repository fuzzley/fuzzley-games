import { Point } from "@/engine/core/common/point";

/**
 * The available drawable area, in device pixels, the board is laid out within.
 * Supplied by the scene each frame so layout is a pure function of the model
 * plus the viewport and never reads live sprite state.
 */
export interface Viewport {
  /** Available width in device pixels. */
  width: number;
  /** Available height in device pixels. */
  height: number;
  /**
   * Device pixels per CSS pixel. The canvas is sized in device pixels so cards
   * rasterize at the display's true resolution, which makes {@link width} and
   * {@link height} a {@link pixelRatio} multiple of the CSS layout size. Layout
   * measurements that come from the DOM rather than the canvas (the header bar
   * overlay) are in CSS pixels and must be scaled by this to match.
   */
  pixelRatio: number;
}

/** A rectangle in absolute screen coordinates. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The absolute screen rectangle a pile occupies, tagged with its pile id. */
export interface PileGeometry extends Rect {
  /** The unique id of the pile this geometry belongs to. */
  pileId: string;
}

/**
 * The complete desired presentation of a single card for one frame: an absolute
 * target transform plus its frame, cursor, and draggability. Derived purely from
 * the model and interaction state, then reconciled onto the Phaser sprite.
 */
export interface CardView {
  /** The card's unique id (also its texture atlas frame when face up). */
  cardId: string;
  /** Absolute target x in screen pixels. */
  x: number;
  /** Absolute target y in screen pixels. */
  y: number;
  /**
   * Uniform sprite scale factor, mapping atlas texels to device pixels. The
   * artwork is authored larger than a card is drawn, so this is the layout
   * scale divided by the art scale, not the layout scale itself.
   */
  scale: number;
  /** Render depth (higher draws on top). */
  depth: number;
  /** The atlas frame to display (face id when face up, else the card back). */
  frame: string;
  /** The hover cursor to show over the card. */
  cursor: "pointer" | "default";
  /** Whether the card can currently be dragged. */
  draggable: boolean;
  /** When true the applier snaps to the target immediately instead of easing. */
  snap: boolean;
}

/**
 * The desired presentation of a pile's background placeholder for one frame.
 *
 * Identified by pile id alone: the applier looks the sprite up by that id, so
 * there is no pile type to branch on and no index that could go missing.
 */
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

/**
 * What a highlight border is drawn around.
 *
 * A card anchor names the card rather than fixing a position, so the applier
 * can put the border wherever that card's sprite has actually eased to. A card
 * on its way to a new pile is not yet where the layout says it belongs, and a
 * border placed at the destination would arrive without it.
 */
export type HighlightAnchor =
  /** Follows a card's sprite, wherever it currently is. */
  | { kind: "card"; cardId: string }
  /** A fixed top-left corner, for borders drawn around a pile slot. */
  | { kind: "point"; x: number; y: number };

/** A highlight border to draw for one frame. */
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
   * When true the bottom edge is left open (the card is covered by another), so
   * the border never draws a line across the card stacked on top.
   */
  openBottom: boolean;
}

/**
 * The full desired presentation of the board for one frame. Produced by the
 * pure view-state builder and consumed by the applier; nothing here references
 * Phaser, so it can be asserted directly in unit tests.
 */
export interface TableViewState {
  /** Target transforms for every pile background placeholder. */
  backgrounds: PileBackgroundView[];
  /** Target presentation for every card. */
  cards: CardView[];
  /**
   * The highlight borders to draw, back to front, or empty when nothing is
   * highlighted. A drag draws two: the pile the stack would land on, and the
   * dragged card itself.
   */
  highlights: HighlightView[];
}

/** A card stack currently being dragged, with its primary sprite's position. */
export interface DragInteraction {
  /** The dragged card ids, primary (grabbed) card first, then those above it. */
  cardIds: string[];
  /** The current absolute position of the primary dragged card. */
  primary: Point;
}

/**
 * A card stack easing across the board to the pile it was just moved to.
 *
 * The model moves a card the moment the move is made, so the sprites are left
 * behind at the old pile and ease to the new one over the following frames. The
 * cards are named here for as long as that takes, because a card in the air
 * belongs above the whole board rather than at the depth of the pile it is
 * still on its way to.
 */
export interface FlightInteraction {
  /** The flying card ids, bottom card of the moved stack first. */
  cardIds: string[];
}

/**
 * The transient, pointer-driven interaction state the view depends on. Combined
 * with the model, this is the complete input to {@link TableViewState}.
 */
export interface TableInteractionState {
  /**
   * The id of the card the pointer is examining, or null.
   *
   * The card under the mouse, or — since a finger cannot hover — the card a
   * finger last touched, which stays named until another is touched or the
   * bare table is pressed. That is what lets a tap open a fan and leave it
   * open long enough to read, rather than for as long as the finger is in the
   * way of what it uncovered.
   */
  hoveredCardId: string | null;
  /**
   * The pile whose background placeholder is hovered, or null.
   *
   * A pile id rather than a flag for the stock: which empty slots respond to a
   * click is a property the zones declare, and a game may have more than one.
   */
  hoveredBackgroundPileId: string | null;
  /** The active drag, or null when nothing is being dragged. */
  drag: DragInteraction | null;
  /**
   * The stacks still crossing the board, oldest first, or empty when none is.
   *
   * A list rather than one stack because actions overlap: a card double-pressed
   * to a foundation is still in the air when the next one is sent after it, and
   * a single slot would drop the first out of the air to make room.
   */
  flights: readonly FlightInteraction[];
  /**
   * When true every card snaps to its target this frame instead of easing. Set
   * for the first render and after a reset or resize so cards do not slide in
   * from stale positions.
   */
  snapAll: boolean;
}
