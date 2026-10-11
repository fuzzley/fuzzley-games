import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
} from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
} from "@angular/router";
import { filter, map } from "rxjs";
import { CATEGORIES } from "../../provider/game_catalog";
import { ThemeMenuComponent } from "../theme_menu/theme_menu.component";

/** Name, category links, search and the palette menu, on every page. */
@Component({
  selector: "app-site-header",
  imports: [RouterLink, RouterLinkActive, ThemeMenuComponent],
  templateUrl: "./site_header.component.html",
  styleUrl: "./site_header.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteHeaderComponent {
  private readonly router = inject(Router);

  protected readonly categories = CATEGORIES;

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /** The search box follows `?q=` in the address, and writes back to it. */
  protected readonly query = linkedSignal(
    () => this.router.parseUrl(this.url()).queryParamMap.get("q") ?? "",
  );
  private readonly onHome = computed(
    () =>
      this.router.parseUrl(this.url()).root.children["primary"] === undefined,
  );

  search(query: string): void {
    this.query.set(query);
    // Typing on the home page refines the results in place; from anywhere
    // else it starts a new search, which Back can undo.
    void this.router.navigate(["/"], {
      queryParams: { q: query || null },
      replaceUrl: this.onHome(),
    });
  }
}
