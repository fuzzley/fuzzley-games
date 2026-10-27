import "@angular/compiler";
import "@testing-library/jest-dom/vitest";
import { getTestBed } from "@angular/core/testing";
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from "@angular/platform-browser/testing";
import { installDialogPolyfill } from "@fz/ui/testing";

getTestBed().initTestEnvironment(
  BrowserTestingModule,
  platformBrowserTesting(),
);

installDialogPolyfill(window);

// Every spec shares one store, so clear it before a saved game leaks into the
// next.
beforeEach(() => {
  localStorage.clear();
});
