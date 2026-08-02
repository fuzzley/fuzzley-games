import { Injectable } from "@angular/core";

/**
 * Reading and writing the browser's local storage, without the ceremony.
 *
 * Three services were each carrying the same three concerns inline: the
 * `typeof localStorage === "undefined"` guard for environments that have none,
 * a try/catch for the quota and privacy-mode failures that make `setItem`
 * throw, and a `console.warn` naming what was lost. That is a lot of noise
 * around a preference, and it was written out five times over two storage
 * shapes.
 *
 * Injectable rather than a module-level helper so a spec can hand a service a
 * storage it controls, instead of reaching for the real one and having to
 * clear it between tests.
 */
@Injectable({ providedIn: "root" })
export class LocalStorageService {
  /**
   * The backing store, or null where there is none.
   *
   * Resolved once at construction: an environment does not grow a
   * `localStorage` halfway through a session, and re-checking on every read
   * only spreads the guard back out again.
   */
  private readonly storage: Storage | null = readableStorage();

  /**
   * Reads a raw string.
   *
   * @param key The key to read.
   * @return The stored string, or null when absent or unreadable.
   */
  readString(key: string): string | null {
    if (!this.storage) return null;
    try {
      return this.storage.getItem(key);
    } catch (e) {
      console.warn(`Failed to read "${key}" from storage:`, e);
      return null;
    }
  }

  /**
   * Reads and parses stored JSON.
   *
   * Anything unparseable or of an unexpected shape reads as null rather than
   * throwing: storage is written by older versions of this application and by
   * whoever else has the console open, so its contents are input, not data.
   *
   * @param key The key to read.
   * @return The parsed value, or null when absent, corrupt, or not an object.
   */
  readObject<T>(key: string): T | null {
    const raw = this.readString(key);
    if (!raw) return null;

    try {
      const parsed: unknown = JSON.parse(raw);
      return typeof parsed === "object" && parsed !== null
        ? (parsed as T)
        : null;
    } catch (e) {
      console.warn(`Failed to parse "${key}" from storage:`, e);
      return null;
    }
  }

  /**
   * Writes a raw string, doing nothing where there is nowhere to write.
   *
   * @param key The key to write.
   * @param value The string to store.
   */
  writeString(key: string, value: string): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(key, value);
    } catch (e) {
      console.warn(`Failed to save "${key}" to storage:`, e);
    }
  }

  /**
   * Writes a value as JSON.
   *
   * @param key The key to write.
   * @param value The value to serialise and store.
   */
  writeObject(key: string, value: unknown): void {
    try {
      this.writeString(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`Failed to serialise "${key}" for storage:`, e);
    }
  }
}

/**
 * The local storage, if this environment has one that can be touched.
 *
 * Reading the property itself can throw where storage is disabled by policy,
 * which is why this is more than an `undefined` check.
 */
function readableStorage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}
