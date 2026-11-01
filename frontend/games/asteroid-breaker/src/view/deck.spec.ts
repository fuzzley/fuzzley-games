import { SHAPES, SMALLEST, shapesAt } from "@fz/dev/layout";
import type { Viewport } from "@fz/phaser/layout";
import type { Place, Torus } from "../rules/torus";
import { FIELD_SHORT_SIDE } from "../rules/tuning";
import { boardOf, viewport } from "../testing/canvases";
import {
  BUTTON_SLACK_CSS_PX,
  type Circle,
  DECK_EDGE_CSS_PX,
  DECK_GAP_CSS_PX,
  type Deck,
  buttonAt,
  deckOf,
} from "./deck";
import {
  type BoardSetting,
  type PixelRect,
  deckLayout,
  fieldShape,
} from "./field_metrics";

/** A board with no margin, its deck showing, its stick on the left and its Fire button. */
const BOARD: BoardSetting = {
  marginCss: 0,
  deck: true,
  stickOnRight: false,
  fireByItself: false,
};

/**
 * A canvas whose deck lies under the field, 200 tall from 600 down, its
 * zones 200 wide.
 */
const UPRIGHT = viewport(400, 800);

/**
 * A canvas whose deck lies beside the field, its zones 150 wide down
 * either side.
 */
const ON_ITS_SIDE = viewport(900, 400);

/** A field of the narrowest shape. */
const SQUARE = { width: FIELD_SHORT_SIDE, height: FIELD_SHORT_SIDE };

/** Returns the field a canvas shapes, as a wave starts there. */
function shapedOn(canvas: Viewport, board: BoardSetting): Torus {
  return fieldShape(canvas, board, SQUARE);
}

/** Returns a deck that shows, around the field a canvas shapes. */
function deckAt(canvas = UPRIGHT, board = BOARD): Deck {
  const deck = deckOf(canvas, board, shapedOn(canvas, board));
  if (!deck) throw new Error("No deck shows.");
  return deck;
}

/** Returns a circle's middle and radius to the hundredth of a device pixel, or null for none. */
function roughly(circle: Circle | null): readonly number[] | null {
  if (!circle) return null;
  const hundredths = (value: number): number => Math.round(value * 100) / 100;
  return [circle.x, circle.y, circle.radius].map(hundredths);
}

/** Returns the place a distance along the way from one circle's middle to another's. */
function along(from: Circle, to: Circle, distance: number): Place {
  const apart = Math.hypot(to.x - from.x, to.y - from.y);
  return {
    x: from.x + ((to.x - from.x) / apart) * distance,
    y: from.y + ((to.y - from.y) / apart) * distance,
  };
}

/** Returns the place a distance to the right of a circle's middle, to its left for a distance under 0. */
function aside(circle: Circle, distance: number): Place {
  return { x: circle.x + distance, y: circle.y };
}

/** Returns a deck's Fire, which shows. */
function fireOf(deck: Deck): Circle {
  if (!deck.fire) throw new Error("No Fire shows.");
  return deck.fire;
}

/** Returns whether two circles share no point. */
function apart(one: Circle, other: Circle): boolean {
  return (
    Math.hypot(one.x - other.x, one.y - other.y) >= one.radius + other.radius
  );
}

/**
 * Returns whether a circle lies within a zone, its gap from the zone's top
 * and bottom, and its edge from the sides of a canvas with no chrome, to
 * within a hair.
 */
function keptIn(circle: Circle, zone: PixelRect, canvas: Viewport): boolean {
  const edge = DECK_EDGE_CSS_PX * canvas.pixelRatio;
  const gap = circle.radius + DECK_GAP_CSS_PX * canvas.pixelRatio;
  const hair = 1e-9;
  const left = circle.x - circle.radius;
  const right = circle.x + circle.radius;
  return (
    left >= zone.x - hair &&
    right <= zone.x + zone.width + hair &&
    left - edge >= -hair &&
    right + edge <= canvas.width + hair &&
    circle.y - gap >= zone.y - hair &&
    circle.y + gap <= zone.y + zone.height + hair
  );
}

