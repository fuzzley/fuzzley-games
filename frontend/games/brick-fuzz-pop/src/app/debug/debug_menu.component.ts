import { Component, computed, inject, input, output } from "@angular/core";
import { count } from "@fz/core/format";
import {
  DebugTuningComponent,
  type ShownSlider,
  type SliderMove,
} from "@fz/game-ui/debug_menu";
import { LEAST_DEPTH, MOST_DEPTH } from "../../rules/tuning";
import {
  TUNING_SLIDERS,
  type TunedNumber,
  formatTuning,
  tuningLines,
} from "../../view/debug/debug_tuning";
import { DebugService } from "./debug.service";

/**
 * Describes the certificate the debug menu offers to play: the level in
 * play's, on the field's depth, and how many rounds its line takes.
 */
export interface CertificateOffer {
  /** The level's number, counted from 1. */
  readonly level: number;
  /** The field's depth the line was found on, in rows. */
  readonly depth: number;
  /** How many rounds the line plays. */
  readonly rounds: number;
}

/** What the menu says while a number the rules read has moved. */
const STALE = "The certificates are stale while the rules are retuned.";

/** What the menu says once the run under way has been played off the game that ships. */
const NO_RECORDS = "This run keeps no records.";

/** The depth list's value for the room's own depth. */
const ROOM = "room";

/** Every depth a field takes, as the depth list offers it. */
const DEPTHS: readonly number[] = Array.from(
  { length: MOST_DEPTH - LEAST_DEPTH + 1 },
  (_, step) => LEAST_DEPTH + step,
);

/**
 * Shows Brick Fuzz Pop's debug menu, `<fz-debug-tuning>`, below the
 * settings: a slider for each of the flight's speeds, the guide's length
 * and the boredom, with the lines they would replace; whether the
 * certificates are stale and the records kept; then the game's own
 * controls, the field's depth over the room's, every level open, and Play
 * the certificate.
 *
 * What it sets, it hands `DebugService`. Play the certificate it hands on,
 * as only the game can play a line; the game offers it the certificate,
 * or null where none holds the level in play on the field's depth.
 */
@Component({
  selector: "app-debug-menu",
  imports: [DebugTuningComponent],
  templateUrl: "./debug_menu.component.html",
  styleUrl: "./debug_menu.component.scss",
})
export class DebugMenuComponent {
  private readonly debug = inject(DebugService);

  /** The certificate of the level in play on the field's depth, or null where there is none. */
  readonly certificate = input<CertificateOffer | null>(null);

  /** Emitted at Play the certificate. */
  readonly playCertificate = output();

  /** The sliders, each at the number in use, read in its unit. */
  protected readonly sliders = computed(
    (): readonly ShownSlider<TunedNumber>[] => {
      const tuned = this.debug.tuning.tuning();
      return TUNING_SLIDERS.map((slider) => ({
        ...slider,
        value: tuned[slider.id],
        valueText: formatTuning(slider.id, tuned[slider.id]),
      }));
    },
  );

  /** The numbers in use as the lines they would replace. */
  protected readonly lines = computed(() =>
    tuningLines(this.debug.tuning.tuning()),
  );

  /**
   * What the menu says of the certificates and the run's records, or
   * nothing while the game is the one that ships and the run has been
   * played on it alone.
   */
  protected readonly status = computed(() =>
    [
      ...(this.debug.certificatesStale() ? [STALE] : []),
      ...(this.debug.runOffRecord() ? [NO_RECORDS] : []),
    ].join(" "),
  );

  /** The depths the list offers, the room's first, each with whether it is the one set. */
  protected readonly depths = computed(() => {
    const depth = this.debug.depth();
    return [
      { value: ROOM, name: "The room's", chosen: depth === null },
      ...DEPTHS.map((each) => ({
        value: String(each),
        name: `${String(each)} rows`,
        chosen: each === depth,
      })),
    ];
  });

  /** Whether every level is open, which its checkbox shows. */
  protected readonly everyLevelOpen = this.debug.everyLevelOpen;

  /** What Play the certificate would play, or that there is nothing to. */
  protected readonly certificateWords = computed(() => {
    const offer = this.certificate();
    if (offer === null) {
      return "No certificate holds the level in play on the field's depth.";
    }
    const { level, depth, rounds } = offer;
    return `Plays level ${String(level)} from its start on a field ${String(depth)} deep, its certificate's ${count(rounds, "round", "rounds")} one at a time.`;
  });

  /** Tunes a number, as its slider says. */
  protected tune({ id, value }: SliderMove<TunedNumber>): void {
    this.debug.tuning.tune(id, value);
  }

  /** Puts every number back to the game's own. */
  protected resetNumbers(): void {
    this.debug.tuning.reset();
  }

  /** Sets the field's depth, or gives it back to the room's, as the depth list says. */
  protected chooseDepth(value: string): void {
    this.debug.setDepth(value === ROOM ? null : Number(value));
  }

  /** Opens every level, or only those the player has, as its checkbox says. */
  protected openEveryLevel(open: boolean): void {
    this.debug.openEveryLevel(open);
  }
}
