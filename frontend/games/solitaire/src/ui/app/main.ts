import { bootstrapApplication } from "@angular/platform-browser";
import {
  inject,
  provideAppInitializer,
  provideZonelessChangeDetection,
} from "@angular/core";
import { provideRouter, withHashLocation } from "@angular/router";
import { AppComponent } from "./component/app/app.component";
import { SavedGameService } from "./service/saved_game.service";
import { routes } from "./routes";
import "./styles/global.scss";

// Zoneless, so Phaser's game loop does not run change detection every frame.
//
// Hash location, because the static host this is copied onto will not rewrite
// unknown paths onto index.html.
//
// The saved game is restored before the first render.
bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withHashLocation()),
    provideAppInitializer(() => {
      inject(SavedGameService);
    }),
  ],
}).catch((err: unknown) => {
  console.error(err);
});
