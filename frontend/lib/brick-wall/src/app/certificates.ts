// A wall game's certificates as its debug menu plays them: a set's file
// holds, for each level's id and each depth the field takes, the line of
// shots that clears the level from its start, each kept as the game's
// certifying script writes it and read back by the game's codec. The
// reader drops what it can't trust, as a page should.

import {
  type Signal,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from "@angular/core";
import { isRecord, listOf } from "@fz/core/json";
import { DEBUG_MENU } from "@fz/game-ui/debug_menu";
import { isDepth } from "../rules/field";

/** Loads each set's certificates, as its file's JSON, by the set's id. */
export type CertificateFiles = Readonly<Record<string, () => Promise<unknown>>>;

/**
 * Returns the files a game's glob found, by the set's id each file's name
 * gives: the glob is the game's own, as only it knows where its files are,
 * and a build makes each a chunk of its own that loads only when called.
 */
export function certificateFilesOf(
  found: Readonly<Record<string, () => Promise<unknown>>>,
): CertificateFiles {
  return Object.fromEntries(
    Object.entries(found).map(([path, load]) => [
      path.slice(path.lastIndexOf("/") + 1, -".json".length),
      load,
    ]),
  );
}

/** Holds a set's certificates, each a line of shots, `C`: each level's on each depth it holds one for, by the level's id, then the depth. */
export type SetCertificates<C> = ReadonlyMap<
  string,
  ReadonlyMap<number, readonly C[]>
>;

/** Returns a shot as a certificate's file keeps it, read back, or null for anything that isn't one: a game's codec. */
export type ReadShot<C> = (kept: unknown) => C | null;

/**
 * Returns a set's certificates read from its file, dropping what can't be
 * trusted: a level that isn't a record of lines, a depth no field has, and
 * a line that is empty or holds anything the game's codec doesn't read as
 * a shot. A file that isn't a record reads as none.
 */
export function readCertificates<C>(
  value: unknown,
  readShot: ReadShot<C>,
): SetCertificates<C> {
  const certificates = new Map<string, ReadonlyMap<number, readonly C[]>>();
  if (!isRecord(value)) return certificates;
  for (const [id, lines] of Object.entries(value)) {
    const read = readLines(lines, readShot);
    if (read.size > 0) certificates.set(id, read);
  }
  return certificates;
}

/** Returns a level's line on a depth, or null where its certificates hold none. */
export function lineOf<C>(
  certificates: SetCertificates<C>,
  levelId: string,
  depth: number,
): readonly C[] | null {
  return certificates.get(levelId)?.get(depth) ?? null;
}

/** Returns a level's lines by depth, those that read. */
function readLines<C>(
  value: unknown,
  readShot: ReadShot<C>,
): ReadonlyMap<number, readonly C[]> {
  const lines = new Map<number, readonly C[]>();
  if (!isRecord(value)) return lines;
  for (const [key, shots] of Object.entries(value)) {
    const depth = Number(key);
    const line = listOf(shots, readShot);
    if (isDepth(depth) && key === String(depth) && line?.length) {
      lines.set(depth, line);
    }
  }
  return lines;
}

/**
 * Describes the certificate a debug menu offers to play: the level in
 * play's, on the field's depth, and how many rounds its line takes.
 */
export interface CertificateOffer {
  /** The level's number, counted from 1. */
  readonly level: number;
  /** The field's depth the line was found on, in rows. */
  readonly depth: number;
  /** How many rounds the line plays. */
  readonly rounds: number;
}

/** Describes a level as a wall game's certificates find it: by its number, its set's id and its own. */
export interface CertifiedLevel {
  readonly number: number;
  readonly set: { readonly id: string };
  readonly data: { readonly id: string };
}

/** Describes what of a wall game its debug menu's certificates read, and how it plays a line of shots, `C`: the game's service's. */
export interface CertifiedGame<C> {
  /** The level in play. */
  readonly level: Signal<CertifiedLevel>;
  /** The field's shape, whose depth a line is found on. */
  readonly shape: Signal<{ readonly depth: number }>;
  /**
   * Starts a run at a level, by its number, playing the line its
   * certificate holds on the field's depth as it then stands, asking first
   * if a run is in progress, and resolves to whether one began.
   */
  playLine(
    level: number,
    lineOn: (depth: number) => readonly C[] | null,
  ): Promise<boolean>;
}

/** Describes a set's certificates, as loaded for the set. */
interface LoadedSet<C> {
  /** The set's id. */
  readonly set: string;
  readonly certificates: SetCertificates<C>;
}

/**
 * Offers a wall game's debug menu the certificate of the level in play on
 * the field's depth, and plays it, over the files the game hands it, its
 * codec for a shot, `C`, and its game.
 *
 * A game's service extends it, made in an injection context, and the menu
 * provides that service, so only a page that offers the menu loads it. It
 * loads the certificates of the level in play's set only while the debug
 * menu is offered, so a player's page never fetches them, and once a set,
 * whatever level of it is in play. A set with no file has none; one whose
 * file fails to load offers none either, and says why in the console.
 */
export abstract class DebugCertificates<C> {
  private readonly menu = inject(DEBUG_MENU);

  /** The id of the level in play's set, while the debug menu is offered; else null. */
  private readonly setInPlay = computed(() =>
    this.menu ? this.game.level().set.id : null,
  );

  /** The certificates last loaded, by their set. */
  private readonly loaded = signal<LoadedSet<C> | null>(null);

  /** The certificates of the level in play's set, once loaded; else null. */
  private readonly certificates = computed(() => {
    const loaded = this.loaded();
    return loaded !== null && loaded.set === this.setInPlay()
      ? loaded.certificates
      : null;
  });

  /** The certificate the debug menu offers: the level in play's on the field's depth, or null where none holds it. */
  readonly offer = computed((): CertificateOffer | null => {
    const certificates = this.certificates();
    if (certificates === null) return null;
    const { number, data } = this.game.level();
    const { depth } = this.game.shape();
    const line = lineOf(certificates, data.id, depth);
    return line === null ? null : { level: number, depth, rounds: line.length };
  });

  protected constructor(
    private readonly files: CertificateFiles,
    private readonly readShot: ReadShot<C>,
    private readonly game: CertifiedGame<C>,
  ) {
    // A signal rather than a `resource()`: Angular's `resource()` shares a
    // module with `computed()`, so the build would put it in the main
    // chunk, though only the menu uses it.
    effect(() => {
      const set = this.setInPlay();
      // Untracked, so nothing the loader reads loads the set again.
      if (set !== null) untracked(() => void this.load(set));
    });
  }

  /**
   * Loads a set's certificates, keeping them while the set is still in
   * play once they arrive.
   */
  private async load(set: string): Promise<void> {
    try {
      const file: unknown = await this.files[set]?.();
      const certificates = readCertificates(file, this.readShot);
      if (this.setInPlay() === set) this.loaded.set({ set, certificates });
    } catch (error) {
      // A debug tool's failure shows, rather than reading as no certificate.
      console.error("The certificates failed to load.", error);
    }
  }

  /**
   * Plays the level in play's certificate from the level's start, asking
   * first if a run is in progress, and resolves to whether it began.
   */
  async play(): Promise<boolean> {
    const certificates = this.certificates();
    if (certificates === null) return false;
    const { number, data } = this.game.level();
    return this.game.playLine(number, (depth) =>
      lineOf(certificates, data.id, depth),
    );
  }
}
