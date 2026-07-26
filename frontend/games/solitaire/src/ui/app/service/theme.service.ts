import { Injectable, signal, computed, inject } from "@angular/core";
import { GAME_MODEL } from "../provider/game_model.provider";

export interface Theme {
  name: string;
  color: string;
  bgClass: string;
}

/**
 * Owns the table-theme catalog and the current selection. Applying a theme
 * routes the board background through the shared game model (the Phaser board
 * scene subscribes and repaints its camera), keeping the Angular layer
 * decoupled from Phaser.
 */
@Injectable({ providedIn: "root" })
export class ThemeService {
  private readonly gameModel = inject(GAME_MODEL);

  readonly themeKeys = ["green", "blue", "charcoal", "purple"] as const;
  readonly themes: Record<string, Theme> = {
    green: { name: "Emerald Felt", color: "#0f4d0e", bgClass: "theme-green" },
    blue: { name: "Deep Ocean", color: "#1b4353", bgClass: "theme-blue" },
    charcoal: {
      name: "Midnight Charcoal",
      color: "#2b2d42",
      bgClass: "theme-charcoal",
    },
    purple: { name: "Royal Velvet", color: "#3c096c", bgClass: "theme-purple" },
  };

  readonly selectedTheme = signal("green");
  readonly currentBgClass = computed(
    () => this.themes[this.selectedTheme()].bgClass,
  );

  constructor() {
    // Restore the theme that matches the persisted background color, then apply
    // it so both the overlay class and the board camera reflect it on load.
    const loadedColor = this.gameModel.settings.backgroundColor;
    const matchedKey = loadedColor
      ? Object.keys(this.themes).find(
          (key) => this.themes[key].color === loadedColor,
        )
      : undefined;
    this.setTheme(matchedKey ?? this.selectedTheme());
  }

  setTheme(themeKey: string): void {
    this.selectedTheme.set(themeKey);
    this.gameModel.settings.setBackgroundColor(this.themes[themeKey].color);
  }
}
