import {
  Component,
  computed,
  contentChild,
  inject,
  input,
  output,
} from "@angular/core";
import { count, formatPoints } from "@fz/core/format";
import { GameViewportService } from "@fz/game-ui/viewport";
import { CanvasCardsComponent, KeepKeysDirective } from "@fz/phaser/canvas";
import { IconComponent } from "@fz/ui/icon";
import { type BrickKindId, brickKind } from "../../rules/catalog/bricks";
import { describeBoon } from "../../rules/run/describe";
import type { LevelTally } from "../../rules/run/scoring";
import { MOST_STARS, starsFor } from "../../rules/run/stars";
import type { Boon } from "../../rules/shot";
import { CrewComponent } from "../bar/crew.component";
import type { HelpPictures } from "../help/help.component";

/** What the Ready card shows, over a level waiting for its first move. */
export interface ReadyCard {
  readonly kind: "ready";
  /** The level's number, from 1. */
  readonly level: number;
  /** The level's name. */
  readonly name: string;
  /** The boon the level's jumps earn. */
  readonly boon: Boon;
  /** The kind of brick the level brings in, the one whose `firstLevel` it is, or null. */
  readonly newKind: BrickKindId | null;
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
  /** The rounds it took. */
  readonly rounds: number;
  /** Its par, in rounds, which with the rounds says the stars it earned. */
  readonly par: number;
  /** How its points added up. */
  readonly tally: LevelTally;
  /** The run's score. */
  readonly score: number;
  /** Each friend its cages freed, by its ink, 0 to 7: the crew's `friends`. */
  readonly friends: readonly number[];
}

/** A card over the field, with what it shows. */
export type BoardCard = ReadyCard | PausedCard | ClearedCard;

/** A line of how a cleared level's points added up. */
interface TallyLine {
  readonly label: string;
  readonly points: string;
}

/** The Ready card as it reads. */
interface ShownReady {
  readonly kind: "ready";
  readonly title: string;
  readonly boon: string;
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
  /** A star for each earned. */
  readonly stars: readonly number[];
  /** The stars in words, since they are pictures: "2 of 3 stars". */
  readonly starsWords: string;
  /** The rounds against par: "7 rounds, par 9". */
  readonly rounds: string;
  readonly tally: readonly TallyLine[];
  readonly score: string;
  readonly friends: readonly number[];
  /** The friends freed in words, since the crew is pictures, or null for none. */
  readonly friendsWords: string | null;
}

/** A card as it reads. */
type ShownCard = ShownReady | ShownPaused | ShownCleared;

/**
 * Shows the card over the field, if any, as it is handed: the level waiting
 * for its first move, its number, its name, what its jumps earn and the
 * kind of brick it brings in; that the level is paused; or how a level
 * cleared added up, its stars, its rounds against par, its points and its
 * crew lined up.
 *
 * Its element is the layer the cards show in, which the board lays over the
 * field, a card keeping the board's margin around the field (`--margin`). It
 * shows what the board hands it first, the canvas's own cards
 * (`<fz-canvas-cards>`), that the board is still loading or couldn't be
 * drawn, and none of its own while they show one. Its buttons keep their
 * keys from the board, Phaser's keyboard target. The app hands the board
 * back the focus as it goes on (`resumeRun`, `nextLevel`), which the
 * button took and would take away with its card.
 */
@Component({
  selector: "app-board-card",
  imports: [CrewComponent, IconComponent, KeepKeysDirective],
  templateUrl: "./board_card.component.html",
  styleUrl: "./board_card.component.scss",
})
export class BoardCardComponent {
  private readonly viewport = inject(GameViewportService);

  /** The canvas's own cards, which the board hands it, if it does. */
  private readonly canvasCards = contentChild(CanvasCardsComponent);

  /** The card to show, or null for none. */
  readonly card = input.required<BoardCard | null>();

  /** The pictures of every kind of brick, How to play's, or null before the scene has drawn. */
  readonly pictures = input<HelpPictures | null>(null);

  /** Emitted as the player goes on with the paused level. */
  readonly resumeRun = output();

  /** Emitted as the player goes on to the next level. */
  readonly nextLevel = output();

  /** Whether the Ready card says the game is larger upright: on a phone on its side. */
  protected readonly sideways = computed(
    () => this.viewport.formFactor() === "phone-landscape",
  );

  /** Its own card as it reads, and none while the canvas's shows. */
  protected readonly shown = computed<ShownCard | null>(() => {
    const card = this.card();
    if (card === null || this.canvasCards()?.card()) return null;
    switch (card.kind) {
      case "ready":
        return this.readyOf(card);
      case "paused":
        return { kind: "paused", score: formatPoints(card.score) };
      case "cleared":
        return clearedOf(card);
    }
  });

  /** Returns the Ready card as it reads, with the new kind's picture once there is one. */
  private readyOf({ level, name, boon, newKind }: ReadyCard): ShownReady {
    return {
      kind: "ready",
      title: `Level ${String(level)}: ${name}`,
      boon: describeBoon(boon),
      newKind:
        newKind === null
          ? null
          : {
              name: brickKind(newKind).name,
              about: brickKind(newKind).about,
              picture: this.pictures()?.bricks[newKind] ?? null,
            },
    };
  }
}

/** Returns the Cleared card as it reads. */
function clearedOf(card: ClearedCard): ShownCleared {
  const { tally, friends } = card;
  const stars = starsFor(card.rounds, card.par);
  return {
    kind: "cleared",
    title: `Level ${String(card.level)} cleared`,
    stars: Array.from({ length: stars }, (_, star) => star),
    starsWords: `${String(stars)} of ${count(MOST_STARS, "star", "stars")}`,
    rounds: `${count(card.rounds, "round", "rounds")}, par ${String(card.par)}`,
    tally: [
      { label: "Bricks", points: formatPoints(tally.bricks) },
      { label: "Jumps", points: formatPoints(tally.jumps) },
      { label: "Stars", points: formatPoints(tally.stars) },
    ],
    score: formatPoints(card.score),
    friends,
    friendsWords:
      friends.length === 0
        ? null
        : `${count(friends.length, "friend", "friends")} freed`,
  };
}
