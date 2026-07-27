import "@angular/compiler";
import { setupTestBed } from "@analogjs/vitest-angular/setup-testbed";

setupTestBed({
  zoneless: true,
});

/**
 * An in-memory Storage for the node test environment, which has no
 * localStorage. GameSettings reads and writes it, so specs that construct
 * settings need a working implementation rather than a stub that throws.
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
