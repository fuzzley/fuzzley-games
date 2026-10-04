import { CardPile, PileRole } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { PileLayout } from "@/engine/render/layout/pile_layout";
import { SlotPlacement } from "@/engine/render/layout/table_layout";
import {
  BoardQuery,
  PlacementContext,
  PlacementRule,
  all,
  buildsOn,
  byEmptiness,
  maxStackSize,
} from "./rules";
import { itemAt } from "@/engine/core/common/item_at";

/** Says which cards in a zone a player may pick up. */
export type GrabRule =
  /** Nothing here can be picked up. */
  | { readonly kind: "none" }
  /** Only the card on top. */
  | { readonly kind: "top-only" }
  /** Any face-up card, and whatever is stacked on it, ordered or not. */
  | { readonly kind: "any-face-up" }
  /**
   * Any face-up card whose covering cards form an unbroken run by
   * {@link adjacent}.
   */
  | {
      readonly kind: "run";
      /** Whether `upper` may sit directly on `lower` within a run. */
      readonly adjacent: (lower: PlayingCard, upper: PlayingCard) => boolean;
    }
  /**
   * Only the card on top, and only while every pile in {@link coveredBy} is
   * empty, as a pyramid's card is free once the two below it are gone.
   */
  | {
      readonly kind: "uncovered";
      /** The ids of the piles whose cards lie over this one. */
      readonly coveredBy: readonly string[];
    };

/**
 * Says which side of its cards a zone shows, which may override the cards' own
 * {@link PlayingCard.faceUp}.
 */
export type FaceVisibility =
  /** Show whichever side the card itself says. */
  | "card"
  /** Always show the face, whatever the card says. */
  | "always-up"
  /** Always show the back, whatever the card says. */
  | "always-down";

/**
 * Describes one pile of a game's board and everything that distinguishes it
 * from the others.
 */
export interface ZoneSpec {
  /** The unique id of the pile this describes. */
  readonly id: string;

  /** The part it plays, for scoring, grouping and gestures. */
  readonly role: PileRole;

  /** Where it sits in the table grid. */
  readonly slot: SlotPlacement;

  /** How it arranges the cards stacked in it. */
  readonly layout: PileLayout;

  /** How many cards it may hold, or undefined for no limit. */
  readonly capacity?: number;

  /**
   * What it accepts, or null when it is never a destination at all.
   *
   * Null, unlike a rule that refuses everything, keeps a drag from offering the
   * pile as a target.
   */
  readonly accept: PlacementRule | null;

  /** What may be taken from it. */
  readonly grab: GrabRule;

  /**
   * Whether a card taken from here may be dragged, rather than only clicked
   * like the top of the Klondike stock.
   */
  readonly draggable: boolean;

  /** Which side of its cards it shows. */
  readonly face: FaceVisibility;

  /**
   * The artwork key for the placeholder drawn beneath the pile, or undefined
   * for a pile drawn over bare table.
   */
  readonly backgroundKey?: string;

  /**
   * Whether clicking this pile's empty slot does something, and so earns a
   * pointer cursor and a hover border.
   */
  readonly emptyIsActionable?: boolean;
}

/** Describes a column whose cards build, and lift, in runs. */
export interface RunColumnOptions {
  /**
   * Whether `upper` may sit directly on `lower`: what a card landing on the
   * column and a run lifted off it both follow.
   */
  readonly adjacent: (lower: PlayingCard, upper: PlayingCard) => boolean;
  /** What an empty column takes. */
  readonly whenEmpty: PlacementRule;
  /**
   * How many cards may move at once in the current position, or undefined
   * for no limit.
   */
  readonly maxStack?: (context: PlacementContext) => number;
}

/** Holds what a column accepts and what may be lifted from it. */
export interface ColumnRules {
  readonly accept: PlacementRule;
  readonly grab: GrabRule;
}

/**
 * Returns a column's build and grab rules from one adjacency, so a run a player
 * can lift is always one they could land.
 */
export function runColumn(options: RunColumnOptions): ColumnRules {
  const build = byEmptiness(options.whenEmpty, buildsOn(options.adjacent));
  return {
    accept: options.maxStack ? all(build, maxStackSize(options.maxStack)) : build,
    grab: { kind: "run", adjacent: options.adjacent },
  };
}

/**
 * Returns whether `card` can be picked up out of `pile` under a grab rule.
 *
 * @param board The rest of the board, which an `uncovered` rule reads.
 */
export function canGrab(
  grab: GrabRule,
  card: PlayingCard,
  pile: CardPile<PlayingCard>,
  board: BoardQuery,
): boolean {
  switch (grab.kind) {
    case "none":
      return false;
    case "top-only":
      return pile.topCard === card;
    case "any-face-up":
      return card.faceUp;
    case "run":
      return card.faceUp && isRunFrom(pile, card, grab.adjacent);
    case "uncovered":
      return pile.topCard === card && isUncovered(grab.coveredBy, board);
  }
}

/**
 * Returns whether the cards from `card` upwards are all face up and form an
 * unbroken run.
 */
function isRunFrom(
  pile: CardPile<PlayingCard>,
  card: PlayingCard,
  adjacent: (lower: PlayingCard, upper: PlayingCard) => boolean,
): boolean {
  const cards = pile.getCards();
  const start = cards.indexOf(card);
  if (start === -1) return false;

  for (let index = start; index < cards.length; index++) {
    const lower = itemAt(cards, index);
    const upper = cards[index + 1];
    if (!lower.faceUp) return false;
    if (upper && !adjacent(lower, upper)) return false;
  }
  return true;
}

/** Returns whether every pile in `coveredBy` is empty. */
export function isUncovered(
  coveredBy: readonly string[],
  board: BoardQuery,
): boolean {
  return coveredBy.every((pileId) => board.pile(pileId)?.isEmpty ?? true);
}

/** Returns whether a zone draws the given card face up. */
export function showsFace(face: FaceVisibility, card: PlayingCard): boolean {
  switch (face) {
    case "always-down":
      return false;
    case "always-up":
      return true;
    case "card":
      return card.faceUp;
  }
}

/** Returns the artwork key a zone shows for one of its cards. */
export function frameFor(
  face: FaceVisibility,
  card: PlayingCard,
  cardBackKey: string,
): string {
  return showsFace(face, card) ? card.faceKey : cardBackKey;
}

/** Returns whether the pile has room for `count` more cards. */
export function hasRoomFor(
  spec: ZoneSpec,
  pile: CardPile<PlayingCard>,
  count: number,
): boolean {
  return spec.capacity === undefined || pile.size + count <= spec.capacity;
}
