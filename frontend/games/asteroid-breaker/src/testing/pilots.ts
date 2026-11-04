import { pilotInk } from "../view/palette";

/** Returns the colors of the pilots drawn in an element, in order, as the page writes them. */
export function pilotsIn(element: Element): string[] {
  return Array.from(
    element.querySelectorAll<HTMLElement>("app-pilot"),
    (pilot) => pilot.style.color,
  );
}

/** Returns a pilot's color in a light palette, the specs' page's, as the page writes it. */
export function inkOf(pilot: number): string {
  const probe = document.createElement("span");
  probe.style.color = pilotInk(pilot, "light");
  return probe.style.color;
}
