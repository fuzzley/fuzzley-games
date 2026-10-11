import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CATEGORIES, findCategory, gamesIn } from '../../provider/game_catalog';
import { GameTileComponent } from '../game_tile/game_tile.component';

/** Every game in one category, as a plain grid. */
@Component({
  selector: 'app-category',
  imports: [RouterLink, GameTileComponent],
  template: `
    <main class="page">
      <a class="back" routerLink="/">All games</a>
      @if (category(); as category) {
        <div class="head">
          <h1>{{ category.name }}</h1>
          <span class="count">{{ games().length }} games</span>
        </div>
        <p class="description">{{ category.description }}</p>
        <ul class="grid">
          @for (game of games(); track game.slug) {
            <li><app-game-tile [game]="game" /></li>
          }
        </ul>
      } @else {
        <h1>There’s no category at this address.</h1>
        <p class="description">Try one of these instead:</p>
        <ul class="others">
          @for (other of categories; track other.id) {
            <li><a [routerLink]="['/category', other.id]">{{ other.name }}</a></li>
          }
        </ul>
      }
    </main>
  `,
  styleUrl: './category.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryComponent {
  /** The `:id` route parameter. */
  readonly id = input.required<string>();

  protected readonly category = computed(() => findCategory(this.id()));
  protected readonly games = computed(() => {
    const category = this.category();
    return category ? gamesIn(category.id) : [];
  });
  protected readonly categories = CATEGORIES;
}
