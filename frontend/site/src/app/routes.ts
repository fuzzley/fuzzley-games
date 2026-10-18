import { inject } from "@angular/core";
import type { ResolveFn, Routes } from "@angular/router";
import { CategoryComponent } from "./component/category/category.component";
import { GamePageComponent } from "./component/game_page/game_page.component";
import { HomeComponent } from "./component/home/home.component";
import { NotFoundComponent } from "./component/not_found/not_found.component";
import { GameCatalog } from "./service/game_catalog.service";

const gameTitle: ResolveFn<string> = (route) =>
  inject(GameCatalog).findGame(route.paramMap.get("slug") ?? "")?.name ??
  "Game not found";

const categoryTitle: ResolveFn<string> = (route) =>
  inject(GameCatalog).findCategory(route.paramMap.get("id") ?? "")?.name ??
  "Category not found";

/**
 * The site's pages.
 *
 * Their parameters bind to the components' inputs, and `SiteTitleStrategy`
 * adds the site's name to their titles.
 */
export const routes: Routes = [
  { path: "", component: HomeComponent },
  { path: "category/:id", component: CategoryComponent, title: categoryTitle },
  { path: "games/:slug", component: GamePageComponent, title: gameTitle },
  { path: "**", component: NotFoundComponent, title: "Page not found" },
];
