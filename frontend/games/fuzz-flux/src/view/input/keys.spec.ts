import type { Square } from "../../rules/board/cells";
import {
  A,
  B,
  BOARD,
  BRICK,
  B_MATES,
  C,
  E,
  F,
  GAP,
  GameOnBoard,
  H,
  SPECIAL,
} from "../../testing/input_board";
import type { BoardShape } from "../board/spaces";
import type { BoardCommand } from "./commands";
import { type KeyPress, Ring } from "./keys";
import { Picking } from "./picking";

/** Returns a key pressed at its place on the keyboard, typing a key, with nothing held with it but what is given. */
function press(
  code: string,
  key: string,
  held: Partial<KeyPress> = {},
): KeyPress {
  return {
    code,
    key,
    repeat: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    ...held,
  };
}

const UP = press("ArrowUp", "ArrowUp");
const RIGHT = press("ArrowRight", "ArrowRight");
const DOWN = press("ArrowDown", "ArrowDown");
const LEFT = press("ArrowLeft", "ArrowLeft");
const SPACE = press("Space", " ");
const ENTER = press("Enter", "Enter");
const ESC = press("Escape", "Escape");

/** Returns a ring on a board, {@link BOARD} where none is given, with the picking it plays on, the ring moved by the keys given. */
function ringOn(
  board: BoardShape = BOARD,
  ...moves: readonly KeyPress[]
): { ring: Ring; hand: Picking } {
  const hand = new Picking(board, new GameOnBoard());
  const ring = new Ring(board, hand);
  for (const move of moves) ring.press(move);
  return { ring, hand };
}

/** Returns the command that moves the ring to a square. */
function ringAt(square: Square): BoardCommand {
  return { what: "move-ring", square };
}

