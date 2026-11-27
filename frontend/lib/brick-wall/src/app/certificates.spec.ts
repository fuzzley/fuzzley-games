import {
  ApplicationRef,
  Injectable,
  InjectionToken,
  inject,
  signal,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { isCount } from "@fz/core/json";
import { DEBUG_MENU } from "@fz/game-ui/debug_menu";
import { loadsSettled } from "@fz/ui/testing";
import {
  type CertificateFiles,
  type CertifiedGame,
  type CertifiedLevel,
  DebugCertificates,
  certificateFilesOf,
  lineOf,
  readCertificates,
} from "./certificates";

/** Returns a shot of the spec's game as its certificates keep it, an aim alone, 0 to 8, or null for anything else. */
function readAim(kept: unknown): number | null {
  return isCount(kept) && kept < 9 ? kept : null;
}

/** A line of two shots, as a file holds it. */
const LINE = [2, 8];

/** Returns what a file reads as, each level's lines as plain records, for a spec to compare. */
function readAsRecords(
  value: unknown,
): Record<string, Record<number, unknown>> {
  return Object.fromEntries(
    [...readCertificates(value, readAim)].map(([id, lines]) => [
      id,
      Object.fromEntries(lines),
    ]),
  );
}

describe("certificateFilesOf", () => {
  it("names each file a glob found by its set's id", () => {
    const load = (): Promise<unknown> => Promise.resolve({});

    const files = certificateFilesOf({
      "../levels/certificates/opening.json": load,
      "../levels/certificates/late.json": load,
    });

    expect(Object.keys(files)).toEqual(["opening", "late"]);
  });
});

describe("readCertificates", () => {
  it("reads each level's line on each depth, by its id, each shot by the game's codec", () => {
    const file = { first: { "11": LINE, "22": [0] } };

    expect(readAsRecords(file)).toEqual({ first: { 11: LINE, 22: [0] } });
  });

  it.each([null, [], "certificates", 3])(
    "reads %j as no certificate",
    (file) => {
      expect(readCertificates(file, readAim).size).toBe(0);
    },
  );

  it.each(["10", "23", "011", "11.0", "eleven"])(
    "drops a line on a depth no field has, %j",
    (depth) => {
      const file = { first: { [depth]: LINE, "12": LINE } };

      expect(readAsRecords(file)).toEqual({ first: { 12: LINE } });
    },
  );

  it.each([
    ["empty", []],
    ["not a list", { 0: 2 }],
    ["with a shot the codec doesn't read", [2, 9]],
  ])("drops a line %s", (_, line) => {
    const file = { first: { "11": line, "12": LINE } };

    expect(readAsRecords(file)).toEqual({ first: { 12: LINE } });
  });

  it.each([
    ["is a list", LINE],
    ["is nothing", null],
    ["holds no line that reads", { "11": [] }],
  ])("drops a level that %s", (_, lines) => {
    const file = { first: lines, second: { "11": LINE } };

    expect(readAsRecords(file)).toEqual({ second: { 11: LINE } });
  });
});

describe("lineOf", () => {
  const certificates = readCertificates({ first: { "14": LINE } }, readAim);

  it("finds a level's line on a depth", () => {
    expect(lineOf(certificates, "first", 14)).toEqual(LINE);
  });

  it.each([
    ["a depth it holds none on", "first", 15],
    ["a level it holds none for", "second", 14],
  ])("finds none on %s", (_, id, depth) => {
    expect(lineOf(certificates, id, depth)).toBeNull();
  });
});

/** The spec's levels: two of the set "early", then one of "late". */
const LEVELS: readonly CertifiedLevel[] = [
  { number: 1, set: { id: "early" }, data: { id: "first" } },
  { number: 2, set: { id: "early" }, data: { id: "second" } },
  { number: 3, set: { id: "late" }, data: { id: "third" } },
];

/** Returns the spec's level of a number, from 1. */
function levelAt(number: number): CertifiedLevel {
  const level = LEVELS[number - 1];
  if (level === undefined) throw new RangeError(`No level ${String(number)}`);
  return level;
}

/** Holds what the certificates read of the spec's game, in signals a spec sets, and the lines it began, as a game begins one only where its level has a line on the field's depth. */
class FakeGame implements CertifiedGame<number> {
  readonly level = signal(levelAt(1));
  readonly shape = signal({ depth: 11 });
  /** The level each line began at, and the line, as `playLine()` found it on the field's depth. */
  readonly begun: [number, readonly number[]][] = [];

  playLine(
    level: number,
    lineOn: (depth: number) => readonly number[] | null,
  ): Promise<boolean> {
    const line = lineOn(this.shape().depth);
    if (line !== null) this.begun.push([level, line]);
    return Promise.resolve(line !== null);
  }
}

/** The files and the game the spec's service is handed. */
const FILES = new InjectionToken<CertificateFiles>("FILES");
const GAME = new InjectionToken<FakeGame>("GAME");

/** The spec's game's certificates, as its debug menu's service offers them. */
@Injectable()
class Certificates extends DebugCertificates<number> {
  constructor() {
    super(inject(FILES), readAim, inject(GAME));
  }
}

/** Describes the service a spec reads, and the game it plays. */
interface Certified {
  readonly certificates: Certificates;
  readonly game: FakeGame;
}

/** Waits for the certificates the service loads, its effects run first. */
function settled(): Promise<void> {
  return loadsSettled(TestBed.inject(ApplicationRef));
}

/**
 * Returns the service over the files handed it, where the debug menu is
 * offered or not, and the game, a new one unless handed, once what it loads
 * has loaded.
 */
async function certifiedWith(
  files: CertificateFiles,
  menu = true,
  game = new FakeGame(),
): Promise<Certified> {
  TestBed.configureTestingModule({
    providers: [
      { provide: DEBUG_MENU, useValue: menu },
      { provide: FILES, useValue: files },
      { provide: GAME, useValue: game },
      Certificates,
    ],
  });
  const certificates = TestBed.inject(Certificates);
  await settled();
  return { certificates, game };
}

/** Returns the files of the set "early", which hold the lines handed, by level id, then depth. */
function earlyFile(
  lines: Record<string, Record<string, unknown>>,
): CertificateFiles {
  return { early: () => Promise.resolve(lines) };
}

/** Files whose set "early" holds a line of two shots for its first level on a field 11 deep. */
const CERTIFYING = earlyFile({ first: { "11": LINE } });

describe("DebugCertificates", () => {
  it("offers the level in play's certificate on the field's depth", async () => {
    const { certificates } = await certifiedWith(CERTIFYING);

    expect(certificates.offer()).toEqual({ level: 1, depth: 11, rounds: 2 });
  });

  it("offers the certificate of another level of the set as it comes into play", async () => {
    const { certificates, game } = await certifiedWith(
      earlyFile({ first: { "11": LINE }, second: { "11": [4] } }),
    );

    game.level.set(levelAt(2));

    expect(certificates.offer()).toEqual({ level: 2, depth: 11, rounds: 1 });
  });

  it("offers the certificate on the depth the field takes", async () => {
    const { certificates, game } = await certifiedWith(
      earlyFile({ first: { "11": LINE, "13": [4] } }),
    );

    game.shape.set({ depth: 13 });

    expect(certificates.offer()).toEqual({ level: 1, depth: 13, rounds: 1 });
  });

  it("offers none where the set has no file", async () => {
    const { certificates } = await certifiedWith({});

    expect(certificates.offer()).toBeNull();
  });

  it("offers none where the file holds no line on the field's depth", async () => {
    const { certificates } = await certifiedWith(
      earlyFile({ first: { "12": LINE, "22": LINE } }),
    );

    expect(certificates.offer()).toBeNull();
  });

  it("offers none where the file fails to load, and says why in the console", async () => {
    const failure = new Error("The chunk failed to load.");
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    const { certificates } = await certifiedWith({
      early: () => Promise.reject(failure),
    });

    expect([certificates.offer(), logged.mock.calls]).toEqual([
      null,
      [["The certificates failed to load.", failure]],
    ]);
  });

  it("fetches no file while the debug menu isn't offered", async () => {
    const load = vi.fn(() => Promise.resolve({}));

    const { certificates } = await certifiedWith({ early: load }, false);

    expect([certificates.offer(), load.mock.calls.length]).toEqual([null, 0]);
  });

  it("fetches a set's file once for all its levels", async () => {
    const load = vi.fn(() => Promise.resolve({}));
    const { game } = await certifiedWith({ early: load });

    game.level.set(levelAt(2));
    await settled();

    expect(load).toHaveBeenCalledTimes(1);
  });

  it("fetches a set's file once, whatever its loader reads", async () => {
    const game = new FakeGame();
    const load = vi.fn(() =>
      Promise.resolve({ first: { [String(game.shape().depth)]: LINE } }),
    );
    await certifiedWith({ early: load }, true, game);

    game.shape.set({ depth: 12 });
    await settled();

    expect(load).toHaveBeenCalledTimes(1);
  });

  it("offers none of the last set's certificates while the next set's load", async () => {
    const { certificates, game } = await certifiedWith({
      ...CERTIFYING,
      late: () => new Promise<never>(() => undefined),
    });

    game.level.set(levelAt(3));
    await settled();

    expect(certificates.offer()).toBeNull();
  });

  it("keeps the set in play's certificates as the last set's arrive late", async () => {
    let arrive: (lines: unknown) => void = () => undefined;
    const { certificates, game } = await certifiedWith({
      early: () =>
        new Promise((resolve) => {
          arrive = resolve;
        }),
      late: () => Promise.resolve({ third: { "11": LINE } }),
    });
    game.level.set(levelAt(3));
    await settled();

    arrive({ first: { "11": [4] } });
    await settled();

    expect(certificates.offer()).toEqual({ level: 3, depth: 11, rounds: 2 });
  });

  it("plays the level in play's line, on the field's depth as the game then has it", async () => {
    const { certificates, game } = await certifiedWith(
      earlyFile({ first: { "11": LINE, "12": [4] } }),
    );
    game.shape.set({ depth: 12 });

    const started = await certificates.play();

    expect([started, game.begun]).toEqual([true, [[1, [4]]]]);
  });

  it.each<[string, CertificateFiles, boolean]>([
    ["the debug menu isn't offered", CERTIFYING, false],
    ["the set has no file", {}, true],
  ])("plays nothing where %s", async (_, files, menu) => {
    const { certificates, game } = await certifiedWith(files, menu);

    const started = await certificates.play();

    expect([started, game.begun]).toEqual([false, []]);
  });
});
