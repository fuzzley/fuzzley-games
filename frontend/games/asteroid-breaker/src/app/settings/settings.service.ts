import { Injectable, signal } from "@angular/core";

/** The times the deck may show beside the field, in the order the settings offer them. */
export const DECK_SHOWINGS = ["auto", "always", "never"] as const;

/** Names when the deck shows: on a touch screen, always or never. */
export type DeckShowing = (typeof DECK_SHOWINGS)[number];

/** Says how the player plays. */
export interface Settings {
  /** When the deck shows beside the field. */
  readonly deck: DeckShowing;
  /** Whether the deck's stick is on the right, for a left thumb on its buttons. */
  readonly stickOnRight: boolean;
  /** Whether the ship fires by itself, so the deck has no Fire. */
  readonly fireByItself: boolean;
}

/** The settings a player starts with. */
export const DEFAULT_SETTINGS: Settings = {
  deck: "auto",
  stickOnRight: false,
  fireByItself: false,
};

/** Holds the player's settings for the visit. */
@Injectable({ providedIn: "root" })
export class SettingsService {
  private readonly state = signal(DEFAULT_SETTINGS);

  /** The settings in use. */
  readonly settings = this.state.asReadonly();

  /** Changes some of the settings. */
  update(change: Partial<Settings>): void {
    this.state.update((settings) => ({ ...settings, ...change }));
  }
}
