// A wave's strikes before its board falls, its bunches' and its blasts'.

import { itemAt } from "@fz/core/records";
import type { Board, Game } from "../board/board";
import type { FoundBunch } from "../bunches/find";
import { gatherBunch } from "../bunches/gather";
import type { ElementId } from "../catalog/elements";
import type { KindId } from "../catalog/kinds";
import type { SpecialId } from "../catalog/specials";
import type { ElementRule } from "../elements/element_rule";
import type { Blast, Bunch, Strike } from "../move/record";
import { PUFFER_REACH, TWO_PUFFERS_REACH, TWO_WISPS_FLIGHTS } from "../tuning";
import { dasherStrikes } from "./dasher";
import { type FurPair, frizzballStrikes, furGiven } from "./frizzball";
import { pufferStrikes } from "./puffer";
import { type SetOff, Striking, type StruckBoard } from "./striking";
import { wholeBoardStrikes } from "./strikes";
import { wispTarget } from "./wisp";

/** Describes what a wave's bunches and blasts did, and the board as they left it to fall. */
export interface StruckWave extends StruckBoard {
  readonly bunches: readonly Bunch[];
  /** What went off, in the order set off. */
  readonly blasts: readonly Blast[];
}

/** Describes a blast waiting its turn to go off, and what set it off. */
type Queued = SetOff & Pick<Blast, "setOffBy" | "wait">;

/** Describes the special a wisp swapped with one carries, and the kind it goes off with. */
interface Carried {
  readonly what: Exclude<SpecialId, "wisp">;
  readonly kind: KindId;
}

/**
 * Returns what a wave's bunches and blasts do to a game's board: each
 * bunch gathered in turn, then each special the bunches set off and each
 * the move sets off, going off in that order, a blast's own set-offs
 * waiting behind every blast set off before them.
 *
 * @param game The game as the move or the fall before left it, its moves
 *   played not yet counting the move, which a wisp's draw takes.
 * @param bunches The bunches standing on the board, in the order found.
 * @param setOff What the move sets off itself, none after its first wave.
 */
export function strikeWave(
  game: Game,
  bunches: readonly FoundBunch[],
  setOff: readonly SetOff[],
  rules: Readonly<Record<ElementId, ElementRule>>,
): StruckWave {
  const striking = new Striking(game, rules);
  const gathered = bunches.map((bunch) => gatherBunch(striking, bunch));
  const blasts = Chain.play(striking, rules, [
    ...gathered.flatMap((bunch) => bunch.setOff),
    ...setOff,
  ]);
  striking.remakeSpecials();
  return {
    ...striking.struck(),
    bunches: gathered.map(({ bunch }) => bunch),
    blasts,
  };
}

/** Holds a wave's blasts as they go off in turn, each setting off the specials it gathers. */
class Chain {
  private readonly queue: Queued[];
  /** Whether a wisp of the wave has flown to each square. */
  private readonly flownTo: boolean[];

  /** Sets off what is handed in, in its order, and returns every blast that went off, in the order set off. */
  static play(
    striking: Striking,
    rules: Readonly<Record<ElementId, ElementRule>>,
    setOff: readonly SetOff[],
  ): readonly Blast[] {
    return new Chain(striking, rules, setOff).goOffInTurn();
  }

  private constructor(
    private readonly striking: Striking,
    private readonly rules: Readonly<Record<ElementId, ElementRule>>,
    setOff: readonly SetOff[],
  ) {
    this.queue = setOff.map((blast) => ({ ...blast, setOffBy: null, wait: 0 }));
    const { width, height } = striking.size;
    this.flownTo = Array.from({ length: width * height }, () => false);
  }

  /** Sets off each blast queued in turn, those it sets off queued behind it, and returns them all. */
  private goOffInTurn(): readonly Blast[] {
    const blasts: Blast[] = [];
    for (let place = 0; place < this.queue.length; place++) {
      const blast = itemAt(this.queue, place);
      blasts.push({ ...blast, strikes: this.goOff(blast, place) });
    }
    return blasts;
  }

