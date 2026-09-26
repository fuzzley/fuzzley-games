import { Card } from "@/engine/core/card/card";
import { PlayingCard, Suit, Rank } from "@/engine/core/card/playing_card";

/** Builds a plain {@link Card}, with overrides for the fields a test uses. */
export function makeCard(overrides: Partial<Card> = {}): Card {
  const id = overrides.id ?? "card";
  // The face defaults to the id, as a single-deck game's does.
  return { id, faceKey: id, faceUp: false, ...overrides };
}

/** Builds a {@link PlayingCard}, with overrides for the fields a test uses. */
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
