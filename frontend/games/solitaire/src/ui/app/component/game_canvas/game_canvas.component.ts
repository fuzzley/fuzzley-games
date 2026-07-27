import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
} from "@angular/core";
import { Solitaire } from "@/game/solitaire";

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

  ngOnInit(): void {
    const solitaire = new Solitaire(window, this.host.nativeElement);
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
