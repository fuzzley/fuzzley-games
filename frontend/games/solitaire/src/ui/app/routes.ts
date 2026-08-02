import { CanMatchFn, Routes } from "@angular/router";
import { inject } from "@angular/core";
import { GameCanvasComponent } from "./component/game_canvas/game_canvas.component";
import { GameCatalogService } from "./service/game_catalog.service";
import { GAME_CATALOG } from "./provider/game_catalog";

/**
 * Whether a URL segment names a game the application has.
 *
 * Without this, `:gameId` matches any single segment — including `/poker` —
 * and the wildcard below never sees it, leaving a URL naming nothing on the
 * address bar of a board it does not describe.
 */
const isKnownGame: CanMatchFn = (_route, segments) => {
  const id = segments[0]?.path;
  return GAME_CATALOG.some((entry) => entry.id === id);
};

/**
 * The application's one route: which game is on the table.
 *
 * That is the whole of its navigable state, and it was previously kept in the
 * URL fragment by hand — a service constructor writing `location.hash` and a
 * `hashchange` listener reading it back. The router does the same job with the
 * back button, deep links and redirects already understood, and without a
 * service reaching for globals to do it.
 *
 * Hash location rather than paths, because the built application is copied
 * into a subdirectory of a static host that will not rewrite unknown paths
 * onto index.html. A fragment needs no server co-operation.
 */
export const routes: Routes = [
  {
    path: ":gameId",
    canMatch: [isKnownGame],
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
    // Anything else — an old link, a typo, a game that has been removed —
    // lands on a playable board rather than a blank page.
    path: "**",
    redirectTo: () => inject(GameCatalogService).initialGameId,
  },
];
