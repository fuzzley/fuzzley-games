import type { ComponentFixture } from "@angular/core/testing";

/**
 * Gives typed access to a fixture's rendered DOM, whose `nativeElement`
 * Angular types as `any`.
 */

/** Returns the fixture's root rendered element. */
export function rootElement(fixture: ComponentFixture<unknown>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

/** A kind of element, by its class, such as `HTMLDialogElement`. */
export type ElementKind<T extends HTMLElement> = abstract new () => T;

/**
 * Returns the first element matching `selector`, or null, checking it is the
 * kind of element asked for.
 */
export function query(
  fixture: ComponentFixture<unknown>,
  selector: string,
): HTMLElement | null;
export function query<T extends HTMLElement>(
  fixture: ComponentFixture<unknown>,
  selector: string,
  kind: ElementKind<T>,
): T | null;
export function query(
  fixture: ComponentFixture<unknown>,
  selector: string,
  kind: ElementKind<HTMLElement> = HTMLElement,
): HTMLElement | null {
  const element = rootElement(fixture).querySelector(selector);
  if (element === null) return null;
  if (!(element instanceof kind)) {
    throw new Error(`${selector} matched a <${element.localName}>.`);
  }
  return element;
}

/**
 * Returns the first element matching `selector`, checking it is the kind of
 * element asked for, and throwing if there is none.
 */
export function queryRequired(
  fixture: ComponentFixture<unknown>,
  selector: string,
): HTMLElement;
export function queryRequired<T extends HTMLElement>(
  fixture: ComponentFixture<unknown>,
  selector: string,
  kind: ElementKind<T>,
): T;
export function queryRequired(
  fixture: ComponentFixture<unknown>,
  selector: string,
  kind: ElementKind<HTMLElement> = HTMLElement,
): HTMLElement {
  const element = query(fixture, selector, kind);
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
  return queryRequired(fixture, selector).textContent.trim();
}

/** Clicks the first element matching `selector`. */
export function clickElement(
  fixture: ComponentFixture<unknown>,
  selector: string,
): void {
  queryRequired(fixture, selector).click();
}
