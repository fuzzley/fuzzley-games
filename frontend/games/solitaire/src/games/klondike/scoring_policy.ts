import { PileRole } from "@/engine/core/card/card_pile";
import { DrawCount, KlondikeRole } from "./klondike_rules";

/** Names the roles a scoring rule tells apart. */
export interface ScoringRoles {
  /** The face-up pile of drawn cards. */
  readonly waste: PileRole;
  /** A board column. */
  readonly tableau: PileRole;
  /** A suit pile built up from Ace to King. */
  readonly foundation: PileRole;
}

/** The roles a standard Klondike board plays by. */
export const KLONDIKE_SCORING_ROLES: ScoringRoles = {
  waste: KlondikeRole.WASTE,
  tableau: KlondikeRole.TABLEAU,
  foundation: KlondikeRole.FOUNDATION,
};

/** Scores Klondike moves, flips and recycles by the standard rules. */
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

  /** Creates a policy that scores by the given roles, Klondike's by default. */
  constructor(private readonly roles: ScoringRoles = KLONDIKE_SCORING_ROLES) {}

  /** Returns the signed score change for moving a card between two roles. */
  public moveScore(sourceRole: PileRole, targetRole: PileRole): number {
    const { waste, tableau, foundation } = this.roles;

    if (sourceRole === waste && targetRole === tableau) {
      return ScoringPolicy.WASTE_TO_TABLEAU;
    }
    if (sourceRole === waste && targetRole === foundation) {
      return ScoringPolicy.TO_FOUNDATION;
    }
    if (sourceRole === tableau && targetRole === foundation) {
      return ScoringPolicy.TO_FOUNDATION;
    }
    if (sourceRole === foundation && targetRole === tableau) {
      return ScoringPolicy.FOUNDATION_TO_TABLEAU;
    }
    return 0;
  }

  /** Returns the bonus for turning a face-down tableau card face up. */
  public tableauFlipBonus(): number {
    return ScoringPolicy.TABLEAU_FLIP_BONUS;
  }

  /**
   * Returns the points to subtract for recycling the waste, where the first
   * passes in each draw mode are free.
   *
   * @param recycleCount How many times the waste has been recycled this game.
   */
  public recyclePenalty(drawCount: DrawCount, recycleCount: number): number {
    if (drawCount === 1) {
      return recycleCount > 1 ? ScoringPolicy.DRAW_ONE_RECYCLE_PENALTY : 0;
    }
    return recycleCount > 3 ? ScoringPolicy.DRAW_THREE_RECYCLE_PENALTY : 0;
  }
}
