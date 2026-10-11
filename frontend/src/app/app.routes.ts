import { ResolveFn, Routes } from '@angular/router';
import { CategoryComponent } from './category/category.component';
import { GamePageComponent } from './game-page/game-page.component';
import { findCategory, findGame } from './games/catalog';
import { HomeComponent } from './home/home.component';

const gameTitle: ResolveFn<string> = (route) =>
  `${findGame(route.paramMap.get('slug') ?? '')?.name ?? 'Game not found'} – Fuzzley Games`;

const categoryTitle: ResolveFn<string> = (route) =>
  `${findCategory(route.paramMap.get('id') ?? '')?.name ?? 'Category not found'} – Fuzzley Games`;

export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'Fuzzley Games' },
  { path: 'category/:id', component: CategoryComponent, title: categoryTitle },
  { path: 'games/:slug', component: GamePageComponent, title: gameTitle },
  { path: '**', redirectTo: '' },
];
