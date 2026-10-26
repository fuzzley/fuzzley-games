import { DOCUMENT } from "@angular/common";
import {
  DestroyRef,
  Injectable,
  InjectionToken,
  type Signal,
  computed,
  effect,
  inject,
  signal,
} from "@angular/core";
import { fuzzballSvg } from "@fz/style/fuzzball";
import {
  DEFAULT_THEMES,
  type PaletteRole,
  THEMES,
  THEME_STORAGE_KEY,
  type Theme,
  type ThemeId,
  isThemeId,
} from "@fz/style/themes";
import { LocalStorageService } from "../storage";

/**
 * The palette role whose color the browser's own toolbar takes (its
 * `theme-color`, the address bar on phones), which should match the top of
 * the page: `bar` by default, `felt` for a game whose table runs to the top,
 * or `null` for an app that sets `theme-color` itself.
 */
export const THEME_COLOR_ROLE = new InjectionToken<PaletteRole | null>(
  "THEME_COLOR_ROLE",
  { providedIn: "root", factory: () => "bar" },
);

/** Describes a palette as a chooser offers it. */
export interface ThemeOption extends Theme {
  /** The palette's mode as a chooser names it: "Light" or "Dark". */
  readonly modeName: string;
  /** Whether it is the palette in use. */
  readonly checked: boolean;
}

/**
 * Applies and remembers the palette in use, the same one in every tab of the
 * site and its games.
 *
 * theme.js picks one before the app starts (the saved choice, else the default
 * for the system's color scheme), so the page never flashes the wrong colors;
 * this service takes it from there.
 */
@Injectable({ providedIn: "root" })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly storage = inject(LocalStorageService);
  private readonly colorRole = inject(THEME_COLOR_ROLE);
  private readonly root = this.document.documentElement;
  private readonly chosen = signal<ThemeId>(this.initial());

  /** The palette on the page, once the effect below has put it there. */
  private readonly applied = signal<ThemeId>(this.chosen());

  /** The palette in use. */
  readonly current: Signal<ThemeId> = this.chosen.asReadonly();

  /** The palettes a chooser offers, in order, the one in use checked. */
  readonly options: Signal<readonly ThemeOption[]> = computed(() =>
    THEMES.map((theme) => ({
      ...theme,
      modeName: theme.mode === "dark" ? "Dark" : "Light",
      checked: theme.id === this.current(),
    })),
  );

  constructor() {
    effect(() => {
      const id = this.current();
      this.root.dataset["theme"] = id;
      this.applied.set(id);
      this.matchBrowserToolbar();
      this.matchTabIcon();
    });
    this.followOtherTabs();
  }

  /**
   * Returns a palette role's color on the page, such as the felt's, which
   * follows the palette in use; empty where no stylesheet sets it.
   */
  role(name: PaletteRole): Signal<string> {
    return computed(() => {
      this.applied();
      return this.read(name);
    });
  }

  /** Applies a palette, and remembers it where the browser allows. */
  select(id: ThemeId): void {
    this.chosen.set(id);
    this.storage.writeString(THEME_STORAGE_KEY, id);
  }

  private initial(): ThemeId {
    const fromPage = this.root.dataset["theme"];
    if (isThemeId(fromPage)) return fromPage;
    // jsdom, which the specs run in, has no matchMedia.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const prefersDark = this.document.defaultView?.matchMedia?.(
      "(prefers-color-scheme: dark)",
    ).matches;
    return DEFAULT_THEMES[prefersDark ? "dark" : "light"];
  }

  /** Gives the browser's own toolbar the palette's color for its role. */
  private matchBrowserToolbar(): void {
    if (!this.colorRole) return;
    const color = this.read(this.colorRole);
    if (color) {
      this.document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", color);
    }
  }

  /**
   * Draws the tab's icon, where the page links an SVG one, as the fuzzball in
   * the palette's accent.
   */
  private matchTabIcon(): void {
    const icon = this.document.querySelector(
      'link[rel="icon"][type="image/svg+xml"]',
    );
    if (!icon) return;
    const accent = this.read("accent");
    if (accent) {
      icon.setAttribute(
        "href",
        `data:image/svg+xml,${encodeURIComponent(fuzzballSvg(accent))}`,
      );
    }
  }

  /** Returns a palette role's color on the page as it is now. */
  private read(name: PaletteRole): string {
    return (
      this.document.defaultView
        ?.getComputedStyle(this.root)
        .getPropertyValue(`--fz-${name}`)
        .trim() ?? ""
    );
  }

  /**
   * Takes up a palette chosen in another tab, which the browser announces
   * here with a `storage` event, so a player moving between the site and a
   * game finds the same colors.
   */
  private followOtherTabs(): void {
    const view = this.document.defaultView;
    if (!view) return;
    const follow = (event: StorageEvent): void => {
      if (event.key === THEME_STORAGE_KEY && isThemeId(event.newValue)) {
        this.chosen.set(event.newValue);
      }
    };
    view.addEventListener("storage", follow);
    inject(DestroyRef).onDestroy(() => {
      view.removeEventListener("storage", follow);
    });
  }
}
