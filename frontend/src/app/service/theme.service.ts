import { DOCUMENT } from "@angular/common";
import { Injectable, effect, inject, signal } from "@angular/core";
import {
  DEFAULT_THEMES,
  THEME_STORAGE_KEY,
  type ThemeId,
  isThemeId,
} from "../provider/themes";

/**
 * Applies and remembers the palette in use. theme.js picks one before Angular
 * starts (the saved choice, else the default for the system's color scheme),
 * so the page never flashes the wrong colors; this service takes it from
 * there.
 */
@Injectable({ providedIn: "root" })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly root = this.document.documentElement;

  readonly current = signal<ThemeId>(this.initial());

  constructor() {
    effect(() => {
      const id = this.current();
      this.root.dataset["theme"] = id;
      // Match the browser's own UI (address bar on phones) to the header.
      const bar = getComputedStyle(this.root).getPropertyValue("--bar").trim();
      this.document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", bar);
    });
  }

  select(id: ThemeId): void {
    this.current.set(id);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, id);
    } catch {
      // Storage can be unavailable (private windows); the choice still applies.
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
}
