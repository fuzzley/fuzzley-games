import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import {
  describeLength,
  describePlayers,
  playUrl,
  screenshotUrl,
} from "../../model/game";
import { GameCatalog } from "../../service/game_catalog.service";
import { GameThumbComponent } from "../game_thumb/game_thumb.component";
import { NotFoundComponent } from "../not_found/not_found.component";

/**
 * A single game's page, which opens the game itself full-page, or says it is
 * still to come.
 */
@Component({
  selector: "app-game-page",
  imports: [RouterLink, GameThumbComponent, NotFoundComponent],
  templateUrl: "./game_page.component.html",
  styleUrl: "./game_page.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GamePageComponent {
  private readonly catalog = inject(GameCatalog);

  /** The `:slug` route parameter. */
  readonly slug = input.required<string>();

  /** Everything the page shows of its game, or null for an unknown slug. */
  protected readonly view = computed(() => {
    const game = this.catalog.findGame(this.slug());
    if (!game) return null;
    const category = this.catalog.categoryOf(game);
    return {
      game,
      category,
      meta: `${describePlayers(game.players)}, about ${describeLength(game.minutes)} a game`,
      // Where the game is played, and its screenshot; null for one to come.
      play: game.play
        ? {
            href: playUrl(game.play),
            preview: screenshotUrl(game.play, "preview"),
          }
        : null,
      // A game not played on a card table shows no felt.
      plain: category.surface === "plain",
    };
  });
}
