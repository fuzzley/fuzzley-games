import { PileRole } from "@/engine/core/card/card_pile";
import { KlondikeRole } from "./klondike_rules";
import { DrawCount } from "./klondike_settings";

/**
 * The piles a scoring rule distinguishes between.
 *
 * Named rather than assumed. This policy is shared with Double Klondike, and it
 * used to compare raw role strings against Klondike's own — so a game whose
 * roles happened to spell "tableau" differently would have compiled cleanly and
 * scored every move zero. Passing the roles in makes that a type error instead
 * of a silent one, and lets a game keep its own vocabulary.
 */
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
   * @param roles Which piles this policy treats as the waste, the columns and
   *   the foundations. Defaults to Klondike's own.
   */
  constructor(private readonly roles: ScoringRoles = KLONDIKE_SCORING_ROLES) {}

  /**
   * The signed score change for moving a card between two pile types.
   *
   * @param sourceRole The type of the pile the card is leaving.
   * @param targetRole The type of the pile the card is moving to.
   * @returns The points to add to the score (may be negative).
   */
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
