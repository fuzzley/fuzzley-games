import { ApplicationRef } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import {
  type CertificateFiles,
  readCertificates,
} from "@fz/brick-wall/app/certificates";
import { DEPTHS } from "@fz/brick-wall/rules/field";
import { DEBUG_MENU } from "@fz/game-ui/debug_menu";
import { NO_INSETS } from "@fz/phaser/insets";
import type { Viewport } from "@fz/phaser/layout";
import { loadsSettled } from "@fz/ui/testing";
import { LEVEL_SETS, LEVELS } from "../../rules/levels/levels";
import { readCertifiedShot } from "../../rules/levels/certificate";
import { playRound } from "../../rules/round/round";
import { TWO_SHOTS, filesCertifying } from "../../testing/certificates";
import {
  SPEC_LEVELS,
  playRoundOut,
  playUntilCard,
  provideSpecPlay,
} from "../../testing/play";
import { GameService } from "../play/game.service";
import { DebugService } from "./debug.service";
import { CERTIFICATE_FILES, CertificatesService } from "./certificates.service";

// What the certificates offer and play, and when they load, is
// `@fz/brick-wall/app/certificates`' `DebugCertificates`, whose spec holds
// it: this one holds the game's files, its codec and its game.

/** A tall canvas, on which the debug menu's depth sets the field's. */
const TALL: Viewport = {
  width: 900,
  height: 2400,
  pixelRatio: 1,
  insets: NO_INSETS,
};

/** The set the specs' levels belong to, whose file a spec writes. */
const SET_ID = SPEC_LEVELS[0]?.set.id ?? "";

/** Describes the service a spec reads, and the game it plays. */
interface Certified {
  readonly certificates: CertificatesService;
  readonly game: GameService;
}

/**
 * Returns the service over the specs' levels and the certificates files
 * handed it, where the debug menu is offered, once what it loads has
 * loaded.
 */
async function certifiedWith(files: CertificateFiles): Promise<Certified> {
  TestBed.configureTestingModule({
    providers: [
      ...provideSpecPlay(),
      { provide: DEBUG_MENU, useValue: true },
      { provide: CERTIFICATE_FILES, useValue: files },
      CertificatesService,
    ],
  });
  const certified = {
    certificates: TestBed.inject(CertificatesService),
    game: TestBed.inject(GameService),
  };
  await settled();
  return certified;
}

/** Returns the files of a set whose file holds the lines handed, by level id, then depth. */
function fileOf(
  lines: Record<string, Record<string, unknown>>,
): CertificateFiles {
  return { [SET_ID]: () => Promise.resolve(lines) };
}

/** Returns the field's depth, as the game lays it out. */
function fieldDepth(): number {
  return TestBed.inject(GameService).shape().depth;
}

/** Waits for what the service loads to load, its effects run first. */
function settled(): Promise<void> {
  return loadsSettled(TestBed.inject(ApplicationRef));
}

describe("CERTIFICATE_FILES", () => {
  it("holds no file but a set's", () => {
    const ids = LEVEL_SETS.map(({ id }) => id);

    const files = TestBed.inject(CERTIFICATE_FILES);

    expect(Object.keys(files).filter((id) => !ids.includes(id))).toEqual([]);
  });

  it.each(LEVEL_SETS.map(({ id }) => id))(
    "holds a line for every level of %s on every depth, each of which reads",
    async (setId) => {
      const depths = DEPTHS.length;
      const levels = LEVELS.filter(({ set }) => set.id === setId);

      const certificates = readCertificates(
        await TestBed.inject(CERTIFICATE_FILES)[setId]?.(),
        readCertifiedShot,
      );

      expect(levels.map(({ data }) => certificates.get(data.id)?.size)).toEqual(
        levels.map(() => depths),
      );
    },
  );
});

describe("CertificatesService", () => {
  it("offers the level in play's certificate on the field's depth", async () => {
    const { certificates, game } = await certifiedWith(
      filesCertifying(fieldDepth),
    );

    expect(certificates.offer()).toEqual({
      level: 1,
      depth: game.shape().depth,
      rounds: 2,
    });
  });

  it("plays the level's line the game ships to its Cleared card", async () => {
    TestBed.configureTestingModule({
      providers: [
        ...provideSpecPlay(playRound),
        { provide: DEBUG_MENU, useValue: true },
        CertificatesService,
      ],
    });
    const certificates = TestBed.inject(CertificatesService);
    const game = TestBed.inject(GameService);
    // The game's own file, a dynamic import, may outlast the settling.
    await vi.waitFor(() => {
      expect(certificates.offer()).not.toBeNull();
    });
    await certificates.play();

    playUntilCard(game);

    expect([game.card(), game.rounds()]).toEqual([
      "cleared",
      certificates.offer()?.rounds,
    ]);
  });

  it("offers the certificate on the field's depth, not the one the level began on", async () => {
    const { certificates, game } = await certifiedWith(
      fileOf({ "hello-wall": { "12": TWO_SHOTS, "13": [[0, 0]] } }),
    );
    const debug = TestBed.inject(DebugService);
    game.setRoom(TALL);
    debug.setDepth(12);
    TestBed.tick();
    playRoundOut(game);

    debug.setDepth(13);
    TestBed.tick();

    expect([game.run().depth, certificates.offer()]).toEqual([
      12,
      { level: 1, depth: 13, rounds: 1 },
    ]);
  });
});
