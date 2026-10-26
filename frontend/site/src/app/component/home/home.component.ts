import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { AnnouncerService } from "@fz/ui/announcer";
import { describeGameCount } from "../../model/game";
import { GameCatalog } from "../../service/game_catalog.service";
import {
  EAGER_TILES,
  GameTileComponent,
} from "../game_tile/game_tile.component";

/**
 * Shows the home page: one short row per category linking to its full list, or
 * every match in each non-empty category when searching.
 */
@Component({
  selector: "app-home",
  imports: [RouterLink, GameTileComponent],
  templateUrl: "./home.component.html",
  styleUrl: "./home.component.scss",
})
export class HomeComponent {
  private readonly catalog = inject(GameCatalog);
  private readonly announcer = inject(AnnouncerService);

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
        return {
          category,
          headingId: `section-${category.id}`,
          count: describeGameCount(tiles.length),
          tiles,
          total: all.length,
        };
      })
      .filter((section) => section.tiles.length > 0);
  });

  protected readonly heading = computed(() =>
    this.searching() ? `Results for “${this.query()}”` : "All games",
  );
  /** What a search found, which screen readers announce as it changes. */
  protected readonly status = computed(() => {
    if (!this.searching()) return "";
    const found = this.sections().reduce(
      (sum, section) => sum + section.tiles.length,
      0,
    );
    return found > 0
      ? `${found} of ${this.catalog.games.length} games`
      : "No games match.";
  });

  constructor() {
    effect(() => {
      const status = this.status();
      if (status) this.announcer.say(status);
      else this.announcer.clear();
    });
    // The announcer outlives the page, so leave nothing for the next to say.
    inject(DestroyRef).onDestroy(() => {
      this.announcer.clear();
    });
  }
}
