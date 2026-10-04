import { CardPile, PileRole } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";
import {
  DealtTableGame,
  DealtTableGameOptions,
} from "@/engine/tableau/dealt_game";
import { MoveEffects, ResolvedMove } from "@/engine/tableau/table_game";
import { ActionKind } from "@/games/common/action_kinds";
import { flipExposedTopOfColumn } from "@/games/common/move_effects";
import { STOCK_PILE_ID, WASTE_PILE_ID } from "@/games/common/pile_ids";
import { drawToWaste, recycleWasteToStock } from "@/games/common/stock_pile";
import {
  CLOSED_STOCK_PLACEHOLDER,
  recyclePipsPlaceholder,
} from "@/games/common/zone_presets";
import { DrawCount } from "./klondike_rules";
import { ScoringPolicy } from "./scoring_policy";

/** Configures a game played with Klondike's stock and scoring. */
export interface KlondikeFamilyOptions extends DealtTableGameOptions {
  /** How many cards a draw turns over. */
  readonly drawCount: DrawCount;
  /** How moves, flips and recycles score. */
  readonly scoring: ScoringPolicy;
  /** The role of the columns whose exposed cards turn face up for a bonus. */
  readonly columnRole: PileRole;
}

/**
 * Plays a game of the Klondike family: a stock drawn onto a waste and recycled
 * as often as the scoring allows, with each move, flip and recycle scored.
 */
export abstract class KlondikeFamilyGame extends DealtTableGame {
  /** The face-down stock pile from which cards are drawn. */
  public readonly stock: CardPile<PlayingCard>;
  /** The face-up waste pile containing drawn cards. */
  public readonly waste: CardPile<PlayingCard>;
  /** How many cards a draw turns over. */
  public readonly drawCount: DrawCount;

  /** The rules used to score moves, flips, and recycles. */
  private readonly scoring: ScoringPolicy;
  private readonly columnRole: PileRole;

  constructor(options: KlondikeFamilyOptions) {
    super(options);
    this.drawCount = options.drawCount;
    this.scoring = options.scoring;
    this.columnRole = options.columnRole;
    this.stock = this.requirePile(STOCK_PILE_ID);
    this.waste = this.requirePile(WASTE_PILE_ID);
  }

  /** @inheritDoc */
  protected override initialScore(): number {
    return this.scoring.initialScore();
  }

  // --- The stock ---

  /** How many more times the waste may be recycled, which may be Infinity. */
  public get recyclesRemaining(): number {
    return Math.max(
      0,
      this.scoring.maxRecycles(this.drawCount) -
        this.timesApplied(ActionKind.RECYCLE),
    );
  }

  /**
   * Draws from the stock onto the waste, or recycles the waste once the stock
   * is empty, if the scoring allows another pass.
   */
  public drawCardsFromStock(): void {
    if (!this.stock.isEmpty) {
      this.commitAction(
        ActionKind.DRAW,
        drawToWaste(this.tabletop, this.stock, this.waste, this.drawCount),
      );
    } else if (!this.waste.isEmpty && this.recyclesRemaining > 0) {
      this.recycleWaste();
    }
  }

  /**
   * Recycles the non-empty waste back into the stock, face down, and charges
   * the penalty for doing so.
   */
  private recycleWaste(): void {
    const penalty = this.scoring.recyclePenalty(
      this.drawCount,
      this.timesApplied(ActionKind.RECYCLE) + 1,
    );
    const score = this.state.score;

    this.commitAction(
      ActionKind.RECYCLE,
      recycleWasteToStock(this.tabletop, this.waste, this.stock),
      {
        scoreDelta: this.scoring.clampScore(score - penalty) - score,
      },
    );
  }

  /**
   * Returns the plain closed outline for the empty stock once a press would do
   * nothing, and a pip per recycle left when the recycles are counted.
   *
   * @inheritDoc
   */
  public override pileBackgroundKey(
    pile: CardPile<PlayingCard>,
  ): string | undefined {
    if (pile !== this.stock) {
      return super.pileBackgroundKey(pile);
    }
    if (this.isSpentStock()) {
      return CLOSED_STOCK_PLACEHOLDER;
    }
    const allowed = this.scoring.maxRecycles(this.drawCount);
    return Number.isFinite(allowed)
      ? recyclePipsPlaceholder(this.recyclesRemaining, allowed)
      : super.pileBackgroundKey(pile);
  }

  /**
   * Returns false for the empty stock once a press would recycle nothing,
   * because the waste is empty or the recycles are spent.
   *
   * @inheritDoc
   */
  public override isEmptySlotActionable(pile: CardPile<PlayingCard>): boolean {
    return (
      !(pile === this.stock && this.isSpentStock()) &&
      super.isEmptySlotActionable(pile)
    );
  }

  /** Returns whether the stock is empty with nothing left to recycle into it. */
  private isSpentStock(): boolean {
    return (
      this.stock.isEmpty && (this.waste.isEmpty || this.recyclesRemaining === 0)
    );
  }

  // --- What a move does beyond moving its cards ---

  /**
   * Scores the move and turns over the card it exposed.
   *
   * @inheritDoc
   */
  protected override applyMoveEffects(move: ResolvedMove): MoveEffects {
    const score = this.state.score;
    const afterMove = this.scoring.clampScore(
      score +
        this.scoring.moveScore(move.sourcePile.role, move.targetPile.role),
    );
    const flipped = flipExposedTopOfColumn(move.sourcePile, this.columnRole);
    // The flip bonus comes on top of the floor, so undo takes it back too.
    const flipBonus = flipped ? this.scoring.tableauFlipBonus() : 0;

    return {
      scoreDelta: afterMove + flipBonus - score,
      flippedCardIds: flipped ? [flipped.id] : [],
    };
  }
}
