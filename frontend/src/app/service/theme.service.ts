import { DOCUMENT } from "@angular/common";
import { Injectable, effect, inject, signal } from "@angular/core";

export type ThemeId = "classic" | "pastel" | "casino" | "midnight";

export interface Theme {
  id: ThemeId;
  name: string;
  mode: "light" | "dark";
}

/** The colors themselves live in styles/global.css under [data-theme='…']. */
export const THEMES: readonly Theme[] = [
  { id: "classic", name: "Classic felt", mode: "light" },
  { id: "pastel", name: "Soft pastel", mode: "light" },
  { id: "casino", name: "Casino night", mode: "dark" },
  { id: "midnight", name: "Midnight blue", mode: "dark" },
];

/** Must match the key read by the inline script in index.html. */
export const THEME_STORAGE_KEY = "fuzzley-theme";

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((theme) => theme.id === value);
}

/**
 * The palette in use. index.html picks one before Angular starts (saved choice,
 * else Classic felt or Casino night by system setting) so the page never
 * flashes the wrong colors; this service takes it from there.
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
    const prefersDark = this.document.defaultView?.matchMedia?.(
      "(prefers-color-scheme: dark)",
    ).matches;
    return prefersDark ? "casino" : "classic";
  }
}
