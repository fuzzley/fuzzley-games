import "@angular/compiler";
import { TestBed } from "@angular/core/testing";
import { setupTestBed } from "@analogjs/vitest-angular/setup-testbed";
import { installHeadlessPhaser } from "@fz/phaser/testing";
import { installDialogPolyfill, provideMemoryStorage } from "@fz/ui/testing";
import { installCompressionStreams } from "./support/compression_streams";

setupTestBed({
  zoneless: true,
});

// Only the specs running in the jsdom environment have a window. Their
// overlays are native <dialog> elements, which jsdom parses but does not
// implement, and their boards run real Phaser, which must find what it needs
// before anything imports it.
if (typeof window !== "undefined") {
  installDialogPolyfill(window);
  installHeadlessPhaser();
}

installCompressionStreams();

// Each test's app stores in a store of its own, so nothing it keeps leaks
// into the next.
beforeEach(() => {
  TestBed.configureTestingModule({ providers: [provideMemoryStorage()] });
});
