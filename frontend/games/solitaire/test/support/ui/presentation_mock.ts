import { vi } from "vitest";
import { computed, signal } from "@angular/core";
import type {
  CardBackStyle,
  CardStyle,
  PresentationSettingsService,
} from "@/ui/app/service/presentation_settings.service";
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
    overrides.cardBackStyle ?? "card-back-blue",
  );
  const theme = signal<ThemeKey>(overrides.theme ?? DEFAULT_THEME);
  const cardStyle = signal<CardStyle>(overrides.cardStyle ?? "auto");
  const desktopCardDeck = signal<DesktopCardDeckId>(
    overrides.desktopCardDeck ?? DEFAULT_DESKTOP_CARD_DECK,
  );
  const cardDeck = computed<CardDeckId>(() =>
    cardStyle() === "mobile" ? MOBILE_CARD_DECK.id : desktopCardDeck(),
  );
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
    theme,
    backgroundColor: computed(() => TABLE_THEMES[theme()].color),
    cardStyle,
    desktopCardDeck,
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
    setTheme: vi.fn((key: ThemeKey) => {
      theme.set(key);
    }),
    setCardStyle: vi.fn((style: CardStyle) => {
      cardStyle.set(style);
    }),
    setDesktopCardDeck: vi.fn((deckId: DesktopCardDeckId) => {
      desktopCardDeck.set(deckId);
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
