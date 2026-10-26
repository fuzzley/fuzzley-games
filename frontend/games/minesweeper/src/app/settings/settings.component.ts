import {
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from "@angular/core";
import {
  FormField,
  form,
  max,
  min,
  submit,
  validateTree,
} from "@angular/forms/signals";
import { DialogComponent } from "@fz/ui/dialog";
import { IconComponent } from "@fz/ui/icon";
import { RadioGroupDirective } from "@fz/ui/radio_group";
import { ThemePickerComponent } from "@fz/ui/theme";
import {
  CUSTOM_SIDE,
  DIFFICULTY_IDS,
  type DifficultyId,
  type FieldSize,
  LIVES,
  PRESETS,
  difficultyName,
  isSide,
  maxMines,
  sizeProblem,
} from "../../rules/difficulty";
import { GameService } from "../play/game.service";
import { SettingsService } from "./settings.service";

/** The lives a game can have, in order. */
const LIVES_CHOICES = Array.from(
  { length: LIVES.max - LIVES.min + 1 },
  (_, i) => LIVES.min + i,
);

/** Custom's field as its inputs hold it, with null where one is empty. */
type CustomDraft = Record<keyof FieldSize, number | null>;

/** The numbers of a custom field, in the order a problem with them is told. */
const SIZE_FIELDS = ["rows", "cols", "mines"] as const;

/** Reads a draft as a field, an empty input as no number at all. */
function draftSize(draft: CustomDraft): FieldSize {
  return {
    rows: draft.rows ?? NaN,
    cols: draft.cols ?? NaN,
    mines: draft.mines ?? NaN,
  };
}

/** Returns how a difficulty reads under its name. */
function describeDifficulty(difficulty: DifficultyId): string {
  if (difficulty === "custom") return "Your own size and mines";
  const { rows, cols, mines } = PRESETS[difficulty].size;
  return `${rows} × ${cols}, ${mines} mines`;
}

/**
 * Shows the settings in a drawer: the difficulty, with Custom's own field,
 * the lives, and the palette.
 *
 * Choosing a difficulty or the lives deals a new game, after asking if one
 * is under way, so the choices are radios the arrow keys move between
 * without choosing.
 */
@Component({
  selector: "app-settings",
  imports: [
    DialogComponent,
    FormField,
    IconComponent,
    RadioGroupDirective,
    ThemePickerComponent,
  ],
  templateUrl: "./settings.component.html",
  styleUrl: "./settings.component.scss",
})
export class SettingsComponent {
  private readonly game = inject(GameService);
  private readonly settings = inject(SettingsService);

  /** Whether the drawer is showing. */
  readonly open = input.required<boolean>();

  /** Emitted when the drawer asks to close. */
  readonly closed = output();

  /** Whether the player has chosen Custom and not yet dealt it. */
  private readonly editingCustom = signal(false);

  /** The custom field as typed, which may not be one the game can deal. */
  private readonly draft = linkedSignal<CustomDraft>(
    () => this.settings.settings().custom,
  );

  protected readonly difficulties = computed(() => {
    const current = this.settings.settings().difficulty;
    const editing = this.editingCustom();
    return DIFFICULTY_IDS.map((id) => ({
      id,
      name: difficultyName(id),
      description: describeDifficulty(id),
      checked:
        id === "custom"
          ? editing || current === id
          : !editing && current === id,
    }));
  });

  /** Whether the custom field's inputs show. */
  protected readonly showCustom = computed(
    () =>
      this.editingCustom() || this.settings.settings().difficulty === "custom",
  );

  /** The most mines the rows and columns typed hold, if both are allowed. */
  private readonly draftMaxMines = computed(() => {
    const { rows, cols } = draftSize(this.draft());
    return isSide(rows) && isSide(cols) ? maxMines(rows, cols) : null;
  });

  /** The most mines the Mines input takes. */
  private readonly mineMax = computed(
    () => this.draftMaxMines() ?? maxMines(CUSTOM_SIDE.max, CUSTOM_SIDE.max),
  );

  /** Custom's inputs, which deal only a field the game can. */
  protected readonly customForm = form(this.draft, (size) => {
    for (const side of [size.rows, size.cols]) {
      min(side, CUSTOM_SIDE.min);
      max(side, CUSTOM_SIDE.max);
    }
    min(size.mines, 1);
    max(size.mines, () => this.mineMax());
    validateTree(size, (context) => {
      const problem = sizeProblem(draftSize(context.value()));
      return problem
        ? {
            kind: "size",
            message: problem.message,
            fieldTree: context.fieldTreeOf(size[problem.field]),
          }
        : undefined;
    });
  });

  /**
   * The custom field as typed, an input that holds something other than a
   * number counting as empty, which the model behind it doesn't show.
   */
  private readonly typed = computed(() => {
    const draft = { ...this.draft() };
    for (const field of SIZE_FIELDS) {
      if (this.customForm[field]().getError("parse")) draft[field] = null;
    }
    return draftSize(draft);
  });

  /**
   * Why the custom field typed can't be dealt, once the player has left an
   * input or tried to start it.
   */
  protected readonly customProblem = computed(() =>
    this.customForm().touched() ? sizeProblem(this.typed()) : null,
  );

  /** What the custom inputs accept, for the hint under them. */
  protected readonly customHint = computed(() => {
    const sides = `Rows and columns from ${CUSTOM_SIDE.min} to ${CUSTOM_SIDE.max}`;
    const most = this.draftMaxMines() ?? "all but nine squares";
    return `${sides}; mines from 1 to ${most}.`;
  });

  protected readonly lives = computed(() => {
    const current = this.settings.settings().lives;
    return LIVES_CHOICES.map((n) => ({ n, checked: n === current }));
  });

  /** Deals a game of a classic difficulty, or opens Custom's field to fill in. */
  protected async chooseDifficulty(difficulty: DifficultyId): Promise<void> {
    if (difficulty === "custom") {
      this.editingCustom.set(true);
      return;
    }
    if (difficulty === this.settings.settings().difficulty) {
      this.editingCustom.set(false);
      return;
    }
    if (await this.game.changeSettings({ difficulty })) {
      this.editingCustom.set(false);
      this.customForm().reset();
    }
  }

  /** Deals the custom field typed, or says why it can't. */
  protected async startCustom(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.customForm, async () => {
      const custom = draftSize(this.draft());
      if (await this.game.changeSettings({ difficulty: "custom", custom })) {
        this.editingCustom.set(false);
      }
    });
  }

  /** Deals a game with the lives chosen. */
  protected async chooseLives(lives: number): Promise<void> {
    if (lives === this.settings.settings().lives) return;
    await this.game.changeSettings({ lives });
  }

  /** Closes the drawer, leaving an unfinished Custom field as it was. */
  protected close(): void {
    this.editingCustom.set(false);
    this.customForm().reset();
    this.closed.emit();
  }
}
