import { Component, input } from "@angular/core";
import type { LevelShown } from "../../view/run_state";

/**
 * Shows a level's number over its name, in the bar or in the panel beside
 * the board, the name in the size and weight of the text around it, cut
 * short with an ellipsis where it has no room, and the number smaller and
 * muted, as large as `--level-number-size` asks.
 */
@Component({
  selector: "app-level-title",
  templateUrl: "./level_title.component.html",
  styleUrl: "./level_title.component.scss",
})
export class LevelTitleComponent {
  /** The level, as the shell names it. */
  readonly level = input.required<LevelShown>();
}
