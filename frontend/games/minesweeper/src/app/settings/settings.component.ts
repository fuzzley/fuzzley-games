import {
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from "@angular/core";
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
  type SizeProblem,
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
  protected readonly draft = linkedSignal(() => {
    const { rows, cols, mines } = this.settings.settings().custom;
    return { rows: String(rows), cols: String(cols), mines: String(mines) };
  });

  /** Why the custom field typed can't be dealt, once the player tries. */
  protected readonly customProblem = signal<SizeProblem | null>(null);

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
    const rows = Number(this.draft().rows);
    const cols = Number(this.draft().cols);
    return isSide(rows) && isSide(cols) ? maxMines(rows, cols) : null;
  });

  /** The most mines the Mines input takes. */
  protected readonly mineMax = computed(
    () => this.draftMaxMines() ?? maxMines(CUSTOM_SIDE.max, CUSTOM_SIDE.max),
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

  protected readonly customSide = CUSTOM_SIDE;

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
      this.customProblem.set(null);
    }
  }

  /** Keeps what the player types into one of Custom's fields. */
  protected type(field: keyof FieldSize, event: Event): void {
    if (!(event.target instanceof HTMLInputElement)) return;
    const value = event.target.value;
    this.draft.update((draft) => ({ ...draft, [field]: value }));
  }

  /** Deals the custom field typed, or says why it can't. */
  protected async startCustom(event: Event): Promise<void> {
    event.preventDefault();
    const draft = this.draft();
    const custom = {
      rows: Number(draft.rows),
      cols: Number(draft.cols),
      mines: Number(draft.mines),
    };
    const problem = sizeProblem(custom);
    this.customProblem.set(problem);
    if (problem) return;
    if (await this.game.changeSettings({ difficulty: "custom", custom })) {
      this.editingCustom.set(false);
    }
  }

  /** Deals a game with the lives chosen. */
  protected async chooseLives(lives: number): Promise<void> {
    if (lives === this.settings.settings().lives) return;
    await this.game.changeSettings({ lives });
  }

  /** Closes the drawer, leaving an unfinished Custom field as it was. */
  protected close(): void {
    this.editingCustom.set(false);
    this.customProblem.set(null);
    this.closed.emit();
  }
}
