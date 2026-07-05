import {
  Injectable,
  signal,
  computed,
  DestroyRef,
  inject,
} from "@angular/core";

/**
 * A simple stopwatch with no knowledge of the game. Tracks elapsed seconds and
 * exposes a formatted `mm:ss` string. Callers drive it via start/stop/reset.
 */
@Injectable({ providedIn: "root" })
export class TimerService {
  private readonly secondsElapsed = signal(0);
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  readonly timerText = computed(() => {
    const total = this.secondsElapsed();
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  /** Whether the stopwatch is currently counting. */
  get isRunning(): boolean {
    return this.intervalHandle !== null;
  }

  start(): void {
    if (this.intervalHandle) return;
    this.intervalHandle = setInterval(() => {
      this.secondsElapsed.update((s) => s + 1);
    }, 1000);
  }

  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  reset(): void {
    this.stop();
    this.secondsElapsed.set(0);
  }
}
