import "@angular/compiler";
import "@testing-library/jest-dom/vitest";
import { TestBed, getTestBed } from "@angular/core/testing";
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from "@angular/platform-browser/testing";
import { provideReportPicture } from "@fz/game-ui/testing";
import { installHeadlessPhaser } from "@fz/phaser/testing";
import { installDialogPolyfill, provideMemoryStorage } from "@fz/ui/testing";

// Before anything imports Phaser, so the scene's specs run it for real.
installHeadlessPhaser();

getTestBed().initTestEnvironment(
  BrowserTestingModule,
  platformBrowserTesting(),
);

// The page a wall game's shell runs in, as a game's setup gives it, so a
// spec of the shell runs here as in the game. jsdom has no modal dialogs,
// which @fz/ui's are.
installDialogPolyfill(window);

// Nor fonts to load, which a shell waits for before its scene writes in
// them: the page's are there at once, and a spec makes one arrive late by
// holding back `load()` and answering `check()`.
Object.defineProperty(document, "fonts", {
  configurable: true,
  value: { load: () => Promise.resolve([]), check: () => true },
});

// Each test stores in a store of its own, so nothing it keeps leaks into the
// next, and a bug report's picture is a spec's own, not the page's.
beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [provideMemoryStorage(), provideReportPicture()],
  });
});
