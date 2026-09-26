import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { deckCardIds } from "@/engine/core/card/deck";
import { DeckCardId, PlayingCard } from "@/engine/core/card/playing_card";
import { readNumber, readObject } from "@/engine/core/common/json_reader";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { DeckSource } from "@/engine/tableau/deck_source";
import { AppliedMove } from "@/engine/tableau/move";
import { MoveEffects, ResolvedMove } from "@/engine/tableau/table_game";
import { drawToWaste, recycleWasteToStock } from "@/games/common/stock_pile";
import { flipExposedTopOfColumn } from "@/games/common/move_effects";
import { ScoringPolicy, ScoringRoles } from "@/games/klondike/scoring_policy";
import {
  DOUBLE_KLONDIKE_TWO_DECKS,
  dealDoubleKlondikeLayout,
} from "./double_klondike_deal";
import {
  DoubleKlondikeRole,
  STOCK_PILE_ID,
  WASTE_PILE_ID,
  doubleKlondikeZoneSpecs,
} from "./double_klondike_zones";

/** Which of this game's roles the shared scoring policy treats as what. */
const DOUBLE_KLONDIKE_SCORING_ROLES: ScoringRoles = {
  waste: DoubleKlondikeRole.WASTE,
  tableau: DoubleKlondikeRole.TABLEAU,
  foundation: DoubleKlondikeRole.FOUNDATION,
};

/** How many cards a draw turns over. */
export const DRAW_COUNT = 3;

/** Holds what Double Klondike keeps outside its piles, for a snapshot. */
interface DoubleKlondikeExtra {
  /** How many times the waste has been recycled. */
  readonly recycleCount: number;
}

/** Reads a snapshot's extra state as Double Klondike's. */
function readDoubleKlondikeExtra(value: unknown): DoubleKlondikeExtra {
  const extra = readObject(value, "extra");
  return { recycleCount: readNumber(extra.recycleCount, "extra.recycleCount") };
}

/**
 * Plays Double Klondike: Klondike dealt from two decks onto nine columns and
 * eight foundations, with the waste recycled as often as the player likes.
 */
export class DoubleKlondikeGame extends DealtTableGame {
  /** The face-down stock pile from which cards are drawn. */
  public readonly stock: CardPile<PlayingCard>;
  /** The face-up waste pile containing drawn cards. */
  public readonly waste: CardPile<PlayingCard>;
  /** The eight foundation piles, two per suit. */
  public readonly foundations: readonly CardPile<PlayingCard>[];
  /** The nine columns. */
  public readonly tableaus: readonly CardPile<PlayingCard>[];

  private recycleCount = 0;

  /** The rules used to score moves, flips, and recycles. */
  private readonly scoring: ScoringPolicy;

  /** Creates a game whose piles are empty until the first deal. */
  constructor(
    cardIds: ReadonlyArray<DeckCardId> = deckCardIds(DOUBLE_KLONDIKE_TWO_DECKS),
    random: () => number = Math.random,
    scoring: ScoringPolicy = new ScoringPolicy(DOUBLE_KLONDIKE_SCORING_ROLES),
  ) {
    super({
      zones: () => doubleKlondikeZoneSpecs(),
      deck: new DeckSource(new CardRegistry(), cardIds, random),
      // A foundation is always preferred over a column.
      autoMoveRoles: [
        DoubleKlondikeRole.FOUNDATION,
        DoubleKlondikeRole.TABLEAU,
      ],
      winsWhenAllCardsIn: DoubleKlondikeRole.FOUNDATION,
    });

    this.scoring = scoring;
    this.stock = this.requirePile(STOCK_PILE_ID);
    this.waste = this.requirePile(WASTE_PILE_ID);
    this.foundations = this.pilesOfRole(DoubleKlondikeRole.FOUNDATION);
    this.tableaus = this.pilesOfRole(DoubleKlondikeRole.TABLEAU);
  }

  /** @inheritDoc */
  protected override dealBoard(deck: PlayingCard[]): void {
    this.recycleCount = 0;
    dealDoubleKlondikeLayout(deck, this.tableaus, this.stock);
  }

  // --- The stock ---

  /**
   * Draws cards from the stock onto the waste, recycling the waste back into
   * the stock when the stock is spent.
   */
  public drawCardsFromStock(): void {
    if (this.stock.isEmpty && this.waste.isEmpty) {
      return;
    }

    this.state.moves++;
    if (!this.stock.isEmpty) {
      this.recordTransfers(
        "draw",
        drawToWaste(this.stock, this.waste, DRAW_COUNT),
      );
    } else {
      this.recycleWaste();
    }
  }

  /**
   * Recycles the non-empty waste back into the stock, face down, and charges
   * the penalty for doing so.
   */
  private recycleWaste(): void {
    const scoreBefore = this.state.score;
    this.recycleCount++;
    this.state.score = Math.max(
      0,
      this.state.score -
        this.scoring.recyclePenalty(DRAW_COUNT, this.recycleCount),
    );

    this.recordTransfers(
      "recycle",
      recycleWasteToStock(this.waste, this.stock),
      { scoreDelta: this.state.score - scoreBefore },
    );
  }

  // --- What a Double Klondike move does beyond moving its cards ---

  /**
   * Scores the move and turns over the card it exposed.
   *
   * @inheritDoc
   */
  protected override applyMoveEffects(move: ResolvedMove): MoveEffects {
    const scoreBefore = this.state.score;
    this.state.score = Math.max(
      0,
      this.state.score +
        this.scoring.moveScore(move.sourcePile.role, move.targetPile.role),
    );

    const flipped = this.autoFlipExposedCard(move.sourcePile);

    return {
      // Measured after the flip, so undo takes back its bonus too.
      scoreDelta: this.state.score - scoreBefore,
      flippedCardIds: flipped ? [flipped.id] : [],
    };
  }

  /** @inheritDoc */
  protected override afterUndo(move: AppliedMove): void {
    if (move.kind === "recycle") {
      // So the next recycle is charged the same penalty this one was.
      this.recycleCount--;
    }
  }

  /** @inheritDoc */
  protected override saveExtra(): DoubleKlondikeExtra {
    return { recycleCount: this.recycleCount };
  }

  /** @inheritDoc */
  protected override restoreExtra(extra: unknown): void {
    this.recycleCount = readDoubleKlondikeExtra(extra).recycleCount;
  }

  /**
   * Turns face up the card a move exposed in a column, awarding the flip bonus,
   * and returns it if there was one.
   */
  private autoFlipExposedCard(
    sourcePile: CardPile<PlayingCard>,
  ): PlayingCard | undefined {
    const flipped = flipExposedTopOfColumn(
      sourcePile,
      DoubleKlondikeRole.TABLEAU,
    );
    if (flipped) {
      this.state.score += this.scoring.tableauFlipBonus();
    }
    return flipped;
  }
}
