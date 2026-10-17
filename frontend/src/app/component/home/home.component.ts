import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { GameCatalog } from "../../service/game_catalog.service";
import {
  EAGER_TILES,
  GameTileComponent,
} from "../game_tile/game_tile.component";

/**
 * The home page: one short row per category, each linking to its full list.
 * With a search, the same sections list every match instead, and empty
 * sections drop out.
 */
@Component({
  selector: "app-home",
  imports: [RouterLink, GameTileComponent],
  templateUrl: "./home.component.html",
  styleUrl: "./home.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private readonly catalog = inject(GameCatalog);

  /** The `?q=` query parameter, written by the header's search box. */
  readonly q = input<string>();

  protected readonly query = computed(() => (this.q() ?? "").trim());
  protected readonly searching = computed(() => this.query() !== "");

  protected readonly sections = computed(() => {
    const matches = this.catalog.matcher(this.query());
    return this.catalog.categories
      .map((category) => {
        const all = this.catalog.gamesIn(category.id);
        const games = this.searching() ? all.filter(matches) : all;
        const tiles = games.map((game, index) => ({
          game,
          eager: index < EAGER_TILES,
        }));
        return { category, tiles, total: all.length };
      })
      .filter((section) => section.tiles.length > 0);
  });

  protected readonly matchCount = computed(() =>
    this.sections().reduce((sum, section) => sum + section.tiles.length, 0),
  );
  protected readonly total = this.catalog.games.length;
}
