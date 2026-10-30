import { Injectable, inject, signal } from "@angular/core";
import { LocalStorageService } from "@fz/ui/storage";
import type { TouchSteering } from "../../view/steering";

/** Where the settings are kept. Renaming it loses every player's. */
export const SETTINGS_KEY = "brick-breaker-settings";

/** The shape the settings are kept in; a reader drops any other. */
const SETTINGS_VERSION = 1;

/** Says how the player plays. */
export interface Settings {
  /** How a finger steers the paddle on a touch screen. */
  readonly touch: TouchSteering;
}

/** The settings a player starts with. */
export const DEFAULT_SETTINGS: Settings = {
  touch: "drag",
};

const TOUCH_STEERINGS: readonly TouchSteering[] = ["drag", "follow"];

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
    const { touch } = saved;
    return {
      touch: oneOf(TOUCH_STEERINGS, touch) ?? DEFAULT_SETTINGS.touch,
    };
  }
}

/** Returns a value if it is one of those given, else null. */
function oneOf<T extends string>(
  options: readonly T[],
  value: unknown,
): T | null {
  return options.find((option) => option === value) ?? null;
}
