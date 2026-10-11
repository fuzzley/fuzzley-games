import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";
import { RED_SUITS, thumbnailFor } from "../../provider/game_thumbnails";

/** A game's layout drawing. Felt and card backs follow the current palette. */
@Component({
  selector: "app-game-thumb",
  templateUrl: "./game_thumb.component.html",
  styleUrl: "./game_thumb.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameThumbComponent {
  readonly slug = input.required<string>();

  protected readonly thumbnail = computed(() => thumbnailFor(this.slug()));
  protected readonly isRed = (suit: string) => RED_SUITS.has(suit);
}
