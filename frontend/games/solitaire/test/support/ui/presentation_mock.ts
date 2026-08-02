import { vi } from "vitest";
import { signal } from "@angular/core";
import type {
  CardBackStyle,
  PresentationSettingsService,
} from "@/ui/app/service/presentation_settings.service";

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
  } = {},
) {
  const cardBackStyle = signal<CardBackStyle>(
    overrides.cardBackStyle ?? "card-back-blue",
  );
  const backgroundColor = signal(overrides.backgroundColor ?? "");

  return {
    cardBackStyle,
    backgroundColor,
    cardBackKey: () => cardBackStyle(),
    onBackgroundColor: vi.fn(() => () => undefined),
    setCardBackStyle: vi.fn((style: CardBackStyle) => {
      cardBackStyle.set(style);
    }),
    setBackgroundColor: vi.fn((color: string) => {
      backgroundColor.set(color);
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
