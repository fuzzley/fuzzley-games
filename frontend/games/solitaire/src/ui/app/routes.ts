import { EnvironmentProviders, inject } from "@angular/core";
import {
  CanDeactivateFn,
  CanMatchFn,
  Routes,
  provideRouter,
  withHashLocation,
  withRouterConfig,
} from "@angular/router";
import { GameCanvasComponent } from "./component/game_canvas/game_canvas.component";
import { GameCatalogService } from "./service/game_catalog.service";
import { GameLifecycleService } from "./service/game_lifecycle.service";
import { GAME_CATALOG } from "./provider/game_catalog";

/**
 * Matches a URL segment only if it names a game the application has, leaving
 * anything else to the wildcard.
 */
const isKnownGame: CanMatchFn = (_route, segments) => {
  const id = segments[0]?.path;
  return GAME_CATALOG.some((entry) => entry.id === id);
};

/**
 * Asks before a navigation throws away a game under way, as the back button or
 * an edited URL would.
 */
const confirmLeavingGame: CanDeactivateFn<unknown> = (
  _component,
  _route,
  _state,
  next,
) => {
  const gameId = next.root.firstChild?.paramMap.get("gameId");
  return gameId ? inject(GameLifecycleService).confirmNavigation(gameId) : true;
};

/** The application's one route: which game is on the table. */
export const routes: Routes = [
  {
    path: ":gameId",
    canMatch: [isKnownGame],
    canDeactivate: [confirmLeavingGame],
    component: GameCanvasComponent,
  },
  {
    path: "",
    pathMatch: "full",
    // Which game an empty URL means depends on what was last played, so the
    // target is resolved on navigation rather than named here.
    redirectTo: () => inject(GameCatalogService).initialGameId,
  },
  {
    path: "**",
    redirectTo: () => inject(GameCatalogService).initialGameId,
  },
];

/**
 * Provides the router the application runs on, which specs share so that they
 * route the way the application does.
 */
export function provideAppRouter(): EnvironmentProviders {
  // Hash location, because the static host this is copied onto will not
  // rewrite unknown paths onto index.html.
  //
  // Computed cancellation, so declining to leave a game with the back button
  // puts the browser back on the page it was on, rather than overwriting the
  // history entry it was heading to.
  return provideRouter(
    routes,
    withHashLocation(),
    withRouterConfig({ canceledNavigationResolution: "computed" }),
  );
}
