import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
} from "@angular/core";
import {
  THEMES,
  type ThemeId,
  ThemeService,
} from "../../service/theme.service";

/** A "Theme" button that opens a short list of palettes to choose from. */
@Component({
  selector: "app-theme-menu",
  templateUrl: "./theme_menu.component.html",
  styleUrl: "./theme_menu.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    "(document:click)": "closeIfOutside($event)",
    "(keydown.escape)": "close(true)",
  },
})
export class ThemeMenuComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly theme = inject(ThemeService);

  protected readonly themes = THEMES;
  protected readonly current = this.theme.current;
  protected readonly currentName = computed(
    () => THEMES.find((t) => t.id === this.current())?.name,
  );
  protected readonly open = signal(false);

  toggle(): void {
    this.open.update((open) => !open);
  }

  choose(id: ThemeId): void {
    this.theme.select(id);
    this.close(true);
  }

  close(refocus = false): void {
    if (!this.open()) return;
    this.open.set(false);
    if (refocus)
      this.host.nativeElement
        .querySelector<HTMLButtonElement>(".trigger")
        ?.focus();
  }

  closeIfOutside(event: Event): void {
    if (!this.host.nativeElement.contains(event.target as Node)) this.close();
  }
}
