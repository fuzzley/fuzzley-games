import { Component, input, output } from "@angular/core";
import { DialogComponent } from "@fz/ui/dialog";
import { IconComponent } from "@fz/ui/icon";

/**
 * Shows How to play in a card over the dimmed page, a dialog named How to
 * play, under its heading and with the button that closes it in the corner.
 *
 * It draws the card and projects what the game says, which the stylesheet
 * of the game's How to play component styles with `@fz/style`'s `help-text`
 * and `help-controls`, as the card's rules can't reach them. Like
 * `<fz-dialog>`, it only asks to close, through `closed`, on Escape, a click
 * beside it or its close button, and the game lowers `open`.
 */
@Component({
  selector: "fz-help-dialog",
  imports: [DialogComponent, IconComponent],
  templateUrl: "./help_dialog.component.html",
  styleUrl: "./help_dialog.component.scss",
})
export class HelpDialogComponent {
  /** Whether the dialog is showing. */
  readonly open = input.required<boolean>();

  /** Emitted when the dialog asks to close. */
  readonly closed = output();
}
