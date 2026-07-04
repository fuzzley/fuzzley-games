import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  NgZone,
} from "@angular/core";
import { SolitaireGame } from "@/game/model/game/solitaire_game";
import { BoardScene } from "@/game/render/scene/board/board_scene";

@Component({
  selector: "app-root",
  standalone: true,
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.css",
})
export class AppComponent implements OnInit, OnDestroy {
  // Live Metrics
  score = 0;
  moves = 0;
  timerText = "00:00";
  isGameWon = false;

  // Options
  drawCount = 3;
  cardBack = "card-back-blue";
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

  private secondsElapsed = 0;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private gameModel: SolitaireGame | null = null;

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly ngZone: NgZone,
  ) {}

  ngOnInit(): void {
    this.initGameModel();
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  private startTimer(): void {
    if (this.timerInterval) return;
    this.timerInterval = setInterval(() => {
      this.secondsElapsed++;
      this.updateTimerText();
      this.cdr.detectChanges();
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
    this.secondsElapsed = 0;
    this.updateTimerText();
  }

  private updateTimerText(): void {
    const mins = Math.floor(this.secondsElapsed / 60);
    const secs = this.secondsElapsed % 60;
    this.timerText = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  toggleSettings(): void {
    this.showSettings = !this.showSettings;
  }

  private setupListeners(): void {
    if (!this.gameModel) return;

    const model = this.gameModel;

    // Pop initial values in NgZone/CDR digest
    this.ngZone.run(() => {
      this.score = model.score;
      this.moves = model.moves;
      this.drawCount = model.drawCount;
      this.cardBack = model.cardBackStyle;
      this.cdr.detectChanges();
    });

    // Listen to changes
    model.on("state-changed", (state) => {
      this.ngZone.run(() => {
        this.score = state.score;
        this.moves = state.moves;
        this.drawCount = state.drawCount;
        this.cardBack = state.cardBackStyle;

        // Auto-start timer on first card movement
        if (this.moves > 0 && !this.timerInterval && !this.isGameWon) {
          this.startTimer();
        }
        this.cdr.detectChanges();
      });
    });

    model.on("game-won", () => {
      this.ngZone.run(() => {
        this.isGameWon = true;
        this.stopTimer();
        this.cdr.detectChanges();
      });
    });
  }

  private initGameModel(): void {
    const gameInstance = window.solitaire?.game;
    if (!gameInstance || !gameInstance.scene) {
      setTimeout(() => this.initGameModel(), 100);
      return;
    }

    const boardScene = gameInstance.scene.getScene("board-scene") as
      BoardScene | undefined;
    if (!boardScene) {
      setTimeout(() => this.initGameModel(), 100);
      return;
    }

    if (boardScene.gameModel) {
      this.gameModel = boardScene.gameModel;
      this.setupListeners();
      this.setTheme(this.selectedTheme);
    } else {
      setTimeout(() => this.initGameModel(), 100);
    }
  }

  restartGame(): void {
    if (this.gameModel) {
      this.gameModel.startNewGame();
      this.isGameWon = false;
      this.resetTimer();
    }
  }

  startNewGame(): void {
    if (this.gameModel) {
      this.gameModel.startNewGame();
      this.isGameWon = false;
      this.resetTimer();
    }
  }

  setDrawMode(mode: 1 | 3): void {
    if (this.gameModel) {
      this.gameModel.setDrawCount(mode);
      this.gameModel.startNewGame();
      this.resetTimer();
    }
  }

  setCardBack(style: "card-back-blue" | "card-back-red"): void {
    if (this.gameModel) {
      this.gameModel.setCardBackStyle(style);
    }
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
