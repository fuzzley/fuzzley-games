import {
  FUZZBALL_FACES,
  FUZZBALL_LOOK_FAR,
  type FuzzballFace,
  MOST_LIFT,
  fuzzballDrawing,
} from "@fz/style/fuzzball";
import { pilotInk } from "../view/colors/palette";

/** How a pilot is drawn: its face, and how far static lifts its fur. */
export interface Pose {
  readonly face: FuzzballFace;
  readonly lift: number;
}

/** The attributes that place and size a mark of a face, as the page writes them. */
const PLACING = ["cx", "cy", "r", "rx", "ry", "points"] as const;

/** Where a mark of a face lies, by the attributes that place it, those it has. */
type Placing = Partial<Record<(typeof PLACING)[number], number | string>>;

/** Each lift of static's a pilot is drawn at, a whole step apiece. */
const LIFTS = Array.from({ length: MOST_LIFT + 1 }, (_, lift) => lift);

/** Returns the colors of the pilots drawn in an element, in order, as the page writes them. */
export function pilotsIn(element: Element): string[] {
  return Array.from(
    element.querySelectorAll<HTMLElement>("app-pilot"),
    (pilot) => pilot.style.color,
  );
}

/** Returns each pilot drawn in an element, in order, as its color, as the page writes it, and its face. */
export function posesIn(element: Element): [string, FuzzballFace][] {
  return Array.from(
    element.querySelectorAll<HTMLElement>("app-pilot"),
    (pilot) => [pilot.style.color, poseIn(pilot).face],
  );
}

/** Returns whether each pilot drawn in an element is ringed as the pilot at the controls, in order. */
export function ringedIn(element: Element): boolean[] {
  return Array.from(element.querySelectorAll("app-pilot"), (pilot) =>
    pilot.hasAttribute("data-at-controls"),
  );
}

/** Returns a pilot's color in a light palette, the specs' page's, as the page writes it. */
export function inkOf(pilot: number): string {
  const probe = document.createElement("span");
  probe.style.color = pilotInk(pilot, "light");
  return probe.style.color;
}

/**
 * Returns the face and the lift of the first pilot drawn in an element, as
 * `fuzzballDrawing()` draws them, read from the marks its fuzzball draws.
 *
 * @throws {Error} for an element that draws no pilot, or one drawn as no
 *   face or lift draws it.
 */
export function poseIn(element: Element): Pose {
  const fuzzball = element.querySelector("fz-fuzzball");
  if (!fuzzball) throw new Error("No pilot drawn.");
  const eyes = eyesDrawn(fuzzball);
  const face = FUZZBALL_FACES.find((each) => eyesOf(each) === eyes);
  const fur = fuzzball.querySelector(".fur")?.getAttribute("d");
  const lift = LIFTS.find((each) => furOf(each) === fur);
  if (face === undefined || lift === undefined) {
    throw new Error("A pilot drawn as no face or lift draws it.");
  }
  return { face, lift };
}

/** Returns the marks of a fuzzball's face, back to front, each its kind and where it lies, a line apiece. */
function eyesDrawn(fuzzball: Element): string {
  return Array.from(
    fuzzball.querySelectorAll("svg > :not(.body, .fur, .halos, .cores)"),
    (mark) =>
      [
        mark.localName,
        ...PLACING.map((name) => mark.getAttribute(name) ?? ""),
      ].join(" "),
  ).join("\n");
}

/** Returns the marks of a face as `eyesDrawn()` reads them drawn. */
function eyesOf(face: FuzzballFace): string {
  return fuzzballDrawing({ face, range: FUZZBALL_LOOK_FAR })
    .eyes.map((mark) => {
      const placing: Placing = mark;
      return [
        mark.kind,
        ...PLACING.map((name) => String(placing[name] ?? "")),
      ].join(" ");
    })
    .join("\n");
}

/** Returns the fur drawn at a lift, as a path. */
function furOf(lift: number): string {
  return fuzzballDrawing({ lift }).fur;
}
