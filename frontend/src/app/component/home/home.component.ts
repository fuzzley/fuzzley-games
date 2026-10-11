import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CATEGORIES, GAMES, gamesIn, matchesQuery } from '../../provider/game_catalog';
import { GameTileComponent } from '../game_tile/game_tile.component';

/**
 * The home page: one short row per category, each linking to its full list.
 * With a search, the same sections list every match instead, and empty
 * sections drop out.
 */
@Component({
  selector: 'app-home',
  imports: [RouterLink, GameTileComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  /** The `?q=` query parameter, written by the header's search box. */
  readonly q = input<string>();

  protected readonly query = computed(() => (this.q() ?? '').trim());
  protected readonly searching = computed(() => this.query() !== '');

  protected readonly sections = computed(() =>
    CATEGORIES.map((category) => {
      const all = gamesIn(category.id);
      const games = this.searching() ? all.filter((game) => matchesQuery(game, this.query())) : all;
      return { category, games, total: all.length };
    }).filter((section) => section.games.length > 0),
  );

  protected readonly matchCount = computed(() => this.sections().reduce((sum, section) => sum + section.games.length, 0));
  protected readonly total = GAMES.length;
}
