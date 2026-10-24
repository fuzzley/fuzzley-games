import { Component, computed, inject, input } from "@angular/core";
import { THEMES } from "@fz/style/themes";
import { IconComponent } from "../icon";
import { ThemeService } from "./theme.service";

/** Tells one picker's radios apart from another's on the same page. */
let nextGroup = 0;

/**
 * Offers the palettes as a group of radio buttons, for a settings panel,
 * where the theme menu would hide them behind a button.
 *
 * They are native radios, so the arrow keys move between them and choose as
 * they go, and a screen reader announces the group by its `label`.
 */
@Component({
  selector: "fz-theme-picker",
  imports: [IconComponent],
  templateUrl: "./theme_picker.component.html",
  styleUrl: "./theme_picker.component.scss",
})
export class ThemePickerComponent {
  protected readonly theme = inject(ThemeService);

  /** What the group is called, for a screen reader. */
  readonly label = input("Theme");

  protected readonly group = `fz-theme-picker-${String(nextGroup++)}`;
  protected readonly options = computed(() =>
    THEMES.map((theme) => ({
      ...theme,
      modeName: theme.mode === "dark" ? "Dark" : "Light",
      checked: theme.id === this.theme.current(),
    })),
  );
}
