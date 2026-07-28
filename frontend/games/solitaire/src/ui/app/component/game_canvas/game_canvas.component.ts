import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
} from "@angular/core";
import { Solitaire } from "@/games/klondike/solitaire";
import { makeBoardScene } from "../../provider/board_catalog";
import { GameCatalogService } from "../../service/game_catalog.service";
import { PresentationSettingsService } from "../../service/presentation_settings.service";

declare global {
  interface Window {
    /** The running game, exposed for debugging from the browser console. */
    solitaire?: Solitaire;
  }
}

/**
 * Hosts the Phaser game canvas.
 *
 * The game used to boot as a side effect of importing a module from main.ts,
 * which tied its lifetime to module evaluation order rather than to anything
 * visible. Owning it here gives the canvas an owner that is created and torn
 * down with the element it draws into.
 *
 * Which game is on the table is decided by the catalog, not here: this hosts
 * whichever board that game asks for, and rebuilds when the choice changes.
 */
@Component({
  selector: "app-game-canvas",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: "",
  styleUrl: "./game_canvas.component.css",
})
export class GameCanvasComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly catalog = inject(GameCatalogService);
  private readonly presentation = inject(PresentationSettingsService);

  constructor() {
    // One Phaser host per game. Switching games tears the old canvas down and
    // builds a new one, because a board is wired to the game it draws when it
    // is constructed and there is nothing sensible to re-point at a different
    // one mid-flight.
    effect((onCleanup) => {
      const { game } = this.catalog.session();
      const solitaire = new Solitaire(window, this.host.nativeElement, () =>
        makeBoardScene(game, this.presentation),
      );
      solitaire.start();
      window.solitaire = solitaire;

      onCleanup(() => {
        solitaire.destroy();
        if (window.solitaire === solitaire) {
          delete window.solitaire;
        }
      });
    });
  }
}
