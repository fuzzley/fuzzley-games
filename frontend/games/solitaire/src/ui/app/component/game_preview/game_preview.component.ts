import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  linkedSignal,
  output,
  viewChild,
} from "@angular/core";
import {
  GameOptionSpec,
  GameOptionValues,
  sameOptionValues,
} from "../../provider/game_catalog";
import { GameBrowserItem } from "../../model/game_browser_item";
import {
  DIFFICULTY_LABELS,
  difficultyFor,
} from "../../model/game_profile.model";
import { OptionGroupComponent } from "../option_group/option_group.component";

/** A running count, so each preview's heading has an id of its own. */
let nextPreviewId = 0;

/**
 * Shows one of the browser's games at size: its board, what it is like, the
 * rules it can be dealt by, and the button that deals it.
 *
 * A rule changed here deals nothing until the game is played.
 */
@Component({
  selector: "app-game-preview",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OptionGroupComponent],
  templateUrl: "./game_preview.component.html",
  styleUrl: "./game_preview.component.scss",
})
export class GamePreviewComponent {
  /** The game to show. */
  readonly item = input.required<GameBrowserItem>();

  /** The rules it would be dealt by, before any are changed here. */
  readonly values = input.required<GameOptionValues>();

  /** The rules the player may change before dealing it. */
  readonly options = input<readonly GameOptionSpec[]>([]);

  /** A few sentences on how the game plays. */
  readonly overview = input("");

  /** Whether this game, by these rules, is the one on the table. */
  readonly playing = input(false);

  /** Whether to offer a way back to the list, which a narrow screen needs. */
  readonly showBack = input(false);

  /** Emitted with the rules to deal the game by. */
  readonly deal = output<GameOptionValues>();

  /** Emitted to ask for the game's full rules. */
  readonly help = output();

  /** Emitted to go back to the list. */
  readonly back = output();

  /** The id of the heading naming the game. */
  protected readonly titleId = `game-preview-title-${nextPreviewId++}`;

  private readonly title =
    viewChild.required<ElementRef<HTMLHeadingElement>>("title");

  /** The rules changed here, forgotten once another game is shown. */
  private readonly changed = linkedSignal<GameOptionValues, GameOptionValues>({
    source: this.values,
    computation: () => ({}),
  });

  /** The rules the game would be dealt by now. */
  protected readonly chosen = computed<GameOptionValues>(() => ({
    ...this.values(),
    ...this.changed(),
  }));

  /** What the picture of the board says, for a screen reader. */
  protected readonly imageAlt = computed(
    () => `The ${this.item().name} board, as dealt`,
  );

  /** The game's family or parent, difficulty, decks, and visibility. */
  protected readonly facts = computed<readonly string[]>(() => {
    const item = this.item();
    return [
      item.parentName ? `Variant of ${item.parentName}` : item.family.name,
      DIFFICULTY_LABELS[difficultyFor(item.difficulty, this.chosen())],
      item.decks === 2 ? "2 decks" : "1 deck",
      ...(item.allCardsVisible ? ["All cards visible"] : []),
    ];
  });

  /** What the play button says, which depends on what it would change. */
  protected readonly playLabel = computed(() => {
    if (!this.playing()) return `Play ${this.item().name}`;
    return sameOptionValues(this.chosen(), this.values())
      ? "Keep playing"
      : "Deal with these rules";
  });

  /** Moves focus to the game's name, as showing it on a narrow screen should. */
  focusTitle(): void {
    this.title().nativeElement.focus();
  }

  /** Changes a rule the game would be dealt by. */
  protected choose(optionId: string, value: number): void {
    this.changed.update((changed) => ({ ...changed, [optionId]: value }));
  }
}
