import type { ComponentFixture } from "@angular/core/testing";
import { queryRequired } from "./dom";

/**
 * Helpers for driving the native <dialog> the overlays are built on.
 *
 * The behaviour under test is the browser's, so these press the same keys and
 * click the same places a player would rather than calling the component's
 * methods.
 */

/**
 * Presses Escape.
 *
 * Dispatched on the document, which is where the browser routes it: the
 * topmost open dialog receives `cancel` from there.
 */
export function pressEscape(): void {
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );
}

/** Whether the fixture's dialog is currently showing. */
export function isDialogOpen(fixture: ComponentFixture<unknown>): boolean {
  return queryRequired<HTMLDialogElement>(fixture, "dialog").open;
}

/** Clicks the dialog's backdrop, which is the dialog element itself. */
export function clickBackdrop(fixture: ComponentFixture<unknown>): void {
  queryRequired<HTMLDialogElement>(fixture, "dialog").click();
}
