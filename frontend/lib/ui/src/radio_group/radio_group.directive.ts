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
 * Gives a `radiogroup` of `role="radio"` buttons its keyboard behaviour: a
 * single tab stop, with the arrow keys, Home and End moving between them.
 *
 * The arrows move focus without choosing, unlike native radios, because a
 * choice can cost something a stray keystroke shouldn't, such as a game's
 * rule, which deals a new game. Space and Enter choose, as the button's click.
 */
@Directive({
  selector: "[fzRadioGroup]",
  host: {
    role: "radiogroup",
    "(keydown)": "onKeydown($event)",
  },
})
export class RadioGroupDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    // The radios and their `aria-checked` change with what the host shows,
    // so the tab stop follows the DOM.
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
   * Moves focus within the group, wrapping at the ends, and leaves the choice
   * to the player.
   */
  protected onKeydown(event: KeyboardEvent): void {
    const radios = this.radios();
    // `closest`, not the target itself: the radio may have a span inside it.
    const radio =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>(RADIO_SELECTOR)
        : null;
    const current = radio ? radios.indexOf(radio) : -1;
    if (current === -1) return;

    const next = this.nextIndex(event.key, current, radios.length);
    if (next === null) return;

    event.preventDefault();
    radios[next]?.focus();
    this.syncTabStops(next);
  }

  /** Returns where a navigation key lands, or null when the key is not one. */
  private nextIndex(key: string, from: number, count: number): number | null {
    if (key === "Home") return 0;
    if (key === "End") return count - 1;

    const step = STEP_BY_KEY[key];
    return step === undefined ? null : (from + step + count) % count;
  }

  /**
   * Leaves exactly one radio in the tab order: `preferred` if given, else the
   * checked one, else the first.
   */
  private syncTabStops(preferred?: number): void {
    const radios = this.radios();
    const checked = radios.findIndex(
      (radio) => radio.getAttribute("aria-checked") === "true",
    );
    const stop = preferred ?? (checked === -1 ? 0 : checked);

    radios.forEach((radio, index) => {
      radio.tabIndex = index === stop ? 0 : -1;
    });
  }

  /** Returns the group's radios, in document order. */
  private radios(): HTMLElement[] {
    return Array.from(
      this.host.nativeElement.querySelectorAll<HTMLElement>(RADIO_SELECTOR),
    );
  }
}
