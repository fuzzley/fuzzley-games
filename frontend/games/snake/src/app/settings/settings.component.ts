import { Component, computed, inject, input, output } from "@angular/core";
import { DialogComponent } from "@fz/ui/dialog";
import { IconComponent } from "@fz/ui/icon";
import { RadioGroupDirective } from "@fz/ui/radio_group";
import { ThemePickerComponent } from "@fz/ui/theme";
import { SPEEDS, SPEED_INFO, type Speed } from "../../rules/speed";
import { GameService } from "../play/game.service";
import {
  type Arrows,
  type Movement,
  SettingsService,
} from "./settings.service";

/** Describes one choice of a setting. */
interface Choice<T> {
  readonly id: T;
  readonly name: string;
  readonly says: string;
}

const MOVEMENTS: readonly Choice<Movement>[] = [
  {
    id: "glide",
    name: "Glide",
    says: "Slides smoothly from square to square.",
  },
  { id: "step", name: "Step", says: "Jumps a whole square at a time." },
];

const ARROWS: readonly Choice<Arrows>[] = [
  {
    id: "touch",
    name: "On a touch screen",
    says: "Beside the board on a phone or a tablet.",
  },
  { id: "always", name: "Always", says: "For a mouse too." },
  { id: "never", name: "Never", says: "Swipes and keys only." },
];

/**
 * Shows the settings in a drawer: the speed, how the snake moves, the
 * on-screen arrows, the sound, and the palette.
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

  protected readonly settings = this.store.settings;

  /** Whether the drawer is showing. */
  readonly open = input.required<boolean>();

  /** Emitted when the drawer asks to close. */
  readonly closed = output();

  protected readonly speeds = computed(() => {
    const current = this.settings().speed;
    return SPEEDS.map((id) => ({
      id,
      name: SPEED_INFO[id].name,
      says: SPEED_INFO[id].says,
      checked: id === current,
    }));
  });

  protected readonly movements = computed(() => {
    const current = this.settings().movement;
    return MOVEMENTS.map((choice) => ({
      ...choice,
      checked: choice.id === current,
    }));
  });

  protected readonly arrows = computed(() => {
    const current = this.settings().arrows;
    return ARROWS.map((choice) => ({
      ...choice,
      checked: choice.id === current,
    }));
  });

  /** Starts a run at the speed chosen, unless it is the speed in use. */
  protected async chooseSpeed(speed: Speed): Promise<void> {
    if (speed === this.settings().speed) return;
    await this.game.changeSpeed(speed);
  }

  /** Makes the snake glide or step. */
  protected chooseMovement(movement: Movement): void {
    this.store.update({ movement });
  }

  /** Says when the on-screen arrows show. */
  protected chooseArrows(arrows: Arrows): void {
    this.store.update({ arrows });
  }

  /** Turns the sound on or off, as its checkbox says. */
  protected setSound(sound: boolean): void {
    this.store.update({ sound });
  }
}
