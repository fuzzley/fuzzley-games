import type { Viewport } from "@fz/phaser/layout";
import { FIELD_SHORT_SIDE } from "../rules/tuning";
import type { Place } from "../rules/torus";
import { viewport } from "../testing/canvases";
import { type Circle, type Deck, deckOf } from "./deck";
import {
  type BoardSetting,
  type FieldMetrics,
  fieldMetrics,
  fieldShape,
  toCanvas,
} from "./field_metrics";
import { STICK_RADIUS_CSS_PX } from "./stick";
import { MOST_FINGERS, type PointerView, Steering } from "./steering";

/** A board whose deck shows, its stick on the left and its Fire button. */
const BOARD: BoardSetting = {
  marginCss: 12,
  deck: true,
  stickOnRight: false,
  fireByItself: false,
};

/** A canvas whose deck lies under the field, its stick's zone from 600 down on the left. */
const CANVAS = viewport(400, 800);

/** Describes where the field and the deck lie on a canvas, its Fire showing. */
interface Layout {
  readonly metrics: FieldMetrics;
  readonly deck: Deck;
  readonly fire: Circle;
  readonly board: BoardSetting;
}

/** A field of the narrowest shape. */
const SQUARE = { width: FIELD_SHORT_SIDE, height: FIELD_SHORT_SIDE };

/** Returns where the field and the deck lie on a canvas. */
function layoutOf(canvas: Viewport = CANVAS, board = BOARD): Layout {
  const torus = fieldShape(canvas, board, SQUARE);
  const deck = deckOf(canvas, board, torus);
  if (!deck?.fire) throw new Error("No deck with Fire shows.");
  return {
    metrics: fieldMetrics(canvas, board, torus),
    deck,
    fire: deck.fire,
    board,
  };
}

/** Returns a steering for a layout. */
function steeringOf(layout = layoutOf()): Steering {
  return new Steering(layout.metrics, layout.deck, layout.board);
}

/** Has a steering take a layout, as the canvas changes. */
function remeasure(steering: Steering, layout: Layout): void {
  steering.measure(layout.metrics, layout.deck, layout.board);
}

/** Returns where a place on the field lies on the canvas. */
function onCanvas(place: Place, { metrics } = layoutOf()): Place {
  return toCanvas(metrics, place, { x: 0, y: 0 });
}

/** Returns the mouse at a place on the canvas, its button as given. */
function mouse(place: Place, button = 0): PointerView {
  return { id: 0, x: place.x, y: place.y, wasTouch: false, button };
}

/** Returns a finger at a place on the canvas. */
function finger(id: number, place: Place): PointerView {
  return { id, x: place.x, y: place.y, wasTouch: true, button: 0 };
}

/** Returns where a steering aims the ship, to the millionth of a field unit, or null. */
function aimOf(steering: Steering): readonly number[] | null {
  const { aim } = steering.read();
  if (!aim) return null;
  return [aim.x, aim.y].map((value) => Math.round(value * 1e6) / 1e6);
}

/** Returns the place a distance to the right of another. */
function aside(place: Place, distance: number): Place {
  return { x: place.x + distance, y: place.y };
}

/** Returns a steering whose stick finger 1 holds, pressed where it rests. */
function stickHeld(layout = layoutOf()): Steering {
  const steering = steeringOf(layout);
  steering.pointerDown(finger(1, layout.deck.stick));
  return steering;
}

