import {
  assertInInjectionContext,
  effect,
  inject,
  untracked,
} from "@angular/core";
import { keepOnLeave } from "./keep_on_leave";
import {
  LocalStorageService,
  type StoredFields,
  type Unversioned,
} from "./local_storage.service";

/** Says where a game under way is kept, and how it is written and taken up. */
export interface KeepSavedOptions {
  /** The key the game is kept under. Renaming it loses every player's. */
  readonly key: string;
  /** The shape the game is kept in; an entry of any other is read as none. */
  readonly version: number;
  /** Returns the fields to keep, or null to forget what was kept. */
  readonly save: () => Unversioned | null;
  /** Takes up what was kept, its fields as stored, unchecked. */
  readonly restore: (saved: StoredFields) => void;
  /**
   * Reads the signals a write follows, where it should follow fewer than
   * `save` reads, such as a run's moments rather than its every step.
   * Without it, a write follows everything `save` reads.
   */
  readonly track?: () => void;
}

/**
 * Keeps a game under way from one visit to the next: takes up what was kept
 * as it is called, then writes the game as what `track` reads changes, or
 * without it what `save` reads, and as the page is hidden or goes away.
 *
 * It must be called in an injection context, and stops writing when that
 * injector is destroyed. What was kept is taken up before the first write,
 * so the game it restores is the one written back.
 */
export function keepSaved({
  key,
  version,
  save,
  restore,
  track,
}: KeepSavedOptions): void {
  assertInInjectionContext(keepSaved);
  const storage = inject(LocalStorageService);
  const keep = (): void => {
    const saved = save();
    if (saved) storage.writeVersioned(key, version, saved);
    else storage.remove(key);
  };

  const kept = storage.readVersioned(key, version);
  if (kept) restore(kept);
  effect(() => {
    if (!track) {
      keep();
      return;
    }
    track();
    untracked(keep);
  });
  keepOnLeave(keep);
}
