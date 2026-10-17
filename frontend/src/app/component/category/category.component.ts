import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { GameCatalog } from "../../service/game_catalog.service";
import { GameTileComponent } from "../game_tile/game_tile.component";

/** Every game in one category, as a plain grid. */
@Component({
  selector: "app-category",
  imports: [RouterLink, GameTileComponent],
  templateUrl: "./category.component.html",
  styleUrl: "./category.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryComponent {
  private readonly catalog = inject(GameCatalog);

  /** The `:id` route parameter. */
  readonly id = input.required<string>();

  protected readonly category = computed(() =>
    this.catalog.findCategory(this.id()),
  );
  protected readonly games = computed(() => {
    const category = this.category();
    return category ? this.catalog.gamesIn(category.id) : [];
  });
  protected readonly categories = this.catalog.categories;
}
