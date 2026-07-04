<template>
  <div class="ui-overlay" :class="themeClass">
    <!-- Top Header Bar -->
    <header class="header-bar">
      <div class="brand">
        <span class="brand-text">fSolitaire</span>
      </div>

      <div class="metrics">
        <div class="metric-card score-card">
          <span class="label">SCORE</span>
          <span class="value">{{ score }}</span>
        </div>
        <div class="metric-card timer-card">
          <span class="label">TIME</span>
          <span class="value">{{ timerText }}</span>
        </div>
        <div class="metric-card moves-card">
          <span class="label">MOVES</span>
          <span class="value">{{ moves }}</span>
        </div>
      </div>

      <div class="actions">
        <button
          class="btn btn-secondary"
          @click="restartGame"
          title="Restart current game"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            class="btn-icon"
          >
            <path
              fill="currentColor"
              d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
            />
          </svg>
          Restart
        </button>
        <button
          class="btn btn-primary"
          @click="startNewGame"
          title="Start a brand new game"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            class="btn-icon"
          >
            <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
          New Game
        </button>
        <button
          class="btn-circle btn-settings"
          @click="toggleSettings"
          title="Game Settings"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            class="btn-icon"
          >
            <path
              fill="currentColor"
              d="M19.14 12.94c.04-.3.06-.61.06-.94c0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.48.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.488.488 0 0 0-.59.22L2.74 8.87a.49.49 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94c0 .31.04.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.03-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6s3.6 1.62 3.6 3.6s-1.62 3.6-3.6 3.6z"
            />
          </svg>
        </button>
      </div>
    </header>

    <!-- Side Settings Drawer Overlay -->
    <transition name="fade">
      <div
        v-if="showSettings"
        class="drawer-backdrop"
        @click="toggleSettings"
      ></div>
    </transition>

    <transition name="slide">
      <div v-if="showSettings" class="drawer">
        <div class="drawer-header">
          <h2>Game Options</h2>
          <button class="btn-close" @click="toggleSettings">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="close-icon"
            >
              <path
                fill="currentColor"
                d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41z"
              />
            </svg>
          </button>
        </div>

        <div class="drawer-content">
          <!-- Draw Mode -->
          <div class="setting-group">
            <label class="setting-label">Draw Mode</label>
            <div class="segmented-control">
              <button
                :class="{ active: drawCount === 1 }"
                @click="setDrawMode(1)"
                class="segment-btn"
              >
                Draw 1
              </button>
              <button
                :class="{ active: drawCount === 3 }"
                @click="setDrawMode(3)"
                class="segment-btn"
              >
                Draw 3
              </button>
            </div>
            <p class="setting-desc">
              Draw 1 is easier; Draw 3 is the standard Solitaire challenge.
            </p>
          </div>

          <!-- Card Back Style -->
          <div class="setting-group">
            <label class="setting-label">Card Back Design</label>
            <div class="card-back-selector">
              <button
                class="card-back-option blue-back"
                :class="{ active: cardBack === 'card-back-blue' }"
                @click="setCardBack('card-back-blue')"
              >
                <div class="card-back-preview blue-pattern"></div>
                <span>Classic Blue</span>
              </button>
              <button
                class="card-back-option red-back"
                :class="{ active: cardBack === 'card-back-red' }"
                @click="setCardBack('card-back-red')"
              >
                <div class="card-back-preview red-pattern"></div>
                <span>Royal Red</span>
              </button>
            </div>
          </div>

          <!-- Table Themes -->
          <div class="setting-group">
            <label class="setting-label">Table Theme</label>
            <div class="theme-selector">
              <button
                v-for="(theme, key) in themes"
                :key="key"
                class="theme-option"
                :class="{ active: selectedTheme === key }"
                @click="setTheme(key)"
                :style="{ backgroundColor: theme.color }"
                :title="theme.name"
              >
                <div class="theme-indicator" v-if="selectedTheme === key"></div>
              </button>
            </div>
            <p class="setting-desc">Theme: {{ themes[selectedTheme].name }}</p>
          </div>
        </div>

        <div class="drawer-footer">
          <button class="btn btn-primary btn-block" @click="toggleSettings">
            Apply Settings
          </button>
        </div>
      </div>
    </transition>

    <!-- Victory Overlay -->
    <transition name="fade">
      <div v-if="isGameWon" class="victory-overlay">
        <div class="victory-card">
          <div class="trophy-container">
            <div class="trophy-glow"></div>
            <svg
              class="trophy-icon"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
            >
              <path
                fill="currentColor"
                d="M18 2H6c-1.1 0-2 .9-2 2v3c0 2.24 1.51 4.13 3.56 4.72c.54 1.5 1.76 2.7 3.29 3.12V18H9v2h6v-2h-1.85v-3.16c1.53-.42 2.75-1.62 3.29-3.12C18.49 11.13 20 9.24 20 7V4c0-1.1-.9-2-2-2zm-3 8h-2v2H9v-2H7V4h8v6zm3-3h-1v2.11c-.75-.43-1.58-.73-2.48-.89V4h3v3zm-11 .22V4h3v3.22c-.9.16-1.73.46-2.48.89H7z"
              />
            </svg>
          </div>
          <h1>Congratulations!</h1>
          <p class="victory-subtitle">
            You have successfully cleared the board!
          </p>

          <div class="victory-stats">
            <div class="v-stat">
              <span class="v-val">{{ score }}</span>
              <span class="v-lbl">Score</span>
            </div>
            <div class="v-stat">
              <span class="v-val">{{ timerText }}</span>
              <span class="v-lbl">Time</span>
            </div>
            <div class="v-stat">
              <span class="v-val">{{ moves }}</span>
              <span class="v-lbl">Moves</span>
            </div>
          </div>

          <button
            class="btn btn-gradient btn-large btn-block"
            @click="startNewGame"
          >
            Play Again
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, computed } from "vue";

