import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { SiteFooterComponent } from "../site_footer/site_footer.component";
import { SiteHeaderComponent } from "../site_header/site_header.component";

/** Places the site's header above whichever page the address shows, and its footer below. */
@Component({
  selector: "app-root",
  imports: [RouterOutlet, SiteFooterComponent, SiteHeaderComponent],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
})
export class AppComponent {}
