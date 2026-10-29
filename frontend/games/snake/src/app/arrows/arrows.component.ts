import { Component, inject, output } from "@angular/core";
import { IconComponent } from "@fz/ui/icon";
import type { Direction } from "../../rules/geometry";
import { commandOfKey } from "../../view/controls";
import { GameService } from "../play/game.service";

/** Describes one arrow's button. */
interface Arrow {
  readonly direction: Direction;
  readonly label: string;
}

/** The arrows, in the order a screen reader and the Tab key reach them. */
const ARROWS: readonly Arrow[] = [
  { direction: "up", label: "Up" },
  { direction: "left", label: "Left" },
  { direction: "right", label: "Right" },
  { direction: "down", label: "Down" },
];

/**
 * Shows the on-screen arrows, for a touch screen, which turn the snake as a
 * finger lands on one rather than as it lifts, and leave the focus where it
 * was. They wait, dimmed, until the board is drawn.
 *
 * With the focus on an arrow, the game's keys steer as they do on the board,
 * whose keys Phaser hears only on the board's own element.
 */
@Component({
  selector: "app-arrows",
  imports: [IconComponent],
  host: {
    "(keydown)": "onKeyDown($event)",
    "(keyup)": "onKeyUp($event)",
  },
  templateUrl: "./arrows.component.html",
  styleUrl: "./arrows.component.scss",
})
export class ArrowsComponent {
  protected readonly game = inject(GameService);

  /** Emits after a press with a pointer, for the board to take the focus. */
  readonly handBack = output();

  protected readonly arrows = ARROWS;

  /**
   * Turns at a press with a pointer, keeping the focus off the button, so
   * the keys go on steering the board.
   */
  protected onPointerDown(event: PointerEvent, direction: Direction): void {
    if (event.button !== 0) return;
    event.preventDefault();
    this.game.turn(direction);
    this.handBack.emit();
  }

  /**
   * Does what one of the game's keys asks, pressed on a focused arrow, as on
   * the board; Enter presses the arrow itself.
   */
  protected onKeyDown(event: KeyboardEvent): void {
    if (event.code === "Enter") return;
    if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
    const command = commandOfKey(event.code);
    if (!command) return;
    event.preventDefault();
    this.game.command(command);
  }

  /** Keeps Space, which pauses, from pressing the focused arrow as it lifts. */
  protected onKeyUp(event: KeyboardEvent): void {
    if (event.code === "Space") event.preventDefault();
  }

  /**
   * Turns at a press from the keyboard, which reports no clicks; a pointer
   * turned already, as it pressed.
   */
  protected onClick(event: MouseEvent, direction: Direction): void {
    if (event.detail === 0) this.game.turn(direction);
  }
}
