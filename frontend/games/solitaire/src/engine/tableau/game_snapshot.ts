import { AppliedMove } from "./move";

/** A card as it lies in a pile. */
export interface CardSnapshot {
  readonly id: string;
  readonly faceUp: boolean;
}

/** A pile and its cards, bottom-first. */
export interface PileSnapshot {
  readonly id: string;
  readonly cards: readonly CardSnapshot[];
}

/** Everything needed to put a dealt game back exactly as it was. */
export interface GameSnapshot {
  /** Every pile, in the order the game declares them. */
  readonly piles: readonly PileSnapshot[];
  readonly score: number;
  readonly moves: number;
  /** The actions undo can take back, oldest first. */
  readonly history: readonly AppliedMove[];
  /** The card ids a restart deals, in dealt order. */
  readonly deal: readonly string[];
  /** What the game keeps outside its piles, in a shape of its own. */
  readonly extra: unknown;
}
