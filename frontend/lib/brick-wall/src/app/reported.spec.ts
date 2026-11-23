import { Injectable, inject, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { NO_INSETS } from "@fz/phaser/insets";
import type { ConfirmRequest } from "@fz/ui/confirm";
import type {
  ReplayedGame,
  ReplayedRound,
  ReportedGame,
} from "../rules/reported";
import {
  type Run,
  type RunRules,
  type TakenRound,
  createRun,
  landRound,
  nextLevel,
  startLevel,
  takeRound,
} from "../rules/run";
import { fieldShape } from "../view/field_metrics";
import { type ReportedDriver, type ReportsMenu, WallReports } from "./reported";
import type { DrivenLevel } from "./round_driver";

/** The first level made up for the spec. */
const ASH: DrivenLevel = { data: { id: "ash", name: "Ash" } };

/** The second level made up for the spec. */
const BIRCH: DrivenLevel = { data: { id: "birch", name: "Birch" } };

/** Two levels made up for the spec, numbered 1 and 2. */
const LEVELS: readonly DrivenLevel[] = [ASH, BIRCH];

/** The made-up run's rules: a level's tally is its points, and one cleared earns a star of 100 points. */
const RULES: RunRules<number> = {
  pars: { ash: { "11": 2 }, birch: { "11": 2 } },
  untallied: 0,
  tallied: (tally, { points }) => tally + points,
  starsOf: () => 1,
  starPoints: 100,
};

/** The shape of the made-up field, 11 rows deep. */
const SHAPE = fieldShape({
  width: 1600,
  height: 500,
  pixelRatio: 1,
  insets: NO_INSETS,
});

/** The made-up game as it stands: its level's shots, and whether one is in the air. */
interface Played {
  readonly shots: number;
  readonly inAir: boolean;
}

/** A made-up reported game read back and played again: its shots are numbers, played on no rules of their own. */
type Replayed = ReplayedGame<
  number,
  { readonly depth: number },
  number,
  null,
  ReplayedRound<number, null>
>;

/** Returns the made-up game as a report keeps it: its shots and its round in the air, each where it has one. */
function keep({ shots, inAir }: Played): ReportedGame<string, number> {
  return {
    game: "kept",
    record: shots === 0 ? null : { from: "kept", shots: [[shots]] },
    round: inAir ? 5 : null,
  };
}

/**
 * Returns a made-up state read back under a run's id: a depth, its round
 * in play a shot on a depth over 11, and none on 11; or throws for a state
 * that isn't a depth.
 */
function replay(state: unknown, id: number): Replayed {
  if (typeof state !== "number") {
    throw new Error("The game state isn't a depth.");
  }
  return {
    game: { run: runAt(1, id), start: { depth: state }, tuned: false },
    rounds: [],
    round: state > 11 ? { shot: 3, rules: null, moment: 5 } : null,
  };
}

/** Holds what the made-up driver and debug menu were asked to do, in order. */
@Injectable({ providedIn: "root" })
class Told {
  readonly lines: string[] = [];
}

/**
 * Holds the made-up game's run and its board, as its driver would, saying
 * what it was asked, and goes ahead past the question as the spec says.
 */
@Injectable({ providedIn: "root" })
class MadeUpDriver implements ReportedDriver<Played, Replayed> {
  private readonly told = inject(Told).lines;
  readonly run = signal<Run<number>>(runAt(1));
  readonly level = signal(ASH);
  readonly rounds = signal(0);
  readonly score = signal(0);
  readonly shape = signal(SHAPE);
  readonly flying = signal(false);
  readonly drawn = signal(true);
  /** The game as it stands. */
  played: Played = { shots: 0, inAir: false };
  /** The questions asked before a run would be lost. */
  readonly asked: ConfirmRequest[] = [];
  /** Whether to go ahead once asked. */
  goAhead = true;

  askBeforeLosingRun(question: ConfirmRequest): Promise<boolean> {
    this.asked.push(question);
    this.told.push("asked");
    return Promise.resolve(this.goAhead);
  }

  report(): Played {
    return this.played;
  }

  takeUpReplayed({ game }: Replayed): void {
    this.told.push(`took up run ${String(game.run.id)}`);
  }
}

/** Says each depth the made-up debug menu was set to. */
@Injectable({ providedIn: "root" })
class MadeUpMenu implements ReportsMenu {
  private readonly told = inject(Told).lines;

  setDepth(depth: number): void {
    this.told.push(`depth ${String(depth)}`);
  }
}

/** Says what the made-up game puts in its reports. */
@Injectable({ providedIn: "root" })
class MadeUpReports extends WallReports<Played, Replayed> {
  constructor() {
    super({
      title: "Made Up",
      tag: "mu1",
      driver: inject(MadeUpDriver),
      menu: inject(MadeUpMenu),
      keep,
      replay,
    });
  }

  settings(): readonly string[] {
    return ["Sound: On"];
  }
}

/** Returns a new run at a level, waiting for its first round, under an id. */
function runAt(level: number, id = 7): Run<number> {
  return createRun({ id, level, depth: 11 }, LEVELS, RULES);
}

/** Returns a run with a round of a result played and landed on the level in play. */
function landed(
  result: TakenRound["result"],
  run: Run<number> = runAt(1),
): Run<number> {
  const taken = takeRound(startLevel(run), { points: 10, result }, RULES);
  return landRound(taken, RULES);
}

/** Returns the made-up reports, and the driver they read. */
function reportsOf(): { reports: MadeUpReports; driver: MadeUpDriver } {
  return {
    reports: TestBed.inject(MadeUpReports),
    driver: TestBed.inject(MadeUpDriver),
  };
}

/** Returns what the made-up driver and debug menu were asked to do, in order. */
function told(): readonly string[] {
  return TestBed.inject(Told).lines;
}

/** Resolves to what a load threw, or to nothing where it didn't. */
async function problemOf(loading: Promise<boolean>): Promise<string> {
  try {
    await loading;
    return "";
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

describe("WallReports", () => {
  it("files a report under the game's name, its state under its tag", () => {
    const { reports } = reportsOf();

    expect([reports.title, reports.tag]).toEqual(["Made Up", "mu1"]);
  });

  it("names the game and the level in play", () => {
    const { reports, driver } = reportsOf();
    driver.run.set(runAt(2));
    driver.level.set(BIRCH);

    expect(reports.game()).toBe("Made Up · Level 2: Birch");
  });

  describe("the state taken", () => {
    it("is the game as it stands, as the game keeps it", () => {
      const { reports, driver } = reportsOf();
      driver.played = { shots: 3, inAir: true };

      expect(reports.capture().value).toEqual(keep(driver.played));
    });

    it("offers the round in the air, then the level's shots, to leave out", () => {
      const { reports, driver } = reportsOf();
      driver.played = { shots: 3, inAir: true };

      const { trim } = reports.capture();

      expect({ most: trim?.most, note: trim?.at(1).note }).toEqual({
        most: 2,
        note: "without the level's shots",
      });
    });

    it("offers nothing to leave out of a level waiting for its first shot", () => {
      const { reports } = reportsOf();

      expect(reports.capture().trim).toBeUndefined();
    });
  });

  describe("the summary", () => {
    it("says the level, the shots, the score and the field's depth as a shot is aimed", () => {
      const { reports, driver } = reportsOf();
      driver.rounds.set(3);
      driver.score.set(1250);

      expect(reports.capture().summary).toBe(
        "Level 1 · 3 shots · Score 1,250 · 11 rows",
      );
    });

    it("counts one shot as the bar does", () => {
      const { reports, driver } = reportsOf();
      driver.rounds.set(1);

      expect(reports.capture().summary).toBe(
        "Level 1 · 1 shot · Score 0 · 11 rows",
      );
    });

    it("says a shot is in the air", () => {
      const { reports, driver } = reportsOf();
      driver.flying.set(true);

      expect(reports.capture().summary).toBe(
        "Level 1 · 0 shots · Score 0 · 11 rows · shot in the air",
      );
    });

    it.each([
      ["cleared", "level cleared"],
      ["lost", "game over"],
    ] as const)("says where a level %s stands", (result, stage) => {
      const { reports, driver } = reportsOf();
      driver.run.set(landed(result));

      expect(reports.capture().summary.split(" · ").at(-1)).toBe(stage);
    });

    it("says every level is cleared", () => {
      const { reports, driver } = reportsOf();
      const second = nextLevel(landed("cleared"), 11, LEVELS, RULES);
      driver.run.set(landed("cleared", second));

      expect(reports.capture().summary.split(" · ").at(-1)).toBe(
        "every level cleared",
      );
    });
  });

  describe("a state loaded", () => {
    it("is taken up under the run after the one in play once the driver may lose its run, the debug menu set to the depth its round starts on first", async () => {
      const { reports } = reportsOf();

      const loaded = await reports.load(13);

      expect([loaded, told()]).toEqual([
        true,
        ["asked", "depth 13", "took up run 8"],
      ]);
    });

    it("asks the player whether to load it over a run in progress", async () => {
      const { reports, driver } = reportsOf();

      await reports.load(13);

      expect(driver.asked).toEqual([
        {
          title: "Load this game?",
          message: "You'll lose the game in progress.",
          confirmLabel: "Load",
          tone: "danger",
        },
      ]);
    });

    it("loads nothing where the player keeps the run in progress", async () => {
      const { reports, driver } = reportsOf();
      driver.goAhead = false;

      const loaded = await reports.load(13);

      expect([loaded, told()]).toEqual([false, ["asked"]]);
    });

    it("refuses a round in play while the board isn't drawn, asking nothing", async () => {
      const { reports, driver } = reportsOf();
      driver.drawn.set(false);

      const problem = await problemOf(reports.load(13));

      expect([problem, told()]).toEqual([
        "The board isn't drawn yet. Try again once it shows.",
        [],
      ]);
    });

    it("loads a game with no round in play while the board isn't drawn", async () => {
      const { reports, driver } = reportsOf();
      driver.drawn.set(false);

      const loaded = await reports.load(11);

      expect([loaded, told()]).toEqual([
        true,
        ["asked", "depth 11", "took up run 8"],
      ]);
    });

    it("names the part of a state that doesn't fit, asking nothing", async () => {
      const { reports } = reportsOf();

      const problem = await problemOf(reports.load("deep"));

      expect([problem, told()]).toEqual(["The game state isn't a depth.", []]);
    });
  });
});