  /** Sets a blast off, by its place in the wave's, and returns the squares it struck. */
  private goOff(blast: Queued, place: number): readonly Strike[] {
    switch (blast.what) {
      case "dasher-across":
      case "dasher-down":
      case "two-dashers":
      case "dasher-and-puffer":
        return this.strikeEach(
          dasherStrikes(this.board(), blast.what, blast.square),
          place,
        );
      case "puffer":
        return this.strikeEach(
          pufferStrikes(this.board(), blast.square, PUFFER_REACH),
          place,
        );
      case "two-puffers":
        return this.strikeEach(
          pufferStrikes(this.board(), blast.square, TWO_PUFFERS_REACH),
          place,
        );
      case "wisp":
        return this.fly(blast.square, place, 1, null);
      case "two-wisps":
        return this.fly(blast.square, place, TWO_WISPS_FLIGHTS, null);
      case "wisp-and-dasher-across":
        return this.fly(blast.square, place, 1, {
          what: "dasher-across",
          kind: blast.kind,
        });
      case "wisp-and-dasher-down":
        return this.fly(blast.square, place, 1, {
          what: "dasher-down",
          kind: blast.kind,
        });
      case "wisp-and-puffer":
        return this.fly(blast.square, place, 1, {
          what: "puffer",
          kind: blast.kind,
        });
      case "frizzball":
        return this.strikeEach(
          frizzballStrikes(this.board(), blast.square, blast.kind),
          place,
        );
      case "frizzball-and-dasher":
      case "frizzball-and-puffer":
      case "frizzball-and-wisp":
        return this.giveFur(blast.what, blast.square, blast.kind, place);
      case "two-frizzballs":
        return this.strikeEach(
          wholeBoardStrikes(this.board(), blast.square),
          place,
        );
    }
  }

  /** Returns the board as struck so far. */
  private board(): Board {
    return this.striking.soFar().board;
  }

  /** Strikes each of a blast's squares in turn, setting off what each gathers, and returns them. */
  private strikeEach(
    strikes: readonly Strike[],
    place: number,
  ): readonly Strike[] {
    for (const strike of strikes) {
      this.queueBehind(
        this.striking.strike(strike.square, { ...strike, blast: place }),
        strike,
        place,
      );
    }
    return strikes;
  }

  /** Queues what a blast's strike set off, if anything, to wait behind every blast set off before it. */
  private queueBehind(
    setOff: SetOff | null,
    { step }: Strike,
    place: number,
  ): void {
    if (setOff !== null) {
      this.queue.push({ ...setOff, setOffBy: place, wait: step });
    }
  }

  /**
   * Flies a wisp from a square, or so many wisps in turn, each to the
   * square it chooses, and returns the squares flown to, a step each: each
   * strikes its square, or sets off there the special it carries, and no
   * wisp flies once one finds nowhere worth flying to.
   */
  private fly(
    from: number,
    place: number,
    flights: number,
    carried: Carried | null,
  ): readonly Strike[] {
    const strikes: Strike[] = [];
    for (let step = 1; step <= flights; step++) {
      const target = wispTarget(
        this.striking.soFar(),
        from,
        (square) =>
          itemAt(this.flownTo, square) || this.striking.isGathered(square),
        this.rules,
      );
      if (target === null) {
        break;
      }
      this.flownTo[target] = true;
      const strike = { square: target, step };
      strikes.push(strike);
      if (carried === null) {
        this.strikeEach([strike], place);
      } else {
        this.queueBehind(
          { ...carried, square: target, piece: null },
          strike,
          place,
        );
      }
    }
    return strikes;
  }

  /**
   * Gives each fuzzball of a kind the fur a frizzball's pair gives, nearest
   * first, then gathers each that took it in that order, setting off its
   * special: and returns their squares, a step each in turn.
   */
  private giveFur(
    pair: FurPair,
    from: number,
    kind: KindId,
    place: number,
  ): readonly Strike[] {
    const takers: number[] = [];
    for (const { square } of frizzballStrikes(this.board(), from, kind)) {
      if (this.striking.giveFur(square, furGiven(pair, takers.length))) {
        takers.push(square);
      }
    }
    const strikes = takers.map((square, taker) => ({
      square,
      step: taker + 1,
    }));
    for (const strike of strikes) {
      this.queueBehind(
        this.striking.gather(strike.square, { ...strike, blast: place }),
        strike,
        place,
      );
    }
    return strikes;
  }
}
