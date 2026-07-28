import { Card } from "@/engine/core/card/card";
import { PlayingCard, Suit, Rank } from "@/engine/core/card/playing_card";

/**
 * Builds a plain {@link Card} with sensible defaults. Pass overrides for the
 * fields a test actually cares about so the intent of each test stays obvious.
 */
export function makeCard(overrides: Partial<Card> = {}): Card {
  const id = overrides.id ?? "card";
  // Defaults to the id, which is what a single-deck game's cards look like and
  // keeps a test that only names an id from having to name a face as well.
  return { id, faceKey: id, faceUp: false, ...overrides };
}

/**
 * Builds a {@link PlayingCard} with sensible defaults. Only the fields a test
 * depends on need to be supplied via overrides.
 */
export function makePlayingCard(
  overrides: Partial<Pick<PlayingCard, "id" | "faceUp" | "suit" | "rank">> = {},
): PlayingCard {
  return new PlayingCard(
    overrides.id ?? "card",
    overrides.suit ?? Suit.SPADE,
    overrides.rank ?? Rank.ACE,
    overrides.faceUp ?? false,
  );
}
