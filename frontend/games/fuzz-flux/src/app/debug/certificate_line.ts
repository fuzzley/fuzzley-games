import {
  Injectable,
  InjectionToken,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from "@angular/core";
import { isRecord, listOf } from "@fz/core/json";
import {
  type LevelInPlay,
  type Move,
  moveOf,
} from "../../rules/run/saved_game";
import { GameService } from "../play/game.service";

/** Loads each set's certificates, as its file's JSON, by the set's id. */
type CertificateFiles = Readonly<Record<string, () => Promise<unknown>>>;

/**
 * The certificates files `yarn certify:deals` writes, by the set's id each
 * file's name gives, loaded as a chunk of its own only when called, so a
 * build carries them in no chunk a player loads; a spec provides its own.
 */
export const CERTIFICATE_FILES = new InjectionToken<CertificateFiles>(
  "CERTIFICATE_FILES",
  {
    providedIn: "root",
    factory: () =>
      Object.fromEntries(
        Object.entries(
          import.meta.glob("../../rules/levels/certificates/*.json", {
            import: "default",
          }),
        ).map(([path, load]) => [
          path.slice(path.lastIndexOf("/") + 1, -".json".length),
          load,
        ]),
      ),
  },
);

/** Describes the certificate the debug menu offers to play: the level in play's on its deal, each by its number, counted from 1, and its line of moves. */
interface CertificateOffer {
  readonly level: number;
  readonly deal: number;
  readonly moves: readonly Move[];
}

/** Says where the certificates of the level in play's set stand: still loading, failed to load, or loaded. */
export type CertificatesStanding = "loading" | "failed" | "loaded";

/** Describes a set's certificates, as its file holds them, loaded for the set, or that its file failed to load. */
interface LoadedSet {
  /** The set's id. */
  readonly set: string;
  readonly file: unknown;
  readonly failed: boolean;
}

/**
 * Returns the line a set's certificates keep for the deal of a level in
 * play, each move in the screen's frame, or null where they keep none, or
 * one that isn't moves of two of its board's squares.
 */
function lineOf(
  file: unknown,
  { level, deal, game }: LevelInPlay,
): readonly Move[] | null {
  const lines = isRecord(file) ? file[level.data.id] : undefined;
  const line = isRecord(lines) ? lines[String(deal)] : undefined;
  const squares = game.board.pieces.length;
  const moves = listOf(line, (move) => moveOf(move, squares));
  return moves?.length ? moves : null;
}

/**
 * Offers the debug menu the certificate of the level in play on its deal,
 * and plays it, the level dealt again and the line's moves made one by
 * one, each once the board rests from the one before.
 *
 * The menu provides it, so only a page that offers the menu loads it, and
 * it loads the certificates of the level in play's set as the set comes
 * into play, so a player's page never fetches them. A set with no file has
 * none; one whose file fails to load offers none either, says so in
 * `standing`, and says why in the console.
 */
@Injectable()
export class CertificateLineService {
  private readonly files = inject(CERTIFICATE_FILES);
  private readonly game = inject(GameService);

  /** The id of the level in play's set. */
  private readonly setInPlay = computed(() => this.game.inPlay().level.set.id);

  /** The certificates last loaded, by their set. */
  private readonly loaded = signal<LoadedSet | null>(null);

  /** Where the certificates of the level in play's set stand. */
  readonly standing = computed((): CertificatesStanding => {
    const loaded = this.loaded();
    if (loaded?.set !== this.setInPlay()) return "loading";
    return loaded.failed ? "failed" : "loaded";
  });

  /** The certificate offered: the level in play's on its deal, or null where none holds it, or until its set's certificates load. */
  readonly offer = computed((): CertificateOffer | null => {
    const loaded = this.loaded();
    if (loaded?.set !== this.setInPlay() || loaded.failed) return null;
    const inPlay = this.game.inPlay();
    const moves = lineOf(loaded.file, inPlay);
    if (moves === null) return null;
    const { level, deal } = inPlay;
    return {
      level: level.number,
      deal: level.data.deals.indexOf(deal) + 1,
      moves,
    };
  });

  constructor() {
    // A signal rather than a `resource()`: Angular's `resource()` shares a
    // module with `computed()`, so the build would put it in the main
    // chunk, though only the menu uses it.
    effect(() => {
      const set = this.setInPlay();
      // Untracked, so nothing the loader reads loads the set again.
      untracked(() => void this.load(set));
    });
  }

  /**
   * Plays the certificate offered from its level's start, asking first if
   * a move is made on the level in play, and resolves to whether it began.
   */
  async play(): Promise<boolean> {
    const offer = this.offer();
    if (offer === null) return false;
    return this.game.playLine(offer.moves);
  }

  /** Loads a set's certificates, keeping them, or that they failed to load, while the set is still in play once they arrive. */
  private async load(set: string): Promise<void> {
    let loaded: LoadedSet;
    try {
      loaded = { set, file: await this.files[set]?.(), failed: false };
    } catch (error) {
      // A debug tool's failure shows, rather than reading as no certificate.
      console.error("The certificates failed to load.", error);
      loaded = { set, file: null, failed: true };
    }
    if (this.setInPlay() === set) this.loaded.set(loaded);
  }
}
