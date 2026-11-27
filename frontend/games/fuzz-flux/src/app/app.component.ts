import { Component, inject } from "@angular/core";
import { BugReportDialogComponent } from "@fz/game-ui/bug_report";
import { GameViewportService } from "@fz/game-ui/viewport";
import { AnnouncerComponent } from "@fz/ui/announcer";
import { ConfirmDialogComponent } from "@fz/ui/confirm";

/**
 * Shows the game: for now its name, beside what the page holds from the
 * start, the live region that says what happens, the question asked before
 * something is lost, and the Report a bug dialog.
 */
@Component({
  selector: "app-root",
  imports: [
    AnnouncerComponent,
    BugReportDialogComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
})
export class AppComponent {
  protected readonly viewport = inject(GameViewportService);
}
