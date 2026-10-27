import { Injectable, inject, signal } from "@angular/core";
import { LocalStorageService } from "@fz/ui/storage";
import { type Level, isLevel } from "../../rules/difficulty";

/** Where the settings are kept. Renaming it loses every player's. */
export const SETTINGS_KEY = "sudoku-settings";

/** The shape the settings are kept in; a reader drops any other. */
const SETTINGS_VERSION = 1;

/** Says what the player deals, and which assists they play with. */
export interface Settings {
  readonly level: Level;
  /** Whether a digit the solution doesn't hold is marked as a repeat is. */
  readonly markMistakes: boolean;
  /** Whether a digit placed comes out of its peers' notes. */
  readonly clearNotes: boolean;
}

/** The settings a player starts with. */
export const DEFAULT_SETTINGS: Settings = {
  level: "easy",
  markMistakes: false,
  clearNotes: true,
};

/** Holds and keeps the player's settings. */
@Injectable({ providedIn: "root" })
export class SettingsService {
  private readonly storage = inject(LocalStorageService);
  private readonly state = signal(this.read());

  /** The settings in use. */
  readonly settings = this.state.asReadonly();

  /** Changes some of the settings, and keeps them. */
  update(change: Partial<Settings>): void {
    this.state.update((settings) => ({ ...settings, ...change }));
    this.storage.writeVersioned(SETTINGS_KEY, SETTINGS_VERSION, this.state());
  }

  /** Returns the settings stored, each one that makes sense, else the default. */
  private read(): Settings {
    const saved = this.storage.readVersioned(SETTINGS_KEY, SETTINGS_VERSION);
    if (!saved) return DEFAULT_SETTINGS;
    const { level, markMistakes, clearNotes } = saved;
    return {
      level: isLevel(level) ? level : DEFAULT_SETTINGS.level,
      markMistakes:
        typeof markMistakes === "boolean"
          ? markMistakes
          : DEFAULT_SETTINGS.markMistakes,
      clearNotes:
        typeof clearNotes === "boolean"
          ? clearNotes
          : DEFAULT_SETTINGS.clearNotes,
    };
  }
}
