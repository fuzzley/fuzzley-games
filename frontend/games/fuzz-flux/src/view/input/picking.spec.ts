import type { Square } from "../../rules/board/cells";
import { type BoardShape, type Way, sameSquare } from "../board/spaces";
import type { BoardCommand } from "./commands";
import { type GameInPlay, Picking } from "./picking";

// A board 4 squares across and 3 down, as the screen shows it:
//
//   A B C ·      · a gap
//   D # E F      # a brick, which can't be swapped
//   S G H I      S a special
const A: Square = { x: 0, y: 0 };
const B: Square = { x: 1, y: 0 };
const C: Square = { x: 2, y: 0 };
const GAP: Square = { x: 3, y: 0 };
const D: Square = { x: 0, y: 1 };
const BRICK: Square = { x: 1, y: 1 };
const E: Square = { x: 2, y: 1 };
const SPECIAL: Square = { x: 0, y: 2 };
const G: Square = { x: 1, y: 2 };
const H: Square = { x: 2, y: 2 };

const BOARD: BoardShape = {
  width: 4,
  height: 3,
  open: [true, true, true, false, ...Array<boolean>(8).fill(true)],
};

/** The fuzzballs that could bunch with B, were it swapped. */
const B_MATES: readonly Square[] = [D, SPECIAL];

/** A game on {@link BOARD}, in which a move plays while a spec says so. */
class GameOnBoard implements GameInPlay {
  /** Whether a move plays. */
  playing = false;

  readonly canSwap = (square: Square): boolean => !sameSquare(square, BRICK);
  readonly goesOff = (square: Square): boolean => sameSquare(square, SPECIAL);
  readonly bunchMatesOf = (square: Square): readonly Square[] =>
    sameSquare(square, B) ? B_MATES : [];
  readonly movePlays = (): boolean => this.playing;
}

/** Returns a picking on {@link BOARD}, holding the fuzzball on a square where one is given. */
function picking(
  holding: Square | null = null,
  game = new GameOnBoard(),
): Picking {
  const made = new Picking(BOARD, game);
  if (holding !== null) made.press(holding);
  return made;
}

/** Returns a picking in a game in which a move plays, and the game, which a spec may bring to rest. */
function whilePlaying(): { hand: Picking; game: GameOnBoard } {
  const game = new GameOnBoard();
  game.playing = true;
  return { hand: picking(null, game), game };
}

/** Returns the command that puts down the fuzzball on a square. */
function putDown(square: Square): BoardCommand {
  return { what: "put-down", square };
}

/** Returns the command that swaps the fuzzball on a square with its neighbor's piece. */
function swap(from: Square, to: Square): BoardCommand {
  return { what: "swap", from, to };
}

