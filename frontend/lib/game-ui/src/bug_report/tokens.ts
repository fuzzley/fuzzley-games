import { InjectionToken, inject } from "@angular/core";
import { PageCaptureService } from "@fz/ui/capture";

/** Says where reports are filed. */
export interface BugReportConfig {
  /** The page that opens a new issue on the project. */
  readonly newIssueUrl: string;
  /** The issue form to open, by its file name in `.github/ISSUE_TEMPLATE`. */
  readonly template: string;
  /**
   * The longest link to allow, below the roughly 7,000 characters at which
   * GitHub fails a signed-out visitor's link.
   */
  readonly maxUrlChars: number;
}

/**
 * Where reports are filed: the shared form on the games' repository, unless a
 * spec provides another.
 */
export const BUG_REPORT_CONFIG = new InjectionToken<BugReportConfig>(
  "BUG_REPORT_CONFIG",
  {
    providedIn: "root",
    factory: () => ({
      newIssueUrl: "https://github.com/fuzzley/fuzzley-games/issues/new",
      template: "game_bug_report.yml",
      maxUrlChars: 6000,
    }),
  },
);

/** Describes a game's state for a report, and how it shrinks to fit the link. */
export interface ReportState {
  /** One line for people: "Level 9 · Score 950 · 2 lives". */
  readonly summary: string;
  /** What the game needs to put back exactly what the player saw, as JSON. */
  readonly value: unknown;
  /**
   * Smaller states for a link with no room for the whole: `at(kept)` keeps
   * `kept` of `most` parts, the most useful first, and says what it left
   * out. Left out where the state can't shrink.
   */
  readonly trim?: {
    readonly most: number;
    at(kept: number): { readonly value: unknown; readonly note: string };
  };
}

/** Says what a game puts in its reports, and how it takes one back. */
export interface BugReportSource {
  /**
   * The game's name, "Snake", which the issue's title starts with in
   * brackets: "[Snake] ".
   */
  readonly title: string;
  /** The tag its state is packed under: "sn1". */
  readonly tag: string;
  /** Describes the game in play in one line. */
  game(): string;
  /** Returns the game's settings for the Environment list, "Speed: Normal". */
  settings(): readonly string[];
  /** Takes the game's state as it stands, at once. */
  capture(): ReportState;
  /**
   * Puts a reported state in play, paused, asking first where a game in
   * progress would be lost; resolves to whether it did.
   *
   * @throws Error naming the part that doesn't fit this build.
   */
  load(state: unknown): Promise<boolean>;
}

/**
 * The game's reports, which a game provides in its `main.ts`; where it is
 * provided, the settings drawer offers Report a bug.
 */
export const BUG_REPORT_SOURCE = new InjectionToken<BugReportSource>(
  "BUG_REPORT_SOURCE",
);

/**
 * Takes the report's picture, a PNG of the page as the player left it, or
 * null where it can't; `PageCaptureService.capture()` unless a spec
 * provides its own.
 */
export const REPORT_PICTURE = new InjectionToken<() => Promise<Blob | null>>(
  "REPORT_PICTURE",
  {
    providedIn: "root",
    factory: () => {
      const page = inject(PageCaptureService);
      return () => page.capture();
    },
  },
);
