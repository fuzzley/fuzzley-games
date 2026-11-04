import { Injectable, inject, signal } from "@angular/core";
import { booleanOr } from "@fz/core/json";
import { LocalStorageService } from "@fz/ui/storage";
import { type Speed, isSpeed } from "../../rules/speed";

/** Where the settings are kept. Renaming it loses every player's. */
const SETTINGS_KEY = "asteroid-breaker-settings";

/** The shape the settings are kept in; a reader drops any other. */
const SETTINGS_VERSION = 1;

/** The times the deck may show beside the field, in the order the settings offer them. */
export const DECK_SHOWINGS = ["auto", "always", "never"] as const;

/** Names when the deck shows: on a touch screen, always or never. */
export type DeckShowing = (typeof DECK_SHOWINGS)[number];

/** Returns whether a value names when the deck shows. */
function isDeckShowing(value: unknown): value is DeckShowing {
  return DECK_SHOWINGS.some((showing) => showing === value);
}

/** Says how the player plays. */
export interface Settings {
  /** The speed of the last run started, at which a visit's first run is played. */
  readonly speed: Speed;
  /** When the deck shows beside the field. */
  readonly deck: DeckShowing;
  /** Whether the deck's stick is on the right, for a left thumb on its buttons. */
  readonly stickOnRight: boolean;
  /** Whether the ship fires by itself, so the deck has no Fire. */
  readonly fireByItself: boolean;
  /** Whether the phone buzzes as a ship is lost and as a wave is cleared. */
  readonly haptics: boolean;
  /** Whether the field plays its sounds. */
  readonly sound: boolean;
}

/** The settings a player starts with. */
export const DEFAULT_SETTINGS: Settings = {
  speed: "normal",
  deck: "auto",
  stickOnRight: false,
  fireByItself: false,
  haptics: true,
  sound: true,
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
    const { speed, deck, stickOnRight, fireByItself, haptics, sound } = saved;
    return {
      speed: isSpeed(speed) ? speed : DEFAULT_SETTINGS.speed,
      deck: isDeckShowing(deck) ? deck : DEFAULT_SETTINGS.deck,
      stickOnRight: booleanOr(stickOnRight, DEFAULT_SETTINGS.stickOnRight),
      fireByItself: booleanOr(fireByItself, DEFAULT_SETTINGS.fireByItself),
      haptics: booleanOr(haptics, DEFAULT_SETTINGS.haptics),
      sound: booleanOr(sound, DEFAULT_SETTINGS.sound),
    };
  }
}
