import { Component, computed, inject, output } from "@angular/core";
import {
  type BarOverflowAction,
  BarOverflowComponent,
  type BarOverflowItem,
  withHomeLink,
} from "@fz/game-ui/bar_overflow";
import { GameBarComponent } from "@fz/game-ui/game_bar";
import { formatClock } from "@fz/game-ui/stopwatch";
import { GameViewportService } from "@fz/game-ui/viewport";
import { IconComponent } from "@fz/ui/icon";
import { LEVEL_INFO } from "../../rules/difficulty";
import { GameService } from "../play/game.service";

/** Where the link home leads: the Fuzzley Games site, which serves this game. */
const HOME_HREF = "/";

/** Names an action the overflow menu offers. */
type MenuAction = "restart" | "help" | "settings";

/** The overflow menu's actions, in order. */
const OVERFLOW_ACTIONS: readonly BarOverflowAction<MenuAction>[] = [
  { id: "restart", label: "Restart", icon: "restart" },
  { id: "help", label: "How to play", icon: "help" },
  { id: "settings", label: "Settings", icon: "settings" },
];

/**
 * Shows the game bar: the link home, the game's name and level, the time,
 * and the actions. The level shows at every size; the name only for a
 * screen reader on a compact screen.
 *
 * On a compact screen, Restart, How to play and Settings move into the
 * overflow menu, and on the narrowest the link home does too.
 */
@Component({
  selector: "app-bar",
  imports: [BarOverflowComponent, GameBarComponent, IconComponent],
  host: {
    "[class.compact]": "viewport.isCompact()",
    "[class.rail]": 'viewport.barPlacement() === "end"',
  },
  templateUrl: "./bar.component.html",
  styleUrl: "./bar.component.scss",
})
export class BarComponent {
  protected readonly game = inject(GameService);
  protected readonly viewport = inject(GameViewportService);

  /** Emitted when the player asks how to play. */
  readonly openHelp = output();

  /** Emitted when the player asks for the settings. */
  readonly openSettings = output();

  protected readonly homeHref = HOME_HREF;

  protected readonly level = computed(() => LEVEL_INFO[this.game.level()].name);

  protected readonly time = computed(() => formatClock(this.game.seconds()));

  /** The overflow menu, led by the link home where the bar has no room for it. */
  protected readonly overflowItems = computed<
    readonly BarOverflowItem<MenuAction>[]
  >(() =>
    this.viewport.barHome() === "none"
      ? withHomeLink(OVERFLOW_ACTIONS, HOME_HREF)
      : OVERFLOW_ACTIONS,
  );

  /** Carries out the action chosen from the overflow menu. */
  protected chooseFromMenu(id: MenuAction): void {
    switch (id) {
      case "restart":
        void this.game.restart();
        break;
      case "help":
        this.openHelp.emit();
        break;
      case "settings":
        this.openSettings.emit();
        break;
    }
  }
}
