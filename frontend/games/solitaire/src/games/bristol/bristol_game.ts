import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { Deal } from "@/engine/tableau/dealing/deal";
import { DealtTableGame } from "@/engine/tableau/game/dealt_table_game";
import { DeckOptions } from "@/games/common/deck_options";
import { dealRowFromStock } from "@/games/common/row_deal";
import { dealBristolLayout } from "./bristol_deal";
import { BristolVariant, DEFAULT_BRISTOL_VARIANT } from "./bristol_rules";
import { BristolRole, STOCK_PILE_ID, bristolZoneSpecs } from "./bristol_zones";
import { ActionKind } from "@/games/common/action_kinds";

/** Configures a game played on Bristol's board. */
export interface BristolOptions extends DeckOptions {
  /** Which of the pair to play. */
  readonly variant?: BristolVariant;
}

/**
 * Plays Bristol or Belvedere: eight short fans built down in any suit, three
 * reserves the stock deals onto, and foundations built up in any suit.
 */
export class BristolGame extends DealtTableGame {
  /** The face-down stock, dealt three at a time onto the reserves. */
  public readonly stock: ReadonlyCardPile<PlayingCard>;
  /** The three reserves. */
  public readonly reserves: readonly ReadonlyCardPile<PlayingCard>[];
  /** The four foundations. */
  public readonly foundations: readonly ReadonlyCardPile<PlayingCard>[];
  /** The eight fans. */
  public readonly tableaus: readonly ReadonlyCardPile<PlayingCard>[];

  /** Which of the pair is being played. */
  public readonly variant: BristolVariant;

  /** Creates a game whose piles are empty until the first deal. */
  constructor({
    cardIds = ALL_PLAYING_CARD_IDS,
    random,
    variant = DEFAULT_BRISTOL_VARIANT,
  }: BristolOptions = {}) {
    super({
      zones: bristolZoneSpecs(),
      deck: { cardIds, random },
      // Foundations only: which fan a card goes to is the player's decision.
      autoMoveRoles: [BristolRole.FOUNDATION],
      winsWhenAllCardsIn: BristolRole.FOUNDATION,
    });

    this.variant = variant;
    this.stock = this.requirePile(STOCK_PILE_ID);
    this.reserves = this.pilesOfRole(BristolRole.RESERVE);
    this.foundations = this.pilesOfRole(BristolRole.FOUNDATION);
    this.tableaus = this.pilesOfRole(BristolRole.TABLEAU);
  }

  /** @inheritDoc */
  protected override dealBoard(deal: Deal): void {
    dealBristolLayout(this.variant, deal, this);
  }

  /** Whether the stock has cards left to deal. */
  public get canDeal(): boolean {
    return !this.stock.isEmpty;
  }

  /** Deals a card onto each reserve, returning whether there were any. */
  public deal(): boolean {
    if (!this.canDeal) {
      return false;
    }

    this.commitAction(
      ActionKind.DEAL,
      dealRowFromStock(this.tabletop, this.stock, this.reserves),
    );
    return true;
  }
}
