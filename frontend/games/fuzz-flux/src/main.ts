import { provideZonelessChangeDetection } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { AppComponent } from "./app/app.component";
import { provideFuzzFluxBugReports } from "./app/bug_report/fuzz_flux_bug_reports";
import "./app/styles/global.scss";

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    // The settings drawer offers Report a bug where a game provides this.
    provideFuzzFluxBugReports(),
  ],
}).catch((err: unknown) => {
  console.error(err);
});
