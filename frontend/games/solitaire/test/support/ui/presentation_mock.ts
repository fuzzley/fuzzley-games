import { vi } from "vitest";
import { computed, signal } from "@angular/core";
import type {
  CardStyle,
  PresentationSettingsService,
} from "@/ui/app/service/presentation_settings.service";
import { CardBackStyle, DEFAULT_CARD_BACK } from "@/engine/render/card_back";
import {
  CardDeckId,
  DEFAULT_DESKTOP_CARD_DECK,
  DesktopCardDeckId,
  MOBILE_CARD_DECK,
} from "@/engine/render/card_deck";
import {
  DEFAULT_THEME,
  TABLE_THEMES,
  ThemeKey,
} from "@/ui/app/model/table_theme";
import type {
  Hand,
  PhonePilePosition,
} from "@/engine/render/layout/board_layouts";

/**
 * Creates a mock of the presentation settings whose setters hold real state
 * behind their spies.
 *
 * Its viewport is never compact, so `auto` draws the desktop deck.
 */
export function createMockPresentation(
  overrides: {
    cardBackStyle?: CardBackStyle;
    theme?: ThemeKey;
    cardStyle?: CardStyle;
    desktopCardDeck?: DesktopCardDeckId;
    pendingCardDeck?: CardDeckId | null;
    cardDeckProblem?: string | null;
  } = {},
) {
  const cardBackStyle = signal<CardBackStyle>(
    overrides.cardBackStyle ?? DEFAULT_CARD_BACK,
  );
  const theme = signal<ThemeKey>(overrides.theme ?? DEFAULT_THEME);
  const cardStyle = signal<CardStyle>(overrides.cardStyle ?? "auto");
  const desktopCardDeck = signal<DesktopCardDeckId>(
    overrides.desktopCardDeck ?? DEFAULT_DESKTOP_CARD_DECK,
  );
  const drawsDesktopCards = computed(() => cardStyle() !== "mobile");
  const cardDeck = computed<CardDeckId>(() =>
    drawsDesktopCards() ? desktopCardDeck() : MOBILE_CARD_DECK.id,
  );
  // Held as signals like the rest, so a spec can put the drawer into a
  // mid-swap or failed state and read what it drew.
  const pendingCardDeck = signal<CardDeckId | null>(
    overrides.pendingCardDeck ?? null,
  );
  const cardDeckProblem = signal<string | null>(
    overrides.cardDeckProblem ?? null,
  );
  const phonePiles = signal<PhonePilePosition>("bottom");
  const hand = signal<Hand>("right");

  return {
    cardBackStyle,
    theme,
    backgroundColor: computed(() => TABLE_THEMES[theme()].color),
    cardStyle,
    desktopCardDeck,
    drawsDesktopCards,
    cardDeck,
    pendingCardDeck,
    cardDeckProblem,
    phonePiles,
    hand,
    boardArrangement: () => ({ phonePiles: phonePiles(), hand: hand() }),
    cardBackKey: () => cardBackStyle(),
    cardDeckId: () => cardDeck(),
    onBackgroundColor: vi.fn(() => () => undefined),
    onCardDeck: vi.fn(() => () => undefined),
    reportCardDeckStatus: vi.fn(),
    setCardBackStyle: vi.fn((style: CardBackStyle) => {
      cardBackStyle.set(style);
    }),
    setTheme: vi.fn((key: ThemeKey) => {
      theme.set(key);
    }),
    setCardStyle: vi.fn((style: CardStyle) => {
      cardStyle.set(style);
    }),
    setDesktopCardDeck: vi.fn((deckId: DesktopCardDeckId) => {
      desktopCardDeck.set(deckId);
    }),
    setPhonePiles: vi.fn((position: PhonePilePosition) => {
      phonePiles.set(position);
    }),
    setHand: vi.fn((chosen: Hand) => {
      hand.set(chosen);
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
