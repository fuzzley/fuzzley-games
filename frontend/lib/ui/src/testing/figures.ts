import { within } from "@testing-library/dom";

/** Returns an element's text as it reads: each run of white space one space, trimmed. */
function textOf(element: Element): string {
  return element.textContent.replace(/\s+/g, " ").trim();
}

/**
 * Returns the `<dd>` that gives a figure's value, the element right after its
 * `<dt>`.
 *
 * @throws {Error} when no `<dd>` follows the `<dt>`, as when another `<dt>`
 *   does.
 */
function valueAfter(dt: Element): HTMLElement {
  const value = dt.nextElementSibling;
  if (!(value instanceof HTMLElement && value.matches("dd"))) {
    throw new Error(`No value for the figure ${textOf(dt)}.`);
  }
  return value;
}

/**
 * Returns the value a figure gives, as an element: the `<dd>` after the
 * `<dt>` whose text is the term, on the page or within an element of it.
 *
 * @throws {Error} for a term not shown, or one with no `<dd>` after it.
 */
export function figureValue(
  term: string,
  container: HTMLElement = document.body,
): HTMLElement {
  const name = within(container)
    .getAllByRole("term")
    .find((dt) => textOf(dt) === term);
  if (!name) throw new Error(`No figure ${term} shown.`);
  return valueAfter(name);
}

/**
 * Returns the value a figure gives, by its term, as it reads, on the page or
 * within an element of it.
 *
 * @throws {Error} for a term not shown, or one with no `<dd>` after it.
 */
export function figure(
  term: string,
  container: HTMLElement = document.body,
): string {
  return textOf(figureValue(term, container));
}

/**
 * Returns every figure shown, on the page or within an element of it, each
 * as its term and its value, as they read, in order.
 *
 * @throws {Error} for no figure shown, or a term with no `<dd>` after it.
 */
export function figures(
  container: HTMLElement = document.body,
): [term: string, value: string][] {
  return within(container)
    .getAllByRole("term")
    .map((dt) => [textOf(dt), textOf(valueAfter(dt))]);
}
