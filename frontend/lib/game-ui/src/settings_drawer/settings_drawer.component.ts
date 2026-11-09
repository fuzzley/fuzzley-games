import { Component, input, output } from "@angular/core";
import { DialogComponent } from "@fz/ui/dialog";
import { IconComponent } from "@fz/ui/icon";

/**
 * Shows a game's settings in a drawer down the right of the window, a
 * dialog named Settings, under its heading and the button that closes it.
 *
 * It draws the frame and projects the settings, which the stylesheet of the
 * game's settings component styles with `@fz/style`'s `setting-fields`, as
 * the drawer's rules can't reach them. As `<fz-dialog>`, it never closes
 * itself, only asks to through `closed`, on Escape, a click beside it or its
 * close button, so the game lowers `open` in return.
 */
@Component({
  selector: "fz-settings-drawer",
  imports: [DialogComponent, IconComponent],
  templateUrl: "./settings_drawer.component.html",
  styleUrl: "./settings_drawer.component.scss",
})
export class SettingsDrawerComponent {
  /** Whether the drawer is showing. */
  readonly open = input.required<boolean>();

  /** Emitted when the drawer asks to close. */
  readonly closed = output();
}
