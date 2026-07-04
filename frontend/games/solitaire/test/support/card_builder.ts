import { Card } from "@/game/model/card/card";
import { PlayingCard, Suit, Type } from "@/game/model/card/playing_card";

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
  overrides: Partial<
    Pick<PlayingCard, "id" | "faceUp" | "suite" | "type">
  > = {},
): PlayingCard {
  const card = new PlayingCard();
  card.id = overrides.id ?? "card";
  card.faceUp = overrides.faceUp ?? false;
  card.suite = overrides.suite ?? Suit.SPADE;
  card.type = overrides.type ?? Type.ACE;
  return card;
}
