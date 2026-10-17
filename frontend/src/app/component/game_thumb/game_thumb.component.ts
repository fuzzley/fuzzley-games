import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";
import { type Game, screenshotUrl } from "../../model/game";
import { thumbnailFor } from "../../provider/game_thumbnails";

/**
 * A game's picture: the screenshot its build ships, or a drawing of its layout
 * for a game still to come.
 */
@Component({
  selector: "app-game-thumb",
  templateUrl: "./game_thumb.component.html",
  styleUrl: "./game_thumb.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameThumbComponent {
  readonly game = input.required<Game>();

  protected readonly screenshot = computed(() => {
    const play = this.game().play;
    return play ? screenshotUrl(play, "thumb") : null;
  });
  protected readonly thumbnail = computed(() => thumbnailFor(this.game().slug));
}