describe("Steering's keys", () => {
  it.each([
    ["ArrowLeft", -1],
    ["KeyA", -1],
    ["ArrowRight", 1],
    ["KeyD", 1],
  ] as const)("turn the ship by %s while it is held", (code, turn) => {
    const steering = steeringOf();

    steering.press(code);

    expect(steering.read().turn).toBe(turn);
  });

  it.each([
    ["ArrowLeft", "ArrowRight", 1],
    ["ArrowRight", "ArrowLeft", -1],
  ] as const)(
    "turn it the way of the key held last, %s then %s, while both are",
    (first, last, turn) => {
      const steering = steeringOf();
      steering.press(first);

      steering.press(last);

      expect(steering.read().turn).toBe(turn);
    },
  );

  it("turn it the way of the key still held, once the last is let go", () => {
    const steering = steeringOf();
    steering.press("ArrowLeft");
    steering.press("ArrowRight");

    steering.release("ArrowRight");

    expect(steering.read().turn).toBe(-1);
  });

  it.each([
    ["ArrowUp", { thrust: 1, fire: false, dash: false }],
    ["Space", { thrust: 0, fire: true, dash: false }],
    ["ShiftLeft", { thrust: 0, fire: false, dash: true }],
  ] as const)("ask what %s does while it is held", (code, asked) => {
    const steering = steeringOf();

    steering.press(code);

    expect(steering.read()).toMatchObject(asked);
  });

  it("ask nothing once let go", () => {
    const steering = steeringOf();
    steering.press("ArrowUp");

    steering.release("ArrowUp");

    expect(steering.read().thrust).toBe(0);
  });

  it("ask nothing of a key that flies nothing", () => {
    const steering = steeringOf();

    steering.press("Enter");

    expect(steering.read()).toMatchObject({
      turn: 0,
      thrust: 0,
      fire: false,
      dash: false,
    });
  });

  it("keep asking while another key held asks the same", () => {
    const steering = steeringOf();
    steering.press("ArrowUp");
    steering.press("KeyW");

    steering.release("ArrowUp");

    expect(steering.read().thrust).toBe(1);
  });

  it("pay no mind to a key let go that wasn't held", () => {
    const steering = steeringOf();
    steering.release("ArrowUp");

    steering.press("ArrowUp");

    expect(steering.read().thrust).toBe(1);
  });

  it("keep the heading with the mouse as a held turn key repeats", () => {
    const steering = steeringOf();
    steering.press("ArrowLeft");
    steering.pointerMove(mouse(onCanvas({ x: 10, y: 20 })));

    steering.press("ArrowLeft");

    expect([aimOf(steering), steering.read().turn]).toEqual([[10, 20], 0]);
  });

  it("take the heading back from the mouse at another key for a turn already held", () => {
    const steering = steeringOf();
    steering.press("ArrowLeft");
    steering.pointerMove(mouse(onCanvas({ x: 10, y: 20 })));

    steering.press("KeyA");

    expect([aimOf(steering), steering.read().turn]).toEqual([null, -1]);
  });
});

