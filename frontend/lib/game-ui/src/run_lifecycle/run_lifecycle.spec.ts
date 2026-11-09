import { Injectable, computed, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { AnnouncerService } from "@fz/ui/announcer";
import { ConfirmService } from "@fz/ui/confirm";
import {
  type RunCommand,
  RunLifecycle,
  type RunStage,
  speedQuestion,
} from "./run_lifecycle";

/**
 * Plays a run as a game whose runs clear no stage does, from where a spec
 * puts it: it pauses a run in play, goes on with one paused once the board
 * is drawn, and starts another, asking first, as a game's `GameService`
 * does.
 */
@Injectable({ providedIn: "root" })
class SpecRun extends RunLifecycle {
  /** Where the run stands, as the spec puts it or the run moves it. */
  readonly stage = signal<RunStage>("ready");

  /** Whether the card over an ended run is put away, as the spec puts it. */
  readonly cardAway = signal(false);

  readonly outcome = this.stage.asReadonly();
  readonly ended = computed(
    () => this.stage() === "over" || this.stage() === "won",
  );
  readonly inProgress = computed(() =>
    ["playing", "paused", "cleared"].includes(this.stage()),
  );
  readonly resultClosed = this.cardAway.asReadonly();

  pause(): void {
    if (this.stage() === "playing") this.stage.set("paused");
  }

  resume(): void {
    if (this.drawn() && this.stage() === "paused") this.stage.set("playing");
  }

  async newGame(): Promise<boolean> {
    if (!(await this.mayLoseRun())) return false;
    this.begin();
    return true;
  }

  /** Starts a new run at a speed, asking first, naming it, if one is in progress. */
  async changeSpeed(speedName: string): Promise<boolean> {
    if (!(await this.mayLoseRun(speedQuestion(speedName)))) return false;
    this.begin();
    return true;
  }

  /** Puts a new run on the board, waiting for its first move. */
  begin(): void {
    this.stage.set("ready");
    this.cardAway.set(false);
    this.began();
  }
}

/** Plays a run as `SpecRun` does, through stages it goes on to one by one. */
@Injectable({ providedIn: "root" })
class StagedRun extends SpecRun {
  /** The number of the stage in play, or the last one cleared, from 1. */
  readonly stageNumber = signal(1);

  protected override nextStage(): void {
    this.stageNumber.update((stage) => stage + 1);
    this.stage.set("ready");
  }
}

/** New game's question, as the confirmation shows it. */
const NEW_GAME_PROMPT = {
  title: "Start a new game?",
  message: "The run in progress will be lost.",
  confirmLabel: "New game",
  cancelLabel: "Cancel",
  tone: "danger",
};

/** Returns a run whose runs clear no stage, at a stage, its card showing. */
function runAt(stage: RunStage): SpecRun {
  const run = TestBed.inject(SpecRun);
  run.stage.set(stage);
  return run;
}

/** Returns a run that has ended, its card put away. */
function endedAndPutAway(): SpecRun {
  const run = runAt("over");
  run.cardAway.set(true);
  return run;
}

/** Lets every promise the run is waiting on settle. */
async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("RunLifecycle", () => {
  describe("the keys", () => {
    it("pauses a run in play at pause", () => {
      const run = runAt("playing");

      run.command("pause");

      expect(run.outcome()).toBe("paused");
    });

    it("leaves a paused run paused at pause", () => {
      const run = runAt("paused");

      run.command("pause");

      expect(run.outcome()).toBe("paused");
    });

    it("starts no run at pause once an ended run's card is put away", async () => {
      const run = endedAndPutAway();

      run.command("pause");
      await flush();

      expect({ outcome: run.outcome(), runs: run.runs() }).toEqual({
        outcome: "over",
        runs: 0,
      });
    });

    it("pauses a run in play at toggle", () => {
      const run = runAt("playing");

      run.command("toggle");

      expect(run.outcome()).toBe("paused");
    });

    it.each<RunCommand>(["toggle", "go"])(
      "goes on with a paused run at %s",
      (command) => {
        const run = runAt("paused");

        run.command(command);

        expect(run.outcome()).toBe("playing");
      },
    );

    it.each<RunCommand>(["toggle", "go"])(
      "starts another run at %s once an ended run's card is put away",
      async (command) => {
        const run = endedAndPutAway();

        run.command(command);
        await flush();

        expect({ outcome: run.outcome(), runs: run.runs() }).toEqual({
          outcome: "ready",
          runs: 1,
        });
      },
    );

    it.each<RunCommand>(["toggle", "go"])(
      "starts no run at %s while an ended run's card shows",
      async (command) => {
        const run = runAt("won");

        run.command(command);
        await flush();

        expect({ outcome: run.outcome(), runs: run.runs() }).toEqual({
          outcome: "won",
          runs: 0,
        });
      },
    );

    it("pauses at toggle a run that hasn't ended, whatever its card says", async () => {
      const run = runAt("playing");
      run.cardAway.set(true);

      run.command("toggle");
      await flush();

      expect({ outcome: run.outcome(), runs: run.runs() }).toEqual({
        outcome: "paused",
        runs: 0,
      });
    });

    it("goes on to the next stage at go once one is cleared", () => {
      const run = TestBed.inject(StagedRun);
      run.stage.set("cleared");

      run.command("go");

      expect({ outcome: run.outcome(), stage: run.stageNumber() }).toEqual({
        outcome: "ready",
        stage: 2,
      });
    });

    it("stays on a cleared stage at go when the game's runs clear none", () => {
      const run = runAt("cleared");

      run.command("go");

      expect(run.outcome()).toBe("cleared");
    });
  });

  describe("the board drawn", () => {
    it("holds the board as drawn until told otherwise", () => {
      const run = TestBed.inject(SpecRun);

      expect(run.drawn()).toBe(true);
    });

    it("holds the board as not drawn once told so", () => {
      const run = TestBed.inject(SpecRun);

      run.setDrawn(false);

      expect(run.drawn()).toBe(false);
    });
  });

  describe("the runs begun", () => {
    it("counts each run begun, from none", () => {
      const run = TestBed.inject(SpecRun);
      run.begin();

      run.begin();

      expect(run.runs()).toBe(2);
    });

    it("clears what the last run said as a run begins", () => {
      const run = TestBed.inject(SpecRun);
      const announcer = TestBed.inject(AnnouncerService);
      announcer.say("Game over.");

      run.begin();

      expect(announcer.message()).toBe("");
    });
  });

  describe("a run in progress lost", () => {
    it("starts a new game at once, asking nothing, with no run in progress", async () => {
      const run = runAt("over");

      const started = await run.newGame();

      expect({
        started,
        asked: TestBed.inject(ConfirmService).isOpen(),
      }).toEqual({ started: true, asked: false });
    });

    it("asks before a new game loses a run in progress, in New game's words", () => {
      const run = runAt("playing");

      void run.newGame();

      expect(TestBed.inject(ConfirmService).prompt()).toEqual(NEW_GAME_PROMPT);
    });

    it("starts the new game once the player says yes", async () => {
      const run = runAt("paused");
      const started = run.newGame();

      TestBed.inject(ConfirmService).accept();

      expect({ started: await started, runs: run.runs() }).toEqual({
        started: true,
        runs: 1,
      });
    });

    it("keeps the run in progress once the player says no", async () => {
      const run = runAt("cleared");
      const started = run.newGame();

      TestBed.inject(ConfirmService).cancel();

      expect({
        started: await started,
        outcome: run.outcome(),
        runs: run.runs(),
      }).toEqual({ started: false, outcome: "cleared", runs: 0 });
    });

    it("asks before a run at another speed loses a run in progress, naming the speed", () => {
      const run = runAt("playing");

      void run.changeSpeed("Relaxed");

      expect(TestBed.inject(ConfirmService).prompt()).toEqual({
        ...NEW_GAME_PROMPT,
        title: "Start a new Relaxed game?",
      });
    });
  });

  describe("speedQuestion()", () => {
    it("asks New game's question, naming the speed", () => {
      expect(speedQuestion("Fast")).toEqual({
        title: "Start a new Fast game?",
        message: "The run in progress will be lost.",
        confirmLabel: "New game",
        tone: "danger",
      });
    });
  });
});
