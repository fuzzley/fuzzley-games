import "@angular/compiler";
import "@testing-library/jest-dom/vitest";
import { getTestBed } from "@angular/core/testing";
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from "@angular/platform-browser/testing";

import { installHeadlessPhaser } from "./testing";

installHeadlessPhaser();

getTestBed().initTestEnvironment(
  BrowserTestingModule,
  platformBrowserTesting(),
);