export default defineComponent({
  name: "App",
  setup() {
    // Dynamic Stats
    const score = ref(0);
    const moves = ref(0);
    const timerText = ref("00:00");
    const isGameWon = ref(false);

    // Options
    const drawCount = ref<1 | 3>(3);
    const cardBack = ref<"card-back-blue" | "card-back-red">("card-back-blue");
    const selectedTheme = ref("green");
    const showSettings = ref(false);

    const themes: Record<
      string,
      { name: string; color: string; bgClass: string }
    > = {
      green: { name: "Emerald Felt", color: "#0f4d0e", bgClass: "theme-green" },
      blue: { name: "Deep Ocean", color: "#1b4353", bgClass: "theme-blue" },
      charcoal: {
        name: "Midnight Charcoal",
        color: "#2b2d42",
        bgClass: "theme-charcoal",
      },
      purple: {
        name: "Royal Velvet",
        color: "#3c096c",
        bgClass: "theme-purple",
      },
    };

    const themeClass = computed(() => themes[selectedTheme.value].bgClass);

    // Timer Variables
    const secondsElapsed = ref(0);
    let timerInterval: ReturnType<typeof setInterval> | null = null;

    let gameModel: any = null;

    const startTimer = () => {
      if (timerInterval) return;
      timerInterval = setInterval(() => {
        secondsElapsed.value++;
        updateTimerText();
      }, 1000);
    };

    const stopTimer = () => {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
    };

    const resetTimer = () => {
      stopTimer();
      secondsElapsed.value = 0;
      updateTimerText();
    };

    const updateTimerText = () => {
      const mins = Math.floor(secondsElapsed.value / 60);
      const secs = secondsElapsed.value % 60;
      timerText.value = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    const toggleSettings = () => {
      showSettings.value = !showSettings.value;
    };

    const setupListeners = () => {
      if (!gameModel) return;

      // Populate initial model values
      score.value = gameModel.score;
      moves.value = gameModel.moves;
      drawCount.value = gameModel.drawCount;
      cardBack.value = gameModel.cardBackStyle;

      // Listen for updates
      gameModel.on("state-changed", (state: any) => {
        score.value = state.score;
        moves.value = state.moves;
        drawCount.value = state.drawCount;
        cardBack.value = state.cardBackStyle;

        // Auto-start timer on the first move
        if (moves.value > 0 && !timerInterval && !isGameWon.value) {
          startTimer();
        }
      });

      gameModel.on("game-won", () => {
        isGameWon.value = true;
        stopTimer();
      });
    };

    const initGameModel = () => {
      const gameInstance = (window as any).solitaire?.game;
      if (!gameInstance || !gameInstance.scene) {
        setTimeout(initGameModel, 100);
        return;
      }

      const boardScene = gameInstance.scene.getScene("board-scene");
      if (!boardScene) {
        setTimeout(initGameModel, 100);
        return;
      }

      // If boardScene gameModel is available, set it up
      if (boardScene.gameModel) {
        gameModel = boardScene.gameModel;
        setupListeners();
        // Set initial theme color
        setTheme(selectedTheme.value);
      } else {
        setTimeout(initGameModel, 100);
      }
    };

    const restartGame = () => {
      if (gameModel) {
        gameModel.startNewGame();
        isGameWon.value = false;
        resetTimer();
      }
    };

    const startNewGame = () => {
      if (gameModel) {
        gameModel.startNewGame();
        isGameWon.value = false;
        resetTimer();
      }
    };

    const setDrawMode = (mode: 1 | 3) => {
      if (gameModel) {
        gameModel.setDrawCount(mode);
        gameModel.startNewGame();
        resetTimer();
      }
    };

    const setCardBack = (style: "card-back-blue" | "card-back-red") => {
      if (gameModel) {
        gameModel.setCardBackStyle(style);
      }
    };

    const setTheme = (themeKey: string) => {
      selectedTheme.value = themeKey;
      const themeColor = themes[themeKey].color;

      const gameInstance = (window as any).solitaire?.game;
      if (gameInstance && gameInstance.scene) {
        const boardScene = gameInstance.scene.getScene("board-scene");
        if (boardScene && boardScene.cameras?.main) {
          boardScene.cameras.main.setBackgroundColor(themeColor);
        }
      }
    };

    onMounted(() => {
      initGameModel();
    });

    onUnmounted(() => {
      stopTimer();
    });

    return {
      score,
      moves,
      timerText,
      isGameWon,
      drawCount,
      cardBack,
      selectedTheme,
      showSettings,
      themes,
      themeClass,
      toggleSettings,
      restartGame,
      startNewGame,
      setDrawMode,
      setCardBack,
      setTheme,
    };
  },
});
</script>

<style scoped>
.ui-overlay {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  box-sizing: border-box;
}

/* Header Bar Styling */
.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.2);
  pointer-events: auto;
  color: #f8fafc;
  user-select: none;
}

