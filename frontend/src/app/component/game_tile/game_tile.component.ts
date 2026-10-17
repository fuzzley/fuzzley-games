import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from "@angular/core";
import { NgTemplateOutlet } from "@angular/common";
import { RouterLink } from "@angular/router";
import {
  describeLength,
  describePlayers,
  type Game,
  playUrl,
} from "../../model/game";
import { GameCatalog } from "../../service/game_catalog.service";
import { GameThumbComponent } from "../game_thumb/game_thumb.component";

/**
 * How many tiles at the top of a list load their pictures at once: about a
 * row, which is in view as the page opens.
 */
export const EAGER_TILES = 6;

/**
 * A game in a row or grid: a link to its page and a direct play link, or no
 * link at all for a game still to come.
 */
@Component({
  selector: "app-game-tile",
  imports: [NgTemplateOutlet, RouterLink, GameThumbComponent],
  templateUrl: "./game_tile.component.html",
  styleUrl: "./game_tile.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameTileComponent {
  private readonly catalog = inject(GameCatalog);

  readonly game = input.required<Game>();
  /** Loads the game's picture at once, for a tile in view as the page opens. */
  readonly eager = input(false);

  protected readonly playHref = computed(() => {
    const play = this.game().play;
    return play ? playUrl(play) : null;
  });
  protected readonly isNew = computed(() => this.catalog.isNew(this.game()));
  protected readonly players = computed(() =>
    describePlayers(this.game().players),
  );
  protected readonly length = computed(() =>
    describeLength(this.game().minutes),
  );
}
