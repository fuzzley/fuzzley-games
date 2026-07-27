import { bootstrapApplication } from "@angular/platform-browser";
import { provideZonelessChangeDetection } from "@angular/core";
import { AppComponent } from "./component/app/app.component";
import "./styles.css";

// Zoneless: the UI is entirely signal-based, and without zone.js patching
// requestAnimationFrame there is no way for Phaser's game loop to drag the
// Angular change detector along with it at 60fps.
bootstrapApplication(AppComponent, {
  providers: [provideZonelessChangeDetection()],
}).catch((err: unknown) => {
  console.error(err);
});
