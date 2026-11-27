import { Injectable, computed, inject } from "@angular/core";
import { booleanOr } from "@fz/core/json";
import { isOneOf } from "@fz/core/records";
import { GameViewportService } from "@fz/game-ui/viewport";
import { type StoredFields, storedSignal } from "@fz/ui/storage";
import { SPEEDS, type Speed } from "../../view/timeline/pace";

/** Where the settings are kept. Renaming it loses every player's. */
const SETTINGS_KEY = "fuzz-flux-settings";

/** The shape the settings are kept in; a reader drops any other. */
const SETTINGS_VERSION = 1;

/** Says how the player plays. */
export interface Settings {
  /** How fast a move plays (C6). */
  readonly speed: Speed;
  /** Whether Less motion is on, or null until the player sets it, while it follows the system (C7). */
  readonly lessMotion: boolean | null;
  /** Whether the board plays its sounds. */
  readonly sound: boolean;
}

/** The settings a player starts with. */
const DEFAULT_SETTINGS: Settings = {
  speed: "normal",
  lessMotion: null,
  sound: true,
};

/** Holds and keeps the player's settings. */
@Injectable({ providedIn: "root" })
export class SettingsService {
  private readonly viewport = inject(GameViewportService);

  private readonly state = storedSignal({
    key: SETTINGS_KEY,
    version: SETTINGS_VERSION,
    read: settingsFrom,
  });

  /** The settings in use. */
  readonly settings = this.state.asReadonly();

  /**
   * Whether Less motion is on: as the player set it, or, until they do,
   * where the system asks for less motion (C7).
   */
  readonly lessMotion = computed(
    () => this.state().lessMotion ?? !this.viewport.allowsMotion(),
  );

  /** Changes some of the settings, and keeps them. */
  update(change: Partial<Settings>): void {
    this.state.update((settings) => ({ ...settings, ...change }));
  }
}

/** Returns the settings stored, each one that makes sense, else the default. */
function settingsFrom(saved: StoredFields | null): Settings {
  if (!saved) return DEFAULT_SETTINGS;
  const { speed, lessMotion, sound } = saved;
  return {
    speed: isOneOf(speed, SPEEDS) ? speed : DEFAULT_SETTINGS.speed,
    lessMotion: typeof lessMotion === "boolean" ? lessMotion : null,
    sound: booleanOr(sound, DEFAULT_SETTINGS.sound),
  };
}
