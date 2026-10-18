import type { ComponentFixture } from "@angular/core/testing";
import { queryRequired } from "./dom";

/**
 * Drives the native <dialog> the overlays are built on the way a player would,
 * by key and by click.
 */

/**
 * Presses Escape on the document, from which the topmost open dialog receives
 * `cancel`.
 */
export function pressEscape(): void {
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );
}

/** Returns whether the fixture's dialog is showing. */
export function isDialogOpen(fixture: ComponentFixture<unknown>): boolean {
  return queryRequired<HTMLDialogElement>(fixture, "dialog").open;
}

/** Clicks the dialog's backdrop, which is the dialog element itself. */
export function clickBackdrop(fixture: ComponentFixture<unknown>): void {
  queryRequired<HTMLDialogElement>(fixture, "dialog").click();
}
