import type { Provider } from "@angular/core";
import { thirdsOf } from "@fz/brick-wall/rules/wall";
import { STRAIGHT_UP } from "@fz/brick-wall/view/aim_settings";
import { FRAME_MS, playUntil } from "@fz/core/testing";
import { GAME_RANDOM } from "@fz/game-ui/random";
import type { GameService } from "../app/play/game.service";
import { GAME_LEVELS, PLAY_ROUND, type RoundPlayer } from "../app/tokens";
import type { Flight, FlightEvent } from "../rules/flight/events";
import type { FlightDrop } from "../rules/flight/flight";
import { LEVELS, type LevelEntry } from "../rules/levels/levels";
import {
  RULES,
  type Round,
  type RoundOutcome,
  type RoundStart,
  playRound,
} from "../rules/round/round";
import type { Boon } from "../rules/shot";
import type { Wall } from "../rules/wall/wall";
import type { Steer } from "../view/steering/steering";
import { FLIGHT_FIXTURES, type FlightFixture } from "./flight_fixtures";

/** The levels the shell's specs play: the game's first three, so a run is won in three. */
export const SPEC_LEVELS: readonly LevelEntry[] = LEVELS.slice(0, 3);

/** Where the specs' runs take their seeds from: always the same. */
export const SPEC_RANDOM = (): number => 0.5;

/**
 * Names what a spec's round comes to: the wall stepping down a row,
 * jumping, a friend freed as it steps, the level cleared, or lost.
 */
export type SpecRound = "step" | "jump" | "freed" | "cleared" | "lost";

/** The ink of the friend a spec's round frees. */
export const FREED_INK = 3;

/**
 * The points each spec's round scores: a jump's those of its flight's
 * breaks and the jump's own, so the bar, which counts the breaks as they
 * play back, comes to the round's points; each other's no fewer than its
 * flight's breaks score, the rest coming as it lands.
 */
export const SPEC_POINTS: Readonly<Record<SpecRound, number>> = {
  step: 10,
  jump: FLIGHT_FIXTURES.zap.round.outcome.points,
  freed: 20,
  cleared: 30,
  lost: 0,
};

/** The round made by hand whose start and shot the rules fly each spec's round's flight from. */
const FIXTURES: Readonly<Record<SpecRound, FlightFixture>> = {
  step: FLIGHT_FIXTURES.plain,
  jump: FLIGHT_FIXTURES.zap,
  freed: FLIGHT_FIXTURES.plain,
  cleared: FLIGHT_FIXTURES.cleared,
  lost: FLIGHT_FIXTURES.lost,
};

/** The round the rules play from each spec's round's fixture, whose flight only the view reads. */
const WHOLE: Readonly<Record<SpecRound, Round>> = {
  step: fixtureRound("step"),
  jump: fixtureRound("jump"),
  freed: fixtureRound("freed"),
  cleared: fixtureRound("cleared"),
  lost: fixtureRound("lost"),
};

/**
 * Returns a round player that plays the rounds a script lists, in turn, the
 * last again once it runs out: each the flight the rules fly its fixture's
 * round in, and a round from the start it is handed, its wall stepped,
 * jumped or emptied, or stepped as the level is lost, so the saved game can
 * take its next start up again. Handed a drop, it plays the round it played
 * last again, dropped ({@link droppedRound}), and counts no round in the
 * script.
 */
export function scriptedRounds(...script: readonly SpecRound[]): RoundPlayer {
  let played = 0;
  return (start, _shot, levelBoon, _rules, drop) => {
    if (drop === undefined) played++;
    const kind = script[Math.min(played, script.length) - 1] ?? "step";
    return drop === undefined
      ? specRound(kind, start, levelBoon, WHOLE[kind].flight, SPEC_POINTS[kind])
      : droppedRound(kind, start, levelBoon, drop);
  };
}

/**
 * Returns the providers that hand `GameService` the specs' levels, rounds
 * played as a script says, and {@link SPEC_RANDOM}.
 */
