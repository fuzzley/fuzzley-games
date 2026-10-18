import "@angular/compiler";
import { setupTestBed } from "@analogjs/vitest-angular/setup-testbed";
import { installCompressionStreams } from "./support/compression_streams";
import { installDialogPolyfill } from "./support/dialog_polyfill";

setupTestBed({
  zoneless: true,
});

// The overlays are native <dialog> elements, which jsdom parses but does not
// implement. Only the specs running in the jsdom environment have a window.
if (typeof window !== "undefined") {
  installDialogPolyfill(window);
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

if (!globalThis.localStorage) {
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
