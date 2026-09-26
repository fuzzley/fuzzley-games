import { InjectionToken } from "@angular/core";

/** Where a bug report is filed, and which build is filing it. */
export interface BugReportConfig {
  /** The page that opens a new issue on the project. */
  readonly newIssueUrl: string;
  /** The issue form to open, by its file name in `.github/ISSUE_TEMPLATE`. */
  readonly template: string;
  /** The commit this build was made from, or null for a local build. */
  readonly commit: string | null;
}

/** Where "Report a Bug" leads, and the build it reports. */
export const BUG_REPORT_CONFIG = new InjectionToken<BugReportConfig>(
  "BUG_REPORT_CONFIG",
  {
    providedIn: "root",
    factory: () => ({
      newIssueUrl: "https://github.com/fuzzley/fSolitaire/issues/new",
      template: "bug_report.yml",
      commit: import.meta.env.VITE_COMMIT_SHA ?? null,
    }),
  },
);
