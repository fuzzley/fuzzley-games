import { Component, computed, inject, input } from "@angular/core";
import { NgTemplateOutlet } from "@angular/common";
import { RouterLink } from "@angular/router";
import { IconComponent } from "@fz/ui/icon";
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

/** Returns the badge beside a game's name: coming soon, new, or none. */
function badgeFor(
  game: Game,
  isNew: boolean,
): { text: string; new: boolean } | null {
  if (!game.play) return { text: "Coming soon", new: false };
  return isNew ? { text: "New", new: true } : null;
}

/**
 * Shows a game in a row or grid: a link to its page and a direct play link, or
 * no link at all for a game still to come.
 */
@Component({
  selector: "app-game-tile",
  imports: [NgTemplateOutlet, RouterLink, GameThumbComponent, IconComponent],
  templateUrl: "./game_tile.component.html",
  styleUrl: "./game_tile.component.scss",
})
export class GameTileComponent {
  private readonly catalog = inject(GameCatalog);

  /** The game the tile shows. */
  readonly game = input.required<Game>();
  /** Loads the game's picture at once, for a tile in view as the page opens. */
  readonly eager = input(false);

  /** What the tile shows of its game. */
  protected readonly view = computed(() => {
    const game = this.game();
    return {
      play: game.play
        ? { href: playUrl(game.play), label: `Play ${game.name}` }
        : null,
      badge: badgeFor(game, this.catalog.isNew(game)),
      players: describePlayers(game.players),
      length: describeLength(game.minutes),
    };
  });
}
