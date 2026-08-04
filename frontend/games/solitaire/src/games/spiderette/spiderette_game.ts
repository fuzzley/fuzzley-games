import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { DeckCardId, PlayingCard } from "@/engine/core/card/playing_card";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { DeckSource } from "@/engine/tableau/deck_source";
import { MoveEffects, ResolvedMove } from "@/engine/tableau/table_game";
import { collectCompletedRuns } from "@/games/common/completed_runs";
import { runCollectingEffects } from "@/games/common/move_effects";
import { dealRowFromStock } from "@/games/common/row_deal";
import { dealSpideretteLayout } from "./spiderette_deal";
import {
  DEFAULT_SPIDERETTE_VARIANT,
  SpideretteVariant,
} from "./spiderette_rules";
import {
  SpideretteRole,
  STOCK_PILE_ID,
  spideretteZoneSpecs,
} from "./spiderette_zones";

/**
 * A game of Spiderette, or of Will o' the Wisp.
 *
 * Spider's rules on one deck and seven columns: columns build down by rank in
 * any suit, only a same-suit run can be lifted, and a completed King-to-Ace run
 * leaves for a foundation as soon as the move that finished it lands.
 *
 * The stock is Spider's rather than Klondike's — a press deals a card onto every
 * column at once, with no waste to pick from — but it is a good deal less
 * forgiving here. Spider's stock refuses to deal while a column stands empty,
 * which protects the most valuable square on the board. Spiderette cannot afford
 * that rule: its stock holds 24 cards against seven columns, so the last deal is
 * a short row of three whatever anyone does, and refusing to deal onto an empty
 * column would strand it. See {@link canDeal}.
 *
 * The two variants differ only in the opening deal, which is why nothing below
 * this line knows which is being played.
 */
export class SpideretteGame extends DealtTableGame {
  /** The face-down pile that deals a row at a time. */
  public readonly stock: CardPile<PlayingCard>;
  /** The four piles completed runs go to. */
  public readonly foundations: readonly CardPile<PlayingCard>[];
  /** The seven columns. */
  public readonly tableaus: readonly CardPile<PlayingCard>[];

  private readonly variant: SpideretteVariant;

  /**
   * @param cardIds The card identities to deal from. Defaults to a full 52-card
   *   deck; injectable so a test can supply a shorter one.
   * @param random Source of shuffle randomness, injectable for a fixed deal.
   * @param variant Which of the two openings to deal.
   */
  constructor(
    cardIds: ReadonlyArray<DeckCardId> = ALL_PLAYING_CARD_IDS,
    random: () => number = Math.random,
    variant: SpideretteVariant = DEFAULT_SPIDERETTE_VARIANT,
  ) {
    super({
      zones: () => spideretteZoneSpecs(),
      deck: new DeckSource(new CardRegistry(), cardIds, random),
      // Only a column will take a card; a foundation is never a destination a
      // player can choose.
      autoMoveRoles: [SpideretteRole.TABLEAU],
      winsWhenAllCardsIn: SpideretteRole.FOUNDATION,
    });

    this.variant = variant;
    this.stock = this.requirePile(STOCK_PILE_ID);
    this.foundations = this.pilesOfRole(SpideretteRole.FOUNDATION);
    this.tableaus = this.pilesOfRole(SpideretteRole.TABLEAU);
  }

  /** @inheritDoc */
  protected override dealBoard(deck: PlayingCard[]): void {
    dealSpideretteLayout(deck, this.tableaus, this.stock, this.variant);
  }

  // --- The stock ---

  /**
   * Whether the stock may deal, which it may whenever it still holds cards.
   *
   * Deliberately *not* Spider's rule, which also refuses while a column is
   * empty. Neither variant's stock divides evenly by seven — 24 and 31 against
   * seven columns — so the final deal is always a short row, and a game that had
   * emptied a column by then could never spend it. Anyone reading this alongside
   * `SpiderGame.canDeal` should know the omission is the rule, not a copy that
   * lost a clause.
   */
  public get canDeal(): boolean {
    return !this.stock.isEmpty;
  }

  /**
   * Deals one card face up onto each column, as far as the stock reaches.
   *
   * Recorded as one action, so a single undo takes the whole row back — and the
   * short final row is no special case, because dealing simply stops when the
   * stock runs out.
   */
  public dealRow(): boolean {
    if (!this.canDeal) {
      return false;
    }

    this.state.moves++;
    const transfers = dealRowFromStock(this.stock, this.tableaus);

    // A dealt card can complete a run, and more than one column at a time.
    const collected = collectCompletedRuns(this.tableaus, this.foundations);
    this.recordTransfers("deal", [...transfers, ...collected.transfers], {
      flippedCardIds: collected.flippedCardIds,
    });
    // Dealing a row can finish the last run, so the win is checked here as well
    // as after a move: this is an action the engine's move path never sees.
    this.checkWinCondition();
    return true;
  }

  // --- What a Spiderette move does beyond moving its cards ---

  /** @inheritDoc */
  protected override applyMoveEffects(move: ResolvedMove): MoveEffects {
    return runCollectingEffects(
      move,
      SpideretteRole.TABLEAU,
      this.tableaus,
      this.foundations,
    );
  }
}
