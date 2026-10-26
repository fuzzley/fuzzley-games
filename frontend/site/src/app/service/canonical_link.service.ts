import { DOCUMENT, Injectable, inject } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { NavigationEnd, Router } from "@angular/router";
import { filter } from "rxjs";

/** The address the site is served at, which every canonical link names. */
export const SITE_ORIGIN = "https://fuzzley.games";

/**
 * Names the page's one address in a canonical link after each navigation,
 * without the search or the host it was reached at.
 *
 * The server answers every address with the same `index.html`, so the link
 * can't be written there: it would name one page for all of them.
 */
@Injectable({ providedIn: "root" })
export class CanonicalLink {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  /** How many pages are withholding the link; it stays out until the last lets go. */
  private withholders = 0;

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.update();
      });
  }

  /**
   * Leaves the page without a canonical link, for a page search engines
   * shouldn't index, and returns a function that puts it back.
   */
  withhold(): () => void {
    this.withholders++;
    this.update();
    return () => {
      this.withholders--;
      this.update();
    };
  }

  private update(): void {
    let link = this.document.head.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );
    if (this.withholders > 0) {
      link?.remove();
      return;
    }
    if (!link) {
      link = this.document.createElement("link");
      link.rel = "canonical";
      this.document.head.append(link);
    }
    const { pathname } = new URL(this.router.url, SITE_ORIGIN);
    link.href = `${SITE_ORIGIN}${pathname}`;
  }
}