.brand {
  display: flex;
  align-items: center;
}

.brand-text {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.025em;
  background: linear-gradient(135deg, #38bdf8 0%, #a855f7 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.metrics {
  display: flex;
  gap: 16px;
}

.metric-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  min-width: 90px;
  padding: 6px 16px;
}

.metric-card .label {
  font-size: 0.65rem;
  font-weight: 700;
  color: #94a3b8;
  letter-spacing: 0.1em;
  margin-bottom: 2px;
}

.metric-card .value {
  font-size: 1.1rem;
  font-weight: 700;
  font-family: monospace;
  color: #f8fafc;
}

.actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Button Stylings */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 0.9rem;
  font-weight: 600;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  color: #fff;
  outline: none;
}

.btn-icon {
  width: 16px;
  height: 16px;
}

.btn-primary {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);
}

.btn-primary:hover {
  background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
  transform: translateY(-1px);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.btn-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.1);
  cursor: pointer;
  color: #f8fafc;
  transition: all 0.2s;
  outline: none;
}

.btn-circle:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: rotate(45deg);
}

/* Side Settings Drawer */
.drawer-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.6);
  z-index: 100;
  pointer-events: auto;
}

.drawer {
  position: fixed;
  top: 0;
  right: 0;
  width: 320px;
  height: 100vh;
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: -10px 0 30px rgba(0, 0, 0, 0.4);
  z-index: 101;
  display: flex;
  flex-direction: column;
  color: #e2e8f0;
  pointer-events: auto;
  user-select: none;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.drawer-header h2 {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
}

.btn-close {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-close:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.close-icon {
  width: 20px;
  height: 20px;
}

.drawer-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.setting-group {
  margin-bottom: 28px;
}

.setting-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 12px;
}

.setting-desc {
  margin-top: 8px;
  font-size: 0.75rem;
  color: #64748b;
  line-height: 1.4;
}

/* Segmented Control */
.segmented-control {
  display: flex;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 2px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.segment-btn {
  flex: 1;
  background: transparent;
  border: none;
  padding: 8px 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: #94a3b8;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}

.segment-btn.active {
  background: #3b82f6;
  color: #fff;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);
}

/* Card Back Selector */
.card-back-selector {
  display: flex;
  gap: 16px;
}

.card-back-option {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(255, 255, 255, 0.03);
  border: 2px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s;
  color: #94a3b8;
}

.card-back-option:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.15);
}

.card-back-option.active {
  background: rgba(59, 130, 246, 0.1);
  border-color: #3b82f6;
  color: #fff;
}

.card-back-preview {
  width: 48px;
  height: 68px;
  border-radius: 4px;
  margin-bottom: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.blue-pattern {
  background-color: #1e3a8a;
  background-image:
    radial-gradient(circle, #2563eb 20%, transparent 20%),
    radial-gradient(circle, #2563eb 20%, transparent 20%);
  background-size: 8px 8px;
  background-position:
    0 0,
    4px 4px;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.red-pattern {
  background-color: #7f1d1d;
  background-image:
    radial-gradient(circle, #dc2626 20%, transparent 20%),
    radial-gradient(circle, #dc2626 20%, transparent 20%);
  background-size: 8px 8px;
  background-position:
    0 0,
    4px 4px;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

/* Theme Selector */
.theme-selector {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.theme-option {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.theme-option:hover {
  transform: scale(1.1);
}

.theme-option.active {
  border-color: #fff;
  transform: scale(1.05);
}

.theme-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 8px;
  background-color: #fff;
  border-radius: 50%;
}

.drawer-footer {
  padding: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-block {
  width: 100%;
  justify-content: center;
}

/* Victory Overlay */
.victory-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  pointer-events: auto;
  user-select: none;
}

.victory-card {
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  padding: 40px;
  width: 420px;
  text-align: center;
  box-shadow:
    0 10px 40px rgba(0, 0, 0, 0.5),
    0 0 100px rgba(245, 158, 11, 0.15);
  color: #fff;
  transform: scale(1);
  animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes popIn {
  0% {
    transform: scale(0.8);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.trophy-container {
  position: relative;
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
}

.trophy-icon {
  width: 80px;
  height: 80px;
  color: #f59e0b;
  position: relative;
  z-index: 2;
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

.trophy-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100px;
  height: 100px;
  background: radial-gradient(
    circle,
    rgba(245, 158, 11, 0.4) 0%,
    transparent 70%
  );
  z-index: 1;
}

.victory-card h1 {
  font-size: 2.25rem;
  font-weight: 800;
  margin: 0 0 8px;
  background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.victory-subtitle {
  color: #94a3b8;
  font-size: 1rem;
  margin: 0 0 32px;
}

.victory-stats {
  display: flex;
  justify-content: space-around;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 32px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.v-stat {
  display: flex;
  flex-direction: column;
}

.v-stat .v-val {
  font-size: 1.5rem;
  font-weight: 800;
  color: #f8fafc;
  font-family: monospace;
}

.v-stat .v-lbl {
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  margin-top: 4px;
}

.btn-gradient {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  box-shadow: 0 4px 14px rgba(217, 119, 6, 0.4);
}

.btn-gradient:hover {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  transform: translateY(-1px);
}

.btn-large {
  padding: 12px 24px;
  font-size: 1rem;
  border-radius: 10px;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}
</style>
