import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { deckCardIds } from "@/engine/core/card/deck";
import { DeckCardId, PlayingCard } from "@/engine/core/card/playing_card";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { DeckSource } from "@/engine/tableau/deck_source";
import { AppliedMove } from "@/engine/tableau/move";
import { MoveEffects, ResolvedMove } from "@/engine/tableau/table_game";
import { drawToWaste, recycleWasteToStock } from "@/games/common/stock_pile";
import {
  ScoringPolicy,
  ScoringRoles,
} from "@/games/klondike/scoring_policy";
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

/**
 * Which of this game's roles the shared scoring policy treats as what.
 *
 * Stated rather than left to coincide with Klondike's spelling: the policy
 * compares whatever it is given, so this is the whole of the coupling between
 * the two games and it is now visible in one place.
 */
const DOUBLE_KLONDIKE_SCORING_ROLES: ScoringRoles = {
  waste: DoubleKlondikeRole.WASTE,
  tableau: DoubleKlondikeRole.TABLEAU,
  foundation: DoubleKlondikeRole.FOUNDATION,
};

/** How many cards a draw turns over. */
export const DRAW_COUNT = 3;

/**
 * A game of Double Klondike.
 *
 * Klondike dealt from two decks: nine columns in the same staircase, eight
 * foundations, and a stock of fifty-nine drawn three at a time with the waste
 * recycled as often as the player likes.
 *
 * Twice the cards do not make it twice the game. Eight Kings rather than four
 * means an empty column is far easier to fill, and the long stock gives many
 * more passes to find a card — but eight foundations have to be fed from a
 * tableau only two columns wider, so the middle game is much more congested.
 *
 * The scoring is Klondike's, taken rather than restated: {@link ScoringPolicy}
 * is a policy object built to be injected, and it is told which of this game's
 * roles are the waste, the columns and the foundations. It used to compare
 * against Klondike's own role strings, so this game's had to spell them
 * identically or every move would have scored zero without failing to compile.
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

  /**
   * @param cardIds The card identities to deal from. Defaults to two full
   *   decks; injectable so a test can supply a shorter one.
   * @param random Source of shuffle randomness, injectable for a fixed deal.
   * @param scoring The scoring rules to apply. Injectable so an alternate
   *   ruleset can be supplied without touching the game logic.
   */
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
    // Zeroed here rather than in a hook of its own: how many times the waste has
    // been recycled is part of the board being dealt.
    this.recycleCount = 0;
    dealDoubleKlondikeLayout(deck, this.tableaus, this.stock);
  }

  // --- The stock ---

  /**
   * Draws cards from the stock onto the waste, recycling the waste back into
   * the stock when the stock is spent.
   *
   * Does nothing, and counts no move, when both are empty.
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
   * Recycles the waste back into the stock, face down, and charges the penalty
   * for having done so. The caller guarantees the waste is non-empty.
   */
  private recycleWaste(): void {
    const scoreBefore = this.state.score;
    this.recycleCount++;
    this.state.score = Math.max(
      0,
      this.state.score - this.scoring.recyclePenalty(DRAW_COUNT, this.recycleCount),
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
      // The real delta, not what the policy proposed: the score is clamped at
      // zero. Measured after the flip so the bonus that awarded is included and
      // undo takes both back together.
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

  /**
   * Turns the newly exposed top card of a column face up after a move, awarding
   * the flip bonus.
   *
   * @param sourcePile The pile the moved stack was taken from.
   * @returns The card that was turned face up, or undefined if none was.
   */
  private autoFlipExposedCard(
    sourcePile: CardPile<PlayingCard>,
  ): PlayingCard | undefined {
    if (sourcePile.role !== DoubleKlondikeRole.TABLEAU) {
      return undefined;
    }
    const topRemaining = sourcePile.topCard;
    if (!topRemaining || topRemaining.faceUp) {
      return undefined;
    }

    topRemaining.faceUp = true;
    this.state.score += this.scoring.tableauFlipBonus();
    return topRemaining;
  }
}
