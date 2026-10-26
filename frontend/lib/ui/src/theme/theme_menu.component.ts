import { Component, computed, inject, input } from "@angular/core";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@angular/aria/menu";
import type { ThemeId } from "@fz/style/themes";
import { IconComponent } from "../icon";
import { ThemeService } from "./theme.service";

/**
 * Shows a "Theme" button that opens a menu of the palettes, one of them
 * checked.
 *
 * Angular Aria's menu supplies the keyboard (arrows, Home and End, typing a
 * name, Enter, Escape), the roles, and focus going back to the button.
 *
 * The app sets `compact` where it has little room, as on a phone, and the
 * button shows the palette's swatch alone, still named for what it does.
 */
@Component({
  selector: "fz-theme-menu",
  imports: [IconComponent, Menu, MenuContent, MenuItem, MenuTrigger],
  templateUrl: "./theme_menu.component.html",
  styleUrl: "./theme_menu.component.scss",
})
export class ThemeMenuComponent {
  private readonly theme = inject(ThemeService);

  /** Whether the button shows the swatch alone, without the word "Theme". */
  readonly compact = input(false);

  protected readonly current = this.theme.current;
  protected readonly options = this.theme.options;
  /** The button's name: what it is for, and the palette in use. */
  protected readonly label = computed(
    () =>
      `Theme: ${this.options().find((option) => option.checked)?.name ?? ""}`,
  );

  protected choose(id: ThemeId | undefined): void {
    if (id) this.theme.select(id);
  }
}
