import { Injectable, inject } from "@angular/core";
import { BROWSER_STORAGE } from "./browser_storage";

/**
 * Reads and writes the browser's local storage, warning rather than throwing
 * where it is missing or refuses.
 */
@Injectable({ providedIn: "root" })
export class LocalStorageService {
  private readonly storage = inject(BROWSER_STORAGE);

  /** Reads a raw string, or null when it is absent or unreadable. */
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
   * Reads stored JSON, or null when it is absent, corrupt or not an object or
   * array.
   *
   * Its fields are as stored, unchecked, so treat them as untrusted input.
   */
  readObject(key: string): object | null {
    const raw = this.readString(key);
    if (!raw) return null;

    try {
      const parsed: unknown = JSON.parse(raw);
      return typeof parsed === "object" ? parsed : null;
    } catch (e) {
      console.warn(`Failed to parse "${key}" from storage:`, e);
      return null;
    }
  }

  /** Writes a raw string, doing nothing where there is nowhere to write. */
  writeString(key: string, value: string): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(key, value);
    } catch (e) {
      console.warn(`Failed to save "${key}" to storage:`, e);
    }
  }

  /** Writes a value as JSON. */
  writeObject(key: string, value: unknown): void {
    try {
      this.writeString(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`Failed to serialise "${key}" for storage:`, e);
    }
  }

  /** Removes a key, doing nothing where there is nowhere to remove it from. */
  remove(key: string): void {
    if (!this.storage) return;
    try {
      this.storage.removeItem(key);
    } catch (e) {
      console.warn(`Failed to remove "${key}" from storage:`, e);
    }
  }
}