export function provideSpecPlay(
  rounds: RoundPlayer = scriptedRounds("step"),
): Provider[] {
  return [
    { provide: GAME_LEVELS, useValue: SPEC_LEVELS },
    { provide: PLAY_ROUND, useValue: rounds },
    { provide: GAME_RANDOM, useValue: SPEC_RANDOM },
  ];
}

/** Steers nothing: the aim straight up, no charge, nothing let fly. */
export const STILL: Readonly<Steer> = {
  aim: STRAIGHT_UP,
  charge: 0,
  release: false,
  keyed: false,
  touch: false,
  touchX: 0,
  touchY: 0,
};

/** Lets a shot fly straight up, uncharged. */
export const RELEASE: Readonly<Steer> = { ...STILL, release: true };

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

/**
 * Returns the round the rules play from a spec's round's fixture, dropped
 * where a drop asks, so a dropped flight is the whole one, event for event,
 * up to the drop's moment, as the playback takes it; a freed round's flight
 * frees a friend as its first strike lands.
 */
function fixtureRound(kind: SpecRound, drop?: FlightDrop): Round {
  const { start, shot, levelBoon } = FIXTURES[kind];
  const round = playRound(start, shot, levelBoon, RULES, drop);
  return kind === "freed" ? { ...round, flight: freeing(round.flight) } : round;
}

/**
 * Returns a spec's round dropped: its flight the rules' round of its
 * fixture dropped ({@link fixtureRound}), coming to what that comes to, as
 * a spec's round of that kind does from the start handed: a step, a jump,
 * a friend freed, the level cleared or lost; and scoring the spec's points
 * less those the drop cut off, so a drop that cuts nothing changes nothing.
 */
function droppedRound(
  kind: SpecRound,
  start: RoundStart,
  levelBoon: Boon,
  drop: FlightDrop,
): Round {
  const { flight, outcome } = fixtureRound(kind, drop);
  const freed = flight.events.some((event) => event.kind === "free");
  const comesTo: SpecRound =
    outcome.result !== "on"
      ? outcome.result
      : outcome.jumped
        ? "jump"
        : freed
          ? "freed"
          : "step";
  const cut = WHOLE[kind].outcome.points - outcome.points;
  return specRound(comesTo, start, levelBoon, flight, SPEC_POINTS[kind] - cut);
}

/** Returns the round a spec's script names, played from a start, its flight and its points those handed. */
function specRound(
  kind: SpecRound,
  start: RoundStart,
  levelBoon: Boon,
  flight: Flight,
  points: number,
): Round {
  const { wall, depth, crew } = start;
  const { jump } = thirdsOf(depth);
  const outcome = (
    rowsDown: number,
    result: RoundOutcome["result"],
  ): RoundOutcome => ({
    broken: 1,
    points,
    rowsDown,
    jumped: kind === "jump",
    freed: kind === "freed" ? 1 : 0,
    result,
  });
  const next = (lowered: Wall, boon: Boon | null = null): RoundStart => ({
    ...start,
    wall: lowered,
    crew: kind === "freed" ? { friends: [...crew.friends, FREED_INK] } : crew,
    boon,
  });
  switch (kind) {
    case "step":
    case "freed":
      return {
        flight,
        outcome: outcome(1, "on"),
        next: next(downBy(wall, 1)),
      };
    case "jump":
      return {
        flight,
        outcome: outcome(jump, "on"),
        next: next(downBy(wall, jump), levelBoon),
      };
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

/** Returns a flight with a friend in {@link FREED_INK} freed from the cell its first strike struck, as it strikes. */
function freeing(flight: Flight): Flight {
  const first = flight.events.find(({ kind }) => kind === "strike");
  const events = flight.events.flatMap((event): FlightEvent[] =>
    event === first && event.kind === "strike"
      ? [
          event,
          { at: event.at, kind: "free", cell: event.cell, ink: FREED_INK },
        ]
      : [event],
  );
  return { ...flight, events };
}

/** Returns a wall come down some rows, every brick in its cell. */
function downBy(wall: Wall, rows: number): Wall {
  return { ...wall, lowestRow: wall.lowestRow - rows };
}
