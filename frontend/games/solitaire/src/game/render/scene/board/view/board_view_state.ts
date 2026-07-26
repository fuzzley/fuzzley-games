import { Point } from "@/game/common/point";
import { PileType } from "@/game/model/card/card_pile";

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
  /** Uniform sprite scale factor. */
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

/** The desired presentation of a pile's background placeholder for one frame. */
export interface PileBackgroundView {
  /** The unique id of the pile the background belongs to. */
  pileId: string;
  /** The role/type of the pile. */
  pileType: PileType;
  /** The index of the pile (for foundation or tableau), if applicable. */
  pileIndex?: number;
  /** Absolute target x in screen pixels. */
  x: number;
  /** Absolute target y in screen pixels. */
  y: number;
  /** Uniform sprite scale factor. */
  scale: number;
  /** Render depth (backgrounds sit below their cards). */
  depth: number;
  /** The hover cursor to show over the background, when meaningful. */
  cursor?: "pointer" | "default";
}

/** The hover highlight border to draw for one frame, or null for none. */
export interface HighlightView {
  /** Absolute left edge in screen pixels. */
  x: number;
  /** Absolute top edge in screen pixels. */
  y: number;
  /** Card width in screen pixels. */
  width: number;
  /** Card height in screen pixels. */
  height: number;
  /** The layout scale, used to size the border thickness and radius. */
  scale: number;
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
export interface BoardViewState {
  /** Target transforms for every pile background placeholder. */
  backgrounds: PileBackgroundView[];
  /** Target presentation for every card. */
  cards: CardView[];
  /** The hover highlight to draw, or null when nothing is highlighted. */
  highlight: HighlightView | null;
}

/** A card stack currently being dragged, with its primary sprite's position. */
export interface DragInteraction {
  /** The dragged card ids, primary (grabbed) card first, then those above it. */
  cardIds: string[];
  /** The current absolute position of the primary dragged card. */
  primary: Point;
}

/**
 * The transient, pointer-driven interaction state the view depends on. Combined
 * with the model, this is the complete input to {@link BoardViewState}.
 */
export interface BoardInteractionState {
  /** The id of the currently hovered card, or null. */
  hoveredCardId: string | null;
  /** Whether the stock background placeholder is hovered. */
  isStockBackgroundHovered: boolean;
  /** The active drag, or null when nothing is being dragged. */
  drag: DragInteraction | null;
  /**
   * When true every card snaps to its target this frame instead of easing. Set
   * for the first render and after a reset or resize so cards do not slide in
   * from stale positions.
   */
  snapAll: boolean;
}
