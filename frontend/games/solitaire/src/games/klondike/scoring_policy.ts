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

/** Which way a Klondike game is scored. */
export const KlondikeScoring = {
  /** Points for progress, with unlimited recycles. */
  STANDARD: "standard",
  /** Dollars per card on the foundations, with limited passes. */
  VEGAS: "vegas",
} as const;

/** Names one of the ways a Klondike game is scored. */
export type KlondikeScoring =
  (typeof KlondikeScoring)[keyof typeof KlondikeScoring];

/**
 * Scores a game of the Klondike family, and says how often its waste may be
 * recycled, since the two are chosen together.
 */
export interface ScoringPolicy {
  /** Returns the score a fresh deal starts at. */
  initialScore(): number;

  /** Returns the signed score change for moving a card between two roles. */
  moveScore(sourceRole: PileRole, targetRole: PileRole): number;

  /** Returns the bonus for turning a face-down tableau card face up. */
  tableauFlipBonus(): number;

  /**
   * Returns the points to subtract for recycling the waste.
   *
   * @param recycleCount How many times the waste has been recycled this game,
   *   this recycle included.
   */
  recyclePenalty(drawCount: DrawCount, recycleCount: number): number;

  /** Returns how many times the waste may be recycled, which may be Infinity. */
  maxRecycles(drawCount: DrawCount): number;

  /** Returns a score held to whatever floor the policy keeps. */
  clampScore(score: number): number;
}

/** Scores Klondike by the standard rules, never letting the score below zero. */
export class StandardScoringPolicy implements ScoringPolicy {
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

  /** @inheritDoc */
  public initialScore(): number {
    return 0;
  }

  /** @inheritDoc */
  public moveScore(sourceRole: PileRole, targetRole: PileRole): number {
    const { waste, tableau, foundation } = this.roles;

    if (sourceRole === waste && targetRole === tableau) {
      return StandardScoringPolicy.WASTE_TO_TABLEAU;
    }
    if (sourceRole === waste && targetRole === foundation) {
      return StandardScoringPolicy.TO_FOUNDATION;
    }
    if (sourceRole === tableau && targetRole === foundation) {
      return StandardScoringPolicy.TO_FOUNDATION;
    }
    if (sourceRole === foundation && targetRole === tableau) {
      return StandardScoringPolicy.FOUNDATION_TO_TABLEAU;
    }
    return 0;
  }

  /** @inheritDoc */
  public tableauFlipBonus(): number {
    return StandardScoringPolicy.TABLEAU_FLIP_BONUS;
  }

  /**
   * Returns the points to subtract for recycling the waste, where the first
   * passes in each draw mode are free.
   *
   * @inheritDoc
   */
  public recyclePenalty(drawCount: DrawCount, recycleCount: number): number {
    if (drawCount === 1) {
      return recycleCount > 1
        ? StandardScoringPolicy.DRAW_ONE_RECYCLE_PENALTY
        : 0;
    }
    return recycleCount > 3
      ? StandardScoringPolicy.DRAW_THREE_RECYCLE_PENALTY
      : 0;
  }

  /** @inheritDoc */
  public maxRecycles(): number {
    return Infinity;
  }

  /** @inheritDoc */
  public clampScore(score: number): number {
    return Math.max(0, score);
  }
}

/**
 * Scores Klondike as Las Vegas does: the deck is bought for a dollar a card and
 * each card on a foundation pays five back, over a limited number of passes.
 */
export class VegasScoringPolicy implements ScoringPolicy {
  /** What the deck costs: a dollar for each of its 52 cards. */
  private static readonly STAKE = 52;
  /** What each card played to a foundation pays, and taking one back costs. */
  private static readonly PER_FOUNDATION_CARD = 5;
  /** How many times the waste may be recycled, by draw count. */
  private static readonly MAX_RECYCLES: Readonly<Record<DrawCount, number>> = {
    // One pass through the stock.
    1: 0,
    // Three passes through the stock.
    3: 2,
  };

  /** Creates a policy that scores by the given roles, Klondike's by default. */
  constructor(private readonly roles: ScoringRoles = KLONDIKE_SCORING_ROLES) {}

  /** @inheritDoc */
  public initialScore(): number {
    return -VegasScoringPolicy.STAKE;
  }

  /** @inheritDoc */
  public moveScore(sourceRole: PileRole, targetRole: PileRole): number {
    const { foundation } = this.roles;

    if (targetRole === foundation && sourceRole !== foundation) {
      return VegasScoringPolicy.PER_FOUNDATION_CARD;
    }
    if (sourceRole === foundation && targetRole !== foundation) {
      return -VegasScoringPolicy.PER_FOUNDATION_CARD;
    }
    return 0;
  }

  /** @inheritDoc */
  public tableauFlipBonus(): number {
    return 0;
  }

  /** @inheritDoc */
  public recyclePenalty(): number {
    return 0;
  }

  /** @inheritDoc */
  public maxRecycles(drawCount: DrawCount): number {
    return VegasScoringPolicy.MAX_RECYCLES[drawCount];
  }

  /** @inheritDoc */
  public clampScore(score: number): number {
    return score;
  }
}

/** Returns the policy that scores Klondike's own board by `scoring`. */
export function klondikeScoringPolicy(scoring: KlondikeScoring): ScoringPolicy {
  return scoring === KlondikeScoring.VEGAS
    ? new VegasScoringPolicy()
    : new StandardScoringPolicy();
}
