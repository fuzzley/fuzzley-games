import { bootstrapApplication } from "@angular/platform-browser";
import {
  inject,
  provideAppInitializer,
  provideZonelessChangeDetection,
} from "@angular/core";
import { THEME_COLOR_ROLE } from "@fz/ui/theme";
import { AppComponent } from "./component/app/app.component";
import { SavedGameService } from "./service/saved_game.service";
import { RecentGamesService } from "./service/recent_games.service";
import { provideAppRouter } from "./routes";
import "./styles/global.scss";

// Zoneless, so Phaser's game loop does not run change detection every frame.
//
// The browser's toolbar takes the felt, which AppComponent sets, since a
// player may choose one apart from the palette.
//
// The saved game is restored before the first render, and the recent games
// start following the table from the first game dealt.
bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideAppRouter(),
    { provide: THEME_COLOR_ROLE, useValue: null },
    provideAppInitializer(() => {
      inject(SavedGameService);
      inject(RecentGamesService);
    }),
  ],
}).catch((err: unknown) => {
  console.error(err);
});
