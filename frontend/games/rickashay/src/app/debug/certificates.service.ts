import { Injectable, InjectionToken, inject } from "@angular/core";
import {
  type CertificateFiles,
  DebugCertificates,
  certificateFilesOf,
} from "@fz/brick-wall/app/certificates";
import { type Aim, isAim } from "@fz/brick-wall/rules/aims";
import { GameService } from "../play/game.service";

/**
 * The certificates files `yarn certify:levels` writes, by the set's id,
 * each the line of shots that clears a level from its start, loaded as a
 * chunk of its own only when called, so a build carries them in no chunk a
 * player loads; a spec provides its own.
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
 * The rally lines files `yarn certify:levels` writes, by the set's id, each
 * the line of shots whose last reaches a level's rally mark, loaded as the
 * certificates are; a spec provides its own.
 */
export const RALLY_LINE_FILES = new InjectionToken<CertificateFiles>(
  "RALLY_LINE_FILES",
  {
    providedIn: "root",
    factory: () =>
      certificateFilesOf(
        import.meta.glob("../../rules/levels/lines/*.json", {
          import: "default",
        }),
      ),
  },
);

/** Returns a line's shot as its file keeps it, an aim's index alone, or null for anything that isn't one. */
export function readLineShot(kept: unknown): Aim | null {
  return isAim(kept) ? kept : null;
}

/**
 * Offers the debug menu the certificate of the level in play on the
 * field's depth, and plays it, as `@fz/brick-wall/app/certificates`'
 * `DebugCertificates` offers a wall game's, each shot an aim. The menu
 * provides it, so only a page that offers the menu loads it.
 */
@Injectable()
export class CertificatesService extends DebugCertificates<Aim> {
  constructor() {
    super(inject(CERTIFICATE_FILES), readLineShot, inject(GameService));
  }
}

/**
 * Offers the debug menu the rally line of the level in play on the field's
 * depth, the shots that reach its rally mark, and plays it, as the
 * certificates are offered and played.
 */
@Injectable()
export class RallyLinesService extends DebugCertificates<Aim> {
  constructor() {
    super(inject(RALLY_LINE_FILES), readLineShot, inject(GameService));
  }
}
