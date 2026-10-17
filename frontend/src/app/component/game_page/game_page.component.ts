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

/**
 * A single game's page, which opens the game itself full-page, or says it is
 * still to come.
 */
@Component({
  selector: "app-game-page",
  imports: [RouterLink, GameThumbComponent],
  templateUrl: "./game_page.component.html",
  styleUrl: "./game_page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GamePageComponent {
  private readonly catalog = inject(GameCatalog);

  /** The `:slug` route parameter. */
  readonly slug = input.required<string>();

  protected readonly game = computed(() => this.catalog.findGame(this.slug()));
  protected readonly category = computed(() => {
    const game = this.game();
    return game ? this.catalog.categoryOf(game) : undefined;
  });
  /** Who plays it and for how long, as one line. */
  protected readonly meta = computed(() => {
    const game = this.game();
    return game
      ? `${describePlayers(game.players)}, about ${describeLength(game.minutes)} a game`
      : "";
  });
  /** Where the game is played, and its screenshot; null for one to come. */
  protected readonly play = computed(() => {
    const play = this.game()?.play;
    return play
      ? { href: playUrl(play), preview: screenshotUrl(play, "preview") }
      : null;
  });
}
