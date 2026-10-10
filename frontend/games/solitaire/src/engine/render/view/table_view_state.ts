/** Describes the placeholder a pile is drawn over, as the board is built. */
export interface PileBackgroundSpec {
  /**
   * The pile it sits beneath, which keeps it for the board's life: a pile
   * without one never gets one.
   */
  readonly pileId: string;
  /** The artwork key it is first drawn from, until a view says otherwise. */
  readonly frame: string;
  /**
   * Whether pressing the empty slot can ever do something, making it
   * clickable. Each frame's {@link PileBackgroundView.cursor} says whether it
   * does now.
   */
  readonly actionable: boolean;
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
   * The layout scale, from design units to device pixels, which the renderer
   * divides by the density of the atlas it draws from.
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
  /** The layout scale, as for {@link CardView.scale}. */
  scale: number;
  /** Render depth (backgrounds sit below their cards). */
  depth: number;
  /** The atlas frame to display, which a game may change as it is played. */
  frame: string;
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
