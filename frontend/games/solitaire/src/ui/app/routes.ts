import { CanMatchFn, Routes } from "@angular/router";
import { inject } from "@angular/core";
import { GameCanvasComponent } from "./component/game_canvas/game_canvas.component";
import { GameCatalogService } from "./service/game_catalog.service";
import { GAME_CATALOG } from "./provider/game_catalog";

/**
 * Matches a URL segment only if it names a game the application has, leaving
 * anything else to the wildcard.
 */
const isKnownGame: CanMatchFn = (_route, segments) => {
  const id = segments[0]?.path;
  return GAME_CATALOG.some((entry) => entry.id === id);
};

/** The application's one route: which game is on the table. */
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
    path: "**",
    redirectTo: () => inject(GameCatalogService).initialGameId,
  },
];
