import {
  DestroyRef,
  Directive,
  ElementRef,
  afterNextRender,
  inject,
} from "@angular/core";

/** The children this directive governs, in document order. */
const RADIO_SELECTOR = '[role="radio"]';

/** How far each navigation key moves through the group. */
const STEP_BY_KEY: Readonly<Record<string, number>> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
};

/**
 * The keyboard half of the `radiogroup` pattern.
 *
 * `role="radiogroup"` with `role="radio"` children is a promise about the
 * keyboard as much as a description of the markup: the group is one tab stop,
 * and the arrows move within it. Three groups in this application declared the
 * role and left every button independently tabbable with no arrow handling, so
 * a screen reader announced "radio, 2 of 3" over a control that did not behave
 * like one.
 *
 * Applying this directive is what makes the role true. It owns both halves —
 * the roving `tabindex` and the arrow keys — because a group with one and not
 * the other is the bug it exists to prevent.
 *
 * Selection is manual: the arrows move focus, and Space or Enter chooses,
 * which for a `<button>` needs no handler of ours. The alternative, where
 * focus and selection move together, is the more common reading of the pattern
 * and the wrong one here — one of these groups is the rule picker, where
 * choosing deals a new game behind a confirmation prompt. Arrowing across it
 * would raise a modal per keystroke.
 */
@Directive({
  selector: "[appRadioGroup]",
  host: {
    role: "radiogroup",
    "(keydown)": "onKeydown($event)",
  },
})
export class RadioGroupDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    // `aria-checked` is bound by the host template and the radios themselves
    // can come and go with the game on the table, so the tab stop has to
    // follow the DOM rather than being placed once and left there.
    const observer = new MutationObserver(() => {
      this.syncTabStops();
    });
    observer.observe(this.host.nativeElement, {
      subtree: true,
      childList: true,
      attributes: true,
      // Deliberately narrow: `syncTabStops` writes `tabindex`, and an observer
      // watching that attribute would wake itself up forever.
      attributeFilter: ["aria-checked"],
    });
    inject(DestroyRef).onDestroy(() => {
      observer.disconnect();
    });

    afterNextRender(() => {
      this.syncTabStops();
    });
  }

  /**
   * Moves focus within the group, leaving the choice to the player.
   *
   * Wraps at both ends, and takes Home and End to the first and last, which is
   * what the authoring practices ask of a group that wraps.
   */
  protected onKeydown(event: KeyboardEvent): void {
    const radios = this.radios();
    if (radios.length === 0) return;

    const current = radios.indexOf(
      // `closest`, not `event.target`: the radio may have a span inside it.
      (event.target as HTMLElement | null)?.closest<HTMLElement>(
        RADIO_SELECTOR,
      ) as HTMLElement,
    );
    if (current === -1) return;

    const next = this.nextIndex(event.key, current, radios.length);
    if (next === null) return;

    event.preventDefault();
    radios[next].focus();
    this.syncTabStops(next);
  }

  /** Where a navigation key lands, or null when the key is not one. */
  private nextIndex(key: string, from: number, count: number): number | null {
    if (key === "Home") return 0;
    if (key === "End") return count - 1;

    const step = STEP_BY_KEY[key];
    return step === undefined ? null : (from + step + count) % count;
  }

  /**
   * Leaves exactly one radio in the tab order.
   *
   * The checked one, so tabbing into the group lands on the current choice.
   * With none checked the first takes it, because a group nothing can tab into
   * is worse than one whose entry point is arbitrary.
   *
   * @param preferred The index to make the tab stop regardless of what is
   *     checked, used while the arrows are moving focus around.
   */
  private syncTabStops(preferred?: number): void {
    const radios = this.radios();
    if (radios.length === 0) return;

    const checked = radios.findIndex(
      (radio) => radio.getAttribute("aria-checked") === "true",
    );
    const stop = preferred ?? (checked === -1 ? 0 : checked);

    radios.forEach((radio, index) => {
      radio.tabIndex = index === stop ? 0 : -1;
    });
  }

  /** The group's radios, in document order. */
  private radios(): HTMLElement[] {
    return Array.from(
      this.host.nativeElement.querySelectorAll<HTMLElement>(RADIO_SELECTOR),
    );
  }
}
