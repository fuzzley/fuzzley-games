import {
  inject,
  provideAppInitializer,
  provideZonelessChangeDetection,
} from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { THEME_COLOR_ROLE } from "@fz/ui/theme";
import { AppComponent } from "./app/app.component";
import { SavedGameService } from "./app/play/saved_game.service";
import "./app/styles/global.scss";

// The browser's toolbar takes the page's color: on a phone the bar stands at
// the bottom, and the page runs to the top.
bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    { provide: THEME_COLOR_ROLE, useValue: "page" },
    // Takes up the game a reload interrupted, before the board first shows.
    provideAppInitializer(() => {
      inject(SavedGameService);
    }),
  ],
}).catch((err: unknown) => {
  console.error(err);
});