describe("Steering's mouse", () => {
  it("aims the ship at its place on the field, in field units, once it moves over the field", () => {
    const steering = steeringOf();

    steering.pointerMove(mouse(onCanvas({ x: 10, y: 20 })));

    const { heading, turn } = steering.read();
    expect([aimOf(steering), heading, turn]).toEqual([[10, 20], null, 0]);
  });

  it.each([
    ["aims from the field's top left corner", 0, 0, [0, 0]],
    ["aims at nothing just past its right side", 1, 0, null],
    ["aims at nothing just past its bottom", 0, 1, null],
  ] as const)("%s", (_, across, down, aim) => {
    const { metrics } = layoutOf();
    const steering = steeringOf();

    steering.pointerMove(
      mouse({
        x: metrics.x + across * metrics.width,
        y: metrics.y + down * metrics.height,
      }),
    );

    expect(aimOf(steering)).toEqual(aim);
  });

  it("aims at nothing as it moves off the field, until it moves over it", () => {
    const steering = steeringOf();

    steering.pointerMove(mouse(layoutOf().deck.stick));

    expect(steering.read().aim).toBeNull();
  });

  it("aims at a place off the field as it moves off it, once it aims", () => {
    const steering = steeringOf();
    steering.pointerMove(mouse(onCanvas({ x: 10, y: 20 })));

    steering.pointerMove(mouse(onCanvas({ x: 10, y: -5 })));

    expect(aimOf(steering)).toEqual([10, -5]);
  });

  it("keeps aiming at the place it last moved to, through a resize", () => {
    const steering = steeringOf();
    steering.pointerMove(mouse(onCanvas({ x: 10, y: 20 })));
    const resized = layoutOf(viewport(400, 800, 2));

    remeasure(steering, resized);

    expect(aimOf(steering)).toEqual([10, 20]);
  });

  it("keeps the heading with the keys at a move that goes nowhere", () => {
    const steering = steeringOf();
    const at = mouse(onCanvas({ x: 10, y: 20 }));
    steering.pointerMove(at);
    steering.press("ArrowLeft");

    steering.pointerMove(at);

    expect([aimOf(steering), steering.read().turn]).toEqual([null, -1]);
  });

  it("gives the heading back to the keys as a turn key is pressed", () => {
    const steering = steeringOf();
    steering.pointerMove(mouse(onCanvas({ x: 10, y: 20 })));

    steering.press("ArrowLeft");

    expect([aimOf(steering), steering.read().turn]).toEqual([null, -1]);
  });

  it("takes the heading again as it moves, while a turn key is held", () => {
    const steering = steeringOf();
    steering.press("ArrowLeft");

    steering.pointerMove(mouse(onCanvas({ x: 10, y: 20 })));

    expect([aimOf(steering), steering.read().turn]).toEqual([[10, 20], 0]);
  });

  it.each([
    ["fires", 0, { fire: true, thrust: 0 }],
    ["thrusts", 2, { fire: false, thrust: 1 }],
    ["asks nothing", 1, { fire: false, thrust: 0 }],
  ] as const)("%s while button %i is held", (_, button, asked) => {
    const steering = steeringOf();

    steering.pointerDown(mouse(onCanvas({ x: 10, y: 20 }), button));

    expect(steering.read()).toMatchObject(asked);
  });

  it.each([0, 2])("asks nothing once button %i is let go", (button) => {
    const steering = steeringOf();
    const at = mouse(onCanvas({ x: 10, y: 20 }), button);
    steering.pointerDown(at);

    steering.pointerUp(at);

    expect(steering.read()).toMatchObject({ fire: false, thrust: 0 });
  });
});

