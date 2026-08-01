import type { ComponentFixture } from "@angular/core/testing";

/**
 * Typed access to a fixture's rendered DOM.
 *
 * Angular types `ComponentFixture.nativeElement` as `any`, so touching it
 * directly spreads `any` through every query and assertion that follows. These
 * helpers narrow it once, in one place.
 */

/** The fixture's root rendered element. */
export function rootElement(fixture: ComponentFixture<unknown>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

/** The first element matching `selector`, or null when nothing matches. */
export function query<T extends HTMLElement = HTMLElement>(
  fixture: ComponentFixture<unknown>,
  selector: string,
): T | null {
  return rootElement(fixture).querySelector<T>(selector);
}

/**
 * The first element matching `selector`. Throws when nothing matches, so a
 * selector that has drifted from the template fails at the line that uses it
 * rather than as a confusing null further along.
 */
export function queryRequired<T extends HTMLElement = HTMLElement>(
  fixture: ComponentFixture<unknown>,
  selector: string,
): T {
  const element = query<T>(fixture, selector);
  if (!element) {
    throw new Error(`No element matched selector: ${selector}`);
  }
  return element;
}

/** Every element matching `selector`, in document order. */
export function queryAll<T extends HTMLElement = HTMLElement>(
  fixture: ComponentFixture<unknown>,
  selector: string,
): T[] {
  return [...rootElement(fixture).querySelectorAll<T>(selector)];
}

/** The trimmed text content of the first element matching `selector`. */
export function queryText(
  fixture: ComponentFixture<unknown>,
  selector: string,
): string {
  return queryRequired(fixture, selector).textContent?.trim() ?? "";
}

/** Clicks the first element matching `selector`. */
export function clickElement(
  fixture: ComponentFixture<unknown>,
  selector: string,
): void {
  queryRequired(fixture, selector).click();
}
