import { Component, computed, input } from "@angular/core";
import {
  FUZZBALL,
  FUZZBALL_GRID,
  FUZZBALL_LOOK_FAR,
  type FuzzballFace,
  SPARK_LOOK,
  type SvgEyeMark,
  type SvgSparkMark,
  fuzzballDrawing,
} from "@fz/style/fuzzball";

/** Describes a mark of a face as the template draws it, in its tone's color. */
type ShownEyeMark = SvgEyeMark & {
  readonly glint: boolean;
  /** Its color as an attribute, beneath any style. */
  readonly ink: string;
  /** Its color as a style, which `--fz-fuzzball-eyes` sets for the eyes, or none for a glint. */
  readonly paint: string | null;
};

/** Describes a posed fuzzball as the template draws it. */
interface ShownFuzzball {
  readonly fur: string;
  readonly furWidth: number;
  readonly eyes: readonly ShownEyeMark[];
  readonly sparks: readonly SvgSparkMark[];
  readonly sparking: boolean;
}

/** Returns how much of the fuzzball's ink a spark's core keeps, as a percentage, mixed a share of the way toward another color. */
function kept(share: number): string {
  return `${String(Math.round(100 * (1 - share)))}%`;
}

/**
 * Draws the fuzzball, its body and fur in the text's color and its eyes
 * dark, as the wordmark and a game's own fuzzballs show it, at rest unless
 * given another `face`, as the art kit draws it, and with its fur lifted by
 * static's `lift`, from 0, flat as the mark's, to 3, on end and sparking
 * from 2.5.
 *
 * Its eyes take `--fz-fuzzball-eyes` where it is set, for a fuzzball whose
 * body is too dark for dark eyes, such as one in the text's color in a light
 * palette. Static's sparks are the text's color too, their cores mixed
 * toward the page's text in a light palette and toward white in a dark one.
 *
 * Its size is the text's, unless `width` and `height` say otherwise; lifted
 * fur and its sparks reach past it, as far as `fuzzballDrawing()`'s `reach`
 * says, so what holds it leaves them room. Drawn 16 device pixels across or
 * less, as 16 px is on a screen of about a device pixel to a CSS pixel, it
 * leaves out its eyes' glints, which would only turn them grey. It is
 * hidden from assistive technology: whatever it sits beside has to say what
 * it stands for.
 */
@Component({
  selector: "fz-fuzzball",
  templateUrl: "./fuzzball.component.html",
  styleUrl: "./fuzzball.component.scss",
  host: { "aria-hidden": "true" },
})
export class FuzzballComponent {
  /** Its face, the mark's own unless another is given. */
  readonly face = input<FuzzballFace>("rest");

  /** Static's step, from 0 to 3, its fur standing further on end the higher it is, sparking from 2.5. */
  readonly lift = input(0);

  protected readonly mark = FUZZBALL;
  protected readonly sparkLook = SPARK_LOOK;

  /** The sparks' cores' color: the fuzzball's ink mixed toward the text in a light palette, and toward white in a dark one. */
  protected readonly sparkCore = `light-dark(color-mix(in srgb, currentcolor ${kept(SPARK_LOOK.coreMix.light)}, var(--fz-text)), color-mix(in srgb, currentcolor ${kept(SPARK_LOOK.coreMix.dark)}, ${FUZZBALL.glint}))`;

  /** How wide a tick's core is drawn, in CSS pixels, as its stroke doesn't scale: `SPARK_LOOK.tickCore` of the grid, and never under `tickCoreLeast`. */
  protected readonly tickCoreWidth = `max(${String(SPARK_LOOK.tickCoreLeast)}px, ${String((SPARK_LOOK.tickCore / FUZZBALL_GRID) * 100)}cqi)`;

  protected readonly shown = computed((): ShownFuzzball => {
    const { fur, furWidth, eyes, sparks } = fuzzballDrawing({
      face: this.face(),
      // The kit's range, so a face that looks somewhere of its own, as a plead looks up, looks as far.
      range: FUZZBALL_LOOK_FAR,
      lift: this.lift(),
    });
    return {
      fur,
      furWidth,
      eyes: eyes.map((mark) =>
        mark.tone === "glint"
          ? { ...mark, glint: true, ink: FUZZBALL.glint, paint: null }
          : {
              ...mark,
              glint: false,
              ink: FUZZBALL.ink,
              paint: `var(--fz-fuzzball-eyes, ${FUZZBALL.ink})`,
            },
      ),
      sparks,
      sparking: sparks.length > 0,
    };
  });
}