describe("Steering's stick", () => {
  it("takes a finger pressed in its zone, which points the ship where it is pushed", () => {
    const layout = layoutOf();
    const steering = stickHeld(layout);

    steering.pointerMove(finger(1, aside(layout.deck.stick, 20)));

    expect([steering.read().heading, steering.stickView.held]).toEqual([
      0,
      true,
    ]);
  });

  it("pushes the ship fully at its edge", () => {
    const layout = layoutOf();
    const steering = stickHeld(layout);

    steering.pointerMove(
      finger(1, aside(layout.deck.stick, STICK_RADIUS_CSS_PX)),
    );

    expect(steering.read().thrust).toBe(1);
  });

  it("reaches as far in CSS pixels at any pixel ratio", () => {
    const layout = layoutOf(viewport(400, 800, 2));
    const steering = stickHeld(layout);

    steering.pointerMove(
      finger(1, aside(layout.deck.stick, 0.75 * 2 * STICK_RADIUS_CSS_PX)),
    );

    expect(steering.read().thrust).toBeCloseTo(0.5);
  });

  it("reaches as far in CSS pixels after a resize to another pixel ratio", () => {
    const steering = steeringOf();
    const resized = layoutOf(viewport(400, 800, 2));
    remeasure(steering, resized);
    steering.pointerDown(finger(1, resized.deck.stick));

    steering.pointerMove(
      finger(1, aside(resized.deck.stick, 0.75 * 2 * STICK_RADIUS_CSS_PX)),
    );

    expect(steering.read().thrust).toBeCloseTo(0.5);
  });

  it("goes on asking what it did as the canvas changes under its finger", () => {
    const layout = layoutOf();
    const steering = stickHeld(layout);
    steering.pointerMove(
      finger(1, aside(layout.deck.stick, 0.75 * STICK_RADIUS_CSS_PX)),
    );
    const resized = layoutOf(viewport(400, 800, 2));
    remeasure(steering, resized);

    steering.pointerMove(finger(1, resized.deck.stick));

    const { heading, thrust } = steering.read();
    expect([heading, thrust]).toEqual([0, expect.closeTo(0.5)]);
  });

  it("is taken afresh by a finger pressed under the id of one whose lift was lost", () => {
    const layout = layoutOf();
    const steering = stickHeld(layout);
    steering.pointerMove(finger(1, aside(layout.deck.stick, 40)));

    steering.pointerDown(finger(1, aside(layout.deck.stick, -10)));

    const { heading, thrust } = steering.read();
    expect([steering.stickView.held, heading, thrust]).toEqual([true, null, 0]);
  });

  it("turns the ship before the mouse and the keys", () => {
    const layout = layoutOf();
    const steering = stickHeld(layout);
    steering.press("ArrowLeft");
    steering.pointerMove(mouse(onCanvas({ x: 10, y: 20 })));

    steering.pointerMove(finger(1, aside(layout.deck.stick, 20)));

    const { heading, aim, turn } = steering.read();
    expect([heading, aim, turn]).toEqual([0, null, 0]);
  });

  it("leaves the turn to the mouse within its turn ring, once the mouse moves", () => {
    const layout = layoutOf();
    const steering = stickHeld(layout);

    steering.pointerMove(mouse(onCanvas({ x: 10, y: 20 })));

    expect(aimOf(steering)).toEqual([10, 20]);
  });

  it("takes the heading from a mouse that moved before a finger took it", () => {
    const layout = layoutOf();
    const steering = steeringOf(layout);
    steering.pointerMove(mouse(onCanvas({ x: 10, y: 20 })));

    steering.pointerDown(finger(1, layout.deck.stick));

    expect(aimOf(steering)).toBeNull();
  });

  it("leaves the heading with the keys as the finger that took it from the mouse lifts", () => {
    const layout = layoutOf();
    const steering = steeringOf(layout);
    steering.pointerMove(mouse(onCanvas({ x: 10, y: 20 })));
    steering.pointerDown(finger(1, layout.deck.stick));

    steering.pointerUp(finger(1, layout.deck.stick));

    expect(aimOf(steering)).toBeNull();
  });

  it.each([
    ["is taken by a finger at its zone's top left corner", 0, 0, true],
    ["is taken by no finger just past its zone's right side", 1, 0, false],
    ["is taken by no finger just past its zone's bottom", 0, 1, false],
  ] as const)("%s", (_, across, down, held) => {
    const layout = layoutOf();
    const { stickZone } = layout.deck;
    const steering = steeringOf(layout);

    steering.pointerDown(
      finger(1, {
        x: stickZone.x + across * stickZone.width,
        y: stickZone.y + down * stickZone.height,
      }),
    );

    expect(steering.stickView.held).toBe(held);
  });

  it("is taken by no finger pressed outside its zone", () => {
    const steering = steeringOf();

    steering.pointerDown(finger(1, onCanvas({ x: 10, y: 20 })));

    expect(steering.stickView.held).toBe(false);
  });

  it("keeps the finger that holds it from another pressed in its zone", () => {
    const layout = layoutOf();
    const steering = stickHeld(layout);
    steering.pointerDown(finger(2, aside(layout.deck.stick, 30)));

    steering.pointerMove(finger(2, aside(layout.deck.stick, -40)));

    expect(steering.read().heading).toBeNull();
  });

  it("doesn't fire as its finger slides over Fire", () => {
    const layout = layoutOf();
    const steering = stickHeld(layout);

    steering.pointerMove(finger(1, layout.fire));

    expect(steering.read().fire).toBe(false);
  });

  it("lets go as its finger lifts", () => {
    const layout = layoutOf();
    const steering = stickHeld(layout);
    steering.pointerMove(finger(1, aside(layout.deck.stick, 40)));

    steering.pointerUp(finger(1, aside(layout.deck.stick, 40)));

    expect([steering.read().heading, steering.read().thrust]).toEqual([
      null,
      0,
    ]);
  });
});

