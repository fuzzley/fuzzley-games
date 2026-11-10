import { DOCUMENT } from "@angular/common";
import {
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from "@angular/core";

/** Describes a slider of a debug menu: the number it tunes, its name and its range. */
export interface TuningSlider<Id extends string = string> {
  readonly id: Id;
  readonly name: string;
  readonly least: number;
  readonly most: number;
  readonly step: number;
}

/** Describes a slider as the debug menu shows it, at the number in use. */
export interface ShownSlider<
  Id extends string = string,
> extends TuningSlider<Id> {
  readonly value: number;
  /** The number in its unit, such as "×1.25", shown beside the slider and said by a screen reader. */
  readonly valueText: string;
  /** What the number comes to, shown beneath the slider as its description, where the game says. */
  readonly description?: string;
}

/** Describes a slider moved: the number it tunes and where it was moved to. */
export interface SliderMove<Id extends string = string> {
  readonly id: Id;
  readonly value: number;
}

/** What the menu says once Copy the numbers has tried the clipboard. */
const COPY_WORDS = {
  copied: "Copied the numbers.",
  failed: "The browser kept the clipboard shut: the lines are below.",
} as const;

/** Says how the last Copy the numbers went. */
type CopyOutcome = keyof typeof COPY_WORDS;

/** Tells one menu's ids apart from another's on the same page. */
let nextMenu = 0;

/**
 * Shows a game's debug menu, in its settings drawer: a slider for each
 * number it tunes, with what it comes to where the game says, what the game
 * projects for controls of its own, Reset the numbers, and Copy the
 * numbers, the lines of code they would replace, which it shows instead
 * where the browser keeps the clipboard shut, as a phone reaching a dev
 * server over plain HTTP does.
 *
 * It holds no numbers: the game hands it each slider at the number in use,
 * and the lines, and hears each move through `tune` and Reset the numbers
 * through `resetNumbers`, as `createTuning()`'s `tune()` and `reset()` take
 * them.
 */
@Component({
  selector: "fz-debug-tuning",
  templateUrl: "./debug_tuning.component.html",
  styleUrl: "./debug_tuning.component.scss",
})
export class DebugTuningComponent<Id extends string = string> {
  private readonly document = inject(DOCUMENT);
  private readonly menuId = `fz-debug-${String(nextMenu++)}`;

  /** The sliders, in order, each at the number in use. */
  readonly sliders = input.required<readonly ShownSlider<Id>[]>();

  /** The numbers in use as the lines of code they would replace, which Copy the numbers copies. */
  readonly lines = input.required<string>();

  /** Emits each move of a slider. */
  readonly tune = output<SliderMove<Id>>();

  /** Emits at Reset the numbers. */
  readonly resetNumbers = output();

  protected readonly headingId = `${this.menuId}-heading`;

  /**
   * The sliders, each with its input's id and its description's, or null
   * where it has none.
   *
   * Each kind of id has a word of its own after the menu's, so no slider's id
   * can make one the menu already gave: a slider named `heading`, or one
   * named after another's description.
   */
  protected readonly shown = computed(() =>
    this.sliders().map((slider) => ({
      ...slider,
      inputId: `${this.menuId}-slider-${slider.id}`,
      descriptionId:
        slider.description === undefined
          ? null
          : `${this.menuId}-description-${slider.id}`,
    })),
  );

  /**
   * How the last Copy went, forgotten once the lines move on from one that
   * worked, as the clipboard holds the old ones; where one failed, the lines
   * shown are the ones in use, so it stays.
   */
  private readonly copied = linkedSignal<string, CopyOutcome | null>({
    source: this.lines,
    computation: (_, previous) =>
      previous?.value === "failed" ? "failed" : null,
  });

  /** What the menu says of the last Copy, or nothing. */
  protected readonly copyWords = computed(() => {
    const copied = this.copied();
    return copied === null ? "" : COPY_WORDS[copied];
  });

  /**
   * Whether the lines show beneath, as a failed Copy opens them and the
   * player opens or shuts them.
   */
  protected readonly linesShown = signal(false);

  /** Tells the game a slider moved. */
  protected move(id: Id, value: number): void {
    this.tune.emit({ id, value });
  }

  /** Puts the lines on the clipboard, and says whether they got there. */
  protected async copyNumbers(): Promise<void> {
    // A page reached over plain HTTP, as a phone reaches a dev server, has none.
    const clipboard = this.document.defaultView?.navigator.clipboard;
    if (!clipboard) {
      this.copyFailed();
      return;
    }
    try {
      await clipboard.writeText(this.lines());
      this.copied.set("copied");
    } catch {
      this.copyFailed();
    }
  }

  /** Says the browser kept the clipboard shut, and shows the lines to copy by hand. */
  private copyFailed(): void {
    this.copied.set("failed");
    this.linesShown.set(true);
  }
}
