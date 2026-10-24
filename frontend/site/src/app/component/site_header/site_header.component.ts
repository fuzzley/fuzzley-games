import { BreakpointObserver } from "@angular/cdk/layout";
import { Component, computed, inject, linkedSignal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
} from "@angular/router";
import { IconComponent } from "@fz/ui/icon";
import { ThemeMenuComponent } from "@fz/ui/theme";
import { filter, map } from "rxjs";
import { GameCatalog } from "../../service/game_catalog.service";
import { below } from "../../styles/breakpoints";

/** Shows the site's name, category links, search and palette menu on every page. */
@Component({
  selector: "app-site-header",
  imports: [RouterLink, RouterLinkActive, IconComponent, ThemeMenuComponent],
  templateUrl: "./site_header.component.html",
  styleUrl: "./site_header.component.scss",
})
export class SiteHeaderComponent {
  private readonly router = inject(Router);

  protected readonly categories = inject(GameCatalog).categories;

  /** Whether the screen is narrow enough to shrink the theme menu to its swatch. */
  protected readonly compact = toSignal(
    inject(BreakpointObserver)
      .observe(below("md"))
      .pipe(map(({ matches }) => matches)),
    { requireSync: true },
  );

  /** The address after each navigation, parsed once. */
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.parseUrl(this.router.url)),
    ),
    { initialValue: this.router.parseUrl(this.router.url) },
  );

  /** The search box follows `?q=` in the address, and writes back to it. */
  protected readonly query = linkedSignal(
    () => this.url().queryParamMap.get("q") ?? "",
  );
  private readonly onHome = computed(
    () => this.url().root.children["primary"] === undefined,
  );

  /** Searches the games for what the box holds, from any page. */
  protected search(query: string): void {
    this.query.set(query);
    // Typing on the home page refines the results in place; from anywhere
    // else it starts a new search, which Back can undo.
    void this.router.navigate(["/"], {
      queryParams: { q: query || null },
      replaceUrl: this.onHome(),
    });
  }
}
