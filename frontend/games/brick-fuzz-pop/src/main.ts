import {
  inject,
  provideAppInitializer,
  provideZonelessChangeDetection,
} from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { AppComponent } from "./app/app.component";
import { provideGame } from "./app/play/game.service";
import { SavedGameService } from "./app/play/saved_game.service";
import "./app/styles/global.scss";

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideGame(),
    // The saved game takes a kept run up as it is made, so it is made
    // as the app starts, before anything else asks for the game.
    provideAppInitializer(() => {
      inject(SavedGameService);
    }),
  ],
}).catch((err: unknown) => {
  console.error(err);
});
