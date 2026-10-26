import { Component } from "@angular/core";

/** Shows the site's copyright and a link to its source on every page. */
@Component({
  selector: "app-site-footer",
  templateUrl: "./site_footer.component.html",
  styleUrl: "./site_footer.component.scss",
})
export class SiteFooterComponent {
  protected readonly year = new Date().getFullYear();
}
