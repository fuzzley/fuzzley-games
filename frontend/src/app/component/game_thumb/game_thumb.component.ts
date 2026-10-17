import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";
import { type Game, thumbnailUrl } from "../../model/game";

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
  /** Loads the picture at once, for one in view as the page opens. */
  readonly eager = input(false);

  protected readonly src = computed(() => thumbnailUrl(this.game()));
  protected readonly loading = computed(() =>
    this.eager() ? "eager" : "lazy",
  );
}
