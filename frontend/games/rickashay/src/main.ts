import { provideZonelessChangeDetection } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { AppComponent } from "./app/app.component";
import { provideBugReports } from "./app/bug_report/bug_report_source";
import "./app/styles/global.scss";

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    // The settings drawer offers Report a bug where a game provides this.
    provideBugReports(),
  ],
}).catch((err: unknown) => {
  console.error(err);
});
