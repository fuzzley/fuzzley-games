import { Injectable, inject } from "@angular/core";
import { Title } from "@angular/platform-browser";
import { type RouterStateSnapshot, TitleStrategy } from "@angular/router";

/** The site's name, which ends every page's title. */
export const SITE_NAME = "Fuzzley Games";

/**
 * Titles each page "<route's title> – Fuzzley Games", or just the site's name
 * for a route without one, so routes name only themselves.
 */
@Injectable({ providedIn: "root" })
export class SiteTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const page = this.buildTitle(snapshot);
    this.title.setTitle(page ? `${page} – ${SITE_NAME}` : SITE_NAME);
  }
}