describe("Steering's buttons", () => {
  it("fire while a finger is on Fire", () => {
    const layout = layoutOf();
    const steering = steeringOf(layout);

    steering.pointerDown(finger(2, layout.fire));

    expect([steering.read().fire, steering.isPressed("fire")]).toEqual([
      true,
      true,
    ]);
  });

  it("dash while a finger is on Dash", () => {
    const layout = layoutOf();
    const steering = steeringOf(layout);

    steering.pointerDown(finger(2, layout.deck.dash));

    expect([steering.read().dash, steering.isPressed("dash")]).toEqual([
      true,
      true,
    ]);
  });

  it("go by where a finger is, not where it was pressed", () => {
    const layout = layoutOf();
    const steering = steeringOf(layout);
    steering.pointerDown(finger(2, layout.fire));

    steering.pointerMove(finger(2, layout.deck.dash));

    expect([steering.read().fire, steering.read().dash]).toEqual([false, true]);
  });

  it("ask nothing once the finger lifts", () => {
    const layout = layoutOf();
    const steering = steeringOf(layout);
    const onDash = finger(2, layout.deck.dash);
    steering.pointerDown(onDash);

    steering.pointerUp(onDash);

    expect(steering.read().dash).toBe(false);
  });

  it("ask nothing of a finger on neither", () => {
    const steering = steeringOf();

    steering.pointerDown(finger(2, onCanvas({ x: 10, y: 20 })));

    expect([steering.read().fire, steering.read().dash]).toEqual([
      false,
      false,
    ]);
  });

  it(`follow ${MOST_FINGERS} fingers off the stick at most`, () => {
    const layout = layoutOf();
    const steering = steeringOf(layout);
    for (let id = 2; id < 2 + MOST_FINGERS; id++) {
      steering.pointerDown(finger(id, onCanvas({ x: 10, y: 20 })));
    }

    steering.pointerDown(finger(2 + MOST_FINGERS, layout.deck.dash));

    expect(steering.read().dash).toBe(false);
  });

  it("ask nothing of a finger they don't follow as it moves onto one", () => {
    const layout = layoutOf();
    const steering = steeringOf(layout);

    steering.pointerMove(finger(2, layout.deck.dash));

    expect(steering.read().dash).toBe(false);
  });

  it("keep the fingers they follow as one they don't lifts", () => {
    const layout = layoutOf();
    const steering = steeringOf(layout);
    steering.pointerDown(finger(2, layout.deck.dash));

    steering.pointerUp(finger(3, layout.deck.dash));

    expect(steering.read().dash).toBe(true);
  });

  it("go on pressing what a finger pressed as the canvas changes under it, until it moves", () => {
    const layout = layoutOf();
    const steering = steeringOf(layout);
    steering.pointerDown(finger(2, layout.fire));

    remeasure(steering, layoutOf(viewport(400, 800, 2)));

    expect([steering.read().fire, steering.isPressed("fire")]).toEqual([
      true,
      true,
    ]);
  });

  it("go on pressing what a finger pressed through two changes of the canvas before it moves", () => {
    const layout = layoutOf();
    const steering = steeringOf(layout);
    steering.pointerDown(finger(2, layout.fire));
    remeasure(steering, layoutOf(viewport(400, 800, 2)));

    remeasure(steering, layoutOf(viewport(400, 800, 3)));

    expect(steering.read().fire).toBe(true);
  });

  // Where Dash lies at 2×, the finger lies on nothing at 1×.
  it("press nothing new with a finger the canvas changed under, though it lies on a button now, until it moves", () => {
    const steering = steeringOf();
    const resized = layoutOf(viewport(400, 800, 2));
    steering.pointerDown(finger(2, resized.deck.dash));

    remeasure(steering, resized);

    expect(steering.read().dash).toBe(false);
  });

  it("let go of Fire for a finger the canvas changed under, where the deck has no Fire now", () => {
    const layout = layoutOf();
    const steering = steeringOf(layout);
    steering.pointerDown(finger(2, layout.fire));
    const byItself = { ...BOARD, fireByItself: true };
    const deck = deckOf(CANVAS, byItself, fieldShape(CANVAS, byItself, SQUARE));

    steering.measure(layout.metrics, deck, byItself);

    expect(steering.isPressed("fire")).toBe(false);
  });

  it("press again with a finger the canvas changed under, once it moves", () => {
    const layout = layoutOf();
    const steering = steeringOf(layout);
    steering.pointerDown(finger(2, layout.fire));
    const resized = layoutOf(viewport(400, 800, 2));
    remeasure(steering, resized);

    steering.pointerMove(finger(2, resized.fire));

    expect(steering.read().fire).toBe(true);
  });

  it("take a finger pressed under the id of one whose lift was lost as a new one", () => {
    const layout = layoutOf();
    const steering = steeringOf(layout);
    steering.pointerDown(finger(2, layout.fire));

    steering.pointerDown(finger(2, layout.deck.dash));

    expect([steering.read().fire, steering.read().dash]).toEqual([false, true]);
  });

  it("ask nothing of a finger that moves once the deck is gone", () => {
    const layout = layoutOf();
    const steering = steeringOf(layout);
    steering.pointerDown(finger(2, layout.deck.dash));
    steering.measure(layout.metrics, null, { ...BOARD, deck: false });

    steering.pointerMove(finger(2, layout.deck.dash));

    expect(steering.read().dash).toBe(false);
  });

  it("ask nothing where the deck doesn't show", () => {
    const layout = layoutOf();
    const steering = new Steering(layout.metrics, null, layout.board);

    steering.pointerDown(finger(1, layout.deck.dash));

    expect([steering.read().dash, steering.isPressed("dash")]).toEqual([
      false,
      false,
    ]);
  });
});

