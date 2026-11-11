import {
  Injectable,
  InjectionToken,
  computed,
  effect,
  inject,
  resource,
} from "@angular/core";
import { DEBUG_MENU } from "@fz/game-ui/debug_menu";
import {
  type SetCertificates,
  lineOf,
  readCertificates,
} from "../../view/debug/certificates";
import { GameService } from "../play/game.service";
import type { CertificateOffer } from "./debug_menu.component";

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

/**
 * Offers the debug menu the certificate of the level in play on the
 * field's depth, and plays it.
 *
 * It loads the certificates of the level in play's set only while the
 * debug menu is offered, so a player's page never fetches them. A set with
 * no file has none; one whose file fails to load offers none either, and
 * says why in the console.
 */
@Injectable({ providedIn: "root" })
export class CertificatesService {
  private readonly menu = inject(DEBUG_MENU);
  private readonly files = inject(CERTIFICATE_FILES);
  private readonly game = inject(GameService);

  private readonly loaded = resource({
    params: () => (this.menu ? this.game.level().set.id : undefined),
    loader: async ({ params }): Promise<SetCertificates> =>
      readCertificates(await this.files[params]?.()),
  });

  /** The certificates of the level in play's set, once loaded; else null. */
  private readonly certificates = computed(() =>
    this.loaded.hasValue() ? this.loaded.value() : null,
  );

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
    // A debug tool's failure shows, rather than reading as no certificate.
    effect(() => {
      const error = this.loaded.error();
      if (error !== undefined) {
        console.error("The certificates failed to load.", error);
      }
    });
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
