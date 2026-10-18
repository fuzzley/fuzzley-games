import { DOCUMENT } from "@angular/common";
import { Injectable, effect, inject, signal } from "@angular/core";
import {
  DEFAULT_THEMES,
  THEME_STORAGE_KEY,
  type ThemeId,
  isThemeId,
} from "../provider/themes";
import { BROWSER_STORAGE } from "./browser_storage";

/**
 * Applies and remembers the palette in use.
 *
 * theme.js picks one before Angular starts (the saved choice, else the default
 * for the system's color scheme), so the page never flashes the wrong colors;
 * this service takes it from there.
 */
@Injectable({ providedIn: "root" })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly storage = inject(BROWSER_STORAGE);
  private readonly root = this.document.documentElement;

  readonly current = signal<ThemeId>(this.initial());

  constructor() {
    effect(() => {
      this.root.dataset["theme"] = this.current();
      // Match the browser's own UI (address bar on phones) to the header.
      const bar = this.document.defaultView
        ?.getComputedStyle(this.root)
        .getPropertyValue("--bar")
        .trim();
      if (bar) {
        this.document
          .querySelector('meta[name="theme-color"]')
          ?.setAttribute("content", bar);
      }
    });
  }

  /** Applies a palette, and remembers it where the browser allows. */
  select(id: ThemeId): void {
    this.current.set(id);
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
}
