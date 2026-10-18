import {
  CardLocations,
  CardPile,
  PileRole,
  ReadonlyCardPile,
} from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { CardTransfer } from "../moves/move";
import { BoardQuery } from "../rules/board_query";
import { ZoneSpec } from "../zones/zone";

/** Says how cards land when they are relocated. */
export interface RelocateOptions {
  /**
   * The side they land showing, or undefined to leave each as it was, as a
   * move does.
   */
  readonly faceUp?: boolean;
}

/**
 * Holds a game's piles and where every card is, and makes every change to
 * which pile a card is in.
 *
 * It hands its piles out as {@link ReadonlyCardPile}s and is the only code that
 * holds them as piles it can change; a method that changes one takes the
 * read-only pile and finds its own.
 *
 * Every change a player can take back goes through {@link relocate} or
 * {@link rearrange}, which hand back the transfers that let undo put it back,
 * so the record of a change cannot drift from the change itself.
 */
export class Tabletop implements BoardQuery {
  /** Every pile, in the order the zones declared them. */
  readonly piles: readonly ReadonlyCardPile<PlayingCard>[];

  /** Every pile a dragged stack may be dropped onto, in declaration order. */
  readonly dropTargetPiles: readonly ReadonlyCardPile<PlayingCard>[];

  /** Where each card currently is, kept up to date by the piles themselves. */
  private readonly locations = new CardLocations<PlayingCard>();

  private readonly pilesById = new Map<string, CardPile<PlayingCard>>();
  private readonly pilesOfRole = new Map<PileRole, CardPile<PlayingCard>[]>();
  private readonly zonesById: ReadonlyMap<string, ZoneSpec>;

  /**
   * Creates a pile for every zone, all of them empty.
   *
   * @param registry Supplies the persistent card instances the game deals.
   */
  constructor(
    zones: readonly ZoneSpec[],
    private readonly registry: CardRegistry,
  ) {
    for (const zone of zones) {
      const pile = new CardPile<PlayingCard>(
        zone.id,
        zone.role,
        this.locations,
      );
      this.pilesById.set(pile.id, pile);
      const byRole = this.pilesOfRole.get(zone.role) ?? [];
      byRole.push(pile);
      this.pilesOfRole.set(zone.role, byRole);
    }

    this.zonesById = new Map(zones.map((zone) => [zone.id, zone]));
    this.piles = [...this.pilesById.values()];
    this.dropTargetPiles = zones
      .filter((zone) => zone.accept !== null)
      .map((zone) => this.requirePile(zone.id));
  }

  // --- Reading the table ---

  /** @inheritDoc */
  pile(pileId: string): ReadonlyCardPile<PlayingCard> | undefined {
    return this.pilesById.get(pileId);
  }

  /** @inheritDoc */
  pilesByRole(role: PileRole): readonly ReadonlyCardPile<PlayingCard>[] {
    return this.pilesOfRole.get(role) ?? [];
  }

  /** @inheritDoc */
  emptyCount(role: PileRole): number {
    return this.pilesByRole(role).filter((pile) => pile.isEmpty).length;
  }

  /** Returns the pile with the given id, throwing if no zone declares it. */
  requirePile(pileId: string): ReadonlyCardPile<PlayingCard> {
    return this.writable(pileId);
  }

  /** Returns the zone describing the given pile, or undefined if unknown. */
  zoneFor(pileId: string): ZoneSpec | undefined {
    return this.zonesById.get(pileId);
  }

  /** Returns the card with the given id, or undefined if never registered. */
  getCardById(cardId: string): PlayingCard | undefined {
    return this.registry.get(cardId);
  }

  /** Returns the pile holding the given card, or undefined. */
  pileHolding(cardId: string): ReadonlyCardPile<PlayingCard> | undefined {
    return this.locations.get(cardId);
  }

  /** The id of every card in play, which a renderer should make sprites for. */
  get cardIds(): readonly string[] {
    return this.registry.ids();
  }

  /** How many distinct cards are in play. */
  get cardsInPlay(): number {
    return this.registry.size;
  }

  // --- Changes undo can take back ---

  /**
   * Moves cards from the one pile holding them all onto `to`, in the order
   * given, and returns the transfer that lets undo put them back.
   *
   * @throws Error if the cards are not all in one pile, or are not all turned
   *   the same way, since undo turns them back together.
   */
  relocate(
    cards: readonly PlayingCard[],
    destination: ReadonlyCardPile<PlayingCard>,
    options: RelocateOptions = {},
  ): CardTransfer {
    const to = this.own(destination);
    const [first] = cards;
    const from = first ? this.locations.get(first.id) : undefined;
    if (!first || !from) {
      throw new Error("Only cards on the table can be relocated.");
    }
    if (cards.some((card) => this.pileHolding(card.id) !== from)) {
      throw new Error(`The cards are not all in ${from.id}.`);
    }
    if (cards.some((card) => card.faceUp !== first.faceUp)) {
      throw new Error("The cards are not all turned the same way.");
    }

    // Recorded in the order they sat, which undo re-appends them in to rebuild
    // the pile, whichever order they landed in.
    const sourceOrder = from.getCards();
    const transfer: CardTransfer = {
      cardIds: [...cards]
        .sort((a, b) => sourceOrder.indexOf(a) - sourceOrder.indexOf(b))
        .map((card) => card.id),
      fromPileId: from.id,
      toPileId: to.id,
      faceUpBefore: first.faceUp,
    };

    for (const card of cards) {
      from.removeCard(card);
      if (options.faceUp !== undefined) card.faceUp = options.faceUp;
      to.addCard(card);
    }
    return transfer;
  }

