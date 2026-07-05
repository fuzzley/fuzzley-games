import "@angular/compiler";
import "@analogjs/vitest-angular/setup-zone";
import { setupTestBed } from "@analogjs/vitest-angular/setup-testbed";

setupTestBed({
  zoneless: false,
});

if (typeof globalThis.localStorage === "undefined") {
  const store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const key in store) {
        delete store[key];
      }
    },
    key: (index: number) => Object.keys(store)[index] || null,
    get length() {
      return Object.keys(store).length;
    },
  } as Storage;
}
