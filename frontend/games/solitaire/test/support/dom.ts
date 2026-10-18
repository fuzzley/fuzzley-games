import type { ComponentFixture } from "@angular/core/testing";

/**
 * Gives typed access to a fixture's rendered DOM, whose `nativeElement`
 * Angular types as `any`.
 */

/** Returns the fixture's root rendered element. */
export function rootElement(fixture: ComponentFixture<unknown>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

/** Returns the first element matching `selector`, or null. */
export function query<T extends HTMLElement = HTMLElement>(
  fixture: ComponentFixture<unknown>,
  selector: string,
): T | null {
  return rootElement(fixture).querySelector<T>(selector);
}

/** Returns the first element matching `selector`, throwing if there is none. */
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

/** Returns every element matching `selector`, in document order. */
export function queryAll<T extends HTMLElement = HTMLElement>(
  fixture: ComponentFixture<unknown>,
  selector: string,
): T[] {
  return [...rootElement(fixture).querySelectorAll<T>(selector)];
}

/** Returns the trimmed text of the first element matching `selector`. */
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