describe("deckOf", () => {
  it("lays nothing out where the deck doesn't show", () => {
    expect(deckOf(UPRIGHT, { ...BOARD, deck: false }, SQUARE)).toBeNull();
  });

  it("lays the stick at rest low in its zone under the field, Fire low in the buttons', and Dash up from it, toward the middle", () => {
    const deck = deckAt();

    expect([deck.stick, deck.fire, deck.dash].map(roughly)).toEqual([
      [84, 716, 48],
      [332, 724, 32],
      [262, 690, 24],
    ]);
  });

  it("lays the stick at rest low in its zone beside the field, Fire low in the buttons', and Dash above it", () => {
    const deck = deckAt(ON_ITS_SIDE);

    expect([deck.stick, deck.fire, deck.dash].map(roughly)).toEqual([
      [75, 264, 48],
      [834, 280, 32],
      [828, 200, 24],
    ]);
  });

  it("mirrors each part in its zone with the stick on the right", () => {
    const deck = deckAt(UPRIGHT, { ...BOARD, stickOnRight: true });

    expect([deck.stick, deck.fire, deck.dash].map(roughly)).toEqual([
      [316, 716, 48],
      [68, 724, 32],
      [138, 690, 24],
    ]);
  });

  it("takes presses for the stick in its zone, the right one with the stick on the right", () => {
    const deck = deckAt(UPRIGHT, { ...BOARD, stickOnRight: true });

    expect(deck.stickZone).toEqual({ x: 200, y: 600, width: 200, height: 200 });
  });

  it("lays Dash in Fire's place, and no Fire, where fire is held by itself", () => {
    const deck = deckAt(UPRIGHT, { ...BOARD, fireByItself: true });

    expect([deck.fire, roughly(deck.dash)]).toEqual([null, [332, 724, 24]]);
  });

  // In the stick's zone, 112 wide, the stick's middle would lie at 56.
  it("keeps a part its edge from the stage's side, moved no further than that", () => {
    const deck = deckAt(viewport(504, 320));

    expect(roughly(deck.stick)).toEqual([64, 211.2, 48]);
  });

  // In the buttons' zone, from 160 across, Dash lies at 195.6, within 40
  // of the zone's side toward the middle, which isn't the stage's.
  it("lets a part lie up to its zone's side away from the stage's", () => {
    const deck = deckAt(viewport(320, 640));

    expect(roughly(deck.dash)).toEqual([195.6, 545.2, 24]);
  });

  // Under the field, in the stick's zone, 136 tall from 344 down, the stick
  // would lie at 422.88; beside it, in the buttons' zone, 150 tall from the
  // top, 80 up from Fire, Dash would lie at 25.
  it.each([
    [
      "the stick, from its zone's bottom",
      viewport(320, 480),
      "stick",
      [67.2, 422, 48],
    ],
    ["Dash, from its zone's top", viewport(900, 150), "dash", [828, 34, 24]],
  ] as const)(
    "keeps %s its gap, moved no further than that",
    (_, canvas, part, circle) => {
      const deck = deckAt(canvas);

      expect(roughly(deck[part])).toEqual(circle);
    },
  );

  // Inside the notch's 44, the stick's zone is 112 wide, and the stick's
  // middle would lie at 100.
  it("keeps a part its edge from the stage's side inside the chrome", () => {
    const deck = deckAt(
      viewport(568, 320, 1, { top: 0, right: 0, bottom: 0, left: 44 }),
    );

    expect(roughly(deck.stick)).toEqual([108, 211.2, 48]);
  });

  it("lays every part in CSS pixels, at any pixel ratio", () => {
    const deck = deckAt(viewport(400, 800, 2));

    expect([deck.stick, deck.fire, deck.dash].map(roughly)).toEqual([
      [168, 1432, 96],
      [664, 1448, 64],
      [524, 1380, 48],
    ]);
  });

  const boards = [1, 2, 3].flatMap((ratio) =>
    shapesAt(ratio, [...SHAPES, SMALLEST]).flatMap((shape) =>
      [false, true].flatMap((stickOnRight) =>
        [false, true].map((fireByItself) => {
          const { canvas, marginCss } = boardOf(shape);
          return [
            shape.name,
            ratio,
            stickOnRight ? "right" : "left",
            fireByItself ? "by itself" : "on Fire",
            canvas,
            { marginCss, deck: true, stickOnRight, fireByItself },
          ] as const;
        }),
      ),
    ),
  );

  it.each(boards)(
    "keeps every part of the deck of a %s at %f×, its stick on the %s and fire %s, within its zone and Fire and Dash apart",
    (_, __, ___, ____, canvas, board) => {
      const torus = shapedOn(canvas, board);
      const layout = deckLayout(canvas, board, torus);
      const deck = deckOf(canvas, board, torus);

      expect({
        stick:
          layout !== null &&
          deck !== null &&
          keptIn(deck.stick, layout.stick, canvas),
        fire:
          layout !== null &&
          deck !== null &&
          (deck.fire === null || keptIn(deck.fire, layout.buttons, canvas)),
        dash:
          layout !== null &&
          deck !== null &&
          keptIn(deck.dash, layout.buttons, canvas),
        apart:
          deck !== null && (deck.fire === null || apart(deck.fire, deck.dash)),
      }).toEqual({ stick: true, fire: true, dash: true, apart: true });
    },
  );
});

describe("buttonAt", () => {
  const deck = deckAt();
  const fire = fireOf(deck);
  const { dash, slack } = deck;

  it.each([
    ["Fire at its middle", fire, "fire"],
    ["Fire its slack past its edge", aside(fire, fire.radius + slack), "fire"],
    ["nothing past Fire's slack", aside(fire, fire.radius + slack + 1), null],
    ["Dash at its middle", dash, "dash"],
    ["Dash its slack past its edge", aside(dash, -dash.radius - slack), "dash"],
    ["nothing past Dash's slack", aside(dash, -dash.radius - slack - 1), null],
    // From Dash's middle toward Fire's, 77.8 away: at 34, 10 past Dash's
    // edge and 11.8 past Fire's; at 36, 12 past Dash's and 9.8 past Fire's.
    [
      "Dash, within both's slack, nearer its edge",
      along(dash, fire, 34),
      "dash",
    ],
    [
      "Fire, within both's slack, nearer its edge",
      along(dash, fire, 36),
      "fire",
    ],
  ] as const)("presses %s", (_, place, button) => {
    expect(buttonAt(deck, place)).toBe(button);
  });

  it("presses Dash in Fire's place where fire is held by itself", () => {
    const byItself = deckAt(UPRIGHT, { ...BOARD, fireByItself: true });

    expect(buttonAt(byItself, fire)).toBe("dash");
  });

  it("gives each button its slack in CSS pixels, at any pixel ratio", () => {
    expect(deckAt(viewport(400, 800, 3)).slack).toBe(3 * BUTTON_SLACK_CSS_PX);
  });
});
