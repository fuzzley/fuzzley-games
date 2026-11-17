import { Component, input, output } from "@angular/core";
import { HelpDialogComponent } from "@fz/game-ui/help_dialog";

/** Shows the rules, the controls, then quick turns, the speeds and pausing. */
@Component({
  selector: "app-help",
  imports: [HelpDialogComponent],
  templateUrl: "./help.component.html",
  styleUrl: "./help.component.scss",
})
export class HelpComponent {
  /** Whether the dialog is showing. */
  readonly open = input.required<boolean>();

  /** Emitted when the dialog asks to close. */
  readonly closed = output();
}
