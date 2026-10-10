import { Deal } from "@/engine/tableau/dealing/deal";
import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { PlayingCard, Rank } from "@/engine/core/card/playing_card";
import { sinkKings } from "../common/sink_kings";
import { BristolVariant } from "./bristol_rules";

/** How many cards each fan is dealt. */
export const CARDS_PER_FAN = 3;

/** Holds the piles a Bristol deal fills. */
export interface BristolPiles {
  readonly foundations: readonly ReadonlyCardPile<PlayingCard>[];
  readonly tableaus: readonly ReadonlyCardPile<PlayingCard>[];
  readonly reserves: readonly ReadonlyCardPile<PlayingCard>[];
  readonly stock: ReadonlyCardPile<PlayingCard>;
}

/**
 * Deals a board for a variant: Belvedere first lays the first Ace the deal
 * reaches on a foundation. Then three cards face up to each fan, with its
 * Kings sunk to the bottom, one to each reserve, and the rest face down to the
 * stock.
 */
export function dealBristolLayout(
  variant: BristolVariant,
  deal: Deal,
  piles: BristolPiles,
): void {
  if (variant === BristolVariant.BELVEDERE) {
    const ace = deal.pullFirst((card) => card.rank === Rank.ACE);
    const foundation = piles.foundations[0];
    if (ace && foundation) deal.place(ace, foundation, true);
  }

  for (const tableau of piles.tableaus) {
    const fan: PlayingCard[] = [];
    for (let dealt = 0; dealt < CARDS_PER_FAN; dealt++) {
      const card = deal.draw();
      if (!card) break;
      fan.push(card);
    }
    for (const card of sinkKings(fan)) {
      deal.place(card, tableau, true);
    }
  }

  deal.dealEach(piles.reserves, true);
  deal.dealRest(piles.stock, false);
}
