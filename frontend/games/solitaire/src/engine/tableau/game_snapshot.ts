import {
  readBoolean,
  readList,
  readNumber,
  readObject,
  readString,
} from "@/engine/core/common/json_reader";
import { AppliedMove, CardTransfer } from "./move";

/** Records a card as it lies in a pile. */
export interface CardSnapshot {
  readonly id: string;
  readonly faceUp: boolean;
}

/** Records a pile and its cards, bottom first. */
export interface PileSnapshot {
  readonly id: string;
  readonly cards: readonly CardSnapshot[];
}

/** Records everything needed to put a dealt game back exactly as it was. */
export interface GameSnapshot {
  /** Every pile, in the order the game declares them. */
  readonly piles: readonly PileSnapshot[];
  readonly score: number;
  /**
   * The actions undo can take back, oldest first, whose length is the move
   * count.
   */
  readonly history: readonly AppliedMove[];
  /** The card ids a restart deals, in dealt order. */
  readonly deal: readonly string[];
  /** What the game keeps outside its piles, in a shape of its own. */
  readonly extra: unknown;
}

/**
 * Reads a value from outside, such as parsed JSON, as a snapshot.
 *
 * Whether it fits a particular game is for `restore` to say.
 *
 * @throws Error naming the first part that is malformed.
 */
export function readGameSnapshot(
  value: unknown,
  path = "snapshot",
): GameSnapshot {
  const snapshot = readObject(value, path);
  return {
    piles: readList(snapshot.piles, `${path}.piles`, readPile),
    score: readNumber(snapshot.score, `${path}.score`),
    history: readList(snapshot.history, `${path}.history`, readAppliedMove),
    deal: readList(snapshot.deal, `${path}.deal`, readString),
    extra: snapshot.extra,
  };
}

function readPile(value: unknown, path: string): PileSnapshot {
  const pile = readObject(value, path);
  return {
    id: readString(pile.id, `${path}.id`),
    cards: readList(pile.cards, `${path}.cards`, readCard),
  };
}

function readCard(value: unknown, path: string): CardSnapshot {
  const card = readObject(value, path);
  return {
    id: readString(card.id, `${path}.id`),
    faceUp: readBoolean(card.faceUp, `${path}.faceUp`),
  };
}

function readAppliedMove(value: unknown, path: string): AppliedMove {
  const move = readObject(value, path);
  return {
    kind: readString(move.kind, `${path}.kind`),
    transfers: readList(move.transfers, `${path}.transfers`, readTransfer),
    scoreDelta: readNumber(move.scoreDelta, `${path}.scoreDelta`),
    flippedCardIds: readList(
      move.flippedCardIds,
      `${path}.flippedCardIds`,
      readString,
    ),
  };
}

function readTransfer(value: unknown, path: string): CardTransfer {
  const transfer = readObject(value, path);
  return {
    cardIds: readList(transfer.cardIds, `${path}.cardIds`, readString),
    fromPileId: readString(transfer.fromPileId, `${path}.fromPileId`),
    toPileId: readString(transfer.toPileId, `${path}.toPileId`),
    faceUpBefore: readBoolean(transfer.faceUpBefore, `${path}.faceUpBefore`),
  };
}
