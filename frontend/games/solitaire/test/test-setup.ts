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

// GameSettings persists to localStorage, and every test shares one store, so a
// test that flips a setting would otherwise change the starting conditions of
// everything that ran after it — a game left in almost-win mode deals a board
// with an empty stock.
beforeEach(() => {
  localStorage.clear();
});
