import { Component, computed, inject, output } from "@angular/core";
import type { CertificateOffer } from "@fz/brick-wall/app/certificates";
import { DEPTHS } from "@fz/brick-wall/rules/field";
import { count } from "@fz/core/format";
import { BugReportLoaderComponent } from "@fz/game-ui/bug_report";
import {
  DebugTuningComponent,
  type ShownSlider,
  type SliderMove,
} from "@fz/game-ui/debug_menu";
import {
  TUNING_SLIDERS,
  type TunedNumber,
  formatTuning,
  tuningLines,
} from "../../view/debug/debug_tuning";
import { CertificatesService, RallyLinesService } from "./certificates.service";
import { DebugService } from "./debug.service";

/** What the menu says while a number a round's flight reads has moved. */
const STALE =
  "The certificates and rally lines are stale while the rules are retuned.";

/** What the menu says once the run under way has been played off the game that ships. */
const NO_RECORDS = "This run keeps no records.";

/** The depth list's value for the room's own depth. */
const ROOM = "room";

/** Returns what a Play button would play, as the menu says under it, or that there is nothing to. */
function lineWords(
  offer: CertificateOffer | null,
  line: string,
  last: string,
): string {
  if (offer === null) {
    return `No ${line} holds the level in play on the field's depth.`;
  }
  const { level, depth, rounds } = offer;
  return `Plays ${count(rounds, "round", "rounds")} from the start of level ${String(level)}, ${String(depth)} rows deep. The last one ${last}.`;
}

/**
 * Shows Rickashay's debug menu, `<fz-debug-tuning>`, below the settings: a
 * slider for each of the flight's speeds, its dash home and fast-forward,
 * the guide's length past its last turn, the boredom, the floor bounce
 * ladder's first rally and step, and the hatches' holds, with the lines
 * they would replace; whether the certificates are stale and the records
 * kept; then the game's own controls, the field's depth over the room's,
 * every level open, Play the certificate and Play the rally line; and last,
 * the field that loads a bug report's state.
 *
 * What it sets, it hands `DebugService`. It provides `CertificatesService`
 * and `RallyLinesService`, which offer it the level in play's line of each
 * on the field's depth, or none, and play it; the settings drawer loads the
 * menu only where it is offered, so none of them reaches a page that
 * doesn't offer it.
 */
@Component({
  selector: "app-debug-menu",
  imports: [BugReportLoaderComponent, DebugTuningComponent],
  providers: [CertificatesService, RallyLinesService],
  templateUrl: "./debug_menu.component.html",
  styleUrl: "./debug_menu.component.scss",
})
export class DebugMenuComponent {
  private readonly debug = inject(DebugService);
  private readonly certificates = inject(CertificatesService);
  private readonly rallyLines = inject(RallyLinesService);

  /** The certificate of the level in play on the field's depth, or null where there is none. */
  protected readonly certificate = this.certificates.offer;

  /** The rally line of the level in play on the field's depth, or null where there is none. */
  protected readonly rallyLine = this.rallyLines.offer;

  /** Emitted at Play the certificate or Play the rally line, so the drawer can put itself away as the line plays. */
  readonly playLine = output();

  /** Emitted once a reported state the menu loads is in play, so the drawer can put itself away. */
  readonly loaded = output();

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
  protected readonly certificateWords = computed(() =>
    lineWords(this.certificate(), "certificate", "clears the level"),
  );

  /** What Play the rally line would play, or that there is nothing to. */
  protected readonly rallyLineWords = computed(() =>
    lineWords(this.rallyLine(), "rally line", "reaches the rally mark"),
  );

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

  /** Plays the certificate offered, telling the drawer to put itself away. */
  protected playCertificate(): void {
    this.playLine.emit();
    void this.certificates.play();
  }

  /** Plays the rally line offered, telling the drawer to put itself away. */
  protected playRallyLine(): void {
    this.playLine.emit();
    void this.rallyLines.play();
  }
}
