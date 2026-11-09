import "@angular/compiler";
import "@testing-library/jest-dom/vitest";
import { TestBed, getTestBed } from "@angular/core/testing";
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from "@angular/platform-browser/testing";
import { installHeadlessPhaser } from "@fz/phaser/testing";
import { installDialogPolyfill, provideMemoryStorage } from "@fz/ui/testing";

// Before anything imports Phaser, so the scene's specs run it for real.
installHeadlessPhaser();

getTestBed().initTestEnvironment(
  BrowserTestingModule,
  platformBrowserTesting(),
);

// jsdom has no modal dialogs, which the question before a new game is.
installDialogPolyfill(window);

// Nor fonts to load, which the board waits for before the scene writes in
// them: the page's are there at once, and a spec makes one arrive late by
// holding back `load()` and answering `check()`.
Object.defineProperty(document, "fonts", {
  configurable: true,
  value: { load: () => Promise.resolve([]), check: () => true },
});

// Each test's app stores in a store of its own, so nothing it keeps leaks
// into the next.
beforeEach(() => {
  TestBed.configureTestingModule({ providers: [provideMemoryStorage()] });
});
