import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
} from "@angular/core";
import { Meta } from "@angular/platform-browser";
import { RouterLink } from "@angular/router";
import { GameCatalog } from "../../service/game_catalog.service";

/**
 * Says there's nothing at an address, and offers the categories and every
 * game instead. The server answers every address with the app, so the page
 * also asks search engines not to index it.
 */
@Component({
  selector: "app-not-found",
  imports: [RouterLink],
  templateUrl: "./not_found.component.html",
  styleUrl: "./not_found.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundComponent {
  /**
   * What the address was meant to show. As the router's catch-all, the router
   * binds it to undefined, which means a page.
   */
  readonly kind = input("page", {
    transform: (kind: "page" | "game" | "category" | undefined) =>
      kind ?? "page",
  });

  protected readonly categories = inject(GameCatalog).categories;

  constructor() {
    const meta = inject(Meta);
    meta.updateTag({ name: "robots", content: "noindex" });
    inject(DestroyRef).onDestroy(() => {
      meta.removeTag('name="robots"');
    });
  }
}
