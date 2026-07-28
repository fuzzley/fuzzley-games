import { PileRole } from "@/engine/core/card/card_pile";
import { KlondikeRole } from "@/games/klondike/klondike_zones";
import { DrawCount } from "./game_settings";

/**
 * Encapsulates the standard Klondike scoring rules.
 *
 * Keeping the rules in one place lets {@link KlondikeGame} stay focused on
 * moving cards, keeps every magic number in a single readable spot, and makes
 * alternate rulesets (e.g. Vegas scoring) a matter of swapping the policy.
 */
export class ScoringPolicy {
  /** Points awarded to move waste cards down onto a tableau. */
  private static readonly WASTE_TO_TABLEAU = 5;
  /** Points awarded to move a card up onto a foundation. */
  private static readonly TO_FOUNDATION = 10;
  /** Points deducted for pulling a card back off a foundation. */
  private static readonly FOUNDATION_TO_TABLEAU = -15;
  /** Bonus for turning a newly exposed tableau card face up. */
  private static readonly TABLEAU_FLIP_BONUS = 5;
  /** Penalty for recycling the waste beyond the free passes in Draw 1. */
  private static readonly DRAW_ONE_RECYCLE_PENALTY = 100;
  /** Penalty for recycling the waste beyond the free passes in Draw 3. */
  private static readonly DRAW_THREE_RECYCLE_PENALTY = 20;

  /**
   * The signed score change for moving a card between two pile types.
   *
   * @param sourceRole The type of the pile the card is leaving.
   * @param targetRole The type of the pile the card is moving to.
   * @returns The points to add to the score (may be negative).
   */
  public moveScore(sourceRole: PileRole, targetRole: PileRole): number {
    if (
      sourceRole === KlondikeRole.WASTE &&
      targetRole === KlondikeRole.TABLEAU
    ) {
      return ScoringPolicy.WASTE_TO_TABLEAU;
    }
    if (
      sourceRole === KlondikeRole.WASTE &&
      targetRole === KlondikeRole.FOUNDATION
    ) {
      return ScoringPolicy.TO_FOUNDATION;
    }
    if (
      sourceRole === KlondikeRole.TABLEAU &&
      targetRole === KlondikeRole.FOUNDATION
    ) {
      return ScoringPolicy.TO_FOUNDATION;
    }
    if (
      sourceRole === KlondikeRole.FOUNDATION &&
      targetRole === KlondikeRole.TABLEAU
    ) {
      return ScoringPolicy.FOUNDATION_TO_TABLEAU;
    }
    return 0;
  }

  /** The bonus for turning a face-down tableau card face up. */
  public tableauFlipBonus(): number {
    return ScoringPolicy.TABLEAU_FLIP_BONUS;
  }

  /**
   * The non-negative penalty for recycling the waste back into the stock. The
   * early passes in each draw mode are free.
   *
   * @param drawCount The active draw-count mode.
   * @param recycleCount How many times the waste has been recycled this game.
   * @returns The points to subtract from the score (never negative).
   */
  public recyclePenalty(drawCount: DrawCount, recycleCount: number): number {
    if (drawCount === 1) {
      return recycleCount > 1 ? ScoringPolicy.DRAW_ONE_RECYCLE_PENALTY : 0;
    }
    return recycleCount > 3 ? ScoringPolicy.DRAW_THREE_RECYCLE_PENALTY : 0;
  }
}
