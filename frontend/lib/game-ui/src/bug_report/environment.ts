import type { ThemeId } from "@fz/style/themes";
import type { BuildInfo } from "../build_info";
import type { BarPlacement } from "../game_bar";

/** Describes the page a report is filed from. */
export interface ReportEnvironment {
  /** The build, or null where the page carries no stamp. */
  readonly build: BuildInfo | null;
  /** The browser and its window, or null for a document without a window. */
  readonly browser: {
    readonly userAgent: string;
    readonly width: number;
    readonly height: number;
    readonly pixelRatio: number;
  } | null;
  /** Whether the game takes its compact layout. */
  readonly compact: boolean;
  /** Whether the window is taller than it is wide. */
  readonly portrait: boolean;
  /** Where the game bar stands. */
  readonly barPlacement: BarPlacement;
  /** Whether the main pointer is a finger. */
  readonly touch: boolean;
  /** Whether the player allows motion. */
  readonly allowsMotion: boolean;
  /** The palette in use. */
  readonly theme: ThemeId;
}

/**
 * Returns the Environment list of a report, as Markdown: the build, the
 * browser, the window, the screen, motion and the palette, then each of the
 * game's settings as it words them.
 */
export function environmentList(
  page: ReportEnvironment,
  settings: readonly string[],
): string {
  const { browser } = page;
  return [
    `- Build: ${buildLine(page.build)}`,
    ...(browser
      ? [
          `- Browser: ${browser.userAgent}`,
          `- Window: ${browser.width}×${browser.height} at ${Math.round(browser.pixelRatio * 100) / 100}× pixel ratio`,
        ]
      : []),
    `- Screen: ${[
      page.compact ? "compact" : "roomy",
      page.portrait ? "portrait" : "landscape",
      `bar at the ${page.barPlacement}`,
      page.touch ? "touch" : "no touch",
    ].join(", ")}`,
    `- Motion: ${page.allowsMotion ? "full" : "reduced"}`,
    `- Theme: ${page.theme}`,
    ...settings.map((setting) => `- ${setting}`),
  ].join("\n");
}

/** Returns the build's commit and when it was built, or says it isn't known. */
function buildLine(build: BuildInfo | null): string {
  return build ? `${build.commit}, built ${build.buildTime}` : "unknown";
}
