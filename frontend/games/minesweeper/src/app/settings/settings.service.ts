import { Injectable, computed } from "@angular/core";
import { type StoredFields, storedSignal } from "@fz/ui/storage";
import {
  DEFAULT_CUSTOM,
  type DifficultyId,
  type FieldSize,
  LIVES,
  isDifficultyId,
  isValidLives,
  isValidSize,
  sizeOf,
} from "../../rules/difficulty";
import { isRecord, isWhole } from "@fz/core/json";

/** Where the settings are kept. Renaming it loses every player's. */
export const SETTINGS_KEY = "minesweeper-settings";

/** The shape the settings are kept in; a reader drops any other. */
const SETTINGS_VERSION = 1;

/** Says what game the player deals: its difficulty and lives. */
export interface Settings {
  readonly difficulty: DifficultyId;
  /** The player's own field, which Custom deals. */
  readonly custom: FieldSize;
  readonly lives: number;
}

/** The settings a player starts with. */
export const DEFAULT_SETTINGS: Settings = {
  difficulty: "medium",
  custom: DEFAULT_CUSTOM,
  lives: LIVES.default,
};

/** Holds and keeps the player's settings. */
@Injectable({ providedIn: "root" })
export class SettingsService {
  private readonly state = storedSignal({
    key: SETTINGS_KEY,
    version: SETTINGS_VERSION,
    read: settingsFrom,
  });

  /** The settings in use. */
  readonly settings = this.state.asReadonly();

  /** The field the settings deal. */
  readonly size = computed(() => {
    const { difficulty, custom } = this.state();
    return sizeOf(difficulty, custom);
  });

  /** Changes some of the settings, and keeps them. */
  update(change: Partial<Settings>): void {
    this.state.update((settings) => ({ ...settings, ...change }));
  }
}

/** Returns the settings stored, each one that makes sense, else the default. */
function settingsFrom(saved: StoredFields | null): Settings {
  if (!saved) return DEFAULT_SETTINGS;
  const { difficulty, custom, lives } = saved;
  return {
    difficulty: isDifficultyId(difficulty)
      ? difficulty
      : DEFAULT_SETTINGS.difficulty,
    custom: sizeFrom(custom) ?? DEFAULT_SETTINGS.custom,
    lives: isValidLives(lives) ? lives : DEFAULT_SETTINGS.lives,
  };
}

/** Returns the custom field stored, or null if the game couldn't deal it. */
function sizeFrom(value: unknown): FieldSize | null {
  if (!isRecord(value)) return null;
  const { rows, cols, mines } = value;
  if (!isWhole(rows) || !isWhole(cols) || !isWhole(mines)) return null;
  const size = { rows, cols, mines };
  return isValidSize(size) ? size : null;
}
