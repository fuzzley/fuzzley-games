import { bootstrapApplication } from "@angular/platform-browser";
import {
  inject,
  provideAppInitializer,
  provideZonelessChangeDetection,
} from "@angular/core";
import { AppComponent } from "./component/app/app.component";
import { SavedGameService } from "./service/saved_game.service";
import { provideAppRouter } from "./routes";
import "./styles/global.scss";

// Zoneless, so Phaser's game loop does not run change detection every frame.
//
// The saved game is restored before the first render.
bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideAppRouter(),
    provideAppInitializer(() => {
      inject(SavedGameService);
    }),
  ],
}).catch((err: unknown) => {
  console.error(err);
});
