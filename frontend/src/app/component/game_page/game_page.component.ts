import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import {
  findCategory,
  findGame,
  playUrl,
  screenshotUrl,
} from "../../provider/game_catalog";
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
  /** The `:slug` route parameter. */
  readonly slug = input.required<string>();

  readonly game = computed(() => findGame(this.slug()));
  protected readonly category = computed(() => {
    const game = this.game();
    return game ? findCategory(game.category) : undefined;
  });
  /** Where the game is played, and its screenshot; null for one to come. */
  protected readonly play = computed(() => {
    const play = this.game()?.play;
    return play
      ? { href: playUrl(play), preview: screenshotUrl(play, "preview") }
      : null;
  });
}
