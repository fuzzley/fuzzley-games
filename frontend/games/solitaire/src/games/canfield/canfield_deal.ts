import { Deal } from "@/engine/tableau/deal";
import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { PlayingCard, Rank } from "@/engine/core/card/playing_card";
import { CanfieldVariantRules } from "./canfield_rules";

/** How many cards the reserve is dealt. */
export const RESERVE_SIZE = 13;

/** Holds the piles a Canfield deal fills. */
export interface CanfieldPiles {
  readonly stock: ReadonlyCardPile<PlayingCard>;
  readonly reserve: ReadonlyCardPile<PlayingCard>;
  readonly foundations: readonly ReadonlyCardPile<PlayingCard>[];
  readonly tableaus: readonly ReadonlyCardPile<PlayingCard>[];
}

/**
 * Deals a board under a variant's rules.
 *
 * Storehouse lays the Twos on the foundations first; every other game turns
 * the card after the reserve onto the first foundation, which sets the rank
 * all four start on. Then thirteen cards go to the reserve, face down but for
 * the top (or all face up in Superior Canfield), one face up to each column,
 * and the rest face down to the stock.
 */
export function dealCanfieldLayout(
  rules: CanfieldVariantRules,
  deal: Deal,
  piles: CanfieldPiles,
): void {
  if (rules.twosStartFoundations) {
    const twos = deal.pull((card) => card.rank === Rank.TWO);
    for (const [index, two] of twos.entries()) {
      const foundation = piles.foundations[index];
      if (foundation) deal.place(two, foundation, true);
    }
  }

  for (let dealt = 0; dealt < RESERVE_SIZE; dealt++) {
    if (!deal.dealTo(piles.reserve, rules.reserveFaceUp)) break;
  }
  const top = piles.reserve.topCard;
  if (top) top.faceUp = true;

  if (!rules.twosStartFoundations) {
    const base = deal.draw();
    const foundation = piles.foundations[0];
    if (base && foundation) deal.place(base, foundation, true);
  }

  deal.dealEach(piles.tableaus, true);
  deal.dealRest(piles.stock, false);
}
