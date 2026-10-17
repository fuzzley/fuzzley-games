import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { SiteHeaderComponent } from "../site_header/site_header.component";

@Component({
  selector: "app-root",
  imports: [RouterOutlet, SiteHeaderComponent],
  templateUrl: "./app.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {}
