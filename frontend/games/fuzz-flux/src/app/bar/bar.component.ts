import {
  Component,
  computed,
  inject,
  input,
  output,
  viewChild,
} from "@angular/core";
import {
  type BarOverflowItem,
  BarOverflowComponent,
  SETTINGS_MENU_ACTION,
  withHomeLink,
} from "@fz/game-ui/bar_overflow";
import { BarSoundComponent, soundMenuAction } from "@fz/game-ui/bar_sound";
import { GameBarComponent } from "@fz/game-ui/game_bar";
import { GameViewportService } from "@fz/game-ui/viewport";
import { IconComponent } from "@fz/ui/icon";
import type { Pictures } from "../../scene/pictures";
import type { RunState } from "../../view/run_state";
import { LevelFiguresComponent } from "./level_figures.component";
import { LevelTitleComponent } from "./level_title.component";

/** Names an action the overflow menu offers. */
type MenuAction = "sound" | "levels" | "settings";

/**
 * Shows the game bar (`<fz-game-bar>`): the link home, the page's heading,
 * and, unless a wide window's panels beside the board show them, the
 * level's number and name, its figures, and Hint and Restart; then Sound,
 * Choose a level and Settings, asking the app for each.
 *
 * A compact bar shows the level's number alone, and a rail, as narrow as
 * a button, neither, each left to the board's name, so the goals and the
 * moves keep their room. There Sound, Choose a level and Settings move
 * into the overflow menu, as on the narrowest the link home does too.
 */
@Component({
  selector: "app-bar",
  imports: [
    BarOverflowComponent,
    BarSoundComponent,
    GameBarComponent,
    IconComponent,
    LevelFiguresComponent,
    LevelTitleComponent,
  ],
  templateUrl: "./bar.component.html",
  styleUrl: "./bar.component.scss",
  host: {
    "[class.compact]": "viewport.isCompact()",
    "[class.rail]": "viewport.barPlacement() === 'end'",
  },
})
export class BarComponent {
  protected readonly viewport = inject(GameViewportService);

  /** What the shell shows of the level in play. */
  readonly state = input.required<RunState>();

  /** The pictures of the pieces, or null before the board has baked them. */
  readonly pictures = input.required<Pictures | null>();

  /** Whether the panels beside the board show the level and its buttons, which the bar then leaves out. */
  readonly panelled = input.required<boolean>();

  /** Whether the player wants sound. */
  readonly soundOn = input.required<boolean>();

  /** Emitted for Hint. */
  readonly hint = output();

  /** Emitted for Restart. */
  readonly restart = output();

  /** Emitted for Sound, to turn the sound on or off. */
  readonly toggleSound = output();

  /** Emitted for Choose a level. */
  readonly chooseLevel = output();

  /** Emitted for Settings. */
  readonly openSettings = output();

  /** The overflow menu, led by the link home where the bar has no room for it. */
  protected readonly overflowItems = computed(() => {
    const actions: readonly BarOverflowItem<MenuAction>[] = [
      soundMenuAction(this.soundOn()),
      { id: "levels", label: "Choose a level", icon: "grid" },
      SETTINGS_MENU_ACTION,
    ];
    return withHomeLink(actions, this.viewport.barHome());
  });

  /** The level's figures the bar shows, whose goals' pictures a fuzzball's copy flies to, or undefined where the panels show them. */
  readonly figures = viewChild(LevelFiguresComponent);

  /** Asks for the action chosen from the overflow menu. */
  protected chooseFromMenu(id: MenuAction): void {
    switch (id) {
      case "sound":
        this.toggleSound.emit();
        return;
      case "levels":
        this.chooseLevel.emit();
        return;
      case "settings":
        this.openSettings.emit();
        return;
    }
  }
}
