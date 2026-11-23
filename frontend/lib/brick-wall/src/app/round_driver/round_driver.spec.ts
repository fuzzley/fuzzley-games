import { Injectable, inject, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { hasEnded } from "@fz/core/run";
import { FRAME_MS, playUntil } from "@fz/core/testing";
import { GAME_RANDOM } from "@fz/game-ui/random";
import { NO_INSETS } from "@fz/phaser/insets";
import type { Viewport } from "@fz/phaser/layout";
import { AnnouncerService } from "@fz/ui/announcer";
import { ConfirmService } from "@fz/ui/confirm";
import { DEPTHS } from "../../rules/field";
import type { Pars } from "../../rules/par";
import type { ReleasedRound, ReplayedRound } from "../../rules/reported";
import {
  type Run,
  type RunRules,
  type TakenRound,
  createRun,
  startLevel,
  takeRound,
} from "../../rules/run";
import type { TakenUp } from "../../rules/saved_wall";
import { fieldMetrics, fieldShape } from "../../view/field_metrics";
import {
  type DrivenLevel,
  type LandingRecords,
  RoundDriver,
  type RoundDriving,
  type RoundWords,
  type RunBegun,
} from "./round_driver";
import type {
  FrameChange,
  RoundPhase,
  RoundsPlayed,
} from "../../view/rounds_played";

/** What a made-up shot does to its level: leaves it on, clears it, or loses it. */
type Shot = TakenRound["result"];

/** The made-up rules a round plays on: the points it scores. */
interface Rules {
  readonly points: number;
}

/** Where a made-up round starts: its level, its field's depth, and how many of its level's rounds came before it. */
interface Start {
  readonly level: number;
  readonly depth: number;
  readonly round: number;
}

/** A made-up round played: what it came to, where the next starts, and how long its flight is, in field units. */
interface Round {
  readonly outcome: TakenRound;
  readonly next: Start;
  readonly length: number;
}

/** A made-up round in play read back from a report. */
type Replayed = ReplayedRound<Shot, Rules>;

/** A made-up round as the driver released it. */
type Released = ReleasedRound<number, Start, Shot, Rules>;

/** The rules a made-up round plays on but where the spec says. */
const OWN: Rules = { points: 10 };

/** How long a made-up round's flight is, in field units. */
const FLIGHT = 100;

/** How far a made-up flight plays in a frame's millisecond, at its own pace. */
const PACE = 0.5;

/** How long a made-up wall takes to come to rest once its flight has landed, at its pace. */
const SETTLE = 20;

/** How long a made-up level's card waits once its wall has come to rest, at its pace. */
const CARD_WAIT = 40;

/** A made-up level: its number, from 1, its id and its name. */
interface Level extends DrivenLevel {
  readonly number: number;
}

/** Three levels made up for the spec, numbered 1 to 3. */
const LEVELS: readonly Level[] = ["Ash", "Birch", "Cedar"].map(
  (name, index) => ({
    number: index + 1,
    data: { id: name.toLowerCase(), name },
  }),
);

/** Each made-up level's par on each depth: the depth less 8, so a par says the depth it was set on. */
const PARS: Pars = Object.fromEntries(
  LEVELS.map(({ data: { id } }) => [
    id,
    Object.fromEntries(DEPTHS.map((depth) => [String(depth), depth - 8])),
  ]),
);

/** The made-up run's rules: it tallies the points of a level's rounds, and a level cleared within par earns 2 stars, else 1, of 100 points each. */
const RULES: RunRules<number> = {
  pars: PARS,
  untallied: 0,
  tallied: (tally, { points }) => tally + points,
  starsOf: ({ rounds, par }) => (rounds <= par ? 2 : 1),
  starPoints: 100,
};

/** What the made-up game says. */
const WORDS: RoundWords<number, Level, Start, Round> = {
  round: ({ outcome }, aimed) =>
    `Scored ${String(outcome.points)}; next round ${String(aimed.round)} on ${String(aimed.depth)}.`,
  level: ({ number, data }) => `Level ${String(number)}, ${data.name}.`,
  cleared: ({ level, score }) =>
    `Level ${String(level)} cleared at ${String(score)}.`,
  end: ({ score }, newBest) =>
    `Ended at ${String(score)}${newBest ? ", a new best" : ""}.`,
  pause: ({ score }) => `Paused at ${String(score)}.`,
  resume: () => "Resumed.",
  takenUp: ({ score }, { data }) =>
    `Taken up on ${data.name} at ${String(score)}.`,
};

/** A tall canvas, which holds the deepest field. */
const TALL: Viewport = {
  width: 900,
  height: 2400,
  pixelRatio: 1,
  insets: NO_INSETS,
};

/** A wide, low canvas, which holds the shallowest field. */
const LOW: Viewport = { ...TALL, width: 1600, height: 500 };

/** A canvas with no room in it, as a hidden board's is. */
const HIDDEN: Viewport = { ...TALL, width: 0, height: 0 };

/** Returns the round a made-up shot plays from a start, on rules. */
function roundOf(start: Start, shot: Shot, { points }: Rules): Round {
  return {
    outcome: { points, result: shot },
    next: { ...start, round: start.round + 1 },
    length: FLIGHT,
  };
}

/** What a frame that came to nothing hands on. */
const NOTHING: FrameChange<Round> = { settled: null, opens: null };

/**
 * Plays the made-up game's rounds: a flight played by the distance a frame
 * hands it, then its wall coming to rest, then, where the round ended its
 * level, its card's wait.
 */
class MadeUpPlay implements RoundsPlayed<Start, Round> {
  round: Round | null = null;
  moment = 0;
  scored = 0;
  /** How many rounds it has been handed to play. */
  released = 0;
  private skipping = false;
  private settled = 0;
  private waited = 0;

  constructor(public start: Start) {}

  get phase(): RoundPhase {
    if (this.round === null) return "aiming";
    return this.moment < this.round.length ? "flying" : "settling";
  }

  aim(start: Start): void {
    this.start = start;
    this.round = null;
    this.moment = 0;
    this.scored = 0;
  }

  release(round: Round): void {
    this.round = round;
    this.released++;
    this.moment = 0;
    this.settled = 0;
    this.waited = 0;
  }

  skip(): void {
    this.skipping = true;
  }

  /** Plays on by a distance, and returns what that came to. */
  advance(distance: number): FrameChange<Round> {
    const { round } = this;
    if (round === null) return NOTHING;
    if (this.moment < round.length) {
      this.moment = this.skipping
        ? round.length
        : Math.min(round.length, this.moment + distance);
      this.skipping = false;
      this.scored = Math.floor(
        (round.outcome.points * this.moment) / round.length,
      );
      return NOTHING;
    }
    if (this.settled < SETTLE) {
      this.settled += distance;
      return this.settled < SETTLE ? NOTHING : { ...NOTHING, settled: round };
    }
    const { result } = round.outcome;
    if (result === "on" || this.waited >= CARD_WAIT) return NOTHING;
    this.waited += distance;
    if (this.waited < CARD_WAIT) return NOTHING;
    return { ...NOTHING, opens: result === "cleared" ? "cleared" : "result" };
  }
}

/** Keeps what the made-up game's records are told, and its best score. */
class MadeUpRecords implements LandingRecords<number> {
  readonly offRecord = signal(false);
  /** What the records were told, in order. */
  readonly told: string[] = [];
  private best = 0;

  began(run: Run<number>, begun?: RunBegun): void {
    this.told.push(
      `began run ${String(run.id)} at ${String(run.level)}${begun?.kept ? ", kept" : ""}${begun?.certified ? ", certified" : ""}`,
    );
  }

  started(before: Run<number>): void {
    this.told.push(`released from ${before.outcome}`);
  }

  landed(run: Run<number>): boolean {
    this.told.push(`landed ${run.outcome} at ${String(run.score)}`);
    const best = hasEnded(run.outcome) && run.score > this.best;
    if (best) this.best = run.score;
    return best;
  }

  left(run: Run<number>): void {
    this.told.push(`left run ${String(run.id)} ${run.ending ?? "at rest"}`);
  }

  takenUp(run: Run<number>): void {
    this.told.push(`took up run ${String(run.id)}`);
  }
}

/** Holds what the made-up game's debug menu sets, and its records. */
@Injectable({ providedIn: "root" })
class MadeUpMenu {
  readonly depth = signal<number | null>(null);
  readonly records = new MadeUpRecords();
}

/** Returns what the made-up game hands its driver. */
function madeUpDriving(): RoundDriving<
  number,
  Level,
  Start,
  Round,
  MadeUpPlay
> {
  const menu = inject(MadeUpMenu);
  return {
    levels: LEVELS,
    rules: RULES,
    openingOf: ({ level, depth }) => ({ level, depth, round: 0 }),
    playOf: (start) => new MadeUpPlay(start),
    records: menu.records,
    words: WORDS,
    depthSet: menu.depth,
  };
}

/**
 * Plays a made-up wall game on the driver: each frame lets a shot fly, if
 * it is handed one, and plays on; its play plays at its own pace, or a
 * field unit a millisecond where played exactly; and it hands what the
 * driver keeps for the game beside it to the spec.
 */
@Injectable()
class MadeUpGame extends RoundDriver<
  number,
  Level,
  Start,
  Shot,
  Rules,
  Round,
  MadeUpPlay,
  string,
  Replayed
> {
  /** Every round the rules were asked to play: its start, shot and rules. */
  readonly asked: [Start, Shot, Rules][] = [];
  /** Every reported round flown on, with the round as it was released again. */
  readonly flownOn: [Replayed, Released][] = [];
  /** Whether the frames the play was asked to play were paused, in order. */
  readonly pausedFrames: boolean[] = [];

  constructor() {
    super(madeUpDriving());
  }

  /** Moves on a frame, letting a shot fly first where one is handed. */
  readonly tick = (ms: number, shot: Shot | null): void => {
    if (shot !== null) this.shoot(shot);
    this.playFrame(ms);
  };

  /** The made-up play, as the driver holds it. */
  get played(): MadeUpPlay {
    return this.play;
  }

  /** The round in the air as the driver holds it. */
  airborne(): Released | null {
    return this.inAir();
  }

  /** The depth the room gives the field. */
  depthOfRoom(): number {
    return this.roomDepth;
  }

  /** Lets a shot fly, on the rules handed or the made-up game's own. */
  shoot(shot: Shot, rules: Rules = OWN): Released | null {
    return this.release(shot, rules);
  }

  /** Puts a round flown again in place of the round in the air, dropped where the play is. */
  dropAs(points: number): void {
    const released = this.inAir();
    if (released === null) throw new Error("No round flies.");
    const round = roundOf(released.start, "on", { points });
    this.droppedAt(released, round, this.play.moment);
  }

  /** Flies the round in the air on to a moment, as a reported round is. */
  flyOnTo(moment: number): void {
    this.flyTo(moment);
  }

  /** Starts a run at a level, as a certificate's line begins one, and says its level. */
  beginAt(level: number, begun: RunBegun): void {
    this.begin(this.create(level), undefined, begun);
    this.sayLevel();
  }

  protected override playRound(start: Start, shot: Shot, rules: Rules): Round {
    this.asked.push([start, shot, rules]);
    return roundOf(start, shot, rules);
  }

  protected override guideOf(start: Start): string {
    return `Aimed from round ${String(start.round)}.`;
  }

  protected override advancePlay(
    deltaMs: number,
    paused: boolean,
  ): FrameChange<Round> {
    this.pausedFrames.push(paused);
    return paused ? NOTHING : this.play.advance(deltaMs * PACE);
  }

  protected override advanceExactly(distance: number): FrameChange<Round> {
    return this.play.advance(distance);
  }

  protected override flyOn(round: Replayed, released: Released): void {
    this.flownOn.push([round, released]);
    super.flyOn(round, released);
  }
}

/** Returns the made-up game, its field on the first shape. */
function gameOf(): MadeUpGame {
  TestBed.configureTestingModule({
    providers: [MadeUpGame, { provide: GAME_RANDOM, useValue: () => 0.5 }],
  });
  return TestBed.inject(MadeUpGame);
}

/** Returns what the made-up game's records were told. */
function told(): readonly string[] {
  return TestBed.inject(MadeUpMenu).records.told;
}

/** Returns what the live region last said. */
function said(): string {
  return TestBed.inject(AnnouncerService).message();
}

/** Plays the round in the air on until it lands. */
function playUntilLanded(game: MadeUpGame): void {
  playUntil(
    game,
    () => null,
    () => !game.flying(),
  );
}

/** Plays the round in the air on until the next is aimed, or the level's card opens. */
function playOut(game: MadeUpGame): void {
  playUntil(
    game,
    () => null,
    () => game.phase() === "aiming" || game.card() !== null,
  );
}

/** Lets a shot fly and plays its round out. */
function playRoundOut(game: MadeUpGame, shot: Shot = "on"): void {
  game.shoot(shot);
  playOut(game);
}

/** Lets a shot fly that ends its level and plays on until the level's card opens. */
function carded(game: MadeUpGame, shot: Shot): MadeUpGame {
  game.shoot(shot);
  playUntil(
    game,
    () => null,
    () => game.card() !== null,
  );
  return game;
}

/** Returns the made-up game with every level cleared, its result open. */
function won(): MadeUpGame {
  const game = carded(gameOf(), "cleared");
  game.nextLevel();
  carded(game, "cleared");
  game.nextLevel();
  return carded(game, "cleared");
}

/** Lets every promise the game is waiting on settle. */
async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/** Answers the question a new game asks, as the player would. */
async function answered(
  starting: Promise<boolean>,
  yes: boolean,
): Promise<boolean> {
  const confirm = TestBed.inject(ConfirmService);
  if (yes) confirm.accept();
  else confirm.cancel();
  return starting;
}

/** Returns a run as storage would take it up: paused, with where its next round starts. */
function keptOf(
  game: MadeUpGame,
  id: number,
  tuned = false,
): TakenUp<number, Start> {
  return {
    run: { ...game.run(), id, outcome: "paused" },
    start: game.nextStart(),
    tuned,
  };
}

describe("RoundDriver", () => {
  describe("a new run", () => {
    it("waits on the first level for its first shot, with no rounds and no points", () => {
      const game = gameOf();

      expect({
        outcome: game.outcome(),
        level: game.level(),
        rounds: game.rounds(),
        score: game.score(),
        phase: game.phase(),
        inProgress: game.inProgress(),
      }).toEqual({
        outcome: "ready",
        level: LEVELS[0],
        rounds: 0,
        score: 0,
        phase: "aiming",
        inProgress: false,
      });
    });

    it("lays its level out on the field's first shape, with the level's par on it, and aims it in the play", () => {
      const game = gameOf();
      const { depth } = game.shape();

      expect({
        start: game.start(),
        par: game.par(),
        aimed: game.played.start,
      }).toEqual({
        start: { level: 1, depth, round: 0 },
        par: depth - 8,
        aimed: game.start(),
      });
    });
  });

  describe("the room", () => {
    it("lays a run with no round played out again on the room's depth, its par with it", () => {
      const game = gameOf();
      const { depth } = fieldShape(TALL);

      game.setRoom(TALL);

      expect({
        shape: game.shape(),
        depth: game.run().depth,
        par: game.par(),
        start: game.start(),
        aimed: game.played.start,
        room: game.depthOfRoom(),
      }).toEqual({
        shape: fieldShape(TALL),
        depth,
        par: depth - 8,
        start: { level: 1, depth, round: 0 },
        aimed: game.start(),
        room: depth,
      });
    });

    it("keeps the shape it has for a room with no area", () => {
      const game = gameOf();
      const before = game.shape();

      game.setRoom(HIDDEN);

      expect(game.shape()).toBe(before);
    });

    it("changes nothing for a room of the same shape", () => {
      const game = gameOf();
      game.setRoom(TALL);
      const [run, start, shape] = [game.run(), game.start(), game.shape()];

      game.setRoom({ ...TALL, width: TALL.width + 1 });

      expect({
        sameRun: game.run() === run,
        sameStart: game.start() === start,
        sameShape: game.shape() === shape,
      }).toEqual({ sameRun: true, sameStart: true, sameShape: true });
    });

    it("takes a room of the same depth at its new size", () => {
      const game = gameOf();
      game.setRoom(TALL);
      const twice = { ...TALL, width: 2 * TALL.width, height: 2 * TALL.height };

      game.setRoom(twice);

      expect(game.shape()).toEqual(fieldShape(twice));
    });

    it("keeps a level's depth once a round is played, the next round moved onto the room's", () => {
      const game = gameOf();
      game.setRoom(TALL);
      playRoundOut(game);
      const start = game.start();

      game.setRoom(LOW);

      expect({ start: game.start(), began: game.run().depth }).toEqual({
        start: { ...start, depth: fieldShape(LOW).depth },
        began: fieldShape(TALL).depth,
      });
    });

    it("waits for the round in the air to come to rest, then lays the next out on the room's depth", () => {
      const game = gameOf();
      game.setRoom(TALL);
      game.shoot("on");
      game.setRoom(LOW);
      const waiting = game.shape();

      playOut(game);

      expect([waiting, game.shape(), game.start().depth]).toEqual([
        fieldShape(TALL),
        fieldShape(LOW),
        fieldShape(LOW).depth,
      ]);
    });

    it("lays the next level out on the room's depth", () => {
      const game = carded(gameOf(), "cleared");
      game.setRoom(TALL);

      game.nextLevel();

      expect([game.run().depth, game.start().depth]).toEqual([
        fieldShape(TALL).depth,
        fieldShape(TALL).depth,
      ]);
    });

    it("takes the depth the debug menu sets over the room's, between rounds", () => {
      const game = gameOf();
      game.setRoom(TALL);

      TestBed.inject(MadeUpMenu).depth.set(15);
      TestBed.tick();

      expect([game.shape().depth, game.start().depth]).toEqual([15, 15]);
    });

    it("gives the field back the room's depth as the debug menu lets its own go", () => {
      const game = gameOf();
      game.setRoom(TALL);
      const menu = TestBed.inject(MadeUpMenu);
      menu.depth.set(15);
      TestBed.tick();

      menu.depth.set(null);
      TestBed.tick();

      expect(game.shape()).toEqual(fieldShape(TALL));
    });
  });

  describe("releasing a round", () => {
    it("begins the level, the run counting the round and scoring it at once", () => {
      const game = gameOf();

      game.shoot("on");

      expect({
        outcome: game.outcome(),
        rounds: game.run().rounds,
        score: game.run().score,
        tally: game.run().tally,
        phase: game.phase(),
      }).toEqual({
        outcome: "playing",
        rounds: 1,
        score: OWN.points,
        tally: OWN.points,
        phase: "flying",
      });
    });

    it("plays the round through the rules from where it starts, at the shot, on the rules handed", () => {
      const game = gameOf();
      const start = game.start();

      game.shoot("on", { points: 7 });

      expect(game.asked).toEqual([[start, "on", { points: 7 }]]);
    });

    it("returns the round as it was released, which a report keeps and a drop flies again", () => {
      const game = gameOf();
      const before = game.run();
      const start = game.start();

      const released = game.shoot("on");

      expect(released).toEqual({
        started: startLevel(before),
        start,
        shot: "on",
        rules: OWN,
        dropped: null,
      });
    });

    it("keeps the round's next start with the run, so a saved game keeps both at once", () => {
      const game = gameOf();

      game.shoot("on");

      expect(game.nextStart()).toBe(game.round()?.next);
    });

    it("plays the round's flight in the play", () => {
      const game = gameOf();

      game.shoot("on");

      expect(game.played.round).toBe(game.round());
    });

    it("holds the round as the one in the air", () => {
      const game = gameOf();

      const released = game.shoot("on");

      expect(game.airborne()).toBe(released);
    });

    it("lets no other shot fly while a round is in the air", () => {
      const game = gameOf();
      game.shoot("on");

      const again = game.shoot("on");

      expect([again, game.run().rounds, game.played.released]).toEqual([
        null,
        1,
        1,
      ]);
    });

    it("lets no shot fly while the level is paused", () => {
      const game = gameOf();
      playRoundOut(game);
      game.pause();

      const again = game.shoot("on");

      expect([again, game.rounds(), game.phase()]).toEqual([null, 1, "aiming"]);
    });

    it("lets no shot fly while the board isn't drawn, as the first move waits for it", () => {
      const game = gameOf();
      game.setDrawn(false);

      const shot = game.shoot("on");

      expect([shot, game.rounds(), game.outcome()]).toEqual([null, 0, "ready"]);
    });

    it("lets no shot fly once the level is cleared", () => {
      const game = carded(gameOf(), "cleared");

      const again = game.shoot("on");

      expect([again, game.rounds(), game.phase()]).toEqual([
        null,
        1,
        "settling",
      ]);
    });
  });

  describe("playing a round back", () => {
    it("aims the next round from where the last left it once its wall comes to rest", () => {
      const game = gameOf();
      game.shoot("on");
      const next = game.round()?.next;

      playOut(game);

      expect({
        phase: game.phase(),
        round: game.round(),
        start: game.start(),
        aimed: game.played.start,
      }).toEqual({ phase: "aiming", round: null, start: next, aimed: next });
    });

    it("says what the round came to as its wall comes to rest, of the next round aimed on the field's depth", () => {
      const game = gameOf();
      game.setRoom(TALL);
      game.shoot("on");
      game.setRoom(LOW);

      playOut(game);

      expect(said()).toBe(
        `Scored ${String(OWN.points)}; next round 1 on ${String(fieldShape(LOW).depth)}.`,
      );
    });

    it("counts no round while its flight plays back, and counts it as it lands", () => {
      const game = gameOf();
      game.shoot("on");
      const flying = game.rounds();

      playUntilLanded(game);

      expect([flying, game.rounds()]).toEqual([0, 1]);
    });

    it("scores the round as its flight plays it back, the rest as it lands", () => {
      const game = carded(gameOf(), "cleared");
      const run = game.run();

      expect(game.score()).toBe(run.score);
    });

    it("scores what the flight has played back while it flies", () => {
      const game = gameOf();
      game.shoot("on", { points: 40 });

      game.tick(100, null);

      expect(game.score()).toBe(Math.floor((40 * 100 * PACE) / FLIGHT));
    });

    it("plays each frame as the run stands, held still while it is paused", () => {
      const game = gameOf();
      game.shoot("on");
      game.tick(FRAME_MS, null);
      game.pause();

      game.tick(FRAME_MS, null);

      expect(game.pausedFrames).toEqual([false, true]);
    });

    it("says it is flying while paused mid-flight", () => {
      const game = gameOf();
      game.shoot("on");

      game.pause();

      expect(game.flying()).toBe(true);
    });

    it("holds how the level ends until the flight lands", () => {
      const game = gameOf();

      game.shoot("cleared");

      expect([game.outcome(), game.run().ending]).toEqual([
        "playing",
        "cleared",
      ]);
    });

    it("clears the level as the flight lands, its stars with it", () => {
      const game = gameOf();
      game.shoot("cleared");

      playUntilLanded(game);

      expect([game.outcome(), game.run().stars]).toEqual(["cleared", 2]);
    });

    it("tells the records what the landing came to", () => {
      const game = gameOf();
      game.shoot("cleared");

      playUntilLanded(game);

      expect(told().at(-1)).toBe(
        `landed cleared at ${String(OWN.points + 2 * RULES.starPoints)}`,
      );
    });

    it("tells the records nothing of a flight still in the air", () => {
      const game = gameOf();
      game.shoot("cleared");

      game.tick(FRAME_MS, null);

      expect(told().at(-1)).toBe("released from ready");
    });
  });

  describe("a level's end", () => {
    it("opens the Cleared card once the level's last flight has landed and its wall rested, and says so", () => {
      const game = carded(gameOf(), "cleared");

      expect({
        card: game.card(),
        open: game.clearedOpen(),
        result: game.resultOpen(),
        said: said(),
      }).toEqual({
        card: "cleared",
        open: true,
        result: false,
        said: `Level 1 cleared at ${String(game.run().score)}.`,
      });
    });

    it("goes on to the next level from the Cleared card, waiting for its first shot, and says which it is", () => {
      const game = carded(gameOf(), "cleared");

      game.command("go");

      expect({
        level: game.level(),
        outcome: game.outcome(),
        start: game.start(),
        round: game.round(),
        aimed: game.played.start,
        card: game.card(),
        said: said(),
      }).toEqual({
        level: LEVELS[1],
        outcome: "ready",
        start: { level: 2, depth: game.shape().depth, round: 0 },
        round: null,
        aimed: game.start(),
        card: null,
        said: "Level 2, Birch.",
      });
    });

    it("waits for the Cleared card before going on", () => {
      const game = gameOf();
      game.shoot("cleared");
      playUntilLanded(game);

      game.nextLevel();

      expect(game.level().number).toBe(1);
    });

    it("waits for the board to be drawn before going on", () => {
      const game = carded(gameOf(), "cleared");
      game.setDrawn(false);

      game.nextLevel();

      expect(game.level().number).toBe(1);
    });

    it("ends the run as the flight that loses the level lands", () => {
      const game = gameOf();
      game.shoot("lost");

      playUntilLanded(game);

      expect([game.outcome(), game.ended()]).toEqual(["over", true]);
    });

    it("opens the result card once a lost level's wall has rested a while, and says how the run ended", () => {
      const game = carded(gameOf(), "lost");

      expect({
        card: game.card(),
        open: game.resultOpen(),
        cleared: game.clearedOpen(),
        said: said(),
      }).toEqual({
        card: "result",
        open: true,
        cleared: false,
        said: `Ended at ${String(OWN.points)}, a new best.`,
      });
    });

    it("opens the result card, not Cleared, as the last level is cleared, and says both", () => {
      const game = won();
      const { score } = game.run();

      expect({
        outcome: game.outcome(),
        card: game.card(),
        said: said(),
      }).toEqual({
        outcome: "won",
        card: "result",
        said: `Level 3 cleared at ${String(score)}. Ended at ${String(score)}, a new best.`,
      });
    });

    it("tells how a lost run ended, for its result card", () => {
      const game = carded(gameOf(), "cleared");
      game.nextLevel();
      carded(game, "lost");

      expect(game.runEnd()).toEqual({
        outcome: "over",
        firstLevel: 1,
        level: 2,
        levelName: "Birch",
        score: game.run().score,
        cleared: 1,
        stars: 2,
      });
    });

    it("tells of a won run, every level cleared", () => {
      const game = won();

      expect(game.runEnd()).toMatchObject({
        outcome: "won",
        level: 3,
        cleared: 3,
      });
    });

    it("tells nothing of a run that goes on", () => {
      const game = gameOf();
      playRoundOut(game);

      expect(game.runEnd()).toBeNull();
    });

    it("keeps whether the run's end set a new best", () => {
      const game = carded(gameOf(), "lost");

      expect(game.newBest()).toBe(true);
    });

    it("puts the result card away, leaving the board to look at", () => {
      const game = carded(gameOf(), "lost");

      game.closeResult();

      expect([game.resultOpen(), game.resultClosed()]).toEqual([false, true]);
    });

    it("has no result card to put away before one opens", () => {
      const game = carded(gameOf(), "cleared");

      game.closeResult();

      expect(game.resultClosed()).toBe(false);
    });

    it.each(["go", "toggle"] as const)(
      "tries the lost level again at %s once its result card is put away",
      (command) => {
        const game = carded(gameOf(), "cleared");
        game.nextLevel();
        carded(game, "lost");
        game.closeResult();

        game.command(command);

        expect([game.outcome(), game.level().number]).toEqual(["ready", 2]);
      },
    );

    it("leaves a lost run as it is at go while its result card shows", () => {
      const game = carded(gameOf(), "lost");

      game.command("go");

      expect(game.outcome()).toBe("over");
    });

    it("leaves a lost run as it is at pause once its result card is put away", () => {
      const game = carded(gameOf(), "lost");
      game.closeResult();

      game.command("pause");

      expect(game.outcome()).toBe("over");
    });

    it("starts a new game at go once a won run's card is put away", async () => {
      const game = won();
      game.closeResult();

      game.command("go");
      await flush();

      expect([game.outcome(), game.level().number]).toEqual(["ready", 1]);
    });

    it("tries a lost level again in a new run, and says its level", () => {
      const game = carded(gameOf(), "cleared");
      game.nextLevel();
      carded(game, "lost");
      const { id } = game.run();

      game.tryAgain();

      expect({
        id: game.run().id > id,
        level: game.level().number,
        first: game.run().firstLevel,
        outcome: game.outcome(),
        said: said(),
      }).toEqual({
        id: true,
        level: 2,
        first: 2,
        outcome: "ready",
        said: "Level 2, Birch.",
      });
    });

    it("tries nothing again once the last level is cleared, nor while the run goes on", () => {
      const ended = won();
      const wonRun = ended.run();
      ended.tryAgain();
      TestBed.resetTestingModule();
      const going = gameOf();
      playRoundOut(going);
      const goingRun = going.run();

      going.tryAgain();

      expect([ended.run() === wonRun, going.run() === goingRun]).toEqual([
        true,
        true,
      ]);
    });
  });

  describe("pausing and going on", () => {
    it("pauses a level under way, and says so, with the score the bar shows", () => {
      const game = gameOf();
      playRoundOut(game);
      game.shoot("on");

      game.pause();

      expect([game.outcome(), said()]).toEqual([
        "paused",
        `Paused at ${String(OWN.points)}.`,
      ]);
    });

    it("leaves a level waiting for its first shot as it is", () => {
      const game = gameOf();

      game.pause();

      expect([game.outcome(), said()]).toEqual(["ready", ""]);
    });

    it("goes on with a paused level, and says so", () => {
      const game = gameOf();
      game.shoot("on");
      game.pause();

      game.resume();

      expect([game.outcome(), said()]).toEqual(["playing", "Resumed."]);
    });

    it("waits for the board to be drawn before going on", () => {
      const game = gameOf();
      game.shoot("on");
      game.pause();
      game.setDrawn(false);

      game.resume();

      expect(game.outcome()).toBe("paused");
    });

    it("leaves a level not paused as it is", () => {
      const game = gameOf();
      game.shoot("on");
      const run = game.run();

      game.resume();

      expect({ same: game.run() === run, said: said() }).toEqual({
        same: true,
        said: "",
      });
    });

    it("pauses and goes on at the keys every run shares", () => {
      const game = gameOf();
      game.shoot("on");
      game.command("pause");
      const paused = game.outcome();

      game.command("go");

      expect([paused, game.outcome()]).toEqual(["paused", "playing"]);
    });
  });

  describe("looking away", () => {
    it.each(["focus", "turned"] as const)(
      "pauses a flight in the air where it is as the player looks away by %s",
      (reason) => {
        const game = gameOf();
        game.shoot("on");
        game.tick(FRAME_MS, null);
        const { moment } = game.played;

        game.lookAway(reason);
        game.tick(FRAME_MS, null);

        expect({
          outcome: game.outcome(),
          flying: game.flying(),
          moment: game.played.moment,
        }).toEqual({ outcome: "paused", flying: true, moment });
      },
    );

    it("lands a flight in the air at once as the page is hidden, and pauses, saying so with the round's points", () => {
      const game = gameOf();
      game.shoot("on");

      game.lookAway("hidden");

      expect({
        outcome: game.outcome(),
        flying: game.flying(),
        phase: game.phase(),
        rounds: game.rounds(),
        said: said(),
      }).toEqual({
        outcome: "paused",
        flying: false,
        phase: "settling",
        rounds: 1,
        said: `Paused at ${String(OWN.points)}.`,
      });
    });

    it("lands a flight paused in the air at once as the page is hidden, its level's end with it", () => {
      const game = gameOf();
      game.shoot("cleared");
      game.lookAway("focus");

      game.lookAway("hidden");

      expect({
        outcome: game.outcome(),
        flying: game.flying(),
        told: told().at(-1),
      }).toEqual({
        outcome: "cleared",
        flying: false,
        told: `landed cleared at ${String(game.run().score)}`,
      });
    });

    it("keeps a run paused as the page is hidden after the focus left, its flight landed", () => {
      const game = gameOf();
      game.shoot("on");
      game.lookAway("focus");

      game.lookAway("hidden");

      expect([game.outcome(), game.flying()]).toEqual(["paused", false]);
    });

    it("brings the landed round's wall down and aims the next as the run goes on", () => {
      const game = gameOf();
      game.shoot("on");
      const next = game.round()?.next;
      game.lookAway("hidden");
      game.resume();

      playOut(game);

      expect([game.phase(), game.start()]).toEqual(["aiming", next]);
    });

    it("pauses a level with no flight in the air as the page is hidden, the round aimed left as it is", () => {
      const game = gameOf();
      playRoundOut(game);
      const start = game.start();

      game.lookAway("hidden");

      expect([game.outcome(), game.phase(), game.start()]).toEqual([
        "paused",
        "aiming",
        start,
      ]);
    });

    it("lands a flight at once as a Skip asks, the run left under way", () => {
      const game = gameOf();
      game.shoot("on");

      game.landAtOnce();

      expect({
        outcome: game.outcome(),
        phase: game.phase(),
        moment: game.played.moment,
        score: game.score(),
      }).toEqual({
        outcome: "playing",
        phase: "settling",
        moment: FLIGHT,
        score: OWN.points,
      });
    });

    it("lands nothing while no flight is in the air", () => {
      const game = gameOf();
      playRoundOut(game);
      const run = game.run();

      game.landAtOnce();

      expect([game.run(), game.phase()]).toEqual([run, "aiming"]);
    });
  });

  describe("a new game", () => {
    it("starts a new run at the level the last one started at, waiting for its first shot, and says it", async () => {
      const game = gameOf();
      await game.startAt(2);
      const { id } = game.run();

      await game.newGame();

      expect({
        id: game.run().id > id,
        level: game.level().number,
        outcome: game.outcome(),
        said: said(),
      }).toEqual({
        id: true,
        level: 2,
        outcome: "ready",
        said: "Level 2, Birch.",
      });
    });

    it("asks first with a run in progress, and starts none if the player says no", async () => {
      const game = gameOf();
      playRoundOut(game);
      const run = game.run();

      const started = await answered(game.newGame(), false);

      expect([started, game.run()]).toEqual([false, run]);
    });

    it("starts a run at a level chosen once the player says yes", async () => {
      const game = gameOf();
      playRoundOut(game);

      const started = await answered(game.startAt(3), true);

      expect([started, game.level().number, game.rounds()]).toEqual([
        true,
        3,
        0,
      ]);
    });

    it("aims the new run's first round in the play, on the room's depth", async () => {
      const game = gameOf();
      game.setRoom(TALL);
      playRoundOut(game);

      await answered(game.newGame(), true);

      expect([game.run().depth, game.played.start]).toEqual([
        fieldShape(TALL).depth,
        game.start(),
      ]);
    });

    it("counts each run begun, for the board to take the focus after", async () => {
      const game = gameOf();

      await game.newGame();

      expect(game.runs()).toBe(1);
    });

    it("forgets the last run's cards and what it set", async () => {
      const game = carded(gameOf(), "lost");

      await game.newGame();

      expect({
        card: game.card(),
        newBest: game.newBest(),
        resultClosed: game.resultClosed(),
      }).toEqual({ card: null, newBest: false, resultClosed: false });
    });

    it("tells the records how it begins", async () => {
      const game = gameOf();

      await game.startAt(2);

      expect(told().at(-1)).toBe(`began run ${String(game.run().id)} at 2`);
    });

    it("tells the records how a run begun beside the driver begins", () => {
      const game = gameOf();

      game.beginAt(3, { certified: true });

      expect([told().at(-1), said()]).toEqual([
        `began run ${String(game.run().id)} at 3, certified`,
        "Level 3, Cedar.",
      ]);
    });

    it("lands the round the last run left in the air in the records first", async () => {
      const game = gameOf();
      game.shoot("cleared");
      game.pause();
      const left = game.run().id;

      await answered(game.newGame(), true);

      expect(told().slice(-2)).toEqual([
        `left run ${String(left)} cleared`,
        `began run ${String(game.run().id)} at 1`,
      ]);
    });

    it("leaves the round the last run had in the air no more", async () => {
      const game = gameOf();
      game.shoot("on");
      game.pause();

      await answered(game.newGame(), true);

      expect([game.airborne(), game.round(), game.flying()]).toEqual([
        null,
        null,
        false,
      ]);
    });
  });

  describe("a run taken up", () => {
    it("takes the run up paused, aims its next round on the field's depth, and says so", () => {
      const played = gameOf();
      playRoundOut(played);
      const taken = keptOf(played, 7);
      TestBed.resetTestingModule();
      const game = gameOf();
      game.setRoom(TALL);

      game.takeUp(taken);

      expect({
        id: game.run().id,
        outcome: game.outcome(),
        rounds: game.rounds(),
        par: game.par(),
        start: game.start(),
        said: said(),
      }).toEqual({
        id: 7,
        outcome: "paused",
        rounds: 1,
        par: taken.run.par,
        start: { ...taken.start, depth: fieldShape(TALL).depth },
        said: `Taken up on Ash at ${String(OWN.points)}.`,
      });
    });

    it("begins a level with no round played again on the field's depth, its par with it", () => {
      const played = carded(gameOf(), "cleared");
      played.nextLevel();
      const taken = keptOf(played, 7);
      TestBed.resetTestingModule();
      const game = gameOf();
      game.setRoom(TALL);
      const { depth } = fieldShape(TALL);

      game.takeUp(taken);

      expect({
        depth: game.run().depth,
        par: game.par(),
        start: game.start(),
      }).toEqual({
        depth,
        par: depth - 8,
        start: { level: 2, depth, round: 0 },
      });
    });

    it("numbers the next new run past the one taken up", async () => {
      const game = gameOf();
      playRoundOut(game);
      game.takeUp(keptOf(game, 40));

      await answered(game.newGame(), true);

      expect(game.run().id).toBe(41);
    });

    it("tells the records it begins as kept, then that it was taken up", () => {
      const game = gameOf();
      playRoundOut(game);

      game.takeUp(keptOf(game, 7, true));

      expect(told().slice(-2)).toEqual([
        "began run 7 at 1, kept",
        "took up run 7",
      ]);
    });

    it("keeps no records as the records say", () => {
      const game = gameOf();

      TestBed.inject(MadeUpMenu).records.offRecord.set(true);

      expect(game.tuned()).toBe(true);
    });
  });

  describe("a drop beside the driver", () => {
    it("takes a round flown again into the run as it stood once the round in the air was released, in its place", () => {
      const game = gameOf();
      const released = game.shoot("cleared");
      game.tick(FRAME_MS, null);

      game.dropAs(4);

      expect({
        run: game.run(),
        points: game.round()?.outcome.points,
      }).toEqual({
        run: takeRound(
          released?.started ?? game.run(),
          { points: 4, result: "on" },
          RULES,
        ),
        points: 4,
      });
    });

    it("leaves a run paused as it was", () => {
      const game = gameOf();
      game.shoot("on");
      game.pause();

      game.dropAs(4);

      expect(game.outcome()).toBe("paused");
    });

    it("holds the round in the air as dropped where the play was", () => {
      const game = gameOf();
      game.shoot("on");
      game.tick(100, null);

      game.dropAs(4);

      expect(game.airborne()?.dropped).toBe(100 * PACE);
    });

    it("holds no round in the air once its flight has landed", () => {
      const game = gameOf();
      game.shoot("on");

      playUntilLanded(game);

      expect(game.airborne()).toBeNull();
    });
  });

  describe("the guide", () => {
    it("is the game's, of the round aimed, while a shot can be let fly", () => {
      const game = gameOf();
      playRoundOut(game);

      expect(game.guide()).toBe("Aimed from round 1.");
    });

    it("is none while a flight is in the air", () => {
      const game = gameOf();

      game.shoot("on");

      expect(game.guide()).toBeNull();
    });

    it("is none while the level is paused", () => {
      const game = gameOf();
      playRoundOut(game);

      game.pause();

      expect(game.guide()).toBeNull();
    });
  });

  describe("the field's layout", () => {
    it("takes where the scene laid the field out", () => {
      const game = gameOf();
      const before = game.metrics();
      const metrics = fieldMetrics(TALL, fieldShape(TALL));

      game.onLayout(metrics);

      expect([before, game.metrics()]).toEqual([null, metrics]);
    });
  });

  describe("a report", () => {
    it("takes the run, where its round starts and the level's rounds since it began, its last in play", () => {
      const game = gameOf();
      const first = game.shoot("on");
      playOut(game);
      const second = game.shoot("on");
      game.tick(100, null);

      expect(game.report()).toEqual({
        run: game.run(),
        start: game.start(),
        rounds: [first, second],
        inPlay: true,
        moment: 100 * PACE,
        tuned: false,
      });
    });

    it("keeps where a round in the air was dropped", () => {
      const game = gameOf();
      game.shoot("on");
      game.tick(100, null);

      game.dropAs(4);

      expect(game.report().rounds[0]?.dropped).toBe(100 * PACE);
    });

    it("begins its record again as the next level begins", () => {
      const game = carded(gameOf(), "cleared");

      game.nextLevel();

      expect(game.report()).toMatchObject({ rounds: [], inPlay: false });
    });

    it("begins its record again as another run begins", async () => {
      const game = gameOf();
      playRoundOut(game);

      await answered(game.newGame(), true);

      expect(game.report().rounds).toEqual([]);
    });
  });

  describe("a reported game taken up", () => {
    /** Returns a game reported mid-flight, as its report reads back, and the run's id taken up under. */
    function reported(): {
      readonly rounds: readonly Released[];
      readonly game: TakenUp<number, Start>;
      readonly round: Replayed;
    } {
      const played = gameOf();
      playRoundOut(played);
      const flying = played.shoot("on", { points: 30 });
      if (flying === null) throw new Error("No round flies.");
      const { rounds } = played.report();
      const game = {
        run: { ...flying.started, id: 9, outcome: "paused" },
        start: flying.start,
        tuned: false,
      } as const;
      TestBed.resetTestingModule();
      return {
        rounds: rounds.slice(0, -1),
        game,
        round: { shot: "on", rules: { points: 30 }, moment: 37.25 },
      };
    }

    it("flies its round in play again from where it started, to the moment reported, exactly, and pauses", () => {
      const replayed = reported();
      const game = gameOf();

      game.takeUpReplayed(replayed);

      expect({
        outcome: game.outcome(),
        phase: game.phase(),
        moment: game.played.moment,
        asked: game.asked,
        score: game.run().score,
      }).toEqual({
        outcome: "paused",
        phase: "flying",
        moment: 37.25,
        asked: [[replayed.game.start, "on", { points: 30 }]],
        score: OWN.points + 30,
      });
    });

    it("takes the run up off the record, the level's rounds recorded, its round in play last", () => {
      const replayed = reported();
      const game = gameOf();

      game.takeUpReplayed(replayed);

      expect({
        told: told().filter((each) => each.startsWith("began")),
        rounds: game.report().rounds.length,
      }).toEqual({ told: ["began run 9 at 1, kept"], rounds: 2 });
    });

    it("hands the game the round in play as it flies it on, as released again", () => {
      const replayed = reported();
      const game = gameOf();

      game.takeUpReplayed(replayed);

      expect(game.flownOn).toEqual([[replayed.round, game.airborne()]]);
    });

    it("takes the run up on the depth the debug menu sets", () => {
      const replayed = reported();
      const game = gameOf();
      game.setRoom(TALL);
      TestBed.inject(MadeUpMenu).depth.set(13);

      game.takeUpReplayed(replayed);

      expect([game.shape().depth, game.start().depth]).toEqual([13, 13]);
    });

    it("takes up a game with no round in play, aimed and paused", () => {
      const { game: kept, rounds } = reported();
      const game = gameOf();

      game.takeUpReplayed({ game: kept, rounds, round: null });

      expect([game.outcome(), game.phase(), game.flownOn]).toEqual([
        "paused",
        "aiming",
        [],
      ]);
    });

    it("flies no round in play while the board isn't drawn, leaving the run paused", () => {
      const replayed = reported();
      const game = gameOf();
      game.setDrawn(false);

      game.takeUpReplayed(replayed);

      expect([game.outcome(), game.phase(), game.flownOn]).toEqual([
        "paused",
        "aiming",
        [],
      ]);
    });

    it("flies the round in the air on to a moment, as a game beside the driver asks", () => {
      const game = gameOf();
      game.shoot("on");

      game.flyOnTo(12.5);

      expect(game.played.moment).toBe(12.5);
    });
  });

  describe("the saved game's view", () => {
    it("keeps the run made from the levels and rules handed", () => {
      const game = gameOf();

      expect(game.run()).toEqual(
        createRun(
          { id: game.run().id, level: 1, depth: game.shape().depth },
          LEVELS,
          RULES,
        ),
      );
    });

    it("says where the next round starts: the round aimed's, or the round in play's next", () => {
      const game = gameOf();
      const aimed = game.nextStart();

      game.shoot("on");

      expect([aimed, game.nextStart()]).toEqual([
        game.start(),
        { ...game.start(), round: 1 },
      ]);
    });
  });
});
