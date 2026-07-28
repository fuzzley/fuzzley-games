import { CardPile, PileRole } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { PileLayout } from "@/engine/render/layout/pile_layout";
import { SlotPlacement } from "@/engine/render/layout/table_layout";
import { PlacementRule } from "./rules";

/**
 * Which cards in a zone a player may pick up.
 *
 * The question every solitaire answers differently and none answers per card:
 * a Klondike foundation gives up only its top card, a Klondike column gives up
 * any face-up card and everything on it, and a FreeCell column gives up only a
 * properly ordered run.
 */
export type GrabRule =
  /** Nothing here can be picked up. */
  | { readonly kind: "none" }
  /** Only the card on top. */
  | { readonly kind: "top-only" }
  /** Any face-up card, and whatever is stacked on it, ordered or not. */
  | { readonly kind: "any-face-up" }
  /**
   * Any face-up card whose covering cards form an unbroken run by
   * {@link adjacent}. FreeCell and Spider; Klondike is deliberately laxer.
   */
  | {
      readonly kind: "run";
      /** Whether `upper` may sit directly on `lower` within a run. */
      readonly adjacent: (lower: PlayingCard, upper: PlayingCard) => boolean;
    };

/**
 * How a zone decides which side of its cards to show.
 *
 * Distinct from the cards' own {@link PlayingCard.faceUp} because some zones
 * override it wholesale: a Klondike stock is drawn face-down whatever its cards
 * think, a waste face-up, and only a tableau defers to the card.
 */
export type FaceVisibility =
  /** Show whichever side the card itself says. */
  | "card"
  /** Always show the face, whatever the card says. */
  | "always-up"
  /** Always show the back, whatever the card says. */
  | "always-down";

/**
 * One pile of a game's board, and everything that distinguishes it from the
 * others.
 *
 * This is the replacement for switching on a pile's role. A role remains as an
 * opaque tag for scoring and grouping, but the behaviour that used to hang off
 * it — how the pile arranges its cards, what it accepts, what can be taken from
 * it, which side is shown — is declared here instead of branched on in five
 * separate places.
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

  /** How many cards it may hold. Undefined means unbounded. */
  readonly capacity?: number;

  /** What it accepts. A zone that is never a destination uses `never`. */
  readonly accept: PlacementRule;

  /** What may be taken from it. */
  readonly grab: GrabRule;

  /**
   * Whether a card taken from here may be dragged.
   *
   * Separate from {@link grab} because the Klondike stock is clickable but not
   * draggable: pressing it draws rather than picks anything up.
   */
  readonly draggable: boolean;

  /** Which side of its cards it shows. */
  readonly face: FaceVisibility;
}

/**
 * Whether `card` can be picked up out of `pile` under the given rule.
 *
 * @param grab The zone's grab rule.
 * @param card The card the player is reaching for.
 * @param pile The pile holding it.
 */
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
 * Whether the cards from `card` upwards form an unbroken run.
 *
 * A card buried under a broken sequence cannot be lifted, because everything
 * above it comes with it and the pile it lands on would have to accept the
 * whole thing.
 */
function isRunFrom(
  pile: CardPile<PlayingCard>,
  card: PlayingCard,
  adjacent: (lower: PlayingCard, upper: PlayingCard) => boolean,
): boolean {
  const cards = pile.getCards();
  const start = cards.indexOf(card);
  if (start === -1) return false;

  for (let index = start; index < cards.length - 1; index++) {
    if (!cards[index].faceUp) return false;
    if (!adjacent(cards[index], cards[index + 1])) return false;
  }
  return true;
}

/**
 * The artwork key a zone shows for one of its cards.
 *
 * @param face The zone's face visibility.
 * @param card The card being drawn.
 * @param cardBackKey The artwork key for the back of a card.
 */
export function frameFor(
  face: FaceVisibility,
  card: PlayingCard,
  cardBackKey: string,
): string {
  switch (face) {
    case "always-down":
      return cardBackKey;
    case "always-up":
      return card.faceKey;
    case "card":
      return card.faceUp ? card.faceKey : cardBackKey;
  }
}

/** Whether the pile has room for `count` more cards under the zone's capacity. */
export function hasRoomFor(
  spec: ZoneSpec,
  pile: CardPile<PlayingCard>,
  count: number,
): boolean {
  return spec.capacity === undefined || pile.size + count <= spec.capacity;
}