  /**
   * Lays out new contents for several piles at once, as a redeal does, and
   * returns the transfers that let undo restore every one of them exactly.
   *
   * Each card keeps the side it shows. A card that stays at the same height
   * in the same pile, under nothing that moved, is left alone and not
   * recorded.
   *
   * @param layout The new contents of each pile it names, bottom first. It must
   *   hold exactly the cards those piles hold now.
   * @throws Error if the layout gains or loses a card.
   */
  rearrange(
    layout: ReadonlyMap<ReadonlyCardPile<PlayingCard>, readonly PlayingCard[]>,
  ): CardTransfer[] {
    const piles = [...layout.keys()].map((pile) => this.own(pile));
    const before = piles.flatMap((pile) => pile.getCards());
    const after = [...layout.values()].flat();
    if (
      before.length !== after.length ||
      after.some((card) => !before.includes(card))
    ) {
      throw new Error("A rearrangement must keep the same cards.");
    }

    const destination = new Map<PlayingCard, ReadonlyCardPile<PlayingCard>>();
    for (const [pile, cards] of layout) {
      for (const card of cards) destination.set(card, pile);
    }
    const contentsOf = (pile: CardPile<PlayingCard>) => layout.get(pile) ?? [];

    // Each pile keeps the cards its new contents share with its old ones from
    // the bottom up; everything above them is lifted.
    const lifted = piles.map((pile) => {
      const old = pile.getCards();
      const next = contentsOf(pile);
      let kept = 0;
      while (kept < old.length && old[kept] === next[kept]) kept++;
      return { pile, kept, cards: old.slice(kept) };
    });

    // Last pile first and top card first, so undo, which runs the transfers
    // backwards appending each card to the pile it left, rebuilds every pile
    // bottom first on top of what it kept.
    const transfers: CardTransfer[] = [];
    for (const { pile, cards } of [...lifted].reverse()) {
      for (const card of [...cards].reverse()) {
        transfers.push({
          cardIds: [card.id],
          fromPileId: pile.id,
          toPileId: destination.get(card)?.id ?? pile.id,
          faceUpBefore: card.faceUp,
        });
      }
    }

    // Everything comes off before anything goes back, so a pile emptied and
    // filled in the same pass cannot collide with itself.
    for (const { pile, cards } of lifted) {
      for (const card of cards) pile.removeCard(card);
    }
    for (const { pile, kept } of lifted) {
      for (const card of contentsOf(pile).slice(kept)) {
        pile.addCard(card);
      }
    }
    return transfers;
  }

  /** Puts back what a transfer moved, as it lay before, for undo. */
  reverse(transfer: CardTransfer): void {
    const from = this.pilesById.get(transfer.fromPileId);
    const to = this.pilesById.get(transfer.toPileId);
    if (!from || !to) return;

    // cardIds are in source order, so re-appending in that order restores the
    // pile exactly, whichever way the action itself moved them.
    for (const cardId of transfer.cardIds) {
      const card = this.registry.get(cardId);
      if (!card) continue;
      to.removeCard(card);
      card.faceUp = transfer.faceUpBefore;
      from.addCard(card);
    }
  }

  // --- Changes outside the history ---

  /**
   * Puts a card on a pile, showing the side given, outside the history, as a
   * deal or a restore lays the table out.
   *
   * Takes it off any pile it is on first.
   */
  place(
    card: PlayingCard,
    pile: ReadonlyCardPile<PlayingCard>,
    faceUp: boolean,
  ): void {
    const to = this.own(pile);
    this.locations.get(card.id)?.removeCard(card);
    card.faceUp = faceUp;
    to.addCard(card);
  }

  /** Empties every pile, keeping the registry so sprites keep their cards. */
  clear(): void {
    for (const pile of this.pilesById.values()) {
      pile.clear();
    }
  }

  /**
   * Returns the changeable pile behind one this table handed out.
   *
   * @throws Error for a pile from anywhere else, even one with a matching id.
   */
  private own(pile: ReadonlyCardPile<PlayingCard>): CardPile<PlayingCard> {
    const owned = this.writable(pile.id);
    if (owned !== pile) {
      throw new Error(`The pile "${pile.id}" is not on this table.`);
    }
    return owned;
  }

  /** Returns this table's own pile with the given id, which it may change. */
  private writable(pileId: string): CardPile<PlayingCard> {
    const pile = this.pilesById.get(pileId);
    if (!pile) {
      throw new Error(`No zone declares a pile with id: ${pileId}`);
    }
    return pile;
  }
}
