import { Component, inject, output } from "@angular/core";
import { IconComponent } from "@fz/ui/icon";
import type { Direction } from "../../rules/geometry";
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
 * was.
 */
@Component({
  selector: "app-arrows",
  imports: [IconComponent],
  templateUrl: "./arrows.component.html",
  styleUrl: "./arrows.component.scss",
})
export class ArrowsComponent {
  private readonly game = inject(GameService);

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
   * Turns at a press from the keyboard, which reports no clicks; a pointer
   * turned already, as it pressed.
   */
  protected onClick(event: MouseEvent, direction: Direction): void {
    if (event.detail === 0) this.game.turn(direction);
  }
}
