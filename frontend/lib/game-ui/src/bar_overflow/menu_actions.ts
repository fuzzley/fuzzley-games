import type { BarOverflowAction } from "./bar_overflow.component";

/**
 * The overflow menu's item that opens How to play, for a bar with no room
 * for its button, worded once for the games. The Solitaire Collection words
 * its own, "How to Play".
 */
export const HELP_MENU_ACTION: BarOverflowAction<"help"> = {
  id: "help",
  label: "How to play",
  icon: "help",
};

/**
 * The overflow menu's item that opens the settings, for a bar with no room
 * for its button, worded once for every game.
 */
export const SETTINGS_MENU_ACTION: BarOverflowAction<"settings"> = {
  id: "settings",
  label: "Settings",
  icon: "settings",
};
