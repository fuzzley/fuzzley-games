import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";
import { NgTemplateOutlet } from "@angular/common";
import { RouterLink } from "@angular/router";
import { Game, isNew } from "../../provider/game_catalog";
import { GameThumbComponent } from "../game_thumb/game_thumb.component";

/**
 * A game in a row or grid: a link to its page, or no link at all for a game
 * still to come.
 */
@Component({
  selector: "app-game-tile",
  imports: [NgTemplateOutlet, RouterLink, GameThumbComponent],
  templateUrl: "./game_tile.component.html",
  styleUrl: "./game_tile.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameTileComponent {
  readonly game = input.required<Game>();

  protected readonly playable = computed(() => this.game().play !== undefined);
  protected readonly isNew = computed(() => isNew(this.game()));
}