describe("Ring", () => {
  describe("square", () => {
    it("starts on the board's first square", () => {
      expect(ringOn().ring.square).toEqual(A);
    });

    it("starts on the first square past a gap", () => {
      const board = { width: 2, height: 1, open: [false, true] };

      expect(ringOn(board).ring.square).toEqual({ x: 1, y: 0 });
    });
  });

  describe("moveTo", () => {
    it("moves the ring to a square, as the focus moving there does", () => {
      const { ring } = ringOn();
      const commands = ring.moveTo(H);

      expect({ commands, square: ring.square }).toEqual({
        commands: [ringAt(H)],
        square: H,
      });
    });

    it("puts the fuzzball held down as it moves the ring off it", () => {
      const { ring, hand } = ringOn(BOARD, SPACE);

      const commands = ring.moveTo(H);

      expect({ commands, held: hand.held }).toEqual({
        commands: [{ what: "put-down", square: A }, ringAt(H)],
        held: null,
      });
    });

    it("leaves the keys to play the square it moved to", () => {
      const { ring, hand } = ringOn();
      ring.moveTo(B);

      ring.press(SPACE);

      expect(hand.held).toEqual(B);
    });

    it.each<[string, Square]>([
      ["the square it is on", A],
      ["a gap", GAP],
      ["a square off the board", { x: 4, y: 0 }],
    ])("keeps the ring where it is, given %s", (_, square) => {
      const { ring } = ringOn();
      const commands = ring.moveTo(square);

      expect({ commands, square: ring.square }).toEqual({
        commands: [],
        square: A,
      });
    });
  });

  describe("an arrow key with nothing held", () => {
    it.each<[string, KeyPress, Square]>([
      ["up", UP, C],
      ["right", RIGHT, F],
      ["down", DOWN, H],
      ["left", LEFT, BRICK],
    ])("moves the ring %s", (_, arrow, square) => {
      const { ring } = ringOn(BOARD, RIGHT, RIGHT, DOWN);

      expect(ring.press(arrow)).toEqual([ringAt(square)]);
    });

    it("moves the ring past a gap", () => {
      const board = { width: 3, height: 1, open: [true, false, true] };
      const { ring } = ringOn(board);

      expect(ring.press(RIGHT)).toEqual([ringAt({ x: 2, y: 0 })]);
    });

    it.each<[string, KeyPress]>([
      ["up", UP],
      ["left", LEFT],
    ])("keeps the ring at the board's edge %s", (_, arrow) => {
      const { ring } = ringOn();
      const commands = ring.press(arrow);

      expect({ commands, square: ring.square }).toEqual({
        commands: [],
        square: A,
      });
    });

    it("keeps the ring where only a gap lies before the board's edge", () => {
      const { ring } = ringOn(BOARD, RIGHT, RIGHT);
      const commands = ring.press(RIGHT);

      expect({ commands, square: ring.square }).toEqual({
        commands: [],
        square: C,
      });
    });
  });

  describe("Space or Enter", () => {
    it.each<[string, KeyPress]>([
      ["Space", SPACE],
      ["Enter", ENTER],
      ["the number pad's Enter", press("NumpadEnter", "Enter")],
    ])("%s picks up the fuzzball under the ring", (_, key) => {
      const { ring } = ringOn(BOARD, RIGHT);

      expect(ring.press(key)).toEqual([
        { what: "pick-up", square: B, mates: B_MATES },
      ]);
    });

    it("sets off the special held under the ring", () => {
      const { ring } = ringOn(BOARD, DOWN, DOWN, SPACE);

      expect(ring.press(SPACE)).toEqual([
        { what: "put-down", square: SPECIAL },
        { what: "set-off", square: SPECIAL },
      ]);
    });

    it("puts down any other fuzzball held under the ring", () => {
      const { ring } = ringOn(BOARD, SPACE);

      expect(ring.press(SPACE)).toEqual([{ what: "put-down", square: A }]);
    });

    it("picks up nothing it can't swap", () => {
      const { ring, hand } = ringOn(BOARD, RIGHT, DOWN);
      const commands = ring.press(SPACE);

      expect({ commands, held: hand.held }).toEqual({
        commands: [],
        held: null,
      });
    });
  });

  describe("an arrow key with a fuzzball held", () => {
    it("swaps it that way", () => {
      const { ring } = ringOn(BOARD, RIGHT, RIGHT, DOWN, SPACE);

      expect(ring.press(DOWN)).toEqual([
        { what: "put-down", square: E },
        { what: "swap", from: E, to: H },
      ]);
    });

    it("leaves the ring where it was", () => {
      const { ring } = ringOn(BOARD, SPACE);
      ring.press(RIGHT);

      expect(ring.square).toEqual(A);
    });
  });

  it("puts down the fuzzball held at Esc", () => {
    const { ring } = ringOn(BOARD, SPACE);

    expect(ring.press(ESC)).toEqual([{ what: "put-down", square: A }]);
  });

  it("leaves Esc to the page with nothing held", () => {
    expect(ringOn().ring.press(ESC)).toBeNull();
  });

  it.each<[string, KeyPress]>([
    ["H", press("KeyH", "h")],
    ["H with Shift", press("KeyH", "H")],
    ["H where the layout puts it", press("KeyJ", "h")],
  ])("asks for a hint at %s", (_, key) => {
    expect(ringOn().ring.press(key)).toEqual([{ what: "hint" }]);
  });

  it.each<[string, KeyPress]>([
    [
      "an arrow with Ctrl",
      press("ArrowRight", "ArrowRight", { ctrlKey: true }),
    ],
    ["H with Alt", press("KeyH", "h", { altKey: true })],
    ["Space with Meta", press("Space", " ", { metaKey: true })],
    ["the key where H is on another layout", press("KeyH", "d")],
    ["another letter", press("KeyQ", "q")],
    ["Tab", press("Tab", "Tab")],
  ])("leaves %s to the page", (_, key) => {
    expect(ringOn().ring.press(key)).toBeNull();
  });

  it("takes a key's repeats, giving no command", () => {
    const { ring, hand } = ringOn();
    const commands = ring.press({ ...SPACE, repeat: true });

    expect({ commands, held: hand.held }).toEqual({ commands: [], held: null });
  });

  it("leaves the repeats of a key the board doesn't answer to the page", () => {
    expect(
      ringOn().ring.press(press("Tab", "Tab", { repeat: true })),
    ).toBeNull();
  });
});
