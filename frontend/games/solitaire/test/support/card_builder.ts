import { Card } from "@/engine/core/card/card";
import { PlayingCard, Suit, Rank } from "@/engine/core/card/playing_card";

/**
 * Builds a plain {@link Card} with sensible defaults. Pass overrides for the
 * fields a test actually cares about so the intent of each test stays obvious.
 */
export function makeCard(overrides: Partial<Card> = {}): Card {
  return { id: "card", faceUp: false, ...overrides };
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
