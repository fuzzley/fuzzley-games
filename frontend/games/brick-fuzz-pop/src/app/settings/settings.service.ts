import { Injectable } from "@angular/core";
import { booleanOr } from "@fz/core/json";
import { isOneOf } from "@fz/core/records";
import { type StoredFields, storedSignal } from "@fz/ui/storage";
import type { FlightSpeed } from "../../view/round_play";
import type { PointerAiming } from "../../view/steering/aiming";

/** Where the settings are kept. Renaming it loses every player's. */
const SETTINGS_KEY = "brick-fuzz-pop-settings";

/** The shape the settings are kept in; a reader drops any other. */
const SETTINGS_VERSION = 1;

/** The ways the mouse and fingers may aim, in the order the settings offer them. */
export const AIMINGS = [
  "pointAndHold",
  "pullBack",
] as const satisfies readonly PointerAiming[];

/**
 * Names how the mouse and fingers aim and charge: the view's, which aims
 * them. The keys aim either way.
 */
export type Aiming = PointerAiming;

/** The flight's speeds, in the order the settings offer them. */
export const FLIGHT_SPEEDS = [
  "normal",
  "fast",
] as const satisfies readonly FlightSpeed[];

/** Names how fast a round's flight plays back: the view's, which plays it. */
export type { FlightSpeed };

/** Says how the player plays. */
export interface Settings {
  /** How a finger and a mouse aim and charge. */
  readonly aiming: Aiming;
  /** How fast a flight plays back. */
  readonly flightSpeed: FlightSpeed;
  /** Whether a long flight doubles its speed by itself. */
  readonly speedUpLongFlights: boolean;
  /** Whether the guide shows a shot's flight to its first turn. */
  readonly guide: boolean;
  /** Whether the field plays its sounds. */
  readonly sound: boolean;
}

/** The settings a player starts with. */
export const DEFAULT_SETTINGS: Settings = {
  aiming: "pointAndHold",
  flightSpeed: "normal",
  speedUpLongFlights: true,
  guide: true,
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

/**
 * Returns the settings stored, each one that makes sense, else the default,
 * as "By the pointer", a way of aiming no longer offered, is read.
 */
function settingsFrom(saved: StoredFields | null): Settings {
  if (!saved) return DEFAULT_SETTINGS;
  const { aiming, flightSpeed, speedUpLongFlights, guide, sound } = saved;
  return {
    aiming: isOneOf(aiming, AIMINGS) ? aiming : DEFAULT_SETTINGS.aiming,
    flightSpeed: isOneOf(flightSpeed, FLIGHT_SPEEDS)
      ? flightSpeed
      : DEFAULT_SETTINGS.flightSpeed,
    speedUpLongFlights: booleanOr(
      speedUpLongFlights,
      DEFAULT_SETTINGS.speedUpLongFlights,
    ),
    guide: booleanOr(guide, DEFAULT_SETTINGS.guide),
    sound: booleanOr(sound, DEFAULT_SETTINGS.sound),
  };
}
