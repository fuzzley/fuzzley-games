import { CardPile, PileRole } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { PileLayout } from "@/engine/render/layout/pile_layout";
import { SlotPlacement } from "@/engine/render/layout/table_layout";
import { PlacementRule } from "./rules";

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

/** Returns whether `card` can be picked up out of `pile` under a grab rule. */
export function canGrab(
  grab: GrabRule,
  card: PlayingCard,
  pile: CardPile<PlayingCard>,
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
    if (!cards[index].faceUp) return false;
    if (index + 1 < cards.length && !adjacent(cards[index], cards[index + 1])) {
      return false;
    }
  }
  return true;
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
