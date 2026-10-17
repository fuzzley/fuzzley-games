import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { describeGameCount } from "../../model/game";
import { GameCatalog } from "../../service/game_catalog.service";
import {
  EAGER_TILES,
  GameTileComponent,
} from "../game_tile/game_tile.component";
import { NotFoundComponent } from "../not_found/not_found.component";

/** Every game in one category, as a plain grid. */
@Component({
  selector: "app-category",
  imports: [RouterLink, GameTileComponent, NotFoundComponent],
  templateUrl: "./category.component.html",
  styleUrl: "./category.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryComponent {
  private readonly catalog = inject(GameCatalog);

  /** The `:id` route parameter. */
  readonly id = input.required<string>();

  protected readonly category = computed(() =>
    this.catalog.findCategory(this.id()),
  );
  protected readonly tiles = computed(() => {
    const category = this.category();
    const games = category ? this.catalog.gamesIn(category.id) : [];
    return games.map((game, index) => ({ game, eager: index < EAGER_TILES }));
  });
  protected readonly count = computed(() =>
    describeGameCount(this.tiles().length),
  );
}