describe("Steering", () => {
  it("fires every frame where the board holds fire by itself", () => {
    const layout = layoutOf();

    const steering = new Steering(layout.metrics, layout.deck, {
      ...layout.board,
      fireByItself: true,
    });

    expect([steering.read().fire, steering.read().fire]).toEqual([true, true]);
  });

  it("stops firing by itself as the board's setting changes", () => {
    const layout = layoutOf();
    const steering = new Steering(layout.metrics, layout.deck, {
      ...layout.board,
      fireByItself: true,
    });

    remeasure(steering, layout);

    expect(steering.read().fire).toBe(false);
  });

  it("forgets every key, button and finger held as the game pauses, and keeps the mouse's place", () => {
    const layout = layoutOf();
    const steering = stickHeld(layout);
    steering.pointerMove(finger(1, aside(layout.deck.stick, 40)));
    steering.pointerDown(finger(2, layout.deck.dash));
    steering.pointerDown(mouse(onCanvas({ x: 10, y: 20 }), 0));
    steering.pointerDown(mouse(onCanvas({ x: 10, y: 20 }), 2));
    steering.pointerMove(mouse(onCanvas({ x: 10, y: 20 })));
    steering.press("Space");

    steering.letGo();

    const { heading, thrust, fire, dash } = steering.read();
    expect([heading, aimOf(steering), thrust, fire, dash]).toEqual([
      null,
      [10, 20],
      0,
      false,
      false,
    ]);
  });

  it("takes a key pressed again once the game has paused", () => {
    const steering = steeringOf();
    steering.press("ArrowUp");
    steering.letGo();

    steering.press("ArrowUp");

    expect(steering.read().thrust).toBe(1);
  });

  it("writes each frame's steering into the same record", () => {
    const steering = steeringOf();

    expect(steering.read()).toBe(steering.read());
  });
});
