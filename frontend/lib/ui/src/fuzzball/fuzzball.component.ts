import { Component } from "@angular/core";
import { FUZZBALL } from "@fz/style/fuzzball";

/**
 * Draws the fuzzball, its body and fur in the text's color and its eyes
 * dark, as the wordmark and a game's own fuzzballs show it.
 *
 * Its eyes take `--fz-fuzzball-eyes` where it is set, for a fuzzball whose
 * body is too dark for dark eyes, such as one in the text's color in a light
 * palette.
 *
 * Its size is the text's, unless `width` and `height` say otherwise; drawn
 * 16 device pixels across or less, as 16 px is on a screen of about a device
 * pixel to a CSS pixel, it leaves out its eyes' glints, which would only
 * turn them grey. It is hidden from assistive technology: whatever it sits
 * beside has to say what it stands for.
 */
@Component({
  selector: "fz-fuzzball",
  templateUrl: "./fuzzball.component.html",
  styleUrl: "./fuzzball.component.scss",
  host: { "aria-hidden": "true" },
})
export class FuzzballComponent {
  protected readonly mark = FUZZBALL;

  /** The eyes' color: `--fz-fuzzball-eyes`, or dark without it. */
  protected readonly eyes = `var(--fz-fuzzball-eyes, ${FUZZBALL.ink})`;
}
