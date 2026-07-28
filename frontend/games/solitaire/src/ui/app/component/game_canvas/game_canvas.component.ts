import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
} from "@angular/core";
import { Solitaire, makeKlondikeBoardScene } from "@/games/klondike/solitaire";
import { GAME_MODEL } from "../../provider/game_model.provider";
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
 */
@Component({
  selector: "app-game-canvas",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: "",
  styleUrl: "./game_canvas.component.css",
})
export class GameCanvasComponent implements OnInit {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly game = inject(GAME_MODEL);
  private readonly presentation = inject(PresentationSettingsService);

  ngOnInit(): void {
    // The composition root for the canvas: the game, how it looks, and the
    // board that draws it are joined here rather than by any of the three.
    const solitaire = new Solitaire(window, this.host.nativeElement, () =>
      makeKlondikeBoardScene(this.game, this.presentation),
    );
    solitaire.start();
    window.solitaire = solitaire;

    this.destroyRef.onDestroy(() => {
      solitaire.destroy();
      if (window.solitaire === solitaire) {
        delete window.solitaire;
      }
    });
  }
}
