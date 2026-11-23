import {
  Component,
  computed,
  contentChild,
  inject,
  input,
  output,
} from "@angular/core";
import {
  endTitle,
  tryAgainLabel,
  whereLost,
} from "@fz/brick-wall/rules/end_words";
import { count, formatPoints } from "@fz/core/format";
import type { RunStage } from "@fz/core/run";
import { GameViewportService } from "@fz/game-ui/viewport";
import { CanvasCardsComponent, KeepKeysDirective } from "@fz/phaser/canvas";
import { IconComponent } from "@fz/ui/icon";
import { type KindId, kindOf } from "../../rules/catalog/kinds";
import { describeKind, starLabel } from "../../rules/run/describe";
import type { LevelPoints } from "../../rules/run/scoring";
import {
  MOST_STARS,
  STARS,
  type StarFlags,
  starCount,
} from "../../rules/run/stars";
import type { Pictures } from "../../scene/pictures";

/** What the Ready card shows, over a level waiting for its first shot. */
export interface ReadyCard {
  readonly kind: "ready";
  /** The level's number, from 1. */
  readonly level: number;
  /** The level's name. */
  readonly name: string;
  /** What its wall is built around. */
  readonly around: string;
  /** Its par, in shots, on the depth it begins on. */
  readonly par: number;
  /** Its rally mark on that depth. */
  readonly mark: number;
  /** The kind of brick the level brings in, the one whose `firstLevel` it is, or null. */
  readonly newKind: KindId | null;
}

/** What the Paused card shows, over a paused level. */
export interface PausedCard {
  readonly kind: "paused";
  /** The run's score. */
  readonly score: number;
}

/** What the Cleared card shows, over a level cleared with another to come. */
export interface ClearedCard {
  readonly kind: "cleared";
  /** The level's number, from 1. */
  readonly level: number;
  /** The shots it took. */
  readonly rounds: number;
  /** Its par, in shots. */
  readonly par: number;
  /** Its rally mark on the depth it began on. */
  readonly mark: number;
  /** The stars it earned. */
  readonly stars: StarFlags;
  /** The best rally of its shots. */
  readonly bestRally: number;
  /** How its points added up. */
  readonly points: LevelPoints;
  /** The run's score. */
  readonly score: number;
}

/**
 * What the Ended card shows, over an ended run once its result is closed: a
 * level lost, which the player may try again, or the last level cleared,
 * after which a new game begins.
 */
export type EndedCard =
  | {
      readonly kind: "ended";
      /** A level lost. */
      readonly outcome: Extract<RunStage, "over">;
      /** The number of the level it was lost on, from 1. */
      readonly level: number;
      /** That level's name. */
      readonly name: string;
      /** The run's score. */
      readonly score: number;
    }
  | {
      readonly kind: "ended";
      /** The last level cleared. */
      readonly outcome: Extract<RunStage, "won">;
      /** The run's score. */
      readonly score: number;
    };

/** A card over the field, with what it shows. */
export type BoardCard = ReadyCard | PausedCard | ClearedCard | EndedCard;

/** A line of a card's list: a name and a figure. */
interface FigureLine {
  readonly label: string;
  readonly value: string;
}

/** A star on the Cleared card, by its name, earned or missed. */
interface ShownStar {
  readonly label: string;
  readonly earned: boolean;
}

/** The Ready card as it reads. */
interface ShownReady {
  readonly kind: "ready";
  readonly title: string;
  readonly around: string;
  /** Its par and its rally mark. */
  readonly figures: readonly FigureLine[];
  /** The new kind's name, what it does and its picture, once the scene has drawn it. */
  readonly newKind: {
    readonly name: string;
    readonly about: string;
    readonly picture: string | null;
  } | null;
}

/** The Paused card as it reads. */
interface ShownPaused {
  readonly kind: "paused";
  readonly score: string;
}

/** The Cleared card as it reads. */
interface ShownCleared {
  readonly kind: "cleared";
  readonly title: string;
  /** Each star by its name, in order, earned or missed. */
  readonly stars: readonly ShownStar[];
  /** The stars in words, since they are pictures: "2 of 3 stars". */
  readonly starsWords: string;
  /** The shots against par and the best rally. */
  readonly play: readonly FigureLine[];
  /** How the points added up. */
  readonly tally: readonly FigureLine[];
  readonly score: string;
}

/** The Ended card as it reads. */
interface ShownEnded {
  readonly kind: "ended";
  /** Whether the last level was cleared, which earns the trophy and a new game rather than another try. */
  readonly won: boolean;
  readonly title: string;
  /** Where a lost run was lost, "Lost on level 3, Columns", or null for a won one. */
  readonly where: string | null;
  readonly score: string;
  /** What its button says: "Try again from level 3", or "New game" once every level is cleared. */
  readonly againLabel: string;
}

/** The card that says the board is being restored. */
interface ShownRestoring {
  readonly kind: "restoring";
}

/** A card as it reads. */
type ShownCard =
  ShownReady | ShownPaused | ShownCleared | ShownEnded | ShownRestoring;

/** The number the next board card's ids take, so two boards' never clash. */
let nextCardId = 0;

