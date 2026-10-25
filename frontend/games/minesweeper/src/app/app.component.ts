import { ChangeDetectionStrategy, Component } from "@angular/core";
import { GameBarComponent } from "@fz/game-ui/game_bar";

/** Shows the game: its bar, and the field below it. */
@Component({
  selector: "app-root",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GameBarComponent],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
})
export class AppComponent {}
