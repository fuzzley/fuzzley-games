import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from "@angular/core";
import { DialogComponent } from "@fz/ui/dialog";
import { IconComponent } from "@fz/ui/icon";
import { count } from "../../game/describe";
import { GameService } from "../service/game.service";

/** Shows the rules, the lives and the controls for mouse, touch and keyboard. */
@Component({
  selector: "app-help",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogComponent, IconComponent],
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