/**
 * Shows the card over the field, if any, as it is handed: the level waiting
 * for its first shot, its number and name, what its wall is built around,
 * its par and its rally mark, and the kind of brick it brings in; that the
 * level is paused; how a level cleared went, its three stars each by name,
 * its shots against par, its best rally and how its points added up; or,
 * once an ended run's result is closed, how it ended, the score, and a try
 * at the level lost, or a new game after the last is cleared, as the
 * result offers. While the board is being restored, after its WebGL
 * context was lost, it says so in place of any of them.
 *
 * Its element is the layer the cards show in, which the board lays over the
 * field, a card keeping the board's margin around the field (`--margin`). It
 * shows what the board hands it first, the canvas's own cards
 * (`<fz-canvas-cards>`), that the board is still loading or couldn't be
 * drawn, and none of its own while they show one. Its buttons keep their
 * keys from the board, Phaser's keyboard target. The board takes the
 * focus back as it goes on (`resumeRun`, `nextLevel`, `tryAgain`,
 * `newGame`), which the button took and would take away with its card.
 */
@Component({
  selector: "app-board-card",
  imports: [IconComponent, KeepKeysDirective],
  templateUrl: "./board_card.component.html",
  styleUrl: "./board_card.component.scss",
})
export class BoardCardComponent {
  private readonly viewport = inject(GameViewportService);

  /** The id of the card's title, which names the card. */
  protected readonly titleId = `board-card-title-${String(nextCardId++)}`;

  /** The canvas's own cards, which the board hands it, if it does. */
  private readonly canvasCards = contentChild(CanvasCardsComponent);

  /** The card to show, or null for none. */
  readonly card = input.required<BoardCard | null>();

  /**
   * Whether the board is being restored, its WebGL context lost, which
   * shows its card in place of the one handed.
   */
  readonly restoring = input(false);

  /** The pictures of each drawn kind of brick, or null before the scene has drawn them. */
  readonly pictures = input<Pictures | null>(null);

  /** Emitted as the player goes on with the paused level. */
  readonly resumeRun = output();

  /** Emitted as the player goes on to the next level. */
  readonly nextLevel = output();

  /** Emitted as the player tries the lost level again. */
  readonly tryAgain = output();

  /** Emitted as the player asks for a new game, after the last level is cleared. */
  readonly newGame = output();

  /** Whether the Ready card asks for the phone upright, for a bigger board: on a phone on its side. */
  protected readonly sideways = computed(
    () => this.viewport.formFactor() === "phone-landscape",
  );

  /** Its own card as it reads, and none while the canvas's shows. */
  protected readonly shown = computed<ShownCard | null>(() => {
    const card = this.card();
    if (this.canvasCards()?.card()) return null;
    if (this.restoring()) return { kind: "restoring" };
    if (card === null) return null;
    switch (card.kind) {
      case "ready":
        return this.readyOf(card);
      case "paused":
        return { kind: "paused", score: formatPoints(card.score) };
      case "cleared":
        return clearedOf(card);
      case "ended":
        return endedOf(card);
    }
  });

  /** Asks for a new game once every level is cleared, else to try the lost level again. */
  protected startAgain(won: boolean): void {
    if (won) {
      this.newGame.emit();
    } else {
      this.tryAgain.emit();
    }
  }

  /** Returns the Ready card as it reads, with the new kind's picture once there is one. */
  private readyOf(card: ReadyCard): ShownReady {
    const { newKind } = card;
    return {
      kind: "ready",
      title: `Level ${String(card.level)}: ${card.name}`,
      around: `${card.around}.`,
      figures: [
        { label: "Par", value: count(card.par, "shot", "shots") },
        { label: "Rally mark", value: String(card.mark) },
      ],
      newKind:
        newKind === null
          ? null
          : {
              name: kindOf(newKind).name,
              about: describeKind(newKind),
              picture: this.pictures()?.bricks[newKind] ?? null,
            },
    };
  }
}

/** Returns the Cleared card as it reads. */
function clearedOf(card: ClearedCard): ShownCleared {
  const { points } = card;
  return {
    kind: "cleared",
    title: `Level ${String(card.level)} cleared!`,
    stars: STARS.map((star) => ({
      label: starLabel(star, card.par, card.mark),
      earned: card.stars[star],
    })),
    starsWords: `${String(starCount(card.stars))} of ${count(MOST_STARS, "star", "stars")}`,
    play: [
      {
        label: "Shots",
        value: `${String(card.rounds)}, par ${String(card.par)}`,
      },
      { label: "Best rally", value: String(card.bestRally) },
    ],
    tally: [
      { label: "Strikes", value: formatPoints(points.strikes) },
      { label: "Floor bounces", value: formatPoints(points.bounces) },
      { label: "Jumps", value: formatPoints(points.jumps) },
      { label: "Stars", value: formatPoints(points.stars) },
    ],
    score: formatPoints(card.score),
  };
}

/** Returns the Ended card as it reads. */
function endedOf(card: EndedCard): ShownEnded {
  const shown = { title: endTitle(card), score: formatPoints(card.score) };
  return card.outcome === "won"
    ? {
        kind: "ended",
        won: true,
        where: null,
        againLabel: "New game",
        ...shown,
      }
    : {
        kind: "ended",
        won: false,
        where: whereLost(card.level, card.name),
        againLabel: tryAgainLabel(card.level),
        ...shown,
      };
}
