import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { CATEGORIES, findCategory, gamesIn } from "../../provider/game_catalog";
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
  /** The `:id` route parameter. */
  readonly id = input.required<string>();

  protected readonly category = computed(() => findCategory(this.id()));
  protected readonly games = computed(() => {
    const category = this.category();
    return category ? gamesIn(category.id) : [];
  });
  protected readonly categories = CATEGORIES;
}
