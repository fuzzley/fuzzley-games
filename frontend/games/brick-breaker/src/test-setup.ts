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

installDialogPolyfill(window);

// Each test's app stores in a store of its own, so nothing it keeps leaks
// into the next, and a report's picture is a spec's own, not the page's.
beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [provideMemoryStorage(), provideReportPicture()],
  });
});
