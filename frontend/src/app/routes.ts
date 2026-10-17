import { ResolveFn, Routes } from "@angular/router";
import { CategoryComponent } from "./component/category/category.component";
import { GamePageComponent } from "./component/game_page/game_page.component";
import { HomeComponent } from "./component/home/home.component";
import { findCategory, findGame } from "./provider/game_catalog";

const gameTitle: ResolveFn<string> = (route) =>
  `${findGame(route.paramMap.get("slug") ?? "")?.name ?? "Game not found"} – Fuzzley Games`;

const categoryTitle: ResolveFn<string> = (route) =>
  `${findCategory(route.paramMap.get("id") ?? "")?.name ?? "Category not found"} – Fuzzley Games`;

/** The site's pages. Their parameters bind to the components' inputs. */
export const routes: Routes = [
  { path: "", component: HomeComponent, title: "Fuzzley Games" },
  { path: "category/:id", component: CategoryComponent, title: categoryTitle },
  { path: "games/:slug", component: GamePageComponent, title: gameTitle },
  { path: "**", redirectTo: "" },
];
