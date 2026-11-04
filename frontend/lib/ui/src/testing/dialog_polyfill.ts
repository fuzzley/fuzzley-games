/**
 * Implements the parts of `<dialog>` the apps rely on, which jsdom parses
 * without implementing.
 *
 * Opening moves focus in, Escape raises `cancel`, and closing raises `close`
 * and restores focus. The top layer, `::backdrop` and inertness mean nothing
 * without layout, so they are left out.
 */

/** Elements that can take the focus, which a browser chooses among on opening a dialog. */
const FOCUSABLE = "button, a[href], input, select, textarea, [tabindex]";

/** The element focused before each dialog opened, restored on close. */
const previouslyFocused = new WeakMap<HTMLDialogElement, HTMLElement>();

/** Returns what a browser would focus on opening a dialog, if anything. */
function focusableWithin(dialog: HTMLDialogElement): HTMLElement | undefined {
  const candidates = [
    ...dialog.querySelectorAll<HTMLElement>(FOCUSABLE),
  ].filter((el) => !el.hasAttribute("disabled"));

  // A browser honours `autofocus` first, even on what only a script may
  // focus (`tabindex="-1"`), then falls back to the first child the Tab key
  // reaches.
  return (
    candidates.find((el) => el.hasAttribute("autofocus")) ??
    candidates.find((el) => el.tabIndex !== -1)
  );
}

/**
 * Installs the polyfill onto a window, if its dialogs are missing methods.
 *
 * A spec setup file calls it once, for the specs that run in jsdom.
 */
export function installDialogPolyfill(
  target: Window & typeof globalThis,
): void {
  const proto = target.HTMLDialogElement.prototype;
  if (typeof proto.showModal === "function") return;

  proto.showModal = function showModal(this: HTMLDialogElement): void {
    if (this.open) {
      throw new DOMException(
        "The element already has an 'open' attribute",
        "InvalidStateError",
      );
    }
    const active = this.ownerDocument.activeElement;
    if (active instanceof target.HTMLElement) {
      previouslyFocused.set(this, active);
    }
    this.setAttribute("open", "");
    focusableWithin(this)?.focus();
  };

  proto.show = function show(this: HTMLDialogElement): void {
    if (this.open) return;
    this.setAttribute("open", "");
  };

  proto.close = function close(
    this: HTMLDialogElement,
    returnValue?: string,
  ): void {
    if (!this.open) return;
    if (returnValue !== undefined) {
      this.returnValue = returnValue;
    }
    this.removeAttribute("open");
    previouslyFocused.get(this)?.focus();
    previouslyFocused.delete(this);
    this.dispatchEvent(new target.Event("close"));
  };

  // Escape on an open modal raises `cancel`, and closes it unless the handler
  // calls preventDefault. The browser does this itself; in jsdom the keydown
  // has to be routed by hand.
  target.document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    const openDialogs = [
      ...target.document.querySelectorAll<HTMLDialogElement>("dialog[open]"),
    ];
    const topmost = openDialogs.at(-1);
    if (!topmost) return;

    event.preventDefault();
    const cancelled = !topmost.dispatchEvent(
      new target.Event("cancel", { cancelable: true }),
    );
    if (!cancelled) {
      topmost.close();
    }
  });
}
