import { Component, computed, inject, input, output } from "@angular/core";
import { count } from "@fz/core/format";
import { HelpDialogComponent } from "@fz/game-ui/help_dialog";
import { GameService } from "../play/game.service";

/** Shows the rules, the lives and the controls for mouse, touch and keyboard. */
@Component({
  selector: "app-help",
  imports: [HelpDialogComponent],
  templateUrl: "./help.component.html",
  styleUrl: "./help.component.scss",
})
export class HelpComponent {
  private readonly game = inject(GameService);

  /** Whether the dialog is showing. */
  readonly open = input.required<boolean>();

  /** Emitted when the dialog asks to close. */
  readonly closed = output();

  /** The lives the game on the board started with, as words. */
  protected readonly lives = computed(() =>
    count(this.game.field().lives, "life", "lives"),
  );
}
