import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { DeckCardId, PlayingCard } from "@/engine/core/card/playing_card";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { readNumber, readObject } from "@/engine/core/common/json_reader";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { DeckSource } from "@/engine/tableau/deck_source";
import { AppliedMove } from "@/engine/tableau/move";
import { MoveEffects, ResolvedMove } from "@/engine/tableau/table_game";
import { drawToWaste, recycleWasteToStock } from "@/games/common/stock_pile";
import { flipExposedTopOfColumn } from "@/games/common/move_effects";
import { dealKlondikeAlmostWin, dealKlondikeLayout } from "./klondike_deal";
import { KlondikeSettings } from "./klondike_settings";
import {
  DEFAULT_KLONDIKE_VARIANT,
  KlondikeVariant,
  klondikeDealsFaceUp,
} from "./klondike_rules";
import {
  KlondikeRole,
  STOCK_PILE_ID,
  WASTE_PILE_ID,
  klondikeZoneSpecs,
} from "./klondike_zones";
import { ScoringPolicy } from "./scoring_policy";

/** Holds what Klondike keeps outside its piles, for a snapshot. */
interface KlondikeExtra {
  /** How many times the waste has been recycled. */
  readonly recycleCount: number;
}

/** Reads a snapshot's extra state as Klondike's. */
function readKlondikeExtra(value: unknown): KlondikeExtra {
  const extra = readObject(value, "extra");
  return { recycleCount: readNumber(extra.recycleCount, "extra.recycleCount") };
}

/**
 * Plays Klondike or one of its variants, scoring each move, flip and recycle.
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

  /** Which of the family is being played. */
  public readonly variant: KlondikeVariant;

  /**
   * Creates a game whose piles are empty until the first deal.
   *
   * @param settings The settings to play by. It and `variant` are parameters
   *   because the zones are built from them during `super`, before this
   *   class's fields exist.
   */
  constructor(
    cardIds: ReadonlyArray<DeckCardId> = ALL_PLAYING_CARD_IDS,
    scoring: ScoringPolicy = new ScoringPolicy(),
    settings: KlondikeSettings = new KlondikeSettings(),
    variant: KlondikeVariant = DEFAULT_KLONDIKE_VARIANT,
  ) {
    super({
      zones: () => klondikeZoneSpecs(settings.drawCount, variant),
      deck: new DeckSource(new CardRegistry(), cardIds),
      // A foundation is always preferred over a column.
      autoMoveRoles: [KlondikeRole.FOUNDATION, KlondikeRole.TABLEAU],
      winsWhenAllCardsIn: KlondikeRole.FOUNDATION,
    });

    this.settings = settings;
    this.scoring = scoring;
    this.variant = variant;

    this.stock = this.requirePile(STOCK_PILE_ID);
    this.waste = this.requirePile(WASTE_PILE_ID);
    this.foundations = this.pilesOfRole(KlondikeRole.FOUNDATION);
    this.tableaus = this.pilesOfRole(KlondikeRole.TABLEAU);
  }

  // --- Dealing ---

  /**
   * Deals the opening board, or an almost-won one if {@link almostWin} is set.
   *
   * @inheritDoc
   */
  protected override dealBoard(deck: PlayingCard[]): void {
    this.recycleCount = 0;

    if (this.almostWin) {
      dealKlondikeAlmostWin(this.deck, this.foundations, this.tableaus);
    } else {
      dealKlondikeLayout(
        deck,
        this.tableaus,
        this.stock,
        klondikeDealsFaceUp(this.variant),
      );
    }
  }

  // --- The stock ---

  /**
   * Draws from the stock onto the waste, or recycles the waste once the stock
   * is empty.
   */
  public drawCardsFromStock(): void {
    if (this.stock.isEmpty && this.waste.isEmpty) {
      return;
    }

    if (!this.stock.isEmpty) {
      this.drawFromStock();
    } else {
      this.recycleWaste();
    }
  }

  /** Draws up to drawCount cards from the stock pile onto the waste pile. */
  private drawFromStock(): void {
    this.commitAction(
      "draw",
      drawToWaste(this.stock, this.waste, this.settings.drawCount),
    );
  }

  /**
   * Recycles the non-empty waste back into the stock, face down, and charges
   * the penalty for doing so.
   */
  private recycleWaste(): void {
    const scoreBefore = this.state.score;
    this.recycleCount++;
    const penalty = this.scoring.recyclePenalty(
      this.settings.drawCount,
      this.recycleCount,
    );
    this.state.score = Math.max(0, this.state.score - penalty);

    this.commitAction("recycle", recycleWasteToStock(this.waste, this.stock), {
      scoreDelta: this.state.score - scoreBefore,
    });
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
  protected override saveExtra(): KlondikeExtra {
    return { recycleCount: this.recycleCount };
  }

  /** @inheritDoc */
  protected override restoreExtra(extra: unknown): void {
    this.recycleCount = readKlondikeExtra(extra).recycleCount;
  }

  /**
   * Turns face up the card a move exposed in a column, awarding the flip bonus,
   * and returns it if there was one.
   */
  private autoFlipExposedCard(
    sourcePile: CardPile<PlayingCard>,
  ): PlayingCard | undefined {
    const flipped = flipExposedTopOfColumn(sourcePile, KlondikeRole.TABLEAU);
    if (flipped) {
      this.state.score += this.scoring.tableauFlipBonus();
    }
    return flipped;
  }
}
