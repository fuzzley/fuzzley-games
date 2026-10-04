import { Deal } from "@/engine/tableau/deal";
import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { SpideretteVariant } from "./spiderette_rules";

/**
 * How many cards Will o' the Wisp puts on each column: three, of which the top
 * one shows.
 */
export const WISP_CARDS_PER_COLUMN = 3;

/**
 * Deals Spiderette's staircase or Will o' the Wisp's columns of three, with
 * only each column's top card face up, and the rest face down on the stock.
 */
export function dealSpideretteLayout(
  deal: Deal,
  tableaus: readonly CardPile<PlayingCard>[],
  stock: CardPile<PlayingCard>,
  variant: SpideretteVariant,
): void {
  if (tableaus.length === 0) return;

  for (const [column, tableau] of tableaus.entries()) {
    const count =
      variant === SpideretteVariant.WILL_O_THE_WISP
        ? WISP_CARDS_PER_COLUMN
        : column + 1;
    for (let dealt = 0; dealt < count; dealt++) {
      // A short injected deck simply runs out; the columns already dealt stand
      // as they are rather than the deal failing.
      if (!deal.dealTo(tableau, dealt === count - 1)) return;
    }
  }
  deal.dealRest(stock, false);
}
