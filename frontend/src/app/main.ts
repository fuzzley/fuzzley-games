import "zone.js";
import "./styles/global.css";
import { provideZoneChangeDetection } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { AppComponent } from "./component/app/app.component";
import { provideAppRouter } from "./routes";

bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideAppRouter(),
  ],
}).catch((err) => console.error(err));
