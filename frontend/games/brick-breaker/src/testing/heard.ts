import { within } from "@testing-library/angular";

/** Returns the words a screen reader hears of an element, leaving out what is hidden from it. */
export function heardIn(element: HTMLElement): string {
  const copy = element.cloneNode(true) as HTMLElement;
  copy.querySelectorAll("[aria-hidden='true']").forEach((hidden) => {
    hidden.remove();
  });
  return copy.textContent.replace(/\s+/g, " ").trim();
}

/** Returns what a screen reader hears of each of a level's stars, in the one list of them in the page or a part of it. */
export function starsHeard(container: HTMLElement = document.body): string[] {
  const list = within(container).getByRole("list", { name: "Stars" });
  return within(list).getAllByRole("listitem").map(heardIn);
}

/** Returns the part of a panel, in the page or in one panel, that a heading heads. */
export function partHeaded(
  name: string | RegExp,
  panel: HTMLElement = document.body,
): HTMLElement {
  const heading = within(panel).getByRole("heading", { level: 3, name });
  const part = heading.parentElement;
  if (!part) throw new Error(`No part under ${heading.textContent}.`);
  return part;
}