describe("Picking", () => {
  describe("press", () => {
    it("picks up a fuzzball, those that could bunch with it looking its way", () => {
      expect(picking().press(B)).toEqual([
        { what: "pick-up", square: B, mates: B_MATES },
      ]);
    });

    it("holds the fuzzball it picks up", () => {
      const hand = picking();
      hand.press(B);

      expect(hand.held).toEqual(B);
    });

    it("picks up nothing it can't swap", () => {
      const hand = picking();
      const commands = hand.press(BRICK);

      expect({ commands, held: hand.held }).toEqual({
        commands: [],
        held: null,
      });
    });

    it("swaps the fuzzball held with a neighbor pressed", () => {
      expect(picking(A).press(B)).toEqual([putDown(A), swap(A, B)]);
    });

    it("swaps the fuzzball held with a neighbor it can't pick up, for the rules to refuse", () => {
      expect(picking(B).press(BRICK)).toEqual([putDown(B), swap(B, BRICK)]);
    });

    it("picks up another fuzzball in the place of the one held", () => {
      expect(picking(A).press(C)).toEqual([
        putDown(A),
        { what: "pick-up", square: C, mates: [] },
      ]);
    });

    it.each<[string, Square | null]>([
      ["off the board", null],
      ["on a gap", GAP],
      ["on a piece it can't swap", BRICK],
    ])("puts down the fuzzball held at a press %s", (_, square) => {
      expect(picking(A).press(square)).toEqual([putDown(A)]);
    });

    it("waits for a press on the fuzzball held to be read", () => {
      const hand = picking(A);
      const commands = hand.press(A);

      expect({ commands, held: hand.held }).toEqual({ commands: [], held: A });
    });
  });

  describe("swapHeld", () => {
    it.each<[Way, Square]>([
      ["up", BRICK],
      ["right", H],
      ["left", SPECIAL],
    ])("swaps the fuzzball held with its neighbor %s", (way, to) => {
      expect(picking(G).swapHeld(way)).toEqual([putDown(G), swap(G, to)]);
    });

    it.each<[string, Square, Way]>([
      ["the board's edge", A, "up"],
      ["a gap", C, "right"],
    ])("puts down the fuzzball held at %s", (_, held, way) => {
      expect(picking(held).swapHeld(way)).toEqual([putDown(held)]);
    });

    it("swaps nothing with nothing held", () => {
      expect(picking().swapHeld("down")).toEqual([]);
    });
  });

  describe("tap", () => {
    it("sets off the special held, tapped again", () => {
      const hand = picking(SPECIAL);
      hand.press(SPECIAL);

      expect(hand.tap()).toEqual([
        putDown(SPECIAL),
        { what: "set-off", square: SPECIAL },
      ]);
    });

    it("puts down any other fuzzball held, tapped again", () => {
      const hand = picking(A);
      hand.press(A);

      expect(hand.tap()).toEqual([putDown(A)]);
    });

    it("keeps holding the fuzzball a tap picked up", () => {
      const hand = picking();
      hand.press(SPECIAL);
      const commands = hand.tap();

      expect({ commands, held: hand.held }).toEqual({
        commands: [],
        held: SPECIAL,
      });
    });

    it("does nothing for a tap on the fuzzball held once it is put down", () => {
      const hand = picking(SPECIAL);
      hand.press(SPECIAL);
      hand.putDown();

      expect(hand.tap()).toEqual([]);
    });
  });

  describe("putDown", () => {
    it("puts down the fuzzball held", () => {
      const hand = picking(A);
      const commands = hand.putDown();

      expect({ commands, held: hand.held }).toEqual({
        commands: [putDown(A)],
        held: null,
      });
    });

    it("puts down nothing with nothing held", () => {
      expect(picking().putDown()).toEqual([]);
    });
  });

  describe("a move made while another plays", () => {
    it("is kept, the fuzzball held put down", () => {
      const { hand } = whilePlaying();
      hand.press(A);

      expect(hand.press(B)).toEqual([putDown(A)]);
    });

    it("is handed over as the board rests", () => {
      const { hand } = whilePlaying();
      hand.press(A);
      hand.press(B);

      expect(hand.boardRests()).toEqual([swap(A, B)]);
    });

    it("is handed over once", () => {
      const { hand } = whilePlaying();
      hand.press(A);
      hand.press(B);
      hand.boardRests();

      expect(hand.boardRests()).toEqual([]);
    });

    it("takes the place of one kept before", () => {
      const { hand } = whilePlaying();
      hand.press(A);
      hand.press(B);
      hand.press(E);
      hand.swapHeld("down");

      expect(hand.boardRests()).toEqual([swap(E, H)]);
    });

    it("keeps a special set off", () => {
      const { hand } = whilePlaying();
      hand.press(SPECIAL);
      hand.press(SPECIAL);
      hand.tap();

      expect(hand.boardRests()).toEqual([{ what: "set-off", square: SPECIAL }]);
    });

    it("puts down a fuzzball picked up since, as the board rests", () => {
      const { hand } = whilePlaying();
      hand.press(A);
      hand.press(B);
      hand.press(E);

      expect(hand.boardRests()).toEqual([putDown(E), swap(A, B)]);
    });

    it("gives way to a move made at rest before it is handed over", () => {
      const { hand, game } = whilePlaying();
      hand.press(A);
      hand.press(B);
      game.playing = false;
      hand.press(E);
      hand.press(H);

      expect(hand.boardRests()).toEqual([]);
    });

    it("leaves a fuzzball picked up while a move plays held as the board rests", () => {
      const { hand } = whilePlaying();
      hand.press(A);
      const commands = hand.boardRests();

      expect({ commands, held: hand.held }).toEqual({ commands: [], held: A });
    });

    it("hands over nothing where none was made", () => {
      expect(picking().boardRests()).toEqual([]);
    });
  });

  describe("letGo", () => {
    it("puts down the fuzzball held", () => {
      expect(picking(A).letGo()).toEqual([putDown(A)]);
    });

    it("forgets the move kept", () => {
      const { hand } = whilePlaying();
      hand.press(A);
      hand.press(B);
      hand.letGo();

      expect(hand.boardRests()).toEqual([]);
    });

    it("is safe to repeat", () => {
      const hand = picking(A);
      hand.letGo();

      expect(hand.letGo()).toEqual([]);
    });
  });
});
