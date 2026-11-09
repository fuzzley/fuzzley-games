import { Injectable, inject } from "@angular/core";
import { isRecord } from "@fz/core/json";
import { BROWSER_STORAGE } from "./browser_storage";

/** What `readVersioned()` read, its fields as stored, unchecked. */
export type StoredFields = Readonly<Record<string, unknown>>;

/**
 * An object of fields with no `version` among them, which `writeVersioned()`
 * stores beside its fields.
 *
 * The first member takes an interface's value, which has no index
 * signature, and the second an object literal's fields, which the first
 * would refuse as excess. Neither takes what is iterated, such as a list, a
 * set or a map, whose items JSON wouldn't keep as its fields.
 */
export type Unversioned = (
  | (object & { readonly version?: never })
  | { readonly version?: never; readonly [field: string]: unknown }
) & { readonly [Symbol.iterator]?: never };

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

  /**
   * Reads what `writeVersioned()` kept under a key, or null when it is
   * absent, corrupt, or of another version than the one asked for.
   *
   * Its fields are as stored, unchecked, so treat them as untrusted input.
   */
  readVersioned(key: string, version: number): StoredFields | null {
    const saved = this.readObject(key);
    return isRecord(saved) && saved["version"] === version ? saved : null;
  }

  /** Writes an object's fields as JSON, with the version they are kept at. */
  writeVersioned(key: string, version: number, value: Unversioned): void {
    // eslint-disable-next-line @typescript-eslint/no-misused-spread -- Unversioned names an iterator only to refuse one.
    this.writeObject(key, { ...value, version });
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
