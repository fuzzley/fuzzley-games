import { Injectable, signal, computed, inject } from "@angular/core";
import { PresentationSettingsService } from "./presentation_settings.service";

/** A selectable table felt: its display name and board colour. */
export interface Theme {
  name: string;
  color: string;
}

/**
 * The table themes on offer, in the order they are shown.
 *
 * Each used to carry a `bgClass` too, which the shell bound onto the overlay
 * — but no stylesheet ever defined `.theme-green` and friends, so the classes
 * had no effect. The felt is drawn by the Phaser camera, which follows
 * `color` through the presentation settings; there was never a second thing
 * for the class to tint.
 */
const THEMES = {
  green: { name: "Emerald Felt", color: "#0f4d0e" },
  blue: { name: "Deep Ocean", color: "#1b4353" },
  charcoal: { name: "Midnight Charcoal", color: "#2b2d42" },
  purple: { name: "Royal Velvet", color: "#3c096c" },
} as const satisfies Record<string, Theme>;

/**
 * The key of a known theme.
 *
 * Derived from {@link THEMES} rather than listed separately, so the keys, the
 * lookup table, and every signature taking a key stay in step — and an unknown
 * key is a compile error rather than an undefined dereferenced at runtime.
 */
export type ThemeKey = keyof typeof THEMES;

/** The default theme, whose color matches the default board background. */
const DEFAULT_THEME_KEY: ThemeKey = "green";

/**
 * Owns the table-theme catalog and the current selection. Applying a theme
 * routes the board background through the presentation settings (the Phaser
 * board scene follows them and repaints its camera), keeping the Angular layer
 * decoupled from Phaser and the choice independent of which game is running.
 */
@Injectable({ providedIn: "root" })
export class ThemeService {
  private readonly presentation = inject(PresentationSettingsService);

  readonly themes: Record<ThemeKey, Theme> = THEMES;
  readonly themeKeys = Object.keys(THEMES) as ThemeKey[];

  private readonly selectedThemeSignal = signal<ThemeKey>(DEFAULT_THEME_KEY);

  /**
   * The felt currently chosen.
   *
   * Read-only from the outside, like every other piece of service state here.
   * It was writable, which made a wrong theme reachable in one step: setting
   * it directly moves the highlighted swatch without telling the presentation
   * settings, so the swatch and the felt on the table disagree. {@link
   * setTheme} is what keeps them together.
   */
  readonly selectedTheme = this.selectedThemeSignal.asReadonly();

  /** The colour of the felt currently chosen. */
  readonly currentColor = computed(
    () => this.themes[this.selectedTheme()].color,
  );

  constructor() {
    // Restore the theme that matches the persisted background color, then apply
    // it so both the overlay class and the board camera reflect it on load.
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
