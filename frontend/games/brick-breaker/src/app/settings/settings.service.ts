import { Injectable } from "@angular/core";
import { booleanOr } from "@fz/core/json";
import { type StoredFields, storedSignal } from "@fz/ui/storage";
import { type Speed, isCustomPercent, isSpeed } from "../../rules/speed";
import {
  type TouchSteering,
  isTouchSteering,
} from "../../view/steering/steering";

/** Where the settings are kept. Renaming it loses every player's. */
export const SETTINGS_KEY = "brick-breaker-settings";

/** The shape the settings are kept in; a reader drops any other. */
const SETTINGS_VERSION = 1;

/** Says how the player plays. */
export interface Settings {
  /** The speed of the last run started, at which a visit's first run is played. */
  readonly speed: Speed;
  /** The ball's speed at Custom, as a whole percent of Normal's. */
  readonly customPercent: number;
  /** How a finger steers the paddle on a touch screen. */
  readonly touch: TouchSteering;
  /** Whether the field plays its sounds. */
  readonly sound: boolean;
}

/** The settings a player starts with. */
export const DEFAULT_SETTINGS: Settings = {
  speed: "normal",
  customPercent: 100,
  touch: "drag",
  sound: true,
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

  /** Changes some of the settings, and keeps them. */
  update(change: Partial<Settings>): void {
    this.state.update((settings) => ({ ...settings, ...change }));
  }
}

/** Returns the settings stored, each one that makes sense, else the default. */
function settingsFrom(saved: StoredFields | null): Settings {
  if (!saved) return DEFAULT_SETTINGS;
  const { speed, customPercent, touch, sound } = saved;
  return {
    speed: isSpeed(speed) ? speed : DEFAULT_SETTINGS.speed,
    customPercent: isCustomPercent(customPercent)
      ? customPercent
      : DEFAULT_SETTINGS.customPercent,
    touch: isTouchSteering(touch) ? touch : DEFAULT_SETTINGS.touch,
    sound: booleanOr(sound, DEFAULT_SETTINGS.sound),
  };
}
