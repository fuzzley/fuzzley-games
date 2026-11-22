import { Component, inject, input, output } from "@angular/core";
import { DialogComponent } from "@fz/ui/dialog";
import { IconComponent } from "@fz/ui/icon";
import { BUG_REPORT_SOURCE, ReportBugButtonComponent } from "../bug_report";
import { BuildInfoComponent } from "../build_info";

/**
 * Shows a game's settings in a drawer down the right of the window, a
 * dialog named Settings, under its heading and the button that closes it,
 * with the version of the game that is running beneath them.
 *
 * It draws the frame and projects the settings, which the stylesheet of the
 * game's settings component styles with `@fz/style`'s `setting-fields`, as
 * the drawer's rules can't reach them. As `<fz-dialog>`, it never closes
 * itself, only asks to through `closed`, on Escape, a click beside it or its
 * close button, so the game lowers `open` in return.
 *
 * Where the game provides `BUG_REPORT_SOURCE`, it offers Report a bug above
 * the version, and asks to close as it is pressed, so the report's picture
 * shows the game rather than the drawer.
 */
@Component({
  selector: "fz-settings-drawer",
  imports: [
    BuildInfoComponent,
    DialogComponent,
    IconComponent,
    ReportBugButtonComponent,
  ],
  templateUrl: "./settings_drawer.component.html",
  styleUrl: "./settings_drawer.component.scss",
})
export class SettingsDrawerComponent {
  /** Whether the drawer is showing. */
  readonly open = input.required<boolean>();

  /** Emitted when the drawer asks to close. */
  readonly closed = output();

  /** Whether the game takes bug reports, which the drawer then offers. */
  protected readonly reportsBugs =
    inject(BUG_REPORT_SOURCE, { optional: true }) !== null;
}
