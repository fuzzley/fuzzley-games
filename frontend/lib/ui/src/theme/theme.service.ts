import { DOCUMENT } from "@angular/common";
import {
  DestroyRef,
  Injectable,
  InjectionToken,
  type Signal,
  effect,
  inject,
  signal,
} from "@angular/core";
import {
  DEFAULT_THEMES,
  type PaletteRole,
  THEME_STORAGE_KEY,
  type ThemeId,
  isThemeId,
} from "@fz/style/themes";
import { BROWSER_STORAGE } from "../storage";

/**
 * The palette role whose color the browser's own toolbar takes (its
 * `theme-color`, the address bar on phones), which should match the top of
 * the page: `bar` by default, `felt` for a game whose table runs to the top.
 */
export const THEME_COLOR_ROLE = new InjectionToken<PaletteRole>(
  "THEME_COLOR_ROLE",
  { providedIn: "root", factory: () => "bar" },
);

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
  private readonly storage = inject(BROWSER_STORAGE);
  private readonly colorRole = inject(THEME_COLOR_ROLE);
  private readonly root = this.document.documentElement;
  private readonly chosen = signal<ThemeId>(this.initial());

  /** The palette in use. */
  readonly current: Signal<ThemeId> = this.chosen.asReadonly();

  constructor() {
    effect(() => {
      this.root.dataset["theme"] = this.current();
      this.matchBrowserToolbar();
    });
    this.followOtherTabs();
  }

  /** Applies a palette, and remembers it where the browser allows. */
  select(id: ThemeId): void {
    this.chosen.set(id);
    try {
      this.storage?.setItem(THEME_STORAGE_KEY, id);
    } catch {
      // A full or read-only store; the choice still applies to this visit.
    }
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
    const color = this.document.defaultView
      ?.getComputedStyle(this.root)
      .getPropertyValue(`--fz-${this.colorRole}`)
      .trim();
    if (color) {
      this.document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", color);
    }
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
