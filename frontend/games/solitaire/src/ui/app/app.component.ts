import {
  Component,
  inject,
  signal,
  computed,
  effect,
  DestroyRef,
} from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { GAME_MODEL } from "./game-model.provider";
import { BoardScene } from "@/game/render/scene/board/board_scene";

@Component({
  selector: "app-root",
  standalone: true,
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.css",
})
export class AppComponent {
  // Injected game model — available synchronously via InjectionToken factory
  private readonly gameModel = inject(GAME_MODEL);
  private readonly destroyRef = inject(DestroyRef);

  // --- Signals from observable game state ---
  readonly score = toSignal(this.gameModel.state.score$, { initialValue: 0 });
  readonly moves = toSignal(this.gameModel.state.moves$, { initialValue: 0 });
  readonly drawCount = toSignal(this.gameModel.settings.drawCount$, {
    initialValue: 3,
  });
  readonly cardBack = toSignal(this.gameModel.settings.cardBackStyle$, {
    initialValue: "card-back-blue" as const,
  });

  // --- Game-won state ---
  readonly isGameWon = signal(false);

  // --- Timer state ---
  private readonly secondsElapsed = signal(0);
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  readonly timerText = computed(() => {
    const total = this.secondsElapsed();
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  });

  // Options (non-observable, local UI state)
  selectedTheme = "green";
  showSettings = false;

  themeKeys = ["green", "blue", "charcoal", "purple"];
  themes: Record<string, { name: string; color: string; bgClass: string }> = {
    green: { name: "Emerald Felt", color: "#0f4d0e", bgClass: "theme-green" },
    blue: { name: "Deep Ocean", color: "#1b4353", bgClass: "theme-blue" },
    charcoal: {
      name: "Midnight Charcoal",
      color: "#2b2d42",
      bgClass: "theme-charcoal",
    },
    purple: { name: "Royal Velvet", color: "#3c096c", bgClass: "theme-purple" },
  };

  constructor() {
    // Auto-start timer when moves > 0 and game is not won
    effect(() => {
      const moves = this.moves();
      const isWon = this.isGameWon();
      if (moves > 0 && !this.timerInterval && !isWon) {
        this.startTimer();
      }
    });

    // React to game-won event
    const gameWonHandler = () => {
      this.isGameWon.set(true);
      this.stopTimer();
    };
    this.gameModel.on("game-won", gameWonHandler);
    this.destroyRef.onDestroy(() => {
      this.gameModel.off("game-won", gameWonHandler);
    });

    // Apply initial theme
    this.setTheme(this.selectedTheme);

    // Clean up timer on destroy
    this.destroyRef.onDestroy(() => this.stopTimer());
  }

  private startTimer(): void {
    if (this.timerInterval) return;
    this.timerInterval = setInterval(() => {
      this.secondsElapsed.update((s) => s + 1);
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private resetTimer(): void {
    this.stopTimer();
    this.secondsElapsed.set(0);
  }

  toggleSettings(): void {
    this.showSettings = !this.showSettings;
  }

  restartGame(): void {
    this.gameModel.startNewGame();
    this.isGameWon.set(false);
    this.resetTimer();
  }

  startNewGame(): void {
    this.gameModel.startNewGame();
    this.isGameWon.set(false);
    this.resetTimer();
  }

  setDrawMode(mode: 1 | 3): void {
    this.gameModel.setDrawCount(mode);
    this.gameModel.startNewGame();
    this.resetTimer();
  }

  setCardBack(style: "card-back-blue" | "card-back-red"): void {
    this.gameModel.setCardBackStyle(style);
  }

  setTheme(themeKey: string): void {
    this.selectedTheme = themeKey;
    const themeColor = this.themes[themeKey].color;

    const gameInstance = window.solitaire?.game;
    if (gameInstance && gameInstance.scene) {
      const boardScene = gameInstance.scene.getScene("board-scene") as
        BoardScene | undefined;
      if (boardScene && boardScene.cameras?.main) {
        boardScene.cameras.main.setBackgroundColor(themeColor);
      }
    }
  }
}
