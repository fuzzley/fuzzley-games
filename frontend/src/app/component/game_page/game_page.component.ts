import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { findCategory, findGame } from '../../provider/game_catalog';
import { GameThumbComponent } from '../game_thumb/game_thumb.component';

/** Where a single game is played. The game itself mounts in the stage. */
@Component({
  selector: 'app-game-page',
  imports: [RouterLink, GameThumbComponent],
  templateUrl: './game_page.component.html',
  styleUrl: './game_page.component.css',
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
}
