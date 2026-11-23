// What the shell's specs play: the game's first levels, Warm-up's marks, a
// random that always gives the same seed, and rounds played as a script
// says, each with a flight made by hand; and how a spec plays them a frame
// at a time.

import type { Provider } from "@angular/core";
import { thirdsOf } from "@fz/brick-wall/rules/wall";
import { STRAIGHT_UP } from "@fz/brick-wall/view/aim_settings";
import type { AimFrame } from "@fz/brick-wall/view/aiming";
import { FRAME_MS, playUntil } from "@fz/core/testing";
import { GAME_RANDOM } from "@fz/game-ui/random";
import type { GameService } from "../app/play/game.service";
import {
  GAME_LEVELS,
  GAME_MARKS,
  PLAY_ROUND,
  type RoundPlayer,
} from "../app/tokens";
import type { Wall } from "../rules/catalog/kinds";
import type {
  Flight,
  Round,
  RoundOutcome,
  RoundStart,
} from "../rules/flight/events";
import { LEVELS, type LevelEntry } from "../rules/levels/levels";
import { roundPoints } from "../rules/run/scoring";
import type { Marks } from "../rules/run/stars";
import { FLIGHT_FIXTURES } from "./flight_fixtures";
import warmUpMarks from "./warm_up_marks.json";

/** The levels the shell's specs play: the game's first three, so a run is won in three. */
export const SPEC_LEVELS: readonly LevelEntry[] = LEVELS.slice(0, 3);

/** The marks the shell's specs play by: Warm-up's fixture. */
export const SPEC_MARKS: Marks = warmUpMarks;

/** Where the specs' runs take their seeds from: always the same. */
export const SPEC_RANDOM = (): number => 0.5;

/**
 * Names what a spec's round comes to: the wall stepping down a row after a
 * plain flight, or after a long rally that earns a floor bounce, jumping,
 * the level cleared, or lost.
 */
export type SpecRound = "step" | "rally" | "jump" | "cleared" | "lost";

/** The flight made by hand each spec's round flies. */
export const SPEC_FLIGHTS: Readonly<Record<SpecRound, Flight>> = {
  step: FLIGHT_FIXTURES.plain.round.flight,
  rally: FLIGHT_FIXTURES.rally.round.flight,
  jump: FLIGHT_FIXTURES.jumped.round.flight,
  cleared: FLIGHT_FIXTURES.cleared.round.flight,
  lost: FLIGHT_FIXTURES.lost.round.flight,
};

/**
 * Returns a round player that plays the rounds a script lists, in turn, the
 * last again once it runs out: each with its flight made by hand, and a
 * round from the start it is handed, its wall stepped, jumped or emptied,
 * or stepped as the level is lost, so the saved game can take its next
 * start up again, scoring what its flight's rally and floor bounces and its
 * jump score.
 */
export function scriptedRounds(...script: readonly SpecRound[]): RoundPlayer {
  let played = 0;
  return (start) => {
    played++;
    return specRound(
      script[Math.min(played, script.length) - 1] ?? "step",
      start,
    );
  };
}

/**
 * Returns the providers that hand `GameService` the specs' levels and
 * marks, rounds played as a script says, and {@link SPEC_RANDOM}.
 */
export function provideSpecPlay(
  rounds: RoundPlayer = scriptedRounds("step"),
): Provider[] {
  return [
    { provide: GAME_LEVELS, useValue: SPEC_LEVELS },
    { provide: GAME_MARKS, useValue: SPEC_MARKS },
    { provide: PLAY_ROUND, useValue: rounds },
    { provide: GAME_RANDOM, useValue: SPEC_RANDOM },
  ];
}

/** Aims straight up, letting nothing fly. */
export const STILL: Readonly<AimFrame> = {
  aim: STRAIGHT_UP,
  release: false,
  keyed: false,
  touch: false,
  touchX: 0,
  touchY: 0,
};

/** Lets a shot fly straight up. */
export const RELEASE: Readonly<AimFrame> = { ...STILL, release: true };

/** Releases the round aimed, with a frame of the game's. */
export function release(game: GameService): void {
  game.tick(FRAME_MS, RELEASE);
}

/** Plays the round in the air on until the next is aimed, or the level's card opens. */
export function playOut(game: GameService): void {
  playUntil(
    game,
    () => STILL,
    () => game.phase() === "aiming" || game.card() !== null,
  );
}

/** Releases the round aimed and plays it out. */
export function playRoundOut(game: GameService): void {
  release(game);
  playOut(game);
}

/** Plays rounds until the card over the level's end opens. */
export function playUntilCard(game: GameService): void {
  playUntil(
    game,
    () => RELEASE,
    () => game.card() !== null,
  );
}

/** Returns the round a spec's script names, played from a start. */
function specRound(kind: SpecRound, start: RoundStart): Round {
  const flight = SPEC_FLIGHTS[kind];
  const { wall, depth } = start;
  const jumped = kind === "jump";
  const earned = flight.events.filter(
    (event) => event.kind === "bounce-earned" && event.kept,
  ).length;
  const outcome = (
    rowsDown: number,
    result: RoundOutcome["result"],
  ): RoundOutcome => ({
    rally: flight.rally,
    broken: 1,
    earned,
    jumped,
    rowsDown,
    result,
    points: roundPoints({ rally: flight.rally, earned, jumped }),
  });
  const next = (lowered: Wall): RoundStart => ({
    ...start,
    wall: lowered,
    hot: jumped,
  });
  switch (kind) {
    case "step":
    case "rally":
      return { flight, outcome: outcome(1, "on"), next: next(downBy(wall, 1)) };
    case "jump": {
      const rows = thirdsOf(depth).jump;
      return {
        flight,
        outcome: outcome(rows, "on"),
        next: next(downBy(wall, rows)),
      };
    }
    case "cleared":
      return {
        flight,
        outcome: outcome(0, "cleared"),
        next: next({ ...wall, bricks: wall.bricks.map(() => null) }),
      };
    case "lost":
      return {
        flight,
        outcome: outcome(1, "lost"),
        next: next(downBy(wall, 1)),
      };
  }
}

/** Returns a wall come down some rows, every brick in its cell. */
function downBy(wall: Wall, rows: number): Wall {
  return { ...wall, lowestRow: wall.lowestRow - rows };
}
