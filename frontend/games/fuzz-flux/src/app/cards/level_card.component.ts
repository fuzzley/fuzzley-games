import { Component, computed, input, output } from "@angular/core";
import { count } from "@fz/core/format";
import { KeepKeysDirective } from "@fz/phaser/canvas";
import { IconComponent } from "@fz/ui/icon";
import { goalName } from "../../rules/run/describe";
import { MOST_STARS } from "../../rules/run/stars";
import type { Pictures } from "../../scene/pictures";
import type { Card, RunState } from "../../view/run_state";
import { goalPictureOf } from "../bar/goal_pictures";

/** Names what a card's button asks for. */
export type CardChoice =
  "next-level" | "play-again" | "try-again" | "choose-level";

/** Describes a card's button: what it asks for, and its label. */
interface CardButton {
  readonly choice: CardChoice;
  readonly label: string;
}

/** Next level, as the Cleared card offers it where a level comes after. */
const NEXT_LEVEL: CardButton = { choice: "next-level", label: "Next level" };

/** Play again, as the Cleared card offers it. */
const PLAY_AGAIN: CardButton = { choice: "play-again", label: "Play again" };

/** Try again, as the Out of moves card offers it. */
const TRY_AGAIN: CardButton = { choice: "try-again", label: "Try again" };

/** Choose a level, as Out of moves offers it, and the Cleared card where no level comes after. */
const CHOOSE_LEVEL: CardButton = {
  choice: "choose-level",
  label: "Choose a level",
};

/** Describes a goal still open as the Out of moves card shows it: its name, heard, its picture, once the board has baked it, and what it still needs. */
interface ShownGoal {
  readonly name: string;
  readonly picture: string | null;
  readonly left: string;
}

/** Describes a card's two buttons: the next step, and the other way on. */
interface CardButtons {
  readonly main: CardButton;
  readonly other: CardButton;
}

/** Describes a card as it reads. */
type ShownCard = CardButtons &
  (
    | {
        readonly what: "cleared";
        readonly title: string;
        /** Whether each of the most stars a level earns is lit, in order. */
        readonly stars: readonly boolean[];
        /** The stars earned in words, as they are pictures: "2 of 3 stars". */
        readonly starsWords: string;
        readonly spare: string;
      }
    | {
        readonly what: "over";
        readonly goals: readonly ShownGoal[];
      }
  );

/** The number the next card's title takes in its id, so two cards' never clash. */
let nextCardId = 0;

/**
 * Shows the card over the board at a level's end, Cleared or Out of moves,
 * as the state has it once its beat has come (C20).
 *
 * Its element is the layer the card shows in, which lies over the board,
 * letting a press beside the card through to it, as the tap that hurries
 * the encore. Its buttons keep their keys from the board, which hears the
 * keys, and hand each choice on through `choose`.
 */
@Component({
  selector: "app-level-card",
  imports: [IconComponent, KeepKeysDirective],
  templateUrl: "./level_card.component.html",
  styleUrl: "./level_card.component.scss",
})
export class LevelCardComponent {
  /** What the shell shows of the level in play. */
  readonly state = input.required<RunState>();

  /** The pictures of the pieces, or null before the board has baked them. */
  readonly pictures = input.required<Pictures | null>();

  /** Whether a level comes after the level in play, which the Cleared card offers as Next level. */
  readonly nextLevel = input.required<boolean>();

  /** Emitted with what a card's button asks for. */
  readonly choose = output<CardChoice>();

  /** The id of the card's title, which names the card. */
  protected readonly titleId = `level-card-title-${String(nextCardId++)}`;

  /** The card as it reads, or null while the level plays. */
  protected readonly shown = computed((): ShownCard | null => {
    const state = this.state();
    const { card } = state;
    return card === null ? null : this.shownOf(card, state);
  });

  /** Returns a card as it reads, from the state it shows. */
  private shownOf(card: Card, state: RunState): ShownCard {
    switch (card.what) {
      case "cleared":
        return {
          what: "cleared",
          title: `Level ${String(state.level.number)} cleared!`,
          stars: Array.from(
            { length: MOST_STARS },
            (_, star) => star < state.starsLit,
          ),
          starsWords: `${String(card.stars)} of ${count(MOST_STARS, "star", "stars")}`,
          spare: `${count(card.spare, "move", "moves")} to spare.`,
          main: this.nextLevel() ? NEXT_LEVEL : CHOOSE_LEVEL,
          other: PLAY_AGAIN,
        };
      case "over":
        return {
          what: "over",
          goals: this.goalsOpen(state),
          main: TRY_AGAIN,
          other: CHOOSE_LEVEL,
        };
    }
  }

  /** Returns each goal still open, as Out of moves shows it. */
  private goalsOpen({ goals }: RunState): readonly ShownGoal[] {
    const pictures = this.pictures();
    return goals
      .filter(({ met }) => !met)
      .map(({ goal, left }) => ({
        name: goalName(goal),
        picture: pictures && goalPictureOf(goal, pictures),
        left: `${String(left)} left`,
      }));
  }
}
