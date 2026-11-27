import { TestBed } from "@angular/core/testing";
import { MemoryStorage, provideMemoryStorage } from "@fz/ui/testing";
import warmUp from "../../rules/levels/certificates/warm-up.json";
import type { LevelEntry } from "../../rules/levels/levels";
import { BoardFrames } from "../../testing/board_frames";
import {
  BLUE_LINE,
  GAPPED_LEVELS,
  SEEDED_LEVELS,
} from "../../testing/small_levels";
import { GameService } from "../play/game.service";
import { VIEW_KIT } from "../play/view_kit";
import { ProgressService } from "../stats/progress.service";
import { GAME_LEVELS } from "../tokens";
import { CERTIFICATE_FILES, CertificateLineService } from "./certificate_line";
import { DebugService } from "./debug.service";

/** The small levels, dealt on seeds unlike their deals' numbers, then the gapped level of a set of its own, played fifth. */
const TWO_SETS: readonly LevelEntry[] = [
  ...SEEDED_LEVELS,
  ...GAPPED_LEVELS.map((entry) => ({
    ...entry,
    number: SEEDED_LEVELS.length + entry.number,
  })),
];

/**
 * The small set's certificates, as a file keeps them: the third level's
 * line on its first deal, seed 7, the swap that lines up blue and one the
 * board it leaves allows; and on its second, seed 11, a line of a square
 * past the board.
 */
const SMALL = {
  "3": {
    "7": [
      [12, 13],
      [7, 8],
    ],
    "11": [[12, 25]],
  },
};

/** The gapped set's certificates, as a file keeps them: its level's line on its one deal, seed 1. */
const GAPPED = { "1": { "1": [[12, 13]] } };

/** Describes the certificates' service, made where the menu makes it, and the game it plays on. */
interface Offered {
  readonly certificates: CertificateLineService;
  readonly game: GameService;
}

/** Makes the certificates' service over the files given, the game on the third of the small levels on its first deal, the board's view handed it. */
async function offered(
  files: Readonly<Record<string, () => Promise<unknown>>>,
): Promise<Offered> {
  TestBed.configureTestingModule({
    providers: [
      { provide: GAME_LEVELS, useValue: TWO_SETS },
      { provide: CERTIFICATE_FILES, useValue: files },
      provideMemoryStorage(new MemoryStorage()),
      CertificateLineService,
    ],
  });
  const game = TestBed.inject(GameService);
  game.useView(VIEW_KIT);
  TestBed.inject(ProgressService).recordCleared("2");
  await game.startLevel(3);
  return { certificates: TestBed.inject(CertificateLineService), game };
}

/** Resolves once the certificates' service has loaded what the set in play asks of it. */
async function loaded(): Promise<void> {
  TestBed.tick();
  await new Promise((resolve) => setTimeout(resolve));
}

describe("CertificateLineService", () => {
  it("offers the certificate of the level in play on its deal, each by its number, once the set's file loads", async () => {
    const { certificates } = await offered({
      small: () => Promise.resolve(SMALL),
    });

    await loaded();

    expect(certificates.offer()).toEqual({
      level: 3,
      deal: 1,
      moves: [BLUE_LINE, { from: 7, to: 8 }],
    });
  });

  it("offers none before the set's file loads, saying it is loading", async () => {
    const { certificates } = await offered({
      small: () => Promise.resolve(SMALL),
    });

    expect({
      standing: certificates.standing(),
      offer: certificates.offer(),
    }).toEqual({ standing: "loading", offer: null });
  });

  it("says the set's certificates are loaded once its file arrives", async () => {
    const { certificates } = await offered({
      small: () => Promise.resolve(SMALL),
    });

    await loaded();

    expect(certificates.standing()).toBe("loaded");
  });

  it("says the certificates are loading again as another set comes into play", async () => {
    const { certificates, game } = await offered({
      small: () => Promise.resolve(SMALL),
      gapped: () => new Promise(() => undefined),
    });
    await loaded();

    await game.startLevel(5);
    await loaded();

    expect({
      standing: certificates.standing(),
      offer: certificates.offer(),
    }).toEqual({ standing: "loading", offer: null });
  });

  it.each([
    ["it keeps no line for", 3],
    ["its line moves a square off the board on", 2],
  ])(
    "offers none for a deal the set's certificates say nothing true of, as %s deal %i",
    async (_, deal) => {
      const { certificates, game } = await offered({
        small: () => Promise.resolve(SMALL),
      });
      await game.playDeal(deal);

      await loaded();

      expect(certificates.offer()).toBeNull();
    },
  );

  it("offers none for a set with no file", async () => {
    const { certificates, game } = await offered({
      small: () => Promise.resolve(SMALL),
    });
    await game.startLevel(5);

    await loaded();

    expect(certificates.offer()).toBeNull();
  });

  it("loads the certificates of a set as it comes into play", async () => {
    const { certificates, game } = await offered({
      small: () => Promise.resolve(SMALL),
      gapped: () => Promise.resolve(GAPPED),
    });
    await loaded();

    await game.startLevel(5);
    await loaded();

    expect(certificates.offer()).toEqual({
      level: 5,
      deal: 1,
      moves: [BLUE_LINE],
    });
  });

  it("keeps the certificates of the set in play where another's arrive after them", async () => {
    let arrive = (): void => undefined;
    const { certificates, game } = await offered({
      small: () =>
        new Promise((resolve) => {
          arrive = () => {
            resolve(SMALL);
          };
        }),
      gapped: () => Promise.resolve(GAPPED),
    });
    await loaded();
    await game.startLevel(5);
    await loaded();

    arrive();
    await loaded();

    expect(certificates.offer()?.level).toBe(5);
  });

  it("says where a set's file fails to load, and why in the console, and offers none", async () => {
    const said = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { certificates } = await offered({
      small: () => Promise.reject(new Error("offline")),
    });

    await loaded();

    expect({
      said: said.mock.calls.map(([words]: readonly unknown[]) => words),
      standing: certificates.standing(),
      offer: certificates.offer(),
    }).toEqual({
      said: ["The certificates failed to load."],
      standing: "failed",
      offer: null,
    });
  });

  it("plays the certificate offered from its level's start, off the record, a move at a time", async () => {
    const { certificates, game } = await offered({
      small: () => Promise.resolve(SMALL),
    });
    await loaded();
    const frames = new BoardFrames(game);

    const went = await certificates.play();
    frames.frame();

    expect({
      went,
      moves: game.inPlay().moves,
      offRecord: TestBed.inject(DebugService).offRecord(),
    }).toEqual({ went: true, moves: [BLUE_LINE], offRecord: true });
  });

  it("plays nothing where none is offered", async () => {
    const { certificates, game } = await offered({});
    await loaded();
    const inPlay = game.inPlay();

    const went = await certificates.play();

    expect({ went, same: game.inPlay() === inPlay }).toEqual({
      went: false,
      same: true,
    });
  });
});

describe("CERTIFICATE_FILES", () => {
  it("loads each set's certificates the game keeps, by the set's id", async () => {
    const files = TestBed.inject(CERTIFICATE_FILES);

    expect({
      sets: Object.keys(files),
      warmUp: await files["warm-up"]?.(),
    }).toEqual({ sets: ["warm-up"], warmUp });
  });
});
