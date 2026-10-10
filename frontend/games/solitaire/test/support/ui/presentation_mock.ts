import { vi } from "vitest";
import { computed, signal } from "@angular/core";
import type {
  CardStyle,
  PresentationSettingsService,
} from "@/ui/app/service/presentation_settings.service";
import {
  CardBackStyle,
  DEFAULT_CARD_BACK,
} from "@/engine/render/deck/card_back";
import {
  CardDeckId,
  DEFAULT_DESKTOP_CARD_DECK,
  DesktopCardDeckId,
  MOBILE_CARD_DECK,
} from "@/engine/render/deck/card_deck";
import {
  DEFAULT_THEME,
  TABLE_THEMES,
  ThemeKey,
} from "@/ui/app/model/table_theme";
import {
  OrAuto,
  PilePosition,
  StockSide,
  resolveArrangement,
} from "@/engine/render/layout/board_arrangement";
import type { FormFactor } from "@/engine/render/layout/form_factor";

/**
 * Creates a mock of the presentation settings whose setters hold real state
 * behind their spies.
 *
 * Its viewport is never compact, so `auto` draws the desktop deck. Where the
 * piles go and the stock's side are decided for its `formFactor`, which is
 * roomy unless a spec sets it.
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
  const piles = signal<OrAuto<PilePosition>>("auto");
  const stockSide = signal<OrAuto<StockSide>>("auto");
  const formFactor = signal<FormFactor>("roomy");
  const arrangement = computed(() => ({
    piles: piles(),
    stockSide: stockSide(),
  }));

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
    piles,
    stockSide,
    formFactor,
    resolvedArrangement: computed(() =>
      resolveArrangement(arrangement(), formFactor()),
    ),
    boardArrangement: () => arrangement(),
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
    setPiles: vi.fn((position: OrAuto<PilePosition>) => {
      piles.set(position);
    }),
    setStockSide: vi.fn((side: OrAuto<StockSide>) => {
      stockSide.set(side);
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
