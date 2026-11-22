import { Component, ErrorHandler, inject, output } from "@angular/core";
import { IconComponent } from "@fz/ui/icon";
import { BugReportService } from "./bug_report.service";

/**
 * Offers "Found a problem?" over a Report a bug button, which starts a
 * report on the game in play.
 *
 * `fz-settings-drawer` shows it wherever a game provides
 * `BUG_REPORT_SOURCE`, and asks to close as it is pressed: `chosen` comes
 * first, so the drawer can close before `BugReportService.start()` takes the
 * picture.
 */
@Component({
  selector: "fz-report-bug-button",
  imports: [IconComponent],
  templateUrl: "./report_bug_button.component.html",
  styleUrl: "./report_bug_button.component.scss",
})
export class ReportBugButtonComponent {
  private readonly reports = inject(BugReportService);
  private readonly errors = inject(ErrorHandler);

  /** Emitted as the button is pressed, before the report starts. */
  readonly chosen = output();

  /** Starts a report, handing what goes wrong to the app's error handler. */
  protected report(): void {
    this.chosen.emit();
    this.reports.start().catch((error: unknown) => {
      this.errors.handleError(error);
    });
  }
}
