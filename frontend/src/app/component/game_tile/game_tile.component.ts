import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { Game, isNew } from "../../provider/game_catalog";
import { GameThumbComponent } from "../game_thumb/game_thumb.component";

@Component({
  selector: "app-game-tile",
  imports: [RouterLink, GameThumbComponent],
  template: `
    <a
      class="tile"
      [class.soon]="game().comingSoon"
      [routerLink]="['/games', game().slug]"
    >
      <app-game-thumb class="thumb" [slug]="game().slug" />
      <span class="name">
        {{ game().name }}
        @if (game().comingSoon) {
          <span class="badge">Coming soon</span>
        } @else if (isNew()) {
          <span class="badge new">New</span>
        }
      </span>
      <span class="meta">
        <span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="3.6" />
            <path d="M5 20c0-4 3.2-6.5 7-6.5s7 2.5 7 6.5" />
          </svg>
          {{ game().players }}
        </span>
        <span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 7.5V12l3 2" />
          </svg>
          {{ game().time }}
        </span>
      </span>
    </a>
  `,
  styleUrl: "./game_tile.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameTileComponent {
  readonly game = input.required<Game>();

  protected readonly isNew = computed(() => isNew(this.game()));
}
