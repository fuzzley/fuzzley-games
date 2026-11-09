import { Injectable } from "@angular/core";
import { booleanOr } from "@fz/core/json";
import { isOneOf } from "@fz/core/records";
import { type StoredFields, storedSignal } from "@fz/ui/storage";
import { type Speed, isSpeed } from "../../rules/speed";

/** Where the settings are kept. Renaming it loses every player's. */
export const SETTINGS_KEY = "snake-settings";

/** The shape the settings are kept in; a reader drops any other. */
const SETTINGS_VERSION = 1;

/** Says whether the snake glides between squares or steps from one to the next. */
export type Movement = "glide" | "step";

/** Says when the on-screen arrows show: on a touch screen, always, or never. */
export type Arrows = "touch" | "always" | "never";

/** Says how the player plays. */
export interface Settings {
  readonly speed: Speed;
  readonly movement: Movement;
  readonly arrows: Arrows;
  /** Whether the board plays its sounds. */
  readonly sound: boolean;
}

/** The settings a player starts with. */
export const DEFAULT_SETTINGS: Settings = {
  speed: "normal",
  movement: "glide",
  arrows: "touch",
  sound: true,
};

const MOVEMENTS: readonly Movement[] = ["glide", "step"];
const ARROWS: readonly Arrows[] = ["touch", "always", "never"];

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

  /** Changes some of the settings, and keeps them. */
  update(change: Partial<Settings>): void {
    this.state.update((settings) => ({ ...settings, ...change }));
  }
}

/** Returns the settings stored, each one that makes sense, else the default. */
function settingsFrom(saved: StoredFields | null): Settings {
  if (!saved) return DEFAULT_SETTINGS;
  const { speed, movement, arrows, sound } = saved;
  return {
    speed: isSpeed(speed) ? speed : DEFAULT_SETTINGS.speed,
    movement: isOneOf(movement, MOVEMENTS)
      ? movement
      : DEFAULT_SETTINGS.movement,
    arrows: isOneOf(arrows, ARROWS) ? arrows : DEFAULT_SETTINGS.arrows,
    sound: booleanOr(sound, DEFAULT_SETTINGS.sound),
  };
}
