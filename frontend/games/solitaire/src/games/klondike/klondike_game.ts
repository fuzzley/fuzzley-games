import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { DeckCardId, PlayingCard } from "@/engine/core/card/playing_card";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { DeckSource } from "@/engine/tableau/deck_source";
import { AppliedMove } from "@/engine/tableau/move";
import { MoveEffects, ResolvedMove } from "@/engine/tableau/table_game";
import { dealKlondikeAlmostWin, dealKlondikeLayout } from "./klondike_deal";
import { KlondikeSettings } from "./klondike_settings";
import {
  KlondikeRole,
  STOCK_PILE_ID,
  WASTE_PILE_ID,
  klondikeZoneSpecs,
} from "./klondike_zones";
import { ScoringPolicy } from "./scoring_policy";

/**
 * A standard Klondike Solitaire game.
 *
 * Everything true of any solitaire — the piles, whether a move is legal, undo,
 * auto-move, the deal and restart cycle, the win — comes from
 * {@link DealtTableGame}. What is left here is Klondike itself: the stock with
 * its draw and recycle, the bonus for turning over a card a move exposed, and
 * the scoring.
 */
export class KlondikeGame extends DealtTableGame {
  /** The face-down stock pile from which cards are drawn. */
  public readonly stock: CardPile<PlayingCard>;
  /** The face-up waste pile containing drawn cards. */
  public readonly waste: CardPile<PlayingCard>;
  /** The four suit foundation piles. */
  public readonly foundations: readonly CardPile<PlayingCard>[];
  /** The seven tableau piles arranged on the board. */
  public readonly tableaus: readonly CardPile<PlayingCard>[];

  /** User-configurable game settings. */
  public readonly settings: KlondikeSettings;

  /** Whether to deal a nearly finished board, for verification. */
  public almostWin = false;

  private recycleCount = 0;

  /** The rules used to score moves, flips, and recycles. */
  private readonly scoring: ScoringPolicy;

  /**
   * Initializes the piles.
   *
   * @param cardIds The card identities to deal from. Defaults to a full
   *   standard 52-card deck. Injectable so tests can supply a partial or empty
   *   set to exercise short-deck handling through the public API.
   * @param scoring The scoring rules to apply. Injectable so an alternate
   *   ruleset can be supplied without touching the game logic.
   * @param settings The settings to play by. A constructor parameter rather
   *   than a field initializer because the zones are built from the draw mode
   *   during `super`, before this class's own fields exist.
   */
  constructor(
    cardIds: ReadonlyArray<DeckCardId> = ALL_PLAYING_CARD_IDS,
    scoring: ScoringPolicy = new ScoringPolicy(),
    settings: KlondikeSettings = new KlondikeSettings(),
  ) {
    super({
      zones: () => klondikeZoneSpecs(settings.drawCount),
      deck: new DeckSource(new CardRegistry(), cardIds),
      // A foundation is always preferred over a column.
      autoMoveRoles: [KlondikeRole.FOUNDATION, KlondikeRole.TABLEAU],
      winsWhenAllCardsIn: KlondikeRole.FOUNDATION,
    });

    this.settings = settings;
    this.scoring = scoring;

    this.stock = this.requirePile(STOCK_PILE_ID);
    this.waste = this.requirePile(WASTE_PILE_ID);
    this.foundations = this.pilesOfRole(KlondikeRole.FOUNDATION);
    this.tableaus = this.pilesOfRole(KlondikeRole.TABLEAU);
  }

  // --- Dealing ---

  /**
   * Deals the opening board: tableau column i receives i+1 cards, with the top
   * card face-up.
   *
   * @inheritDoc
   */
  protected override dealBoard(deck: PlayingCard[]): void {
    // Zeroed here rather than in a hook of its own: how many times the waste has
    // been recycled is part of the board being dealt.
    this.recycleCount = 0;

    if (this.almostWin) {
      dealKlondikeAlmostWin(this.deck, this.foundations, this.tableaus);
    } else {
      dealKlondikeLayout(deck, this.tableaus, this.stock);
    }
  }

  // --- The stock ---

  /**
   * Draws cards from the stock pile to the waste pile.
   *
   * If stock is empty, recycles waste back into stock. Does nothing (and counts
   * no move) when both the stock and waste are empty.
   */
  public drawCardsFromStock(): void {
    if (this.stock.isEmpty && this.waste.isEmpty) {
      return;
    }

    this.state.moves++;
    if (!this.stock.isEmpty) {
      this.drawFromStock();
    } else {
      this.recycleWaste();
    }
  }

  /** Draws up to drawCount cards from the stock pile onto the waste pile. */
  private drawFromStock(): void {
    const drawCount = Math.min(this.settings.drawCount, this.stock.size);
    const drawn: PlayingCard[] = [];
    for (let i = 0; i < drawCount; i++) {
      const topCard = this.stock.topCard;
      if (!topCard) break;
      this.stock.removeCard(topCard);
      topCard.faceUp = true;
      this.waste.addCard(topCard);
      drawn.push(topCard);
    }

    this.recordTransfers("draw", [
      {
        // Reversed: the cards came off the top of the stock, so the order they
        // were drawn in is the opposite of the order they sat in.
        cardIds: drawn.reverse().map((card) => card.id),
        fromPileId: this.stock.id,
        toPileId: this.waste.id,
        faceUpBefore: false,
      },
    ]);
  }

  /**
   * Recycles the waste pile back into the stock pile, face-down. The caller
   * guarantees the waste is non-empty.
   */
  private recycleWaste(): void {
    const scoreBefore = this.state.score;
    this.recycleCount++;
    const penalty = this.scoring.recyclePenalty(
      this.settings.drawCount,
      this.recycleCount,
    );
    this.state.score = Math.max(0, this.state.score - penalty);

    // Captured bottom-first before draining, which is the order undo restores.
    const recycled = [...this.waste.getCards()];
    let card = this.waste.topCard;
    while (card) {
      this.waste.removeCard(card);
      card.faceUp = false;
      this.stock.addCard(card);
      card = this.waste.topCard;
    }

    this.recordTransfers(
      "recycle",
      [
        {
          cardIds: recycled.map((recycledCard) => recycledCard.id),
          fromPileId: this.waste.id,
          toPileId: this.stock.id,
          faceUpBefore: true,
        },
      ],
      { scoreDelta: this.state.score - scoreBefore },
    );
  }

  // --- What a Klondike move does beyond moving its cards ---

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
      // zero, so a 15 point penalty against a score of 10 moves it by 10. It is
      // measured after the flip so the bonus that awarded is included and undo
      // takes both back together.
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
   * Turns the newly exposed top card of a tableau face up after a move,
   * awarding the flip bonus. Does nothing for non-tableau source piles or when
   * the exposed card is already face up.
   *
   * @param sourcePile The pile the moved stack was taken from.
   * @returns The card that was turned face up, or undefined if none was.
   */
  private autoFlipExposedCard(
    sourcePile: CardPile<PlayingCard>,
  ): PlayingCard | undefined {
    if (sourcePile.role !== KlondikeRole.TABLEAU) {
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
