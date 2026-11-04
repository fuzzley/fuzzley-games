import {
  inject,
  provideAppInitializer,
  provideZonelessChangeDetection,
} from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { AppComponent } from "./app/app.component";
import { SavedGameService } from "./app/play/saved_game.service";
import "./app/styles/global.scss";

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    // Takes up the run a reload interrupted, before the board first shows.
    provideAppInitializer(() => {
      inject(SavedGameService);
    }),
  ],
}).catch((err: unknown) => {
  console.error(err);
});
