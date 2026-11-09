import {
  type WritableSignal,
  assertInInjectionContext,
  inject,
  signal,
  untracked,
} from "@angular/core";
import {
  LocalStorageService,
  type StoredFields,
  type Unversioned,
} from "./local_storage.service";

/** Says where a stored signal keeps its value, and how it reads it back. */
export interface StoredSignalOptions<T> {
  /** The key the value is kept under. Renaming it loses what every player kept. */
  readonly key: string;
  /** The shape the value is kept in; an entry of any other is read as none. */
  readonly version: number;
  /**
   * Returns the value from what was stored, or the value a player starts
   * with from null, where nothing of this version was, or it was corrupt.
   */
  readonly read: (saved: StoredFields | null) => T;
}

/** Says too how a stored signal writes a value that isn't kept as it is, such as a set. */
export interface StoredSignalWriting<T> extends StoredSignalOptions<T> {
  /** Returns the fields a value is kept as. */
  readonly write: (value: T) => Unversioned;
}

/**
 * Returns a signal of the value kept under a key, read as it is made, which
 * keeps every change made to it.
 *
 * It must be made in an injection context. Setting the value it holds keeps
 * nothing, and a change made elsewhere, such as in another tab, isn't read.
 */
export function storedSignal<T>(
  options: StoredSignalWriting<T>,
): WritableSignal<T>;
export function storedSignal<T extends Unversioned>(
  options: StoredSignalOptions<T>,
): WritableSignal<T>;
export function storedSignal<T>({
  key,
  version,
  read,
  write = asStored,
}: StoredSignalOptions<T> &
  Partial<StoredSignalWriting<T>>): WritableSignal<T> {
  assertInInjectionContext(storedSignal);
  const storage = inject(LocalStorageService);
  const stored = signal(read(storage.readVersioned(key, version)));

  const hold = stored.set.bind(stored);
  stored.set = (value: T): void => {
    if (Object.is(value, untracked(stored))) return;
    hold(value);
    storage.writeVersioned(key, version, write(value));
  };
  stored.update = (change: (value: T) => T): void => {
    stored.set(change(untracked(stored)));
  };
  return stored;
}

/**
 * Returns a value as the fields it is kept as, which the overload of
 * {@link storedSignal} with no `write` holds to an object of fields with no
 * version among them.
 */
function asStored(value: unknown): Unversioned {
  return value as Unversioned;
}
