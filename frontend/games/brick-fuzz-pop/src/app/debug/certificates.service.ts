import { Injectable, InjectionToken, inject } from "@angular/core";
import {
  type CertificateFiles,
  DebugCertificates,
  certificateFilesOf,
} from "@fz/brick-wall/app/certificates";
import {
  type CertifiedShot,
  readCertifiedShot,
} from "../../rules/levels/certificate";
import { GameService } from "../play/game.service";

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
 * field's depth, and plays it, as `@fz/brick-wall/app/certificates`'
 * `DebugCertificates` offers a wall game's, over the game's files, each
 * shot kept as a pair of an aim and a charge. The menu provides it, so
 * only a page that offers the menu loads it.
 */
@Injectable()
export class CertificatesService extends DebugCertificates<CertifiedShot> {
  constructor() {
    super(inject(CERTIFICATE_FILES), readCertifiedShot, inject(GameService));
  }
}
