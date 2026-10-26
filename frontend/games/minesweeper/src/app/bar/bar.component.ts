import { Component, computed, inject, output } from "@angular/core";
import {
  type BarOverflowAction,
  BarOverflowComponent,
  type BarOverflowItem,
} from "@fz/game-ui/bar_overflow";
import { type BarHome, GameBarComponent } from "@fz/game-ui/game_bar";
import { IconComponent } from "@fz/ui/icon";
import { GameViewportService } from "@fz/game-ui/viewport";
import { difficultyName } from "../../rules/difficulty";
import { count, formatTime } from "../../rules/format";
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
 * Shows the game bar: the link home, the game's name and difficulty, the
 * mines left, the lives and the time, and the actions.
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

  protected readonly difficulty = computed(() =>
    difficultyName(this.game.difficulty()),
  );

  protected readonly time = computed(() => formatTime(this.game.seconds()));

  /** The lives as hearts, full for each one left. */
  protected readonly hearts = computed(() => {
    const { lives, livesLeft } = this.game.field();
    return Array.from({ length: lives }, (_, i) => i < livesLeft);
  });

  /** The lives as words, since the hearts are pictures. */
  protected readonly livesText = computed(() => {
    const { lives, livesLeft } = this.game.field();
    return `${livesLeft} of ${count(lives, "life", "lives")}`;
  });

  protected readonly home = computed<BarHome>(() => {
    if (!this.viewport.fitsHomeButton()) return "none";
    return this.viewport.fitsWordmark() && !this.viewport.isCompact()
      ? "wordmark"
      : "icon";
  });

  /** The overflow menu, led by the link home where the bar has no room for it. */
  protected readonly overflowItems = computed<
    readonly BarOverflowItem<MenuAction>[]
  >(() => {
    if (this.home() !== "none") return OVERFLOW_ACTIONS;
    const [first, ...rest] = OVERFLOW_ACTIONS;
    return [
      { id: "home", label: "Fuzzley Games", icon: "home", href: HOME_HREF },
      ...(first ? [{ ...first, startsGroup: true }] : []),
      ...rest,
    ];
  });

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
