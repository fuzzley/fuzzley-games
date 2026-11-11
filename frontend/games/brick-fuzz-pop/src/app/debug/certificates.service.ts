import {
  Injectable,
  InjectionToken,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from "@angular/core";
import { DEBUG_MENU } from "@fz/game-ui/debug_menu";
import {
  type SetCertificates,
  lineOf,
  readCertificates,
} from "../../view/debug/certificates";
import { GameService } from "../play/game.service";

/**
 * Describes the certificate the debug menu offers to play: the level in
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

/** Loads each set's certificates, as its file's JSON, by the set's id. */
export type CertificateFiles = Readonly<Record<string, () => Promise<unknown>>>;

/** Returns the files a glob found, by the set's id each file's name gives. */
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

/**
 * The certificates files `yarn certify:levels` writes, by the set's id,
 * each loaded as a chunk of its own only when called, so a build carries
 * them in no chunk a player loads; a spec provides its own.
 */
export const CERTIFICATE_FILES = new InjectionToken<CertificateFiles>(
  "CERTIFICATE_FILES",
  {
    providedIn: "root",
    factory: () =>
      certificateFilesOf(
        import.meta.glob("../../rules/levels/certificates/*.json", {
          import: "default",
        }),
      ),
  },
);

/** Describes a set's certificates, as loaded for the set. */
interface LoadedSet {
  /** The set's id. */
  readonly set: string;
  readonly certificates: SetCertificates;
}

/**
 * Offers the debug menu the certificate of the level in play on the
 * field's depth, and plays it. The menu provides it, so only a page that
 * offers the menu loads it.
 *
 * It loads the certificates of the level in play's set only while the
 * debug menu is offered, so a player's page never fetches them. A set with
 * no file has none; one whose file fails to load offers none either, and
 * says why in the console.
 */
@Injectable()
export class CertificatesService {
  private readonly menu = inject(DEBUG_MENU);
  private readonly files = inject(CERTIFICATE_FILES);
  private readonly game = inject(GameService);

  /** The id of the level in play's set, while the debug menu is offered; else null. */
  private readonly setInPlay = computed(() =>
    this.menu ? this.game.level().set.id : null,
  );

  /** The certificates last loaded, by their set. */
  private readonly loaded = signal<LoadedSet | null>(null);

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

  constructor() {
    // Once a set, whatever level of it is in play. A signal rather than a
    // `resource()`: Angular's `resource()` shares a module with
    // `computed()`, so the build would put it in the main chunk, though
    // only the menu uses it.
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
      const certificates = readCertificates(await this.files[set]?.());
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
