import { bootstrapApplication } from "@angular/platform-browser";
import { provideZonelessChangeDetection } from "@angular/core";
import { provideRouter, withHashLocation } from "@angular/router";
import { AppComponent } from "./component/app/app.component";
import { routes } from "./routes";
import "./styles/global.scss";

// Zoneless: the UI is entirely signal-based, and without zone.js patching
// requestAnimationFrame there is no way for Phaser's game loop to drag the
// Angular change detector along with it at 60fps.
//
// Hash location: the built application is copied into a subdirectory of a
// static host that will not rewrite unknown paths onto index.html, so a
// fragment is the only form of URL that survives a reload.
bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withHashLocation()),
  ],
}).catch((err: unknown) => {
  console.error(err);
});
