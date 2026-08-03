import { vi } from "vitest";
import { signal } from "@angular/core";
import type {
  CardBackStyle,
  PresentationSettingsService,
} from "@/ui/app/service/presentation_settings.service";
import { CardDeckId, DEFAULT_CARD_DECK } from "@/engine/render/card_deck";

/**
 * A mock of the presentation settings, which are no longer part of any game.
 *
 * Separate from the game mock because the split is the point: a card back and
 * a felt colour outlive whichever game is being played.
 *
 * The setters hold real state behind the spy, so a spec can assert either the
 * call or the value it produced — the latter usually reads better.
 */
export function createMockPresentation(
  overrides: {
    cardBackStyle?: CardBackStyle;
    backgroundColor?: string;
    cardDeck?: CardDeckId;
    pendingCardDeck?: CardDeckId | null;
    cardDeckProblem?: string | null;
  } = {},
) {
  const cardBackStyle = signal<CardBackStyle>(
    overrides.cardBackStyle ?? "card-back-blue",
  );
  const backgroundColor = signal(overrides.backgroundColor ?? "");
  const cardDeck = signal<CardDeckId>(overrides.cardDeck ?? DEFAULT_CARD_DECK);
  // Held as signals like the rest, so a spec can put the drawer into a
  // mid-swap or failed state and read what it drew.
  const pendingCardDeck = signal<CardDeckId | null>(
    overrides.pendingCardDeck ?? null,
  );
  const cardDeckProblem = signal<string | null>(
    overrides.cardDeckProblem ?? null,
  );

  return {
    cardBackStyle,
    backgroundColor,
    cardDeck,
    pendingCardDeck,
    cardDeckProblem,
    cardBackKey: () => cardBackStyle(),
    cardDeckId: () => cardDeck(),
    onBackgroundColor: vi.fn(() => () => undefined),
    onCardDeck: vi.fn(() => () => undefined),
    reportCardDeckStatus: vi.fn(),
    setCardBackStyle: vi.fn((style: CardBackStyle) => {
      cardBackStyle.set(style);
    }),
    setBackgroundColor: vi.fn((color: string) => {
      backgroundColor.set(color);
    }),
    setCardDeck: vi.fn((deckId: CardDeckId) => {
      cardDeck.set(deckId);
    }),
  };
}

export type MockPresentation = ReturnType<typeof createMockPresentation>;

/** Casts the mock to the service type the UI injects. */
export function asPresentation(
  mock: MockPresentation,
): PresentationSettingsService {
  return mock as unknown as PresentationSettingsService;
}
