import { designText } from "../../testing/design_files";
import { CHANNELS, type Channel, EASINGS, type Easing } from "./timeline";

/** The sketch's feel, whose easings and sprites the timeline's are. */
const FEEL = designText("sketch/feel/feel.mjs");

/** Each easing's name in the sketch's `ease`. */
const SKETCH_EASINGS = {
  linear: "lin",
  out: "out",
  in: "in",
  "in-out": "inOut",
  back: "back",
  spring: "spring",
} as const satisfies Readonly<Record<Easing, string>>;

/** Each channel's name among the numbers of the sketch's `Sprite`. */
const SKETCH_CHANNELS = {
  x: "x",
  y: "y",
  leanX: "px",
  leanY: "py",
  scaleX: "sx",
  scaleY: "sy",
  rotation: "rot",
  fade: "a",
  lift: "lift",
  lookX: "lx",
  lookY: "ly",
  glow: "flash",
  furIn: "auraIn",
  raise: "z",
  wobble: "shake",
} as const satisfies Readonly<Record<Channel, string>>;

/** The numbers of the sketch's sprites that no move moves: its ids, its kind, a brick's layers and its blinks' clock. */
const NOT_MOVED = ["id", "k", "hp", "blink", "left"];

/** Returns each name a pattern finds in the part of the sketch's feel another finds. */
function namesIn(part: RegExp, name: RegExp): readonly string[] {
  const [found = ""] = part.exec(FEEL) ?? [];
  return Array.from(found.matchAll(name), ([, each = ""]) => each);
}

describe("EASINGS", () => {
  it("names each of the sketch's easings once", () => {
    expect(EASINGS.map((easing) => SKETCH_EASINGS[easing])).toEqual(
      namesIn(/const ease = \{\n[\s\S]*?\n\};/, /^ {2}(\w+):/gm),
    );
  });
});

describe("CHANNELS", () => {
  it("moves each number of the sketch's sprites that a move moves", () => {
    expect(
      new Set(
        namesIn(
          /@typedef \{object\} Sprite\n[\s\S]*?\n \*\//,
          /@property \{number\} \[?(\w+)\]?/g,
        ),
      ),
    ).toEqual(
      new Set([
        ...CHANNELS.map((channel) => SKETCH_CHANNELS[channel]),
        ...NOT_MOVED,
      ]),
    );
  });
});
