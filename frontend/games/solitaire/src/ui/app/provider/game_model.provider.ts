import { InjectionToken, inject } from "@angular/core";
import { GameRuleOptions, PlayableGame } from "@/engine/tableau/playable_game";
import { CatalogSession, SELECTED_GAME } from "./game_catalog";

/**
 * The session the application is running: the chosen game, dealt.
 *
 * Created once, here, so the chrome reads the score off the same game the
 * canvas draws.
 */
export const GAME_SESSION = new InjectionToken<CatalogSession>("GAME_SESSION", {
  providedIn: "root",
  factory: () => inject(SELECTED_GAME).create(),
});

/**
 * The game being played, as much of it as the shell needs.
 *
 * Typed as {@link PlayableGame} rather than as any particular game, which is
 * what lets the same header, stopwatch, undo button and victory overlay serve
 * Klondike, FreeCell and Spider.
 */
export const GAME_MODEL = new InjectionToken<PlayableGame>("GAME_MODEL", {
  providedIn: "root",
  factory: () => inject(GAME_SESSION).game,
});

/** The rule options the running game offers, which may be none. */
export const GAME_RULE_OPTIONS = new InjectionToken<GameRuleOptions>(
  "GAME_RULE_OPTIONS",
  { providedIn: "root", factory: () => inject(GAME_SESSION).ruleOptions },
);
