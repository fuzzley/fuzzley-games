import { Component, InjectionToken, inject } from "@angular/core";
import type { BuildInfo } from "../../model/build";

/** Which commit the site was built from, and when: this build's, unless a spec's. */
export const BUILD_INFO = new InjectionToken<BuildInfo>("BUILD_INFO", {
  providedIn: "root",
  factory: () => __BUILD_INFO__,
});

const REPOSITORY = "https://github.com/fuzzley/fuzzley-games";

/** Shows the site's copyright, its source, and the commit it was built from on every page. */
@Component({
  selector: "app-site-footer",
  templateUrl: "./site_footer.component.html",
  styleUrl: "./site_footer.component.scss",
})
export class SiteFooterComponent {
  private readonly build = inject(BUILD_INFO);
  private readonly builtAt = new Date(this.build.buildTime);

  protected readonly repository = REPOSITORY;
  protected readonly year = this.builtAt.getUTCFullYear();
  protected readonly builtOn = this.builtAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
  /** The commit and its page on GitHub, or null when the build couldn't tell which. */
  protected readonly commit =
    this.build.commit === "dev"
      ? null
      : {
          hash: this.build.commit,
          href: `${REPOSITORY}/commit/${this.build.commit}`,
          label: `${this.build.commit} (opens in a new tab)`,
        };
}
