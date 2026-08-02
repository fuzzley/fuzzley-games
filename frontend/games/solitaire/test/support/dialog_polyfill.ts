/**
 * A minimal `<dialog>` implementation for jsdom.
 *
 * jsdom 30 parses the element and reflects its `open` attribute but ships none
 * of its methods, so `showModal()` is undefined and every spec touching a
 * modal throws. This fills that gap rather than the components defending
 * against it: the production code targets browsers, where `<dialog>` is the
 * whole point of the component, and it should not carry `?.` guards for a test
 * environment's missing API.
 *
 * Modelled on the parts of the specification the application actually relies
 * on: opening moves focus in, Escape raises `cancel`, closing raises `close`
 * and restores focus. The top layer, `::backdrop` and inertness have no
 * meaning without layout, so they are not simulated.
 */

/** Elements a browser would consider for initial dialog focus. */
const FOCUSABLE =
  "[autofocus], button, a[href], input, select, textarea, [tabindex]";

interface PolyfilledDialog extends HTMLDialogElement {
  /** The element focused before opening, restored on close. */
  __previouslyFocused?: HTMLElement | null;
}

function focusableWithin(dialog: HTMLDialogElement): HTMLElement | undefined {
  const candidates = [
    ...dialog.querySelectorAll<HTMLElement>(FOCUSABLE),
  ].filter((el) => el.tabIndex !== -1 && !el.hasAttribute("disabled"));

  // A browser honours `autofocus` first, then falls back to the first
  // focusable child.
  return candidates.find((el) => el.hasAttribute("autofocus")) ?? candidates[0];
}

/** Installs the polyfill onto a window, if its dialogs are missing methods. */
export function installDialogPolyfill(
  target: Window & typeof globalThis,
): void {
  const proto = target.HTMLDialogElement?.prototype;
  if (!proto || typeof proto.showModal === "function") return;

  proto.showModal = function showModal(this: PolyfilledDialog): void {
    if (this.open) {
      throw new DOMException(
        "The element already has an 'open' attribute",
        "InvalidStateError",
      );
    }
    this.__previouslyFocused = this.ownerDocument
      .activeElement as HTMLElement | null;
    this.setAttribute("open", "");
    focusableWithin(this)?.focus();
  };

  proto.show = function show(this: PolyfilledDialog): void {
    if (this.open) return;
    this.setAttribute("open", "");
  };

  proto.close = function close(
    this: PolyfilledDialog,
    returnValue?: string,
  ): void {
    if (!this.open) return;
    if (returnValue !== undefined) {
      this.returnValue = returnValue;
    }
    this.removeAttribute("open");
    this.__previouslyFocused?.focus();
    this.__previouslyFocused = null;
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
    const topmost = openDialogs[openDialogs.length - 1];
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
