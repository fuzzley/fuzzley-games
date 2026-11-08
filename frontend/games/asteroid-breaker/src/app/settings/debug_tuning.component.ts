import { DOCUMENT } from "@angular/common";
import { Component, computed, inject, signal } from "@angular/core";
import {
  TUNING_SLIDERS,
  type TuningNumber,
  formatTuning,
  tuningLines,
} from "../../view/debug_tuning";
import { TuningService } from "./tuning.service";

/** What the debug menu says once Copy the numbers has tried the clipboard. */
const COPY_WORDS = {
  copied: "Copied the numbers.",
  failed: "The browser kept the clipboard shut: the lines are below.",
} as const;

/**
 * Shows the debug menu, the numbers that set the feel, tuned on the field in
 * play: a slider for each, whether shots carry the ship's speed, Reset the
 * numbers, and Copy the numbers, the lines of `tuning.ts` they would replace.
 *
 * It takes no inputs: the numbers are `TuningService`'s, which the game
 * hears each tuning from.
 */
@Component({
  selector: "app-debug-tuning",
  templateUrl: "./debug_tuning.component.html",
  styleUrl: "./debug_tuning.component.scss",
})
export class DebugTuningComponent {
  private readonly tuner = inject(TuningService);
  private readonly document = inject(DOCUMENT);

  /**
   * The sliders, each with its input's id, at the number in use, and how it
   * reads.
   */
  protected readonly sliders = computed(() => {
    const tuning = this.tuner.tuning();
    return TUNING_SLIDERS.map((slider) => ({
      ...slider,
      inputId: `tune-${slider.id}`,
      value: tuning[slider.id],
      valueText: formatTuning(slider.id, tuning[slider.id]),
    }));
  });

  /** Whether shots leave with the ship's speed, as the menu tunes it. */
  protected readonly carryShip = computed(() => this.tuner.tuning().carryShip);

  /** The numbers in use as the lines of `tuning.ts` they would replace. */
  protected readonly lines = computed(() => tuningLines(this.tuner.tuning()));

  private readonly copiedState = signal<keyof typeof COPY_WORDS | null>(null);

  /**
   * Whether the lines of `tuning.ts` show beneath, as a failed Copy opens
   * them and the player opens or shuts them.
   */
  protected readonly linesShown = signal(false);

  /** What the menu says of the last Copy, or nothing before one. */
  protected readonly copyWords = computed(() => {
    const copied = this.copiedState();
    return copied && COPY_WORDS[copied];
  });

  /** Tunes a number, as its slider says, which the clipboard no longer holds. */
  protected tune(id: TuningNumber, value: number): void {
    this.tuner.tune({ [id]: value });
    this.forgetCopied();
  }

  /**
   * Has shots leave with the ship's speed or not, as its checkbox says,
   * which the clipboard no longer holds.
   */
  protected setCarryShip(carryShip: boolean): void {
    this.tuner.tune({ carryShip });
    this.forgetCopied();
  }

  /** Puts every number back to `tuning.ts`'s. */
  protected resetNumbers(): void {
    this.tuner.reset();
    this.forgetCopied();
  }

  /**
   * Puts the numbers on the clipboard as `tuning.ts`'s lines, and says
   * whether they got there.
   */
  protected async copyNumbers(): Promise<void> {
    // A page reached over plain HTTP, as a phone reaches the dev server, has none.
    const clipboard = this.document.defaultView?.navigator.clipboard;
    if (!clipboard) {
      this.copyFailed();
      return;
    }
    try {
      await clipboard.writeText(this.lines());
      this.copiedState.set("copied");
    } catch {
      this.copyFailed();
    }
  }

  /** Says the browser kept the clipboard shut, and shows the lines to copy by hand. */
  private copyFailed(): void {
    this.copiedState.set("failed");
    this.linesShown.set(true);
  }

  /**
   * Forgets a Copy the numbers have moved on from; where one failed, the
   * lines shown are the numbers in use, so they stay.
   */
  private forgetCopied(): void {
    if (this.copiedState() === "copied") this.copiedState.set(null);
  }
}
