import { Injectable } from "@angular/core";
import type { PointerAiming } from "@fz/brick-wall/view/aim_settings";
import { booleanOr } from "@fz/core/json";
import { isOneOf } from "@fz/core/records";
import { type StoredFields, storedSignal } from "@fz/ui/storage";
import { FLIGHT_SPEEDS, type FlightSpeed } from "../../view/play/pace";

/** Where the settings are kept. Renaming it loses every player's. */
const SETTINGS_KEY = "rickashay-settings";

/** The shape the settings are kept in; a reader drops any other. */
const SETTINGS_VERSION = 1;

/** The ways the mouse and fingers may aim, in the order the settings offer them. */
export const AIMINGS = [
  "pointAndHold",
  "pullBack",
] as const satisfies readonly PointerAiming[];

/** The turns the guide may follow a shot to, in the order the settings offer them. */
export const GUIDE_TURNS = [1, 3, 5] as const satisfies readonly number[];

/** Names how many turns the guide follows a shot to, such as 3. */
export type GuideTurns = (typeof GUIDE_TURNS)[number];

/** Says how the player plays. */
export interface Settings {
  /** How a finger and a mouse aim. */
  readonly aiming: PointerAiming;
  /** Whether only the bar's Release lets a shot fly, so letting go of a press leaves the aim where it is. */
  readonly releaseByButton: boolean;
  /** How many turns the guide follows a shot to. */
  readonly guideTurns: GuideTurns;
  /** How fast a flight plays back. */
  readonly flightSpeed: FlightSpeed;
  /** Whether the field plays its sounds. */
  readonly sound: boolean;
  /** Whether fast-forward is on, every flight played faster until it is switched off. */
  readonly fastForward: boolean;
}

/** The settings a player starts with. */
export const DEFAULT_SETTINGS: Settings = {
  aiming: "pointAndHold",
  releaseByButton: false,
  guideTurns: 3,
  flightSpeed: "normal",
  sound: true,
  fastForward: false,
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
  const {
    aiming,
    releaseByButton,
    guideTurns,
    flightSpeed,
    sound,
    fastForward,
  } = saved;
  return {
    aiming: isOneOf(aiming, AIMINGS) ? aiming : DEFAULT_SETTINGS.aiming,
    releaseByButton: booleanOr(
      releaseByButton,
      DEFAULT_SETTINGS.releaseByButton,
    ),
    guideTurns: isOneOf(guideTurns, GUIDE_TURNS)
      ? guideTurns
      : DEFAULT_SETTINGS.guideTurns,
    flightSpeed: isOneOf(flightSpeed, FLIGHT_SPEEDS)
      ? flightSpeed
      : DEFAULT_SETTINGS.flightSpeed,
    sound: booleanOr(sound, DEFAULT_SETTINGS.sound),
    fastForward: booleanOr(fastForward, DEFAULT_SETTINGS.fastForward),
  };
}
