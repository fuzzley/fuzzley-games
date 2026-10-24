import { Component, computed, inject } from "@angular/core";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@angular/aria/menu";
import { THEMES, type ThemeId } from "@fz/style/themes";
import { ThemeService } from "../../service/theme.service";
import { IconComponent } from "../icon/icon.component";

/**
 * Shows a "Theme" button that opens a menu of the palettes, one of them
 * checked.
 *
 * Angular Aria's menu supplies the keyboard (arrows, Home and End, typing a
 * name, Enter, Escape), the roles, and focus going back to the button.
 */
@Component({
  selector: "app-theme-menu",
  imports: [IconComponent, Menu, MenuContent, MenuItem, MenuTrigger],
  templateUrl: "./theme_menu.component.html",
  styleUrl: "./theme_menu.component.scss",
})
export class ThemeMenuComponent {
  private readonly theme = inject(ThemeService);

  protected readonly current = this.theme.current;
  protected readonly options = computed(() =>
    THEMES.map((theme) => ({
      ...theme,
      modeName: theme.mode === "dark" ? "Dark" : "Light",
      checked: theme.id === this.current(),
    })),
  );
  /** The button's name: what it is for, and the palette in use. */
  protected readonly label = computed(
    () =>
      `Theme: ${THEMES.find((theme) => theme.id === this.current())?.name ?? ""}`,
  );

  protected choose(id: ThemeId | undefined): void {
    if (id) this.theme.select(id);
  }
}
