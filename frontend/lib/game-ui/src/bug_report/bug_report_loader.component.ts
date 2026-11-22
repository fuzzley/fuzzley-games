import { Component, inject, output, signal } from "@angular/core";
import { DEBUG_MENU } from "../debug_menu";
import { BugReportService } from "./bug_report.service";

/** Tells one loader's field apart from another's on the same page. */
let nextLoader = 0;

/**
 * Takes a state pasted from a bug report, such as its whole Game state
 * field, and loads it into the game, saying why where it can't.
 *
 * A game puts it in its debug menu, with a line of its own under the field
 * where loading a state touches its records. It shows only where the game
 * offers that menu (`DEBUG_MENU`): in a development build, and on the site at
 * `?debug`.
 */
@Component({
  selector: "fz-bug-report-loader",
  templateUrl: "./bug_report_loader.component.html",
  styleUrl: "./bug_report_loader.component.scss",
})
export class BugReportLoaderComponent {
  private readonly reports = inject(BugReportService);

  /** Whether the game offers its debug menu, and so the loader. */
  protected readonly offered = inject(DEBUG_MENU);

  protected readonly fieldId = `fz-bug-report-state-${String(nextLoader++)}`;

  /** Why the last state couldn't be loaded, if it couldn't. */
  protected readonly problem = signal("");

  /** Emitted once a reported state is in play. */
  readonly loaded = output();

  /** Loads a pasted state, and says why where it can't. */
  protected async load(text: string): Promise<void> {
    this.problem.set("");
    try {
      if (await this.reports.load(text)) this.loaded.emit();
    } catch (error) {
      this.problem.set(error instanceof Error ? error.message : String(error));
    }
  }
}
