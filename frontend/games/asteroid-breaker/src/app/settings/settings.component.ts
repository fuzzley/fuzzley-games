import { DOCUMENT } from "@angular/common";
import {
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from "@angular/core";
import { DialogComponent } from "@fz/ui/dialog";
import { IconComponent } from "@fz/ui/icon";
import { RadioGroupDirective } from "@fz/ui/radio_group";
import { ThemePickerComponent } from "@fz/ui/theme";
import { SPEEDS, SPEED_INFO, type Speed } from "../../rules/speed";
import {
  TUNING_SLIDERS,
  type TuningNumber,
  formatTuning,
  tuningLines,
} from "../../view/debug_tuning";
import { GameService } from "../play/game.service";
import { DEBUG_MENU } from "../tokens";
import {
  DECK_SHOWINGS,
  type DeckShowing,
  SettingsService,
} from "./settings.service";

/** Describes one choice of a setting, as the drawer offers it. */
interface ChoiceInfo {
  readonly name: string;
  readonly says: string;
}

/** What the drawer says of each time the deck may show. */
const DECK_INFO: Readonly<Record<DeckShowing, ChoiceInfo>> = {
  auto: {
    name: "On a touch screen",
    says: "The stick, Fire and Dash show beside the field where the screen takes a finger.",
  },
  always: {
    name: "Always",
    says: "They show on every screen, and a mouse can press them.",
  },
  never: {
    name: "Never",
    says: "The keys and the mouse fly the ship.",
  },
};

/** What the debug menu says once Copy the numbers has tried the clipboard. */
const COPY_WORDS = {
  copied: "Copied the numbers.",
  failed: "The browser kept the clipboard shut: the lines are below.",
} as const;

/**
 * Shows the settings in a drawer: the speed, when the deck shows, which side
 * holds its stick, whether the ship fires by itself, haptics, the sound and
 * the palette, and where `DEBUG_MENU` offers it the debug menu, the numbers that
 * set the feel, tuned on the field in play.
 *
 * Choosing a speed starts a new run, after asking if one is under way, so
 * the speeds are radios the arrow keys move between without choosing. The
 * rest cost the run nothing, and apply at once.
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
  private readonly store = inject(SettingsService);
  private readonly document = inject(DOCUMENT);

  protected readonly settings = this.store.settings;

  /**
   * Whether to offer the debug menu, as a development build does, and a
   * production one at `?debug`.
   */
  protected readonly debugMenu = inject(DEBUG_MENU);

  /** Whether the drawer is showing. */
  readonly open = input.required<boolean>();

  /** Emitted when the drawer asks to close. */
  readonly closed = output();

  protected readonly speeds = computed(() => {
    const current = this.game.speed();
    return SPEEDS.map((id) => ({
      id,
      name: SPEED_INFO[id].name,
      says: SPEED_INFO[id].says,
      checked: id === current,
    }));
  });

  protected readonly deckChoices = computed(() => {
    const current = this.settings().deck;
    return DECK_SHOWINGS.map((id) => ({
      id,
      ...DECK_INFO[id],
      checked: id === current,
    }));
  });

  /** The debug menu's sliders, each with its input's id, at the number in use, and how it reads. */
  protected readonly sliders = computed(() => {
    const tuning = this.game.tuning();
    return TUNING_SLIDERS.map((slider) => ({
      ...slider,
      inputId: `tune-${slider.id}`,
      value: tuning[slider.id],
      valueText: formatTuning(slider.id, tuning[slider.id]),
    }));
  });

  /** Whether shots leave with the ship's speed, as the debug menu tunes it. */
  protected readonly carryShip = computed(() => this.game.tuning().carryShip);

  /** The numbers in use as the lines of `tuning.ts` they would replace. */
  protected readonly lines = computed(() => tuningLines(this.game.tuning()));

  private readonly copiedState = signal<keyof typeof COPY_WORDS | null>(null);

  /** Whether the lines of `tuning.ts` show beneath, as a failed Copy opens them and the player opens or shuts them. */
  protected readonly linesShown = signal(false);

  /** What the debug menu says of the last Copy, or nothing before one. */
  protected readonly copyWords = computed(() => {
    const copied = this.copiedState();
    return copied && COPY_WORDS[copied];
  });

  /** Starts a run at the speed chosen, unless it is the speed in use. */
  protected async chooseSpeed(speed: Speed): Promise<void> {
    if (speed === this.game.speed()) return;
    await this.game.changeSpeed(speed);
  }

  /** Says when the deck shows. */
  protected chooseDeck(deck: DeckShowing): void {
    this.store.update({ deck });
  }

  /** Puts the stick on the right or the left, as its checkbox says. */
  protected setStickOnRight(stickOnRight: boolean): void {
    this.store.update({ stickOnRight });
  }

  /** Has the ship fire by itself, or as the player fires, as its checkbox says. */
  protected setFireByItself(fireByItself: boolean): void {
    this.store.update({ fireByItself });
  }

  /** Turns the haptics on or off, as their checkbox says. */
  protected setHaptics(haptics: boolean): void {
    this.store.update({ haptics });
  }

  /** Turns the sound on or off, as its checkbox says. */
  protected setSound(sound: boolean): void {
    this.store.update({ sound });
  }

  /** Tunes a number, as its slider says, which the clipboard no longer holds. */
  protected tune(id: TuningNumber, value: number): void {
    this.game.tune({ [id]: value });
    this.forgetCopied();
  }

  /** Has shots leave with the ship's speed or not, as its checkbox says, which the clipboard no longer holds. */
  protected setCarryShip(carryShip: boolean): void {
    this.game.tune({ carryShip });
    this.forgetCopied();
  }

  /** Puts every number back to `tuning.ts`'s. */
  protected resetNumbers(): void {
    this.game.resetTuning();
    this.forgetCopied();
  }

  /** Puts the numbers on the clipboard as `tuning.ts`'s lines, and says whether they got there. */
  protected async copyNumbers(): Promise<void> {
    // A page reached over plain HTTP, as a phone reaches the dev server, has none.
    const clipboard = this.document.defaultView?.navigator.clipboard;
    if (!clipboard) {
      this.copyFailed();
      return;
    }
    try {
      await clipboard.writeText(this.lines());
      this.copiedState.set("copied");
    } catch {
      this.copyFailed();
    }
  }

  /** Says the browser kept the clipboard shut, and shows the lines to copy by hand. */
  private copyFailed(): void {
    this.copiedState.set("failed");
    this.linesShown.set(true);
  }

  /** Forgets a Copy the numbers have moved on from; where one failed, the lines shown are the numbers in use, so they stay. */
  private forgetCopied(): void {
    if (this.copiedState() === "copied") this.copiedState.set(null);
  }
}
