import { Injectable, signal, computed, inject } from "@angular/core";
import { PresentationSettingsService } from "./presentation_settings.service";

/** Describes a selectable table felt: its display name and board colour. */
export interface Theme {
  name: string;
  color: string;
}

/** The table themes on offer, in the order they are shown. */
const THEMES = {
  green: { name: "Emerald Felt", color: "#0f4d0e" },
  blue: { name: "Deep Ocean", color: "#1b4353" },
  charcoal: { name: "Midnight Charcoal", color: "#2b2d42" },
  purple: { name: "Royal Velvet", color: "#3c096c" },
} as const satisfies Record<string, Theme>;

/** Names a known theme. */
export type ThemeKey = keyof typeof THEMES;

/** The default theme, whose color matches the default board background. */
const DEFAULT_THEME_KEY: ThemeKey = "green";

/**
 * Owns the table themes and the one chosen, whose colour it passes to the
 * presentation settings for the board to paint.
 */
@Injectable({ providedIn: "root" })
export class ThemeService {
  private readonly presentation = inject(PresentationSettingsService);

  readonly themes: Record<ThemeKey, Theme> = THEMES;
  readonly themeKeys = Object.keys(THEMES) as ThemeKey[];

  private readonly selectedThemeSignal = signal<ThemeKey>(DEFAULT_THEME_KEY);

  /** The felt currently chosen. */
  readonly selectedTheme = this.selectedThemeSignal.asReadonly();

  /** The colour of the felt currently chosen. */
  readonly currentColor = computed(
    () => this.themes[this.selectedTheme()].color,
  );

  constructor() {
    // Pick the theme matching the saved background colour, and apply it.
    const loadedColor = this.presentation.backgroundColor();
    const matchedKey = this.themeKeys.find(
      (key) => this.themes[key].color === loadedColor,
    );
    this.setTheme(matchedKey ?? this.selectedTheme());
  }

  setTheme(themeKey: ThemeKey): void {
    this.selectedThemeSignal.set(themeKey);
    this.presentation.setBackgroundColor(this.themes[themeKey].color);
  }
}
