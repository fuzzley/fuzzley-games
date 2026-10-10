import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { Deal } from "@/engine/tableau/deal";
import { anyCard } from "@/engine/tableau/rules/placement";
import { Tabletop } from "@/engine/tableau/tabletop";
import { ZoneSpec } from "@/engine/tableau/zones/zone";

/** Returns a zone that takes any card, for a pile a helper moves cards on. */
function openZone(id: string): ZoneSpec {
  return {
    id,
    role: id.replace(/-\d+$/, ""),
    slot: { pileId: id, column: 0, row: 0 },
    layout: { kind: "stacked" },
    accept: anyCard,
    grab: { kind: "any-face-up" },
    draggable: true,
    face: "card",
  };
}

/**
 * Wraps a real {@link Tabletop} whose piles take any card, for the specs of
 * the helpers that change piles through one.
 *
 * Each pile's role is its id without a trailing index, so `tableau-0` plays
 * `tableau`.
 */
export class TestTabletop {
  /** The table the helpers under test change. */
  readonly tabletop: Tabletop;

  constructor(pileIds: readonly string[]) {
    this.tabletop = new Tabletop(pileIds.map(openZone), new CardRegistry());
  }

  /** Returns the pile with the given id. */
  pile(pileId: string): ReadonlyCardPile<PlayingCard> {
    return this.tabletop.requirePile(pileId);
  }

  /** Returns a deal of the given cards onto this table, the last dealt first. */
  deal(cards: readonly PlayingCard[]): Deal {
    return new Deal([...cards], this.tabletop);
  }

  /**
   * Puts cards on a pile, bottom first, each showing the side it already
   * shows, and returns the pile.
   */
  fill(
    pileId: string,
    cards: readonly PlayingCard[],
  ): ReadonlyCardPile<PlayingCard> {
    const pile = this.pile(pileId);
    for (const card of cards) this.tabletop.place(card, pile, card.faceUp);
    return pile;
  }
}
