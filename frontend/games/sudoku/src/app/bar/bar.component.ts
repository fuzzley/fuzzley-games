import { Component, computed, inject, output } from "@angular/core";
import {
  BarChoiceComponent,
  type BarChoiceOption,
} from "@fz/game-ui/bar_choice";
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
import { LEVELS, LEVEL_INFO, type Level } from "../../rules/difficulty";
import { GameService } from "../play/game.service";

/** Where the link home leads: the Fuzzley Games site, which serves this game. */
const HOME_HREF = "/";

/** The levels the badge offers, each with what it asks of the player. */
const LEVEL_CHOICES: readonly BarChoiceOption<Level>[] = LEVELS.map((id) => ({
  id,
  name: LEVEL_INFO[id].name,
  detail: LEVEL_INFO[id].asks,
}));

/** Names an action the overflow menu offers. */
type MenuAction = "notes" | "restart" | "help" | "settings";

/** The overflow menu's actions, in order. */
const OVERFLOW_ACTIONS: readonly BarOverflowAction<MenuAction>[] = [
  { id: "notes", label: "Fill in notes", icon: "grid" },
  { id: "restart", label: "Restart", icon: "restart" },
  { id: "help", label: "How to play", icon: "help" },
  { id: "settings", label: "Settings", icon: "settings" },
];

/**
 * Shows the game bar: the link home, the game's name and level, the time,
 * and the actions. The level shows at every size, as a menu of the levels;
 * the name only for a screen reader on a compact screen.
 *
 * On a compact screen, Fill in notes, Restart, How to play and Settings
 * move into the overflow menu, and on the narrowest the link home does too.
 */
@Component({
  selector: "app-bar",
  imports: [
    BarChoiceComponent,
    BarOverflowComponent,
    GameBarComponent,
    IconComponent,
  ],
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

  protected readonly levels = LEVEL_CHOICES;

  protected readonly time = computed(() => formatClock(this.game.seconds()));

  /** The overflow menu, led by the link home where the bar has no room for it. */
  protected readonly overflowItems = computed<
    readonly BarOverflowItem<MenuAction>[]
  >(() =>
    this.viewport.barHome() === "none"
      ? withHomeLink(OVERFLOW_ACTIONS, HOME_HREF)
      : OVERFLOW_ACTIONS,
  );

  /** Deals a puzzle at the level chosen from the badge, asking first. */
  protected changeLevel(level: Level): void {
    void this.game.changeLevel(level);
  }

  /** Carries out the action chosen from the overflow menu. */
  protected chooseFromMenu(id: MenuAction): void {
    switch (id) {
      case "notes":
        this.game.fillNotes();
        break;
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
