import "@angular/compiler";
import "@testing-library/jest-dom/vitest";
import { getTestBed } from "@angular/core/testing";
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from "@angular/platform-browser/testing";
import { installHeadlessPhaser } from "@fz/phaser/testing";
import { installDialogPolyfill } from "@fz/ui/testing";

// Before anything imports Phaser, so the scene's specs run it for real.
installHeadlessPhaser();

getTestBed().initTestEnvironment(
  BrowserTestingModule,
  platformBrowserTesting(),
);

// jsdom has no modal dialogs, which the question before a new game is.
installDialogPolyfill(window);
