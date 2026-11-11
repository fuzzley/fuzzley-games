import { ApplicationRef } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { FRAME_MS } from "@fz/core/testing";
import { DEBUG_MENU } from "@fz/game-ui/debug_menu";
import { NO_INSETS } from "@fz/phaser/insets";
import type { Viewport } from "@fz/phaser/layout";
import { LEVEL_SETS, LEVELS } from "../../rules/levels/levels";
import { playRound } from "../../rules/round/round";
import { LEAST_DEPTH, MOST_DEPTH } from "../../rules/tuning";
import {
  SPEC_LEVELS,
  STILL,
  playRoundOut,
  playUntilCard,
  provideSpecPlay,
} from "../../testing/play";
import { readCertificates } from "../../view/debug/certificates";
import { GameService } from "../play/game.service";
import { DebugService } from "./debug.service";
import {
  CERTIFICATE_FILES,
  type CertificateFiles,
  CertificatesService,
  certificateFilesOf,
} from "./certificates.service";

/** A tall canvas, on which the debug menu's depth sets the field's. */
const TALL: Viewport = {
  width: 900,
  height: 2400,
  pixelRatio: 1,
  insets: NO_INSETS,
};

/** The set the specs' levels belong to, whose file a spec writes. */
const SET_ID = SPEC_LEVELS[0]?.set.id ?? "";

/** A line of two shots, as a file holds it. */
const LINE = [
  [100, 2],
  [300, 4],
];

/** Describes the service a spec reads, and the game it plays. */
interface Certified {
  readonly certificates: CertificatesService;
  readonly game: GameService;
}

/**
 * Returns the service over the specs' levels and the certificates files
 * handed it, where the debug menu is offered or not, once what it loads
 * has loaded.
 */
async function certifiedWith(
  files: CertificateFiles,
  menu = true,
): Promise<Certified> {
  TestBed.configureTestingModule({
    providers: [
      ...provideSpecPlay(),
      { provide: DEBUG_MENU, useValue: menu },
      { provide: CERTIFICATE_FILES, useValue: files },
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

/** Returns the files of a set whose file holds a line for a level on the field's depth as it loads. */
function fileHolding(levelId: string): CertificateFiles {
  return {
    [SET_ID]: () =>
      Promise.resolve({
        [levelId]: {
          [String(TestBed.inject(GameService).shape().depth)]: LINE,
        },
      }),
  };
}

/** Waits for what the service loads to load. */
async function settled(): Promise<void> {
  await TestBed.inject(ApplicationRef).whenStable();
}

describe("certificateFilesOf", () => {
  it("names each file a glob found by its set's id", () => {
    const load = (): Promise<unknown> => Promise.resolve({});

    const files = certificateFilesOf({
      "../../rules/levels/certificates/warm-up.json": load,
      "../../rules/levels/certificates/sparks.json": load,
    });

    expect(Object.keys(files)).toEqual(["warm-up", "sparks"]);
  });
});

describe("CERTIFICATE_FILES", () => {
  it("holds no file but a set's", () => {
    const ids = LEVEL_SETS.map(({ id }) => id);

    const files = TestBed.inject(CERTIFICATE_FILES);

    expect(Object.keys(files).filter((id) => !ids.includes(id))).toEqual([]);
  });

  it("holds a line for every level of Warm-up on every depth, each of which reads", async () => {
    const depths = MOST_DEPTH - LEAST_DEPTH + 1;
    const warmUp = LEVELS.filter(({ set }) => set.id === "warm-up");

    const certificates = readCertificates(
      await TestBed.inject(CERTIFICATE_FILES)["warm-up"]?.(),
    );

    expect(warmUp.map(({ data }) => certificates.get(data.id)?.size)).toEqual(
      warmUp.map(() => depths),
    );
  });
});

describe("CertificatesService", () => {
  it("offers the level in play's certificate on the field's depth", async () => {
    const { certificates, game } = await certifiedWith(
      fileHolding("hello-wall"),
    );

    expect(certificates.offer()).toEqual({
      level: 1,
      depth: game.shape().depth,
      rounds: 2,
    });
  });

  it("offers the certificate of the level a new run starts at", async () => {
    const { certificates, game } = await certifiedWith(fileHolding("stripes"));

    await game.startAt(2);
    await settled();

    expect(certificates.offer()?.level).toBe(2);
  });

  it("plays the level's line the game ships to its Cleared card", async () => {
    TestBed.configureTestingModule({
      providers: [
        ...provideSpecPlay(playRound),
        { provide: DEBUG_MENU, useValue: true },
      ],
    });
    const certificates = TestBed.inject(CertificatesService);
    const game = TestBed.inject(GameService);
    await settled();
    await certificates.play();

    playUntilCard(game);

    expect([game.card(), game.rounds()]).toEqual([
      "cleared",
      certificates.offer()?.rounds,
    ]);
  });

  it("offers the certificate on the field's depth, not the one the level began on", async () => {
    const { certificates, game } = await certifiedWith(
      fileOf({ "hello-wall": { "12": LINE, "13": [[0, 0]] } }),
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

  it("offers none where the set has no file", async () => {
    const { certificates } = await certifiedWith({});

    expect(certificates.offer()).toBeNull();
  });

  it("offers none where the file holds no line on the field's depth", async () => {
    const { certificates } = await certifiedWith(
      fileOf({ "hello-wall": { "11": LINE, "22": LINE } }),
    );

    expect(certificates.offer()).toBeNull();
  });

  it("offers none where the file fails to load, and says why in the console", async () => {
    const failure = new Error("The chunk failed to load.");
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    const { certificates } = await certifiedWith({
      [SET_ID]: () => Promise.reject(failure),
    });

    expect([certificates.offer(), logged.mock.calls]).toEqual([
      null,
      [["The certificates failed to load.", failure]],
    ]);
  });

  it("fetches no file while the debug menu isn't offered", async () => {
    const load = vi.fn(() => Promise.resolve({}));

    const { certificates } = await certifiedWith({ [SET_ID]: load }, false);

    expect([certificates.offer(), load.mock.calls.length]).toEqual([null, 0]);
  });

  it("fetches a set's file once for all its levels", async () => {
    const load = vi.fn(() => Promise.resolve({}));
    const { game } = await certifiedWith({ [SET_ID]: load });

    await game.startAt(2);
    await settled();

    expect(load).toHaveBeenCalledTimes(1);
  });

  it("plays the level in play's line, its first shot let fly as the level waits", async () => {
    const { certificates, game } = await certifiedWith(
      fileHolding("hello-wall"),
    );

    const started = await certificates.play();
    game.tick(FRAME_MS, STILL);

    expect([started, game.rounds()]).toEqual([true, 1]);
  });

  it.each<[string, CertificateFiles, boolean]>([
    ["the debug menu isn't offered", fileHolding("hello-wall"), false],
    ["the set has no file", {}, true],
  ])("plays nothing where %s", async (_, files, menu) => {
    const { certificates, game } = await certifiedWith(files, menu);
    const run = game.run();

    const started = await certificates.play();

    expect([started, game.run()]).toEqual([false, run]);
  });
});
