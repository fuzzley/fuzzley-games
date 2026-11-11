import { Component, computed, input, linkedSignal } from "@angular/core";
import { type Game, thumbnailUrl } from "../../model/game";

/**
 * Shows a game's picture: the screenshot its build ships, or a drawing of its
 * layout for a game still to come.
 *
 * A picture that fails to load, as a game in development's may while its
 * build ships no screenshots yet, leaves the frame's own surface showing
 * rather than a broken image.
 */
@Component({
  selector: "app-game-thumb",
  templateUrl: "./game_thumb.component.html",
  styleUrl: "./game_thumb.component.scss",
})
export class GameThumbComponent {
  /** The game whose picture to show. */
  readonly game = input.required<Game>();
  /** Loads the picture at once, for one in view as the page opens. */
  readonly eager = input(false);

  protected readonly src = computed(() => thumbnailUrl(this.game()));
  protected readonly loading = computed(() =>
    this.eager() ? "eager" : "lazy",
  );
  /** Whether the picture failed to load, until the thumb is handed another game. */
  protected readonly failed = linkedSignal({
    source: this.src,
    computation: () => false,
  });
}
