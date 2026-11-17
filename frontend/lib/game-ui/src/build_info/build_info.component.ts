import { Component, inject } from "@angular/core";
import { BUILD_INFO, type BuildInfo } from "./build_info";

const REPOSITORY = "https://github.com/fuzzley/fuzzley-games";

/** Says what the line shows of a build. */
interface ShownBuild {
  /** The day of the build, as "June 15, 2031". */
  readonly builtOn: string;
  /** The commit and its page on GitHub, or null when the build couldn't tell which. */
  readonly commit: {
    readonly hash: string;
    readonly href: string;
    readonly label: string;
  } | null;
}

/** Returns what the line shows of a build, or null for none. */
function shownBuild(build: BuildInfo | null): ShownBuild | null {
  if (!build) return null;
  const builtOn = new Date(build.buildTime).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
  const commit =
    build.commit === "dev"
      ? null
      : {
          hash: build.commit,
          href: `${REPOSITORY}/commit/${build.commit}`,
          label: `${build.commit} (opens in a new tab)`,
        };
  return { builtOn, commit };
}

/**
 * Shows which version of the game is running: the commit it was built from,
 * linked to its page on GitHub, and the day of the build, as the site's
 * footer does, or nothing where the build wasn't stamped.
 */
@Component({
  selector: "fz-build-info",
  templateUrl: "./build_info.component.html",
  styleUrl: "./build_info.component.scss",
})
export class BuildInfoComponent {
  protected readonly shown = shownBuild(inject(BUILD_INFO));
}
