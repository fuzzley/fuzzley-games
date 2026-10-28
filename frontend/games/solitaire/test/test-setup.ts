import "@angular/compiler";
import { setupTestBed } from "@analogjs/vitest-angular/setup-testbed";
import { installHeadlessPhaser } from "@fz/phaser/testing";
import { installDialogPolyfill } from "@fz/ui/testing";
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

/**
 * Returns an in-memory Storage for the node test environment, which has no
 * localStorage.
 */
function createMemoryStorage(): Storage {
  const entries = new Map<string, string>();
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
    removeItem: (key: string) => {
      entries.delete(key);
    },
    clear: () => {
      entries.clear();
    },
    key: (index: number) => [...entries.keys()][index] ?? null,
    get length() {
      return entries.size;
    },
  };
}

// Node declares localStorage, but leaves it undefined unless it is given a
// file to keep it in.
if (typeof globalThis.localStorage === "undefined") {
  Object.defineProperty(globalThis, "localStorage", {
    value: createMemoryStorage(),
    writable: true,
    configurable: true,
  });
}

// Every test shares one store, so clear it before a setting leaks into the
// next test.
beforeEach(() => {
  localStorage.clear();
});
