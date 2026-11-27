import {
  Component,
  type ElementRef,
  computed,
  input,
  viewChildren,
} from "@angular/core";
import { IconComponent } from "@fz/ui/icon";
import type { Wind } from "../../rules/board/board";
import { goalName } from "../../rules/run/describe";
import type { Pictures } from "../../scene/pictures";
import type { RunState } from "../../view/run_state";
import { goalPictureOf } from "./goal_pictures";

/** How far the chevron, which points down, turns to point the way each wind blows. */
const WIND_TURNS: Readonly<Record<Wind, string>> = {
  down: "0deg",
  right: "-90deg",
  up: "180deg",
  left: "90deg",
};

/**
 * Shows a level's figures, in the bar or in the panel beside the board: the
 * wind's arrow, the way it blows, and its moves to turn; each goal's
 * picture and what it still asks for, with a check once met; and the moves
 * left, in the warning color once they run low.
 *
 * Not a live region: the announcer says each change that matters.
 */
@Component({
  selector: "app-level-figures",
  imports: [IconComponent],
  templateUrl: "./level_figures.component.html",
  styleUrl: "./level_figures.component.scss",
})
export class LevelFiguresComponent {
  /** What the shell shows of the level in play. */
  readonly state = input.required<RunState>();

  /** The pictures of the pieces, or null before the board has baked them. */
  readonly pictures = input.required<Pictures | null>();

  /** The wind, as its figure shows it, or null for a level with none. */
  protected readonly wind = computed(() => {
    const wind = this.state().wind;
    if (wind === null) return null;
    return {
      blows: wind.blows,
      turn: WIND_TURNS[wind.blows],
      turnsIn:
        wind.turnsIn === null ? null : `turns in ${String(wind.turnsIn)}`,
    };
  });

  /** Each goal, as its figure shows it: its name, its picture once the board has baked it, and what it still asks for. */
  protected readonly goals = computed(() => {
    const pictures = this.pictures();
    return this.state().goals.map(({ goal, left, met }) => ({
      name: goalName(goal),
      picture: pictures && goalPictureOf(goal, pictures),
      left,
      met,
    }));
  });

  /** The moves left, whether they show low, and the word under them. */
  protected readonly moves = computed(() => {
    const { movesLeft, movesLow } = this.state();
    return {
      left: movesLeft,
      low: movesLow,
      label: movesLeft === 1 ? "move" : "moves",
    };
  });

  /** Each goal's picture, in the level's order, where a fuzzball's copy flies to. */
  readonly goalPictures = viewChildren<ElementRef<HTMLElement>>("goalPicture");
}
