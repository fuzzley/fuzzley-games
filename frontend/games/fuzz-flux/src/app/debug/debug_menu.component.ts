import { Component, computed, inject, output } from "@angular/core";
import { count } from "@fz/core/format";
import { BugReportLoaderComponent } from "@fz/game-ui/bug_report";
import {
  DebugTuningComponent,
  type ShownSlider,
  type SliderMove,
} from "@fz/game-ui/debug_menu";
import type { FeelTuning } from "../../view/timeline/feel";
import {
  TUNING_SLIDERS,
  formatTuning,
  tuningLines,
} from "../../view/debug/tuning_menu";
import { GameService } from "../play/game.service";
import {
  CertificateLineService,
  type CertificatesStanding,
} from "./certificate_line";
import { DebugService } from "./debug.service";

/** What the menu says once the level in play is played off the game that ships. */
const NO_RECORDS = "This level keeps no records";

/** What the menu says where it offers no certificate to play, by where the certificates of the level in play's set stand. */
const NO_CERTIFICATE: Readonly<Record<CertificatesStanding, string>> = {
  loading: "Loading the certificates…",
  failed: "The certificates couldn't be loaded. See the console.",
  loaded: "No certificate for this deal.",
};

/**
 * Shows Fuzz Flux's debug menu, `<fz-debug-tuning>`, below the settings: a
 * slider for each number of the feel, with the lines of `FEEL` they would
 * replace, which Copy the numbers copies; whether the level in play keeps
 * its records; the level's deal, chosen by its number and played off the
 * record; Play the certificate, which plays the deal's certified line off
 * the record; and last, the field that loads a bug report's state, off the
 * record too.
 *
 * What it sets, it hands `DebugService` and the game. It provides
 * `CertificateLineService`, and the settings drawer loads it only where it
 * is offered, so a page that doesn't offer it never loads the sliders or
 * the certificates.
 */
@Component({
  selector: "app-debug-menu",
  imports: [BugReportLoaderComponent, DebugTuningComponent],
  providers: [CertificateLineService],
  templateUrl: "./debug_menu.component.html",
  styleUrl: "./debug_menu.component.scss",
})
export class DebugMenuComponent {
  private readonly debug = inject(DebugService);
  private readonly game = inject(GameService);
  private readonly certificates = inject(CertificateLineService);

  /** Emitted once the menu has put a deal, a certificate or a reported state in play, so the drawer can put itself away. */
  readonly played = output();

  /** The sliders, each at the number in use, read in its unit. */
  protected readonly sliders = computed(
    (): readonly ShownSlider<keyof FeelTuning>[] => {
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

  /** What the menu says of the level's records, or nothing while it keeps them. */
  protected readonly status = computed(() =>
    this.debug.offRecord() ? NO_RECORDS : "",
  );

  /** The level in play's number, which the deal's line names. */
  protected readonly level = computed(() => this.game.inPlay().level.number);

  /** The level in play's deals the list offers, each by its number and its seed, with whether it is the one in play. */
  protected readonly deals = computed(() => {
    const { level, deal } = this.game.inPlay();
    return level.data.deals.map((seed, index) => ({
      value: String(index + 1),
      name: `Deal ${String(index + 1)}, seed ${String(seed)}`,
      chosen: seed === deal,
    }));
  });

  /** The certificate of the level in play on its deal, or null where there is none. */
  protected readonly certificate = this.certificates.offer;

  /** What Play the certificate plays, or why there is nothing to. */
  protected readonly certificateWords = computed(() => {
    const offer = this.certificate();
    if (offer === null) return NO_CERTIFICATE[this.certificates.standing()];
    const { level, deal, moves } = offer;
    return `Plays level ${String(level)} again on deal ${String(deal)} and clears it in ${count(moves.length, "move", "moves")}. It keeps no records.`;
  });

  /** Tunes a number, as its slider says. */
  protected tune({ id, value }: SliderMove<keyof FeelTuning>): void {
    this.debug.tuning.tune(id, value);
  }

  /** Puts every number back to the design's own. */
  protected resetNumbers(): void {
    this.debug.tuning.reset();
  }

  /** Plays the level in play again on the deal its list names, off the record, putting the drawer away once it does. */
  protected async playDeal(value: string): Promise<void> {
    if (await this.game.playDeal(Number(value))) this.played.emit();
  }

  /** Plays the certificate offered, off the record, putting the drawer away once it begins. */
  protected async playCertificate(): Promise<void> {
    if (await this.certificates.play()) this.played.emit();
  }
}
