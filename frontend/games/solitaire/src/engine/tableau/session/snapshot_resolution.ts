import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { AppliedMove } from "../moves/move";
import { GameSnapshot, PileSnapshot } from "./game_snapshot";

/** Gives snapshot resolution what it needs of the game being restored. */
export interface SnapshotTarget {
  /** Returns the pile with the given id, or undefined. */
  getPileById(pileId: string): ReadonlyCardPile<PlayingCard> | undefined;
  /** Returns the card with the given id, or undefined. */
  getCardById(cardId: string): PlayingCard | undefined;
  /** How many distinct cards are in play. */
  readonly cardsInPlay: number;
}

/** Records a card of a resolved snapshot as it lies in its pile. */
export interface ResolvedCard {
  readonly card: PlayingCard;
  readonly faceUp: boolean;
}

/** Records a pile of a resolved snapshot and its cards, bottom first. */
export interface ResolvedPile {
  readonly pile: ReadonlyCardPile<PlayingCard>;
  readonly cards: readonly ResolvedCard[];
}

/** Holds a snapshot's board and deal as the game's own piles and cards. */
export interface ResolvedSnapshot {
  readonly board: readonly ResolvedPile[];
  /** The cards a restart deals, in dealt order; empty if the snapshot has none. */
  readonly deal: PlayingCard[];
}

/**
 * Returns a snapshot's board and deal as the game's own piles and cards, once
 * it has checked that the history names only those.
 *
 * @throws Error when the snapshot names a pile or card the game lacks, or does
 *   not hold every card exactly once.
 */
export function resolveSnapshot(
  snapshot: GameSnapshot,
  game: SnapshotTarget,
): ResolvedSnapshot {
  const board = resolveBoard(snapshot.piles, game);
  const deal = resolveDeal(snapshot.deal, game);
  checkHistory(snapshot.history, game);
  return { board, deal };
}

/** Returns the snapshot's piles as the game's, holding every card once. */
function resolveBoard(
  piles: readonly PileSnapshot[],
  game: SnapshotTarget,
): ResolvedPile[] {
  checkEveryCardOnce(
    piles.flatMap((pile) => pile.cards.map((card) => card.id)),
    "board",
    game,
  );
  return piles.map((pile) => ({
    pile: resolvePile(pile.id, game),
    cards: pile.cards.map(({ id, faceUp }) => ({
      card: resolveCard(id, game),
      faceUp,
    })),
  }));
}

/** Returns the snapshot's deal as the game's cards; empty if it has none. */
function resolveDeal(
  cardIds: readonly string[],
  game: SnapshotTarget,
): PlayingCard[] {
  if (cardIds.length > 0) checkEveryCardOnce(cardIds, "deal", game);
  return cardIds.map((id) => resolveCard(id, game));
}

/** Throws unless every pile and card the history names is the game's. */
function checkHistory(
  history: readonly AppliedMove[],
  game: SnapshotTarget,
): void {
  for (const move of history) {
    for (const transfer of move.transfers) {
      resolvePile(transfer.fromPileId, game);
      resolvePile(transfer.toPileId, game);
      transfer.cardIds.forEach((id) => resolveCard(id, game));
    }
    move.flippedCardIds.forEach((id) => resolveCard(id, game));
  }
}

/** Throws unless the ids are distinct and as many as the cards in play. */
function checkEveryCardOnce(
  cardIds: readonly string[],
  part: string,
  game: SnapshotTarget,
): void {
  const distinct = new Set(cardIds).size;
  if (distinct !== cardIds.length) {
    throw new Error(`The snapshot's ${part} lists a card twice.`);
  }
  if (distinct !== game.cardsInPlay) {
    throw new Error(
      `The snapshot's ${part} holds ${distinct} cards; this game has ${game.cardsInPlay}.`,
    );
  }
}

function resolvePile(
  pileId: string,
  game: SnapshotTarget,
): ReadonlyCardPile<PlayingCard> {
  const pile = game.getPileById(pileId);
  if (!pile) throw new Error(`This game has no pile "${pileId}".`);
  return pile;
}

function resolveCard(cardId: string, game: SnapshotTarget): PlayingCard {
  const card = game.getCardById(cardId);
  if (!card) throw new Error(`This game has no card "${cardId}".`);
  return card;
}
