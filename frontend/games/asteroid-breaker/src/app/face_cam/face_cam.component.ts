import { Component, computed, inject, input } from "@angular/core";
import { cssHex } from "@fz/phaser/color";
import {
  FUZZBALL,
  FUZZBALL_GRID,
  type FuzzballFace,
  MOST_LIFT,
  fuzzballDrawing,
} from "@fz/style/fuzzball";
import { ThemeService } from "@fz/ui/theme";
import type { Pilot } from "../../rules/ship/pilots";
import { podTones } from "../../view/art/pod_art";
import { fieldPalette } from "../board/field_palette";
import { PilotComponent } from "../pilot/pilot.component";

/**
 * How far the pilot's fur reaches from its body's middle at static's last
 * step, its sparks and their halos with it, on the fuzzball's grid.
 */
const FULL_REACH = fuzzballDrawing({ lift: MOST_LIFT }).reach;

/**
 * Draws the pilot at the controls behind its canopy's glass, larger than the
 * field can, with the face and the fur the field shows, as the art kit's
 * face cam does: the glass, the rim and its lit third in the pod's colors
 * in the palette on the page (`podTones()`), the glass near the field's
 * color, and a glint over it; the glass empty once no one is at the
 * controls.
 *
 * The pilot fills the glass as far as its fur reaches on end and sparking,
 * so at rest it leaves a third of the glass clear, for static to fill. Its
 * size is twice the text's, unless `width` and `height` say otherwise, and
 * it moves nothing of its own, so a face changes as the field's does, at
 * once. It is hidden from assistive technology, as the pilot is: whatever
 * it sits beside has to say what it stands for.
 */
@Component({
  selector: "app-face-cam",
  imports: [PilotComponent],
  host: {
    "aria-hidden": "true",
    "[style.--pilot-share]": "pilotShare",
    "[style.--pilot-drop]": "pilotDrop",
    "[style.--glint]": "glint",
    "[style.--glass]": "tones().glass",
    "[style.--rim]": "tones().rim",
    "[style.--rim-lit]": "tones().rimLit",
  },
  template: `
    <span class="glass">
      <!-- Not \`as\`: the first pilot's color is 0, which an @if takes for none. -->
      @let atControls = pilot();
      @if (atControls !== null) {
        <app-pilot
          class="pilot"
          [pilot]="atControls"
          [face]="face()"
          [lift]="lift()"
        />
      }
    </span>
    <span class="glint"></span>
  `,
  styleUrl: "./face_cam.component.scss",
})
export class FaceCamComponent {
  private readonly palette = fieldPalette(inject(ThemeService));

  /** The pilot at the controls, by its color, or null once no one is. */
  readonly pilot = input.required<Pilot | null>();

  /** Its face, as the field shows it. */
  readonly face = input<FuzzballFace>("rest");

  /** Static's step, as the field lifts its fur: from 0, flat, to 3, on end and sparking. */
  readonly lift = input(0);

  /** How wide the pilot's grid is drawn, as a share of the glass across. */
  protected readonly pilotShare = String(FUZZBALL_GRID / (2 * FULL_REACH));

  /** How far the pilot's body sits below its grid's middle, as a share of the grid, which the glass lifts it by. */
  protected readonly pilotDrop = String(
    (FUZZBALL.body.cy - FUZZBALL_GRID / 2) / FUZZBALL_GRID,
  );

  /** The glint's color, the fuzzball's own glint's, in every palette. */
  protected readonly glint = FUZZBALL.glint;

  /** The canopy's colors, as the field draws the pod's, in CSS hex. */
  protected readonly tones = computed(() => {
    const { glass, rim, rimLit } = podTones(this.palette());
    return { glass: cssHex(glass), rim: cssHex(rim), rimLit: cssHex(rimLit) };
  });
}
