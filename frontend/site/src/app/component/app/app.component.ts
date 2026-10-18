import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { SiteHeaderComponent } from "../site_header/site_header.component";

/** Places the site's header above whichever page the address shows. */
@Component({
  selector: "app-root",
  imports: [RouterOutlet, SiteHeaderComponent],
  templateUrl: "./app.component.html",
})
export class AppComponent {}
