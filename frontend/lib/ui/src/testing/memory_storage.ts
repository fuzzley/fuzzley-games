import type { Provider } from "@angular/core";
import { BROWSER_STORAGE } from "../storage";

/**
 * Keeps what an app stores in memory, as the browser's local storage would,
 * for a spec to hand the app in place of the browser's.
 */
export class MemoryStorage implements Storage {
  // The browser takes a key or a value of any type and keeps it as a string,
  // whatever a caller's types say, so JSON.stringify(undefined)'s value,
  // typed as a string, reads back there as "undefined", and must here too.
  private readonly entries = new Map<string, string>();

  get length(): number {
    return this.entries.size;
  }

  clear(): void {
    this.entries.clear();
  }

  getItem(key: unknown): string | null {
    return this.entries.get(String(key)) ?? null;
  }

  key(index: number): string | null {
    return [...this.entries.keys()][index] ?? null;
  }

  removeItem(key: unknown): void {
    this.entries.delete(String(key));
  }

  setItem(key: unknown, value: unknown): void {
    this.entries.set(String(key), String(value));
  }
}

/**
 * Returns the provider that gives the app a store in memory for the browser's
 * local storage, a new one unless a spec hands it the one it holds.
 *
 * A spec holds the store where it stores an entry for the app to read, reads
 * what the app stored, or hands the same store to the app again after
 * `TestBed.resetTestingModule()`, as a later visit finds what the last kept.
 */
export function provideMemoryStorage(
  storage: MemoryStorage = new MemoryStorage(),
): Provider {
  return { provide: BROWSER_STORAGE, useValue: storage };
}
