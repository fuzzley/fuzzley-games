import { FUZZBALL_STRANDS } from "@fz/phaser/fuzzball";
import { FUZZBALL } from "@fz/style/fuzzball";
import { PILOT_COLORS } from "../../rules/ship/pilots";
import { STRAY_RADIUS } from "../../rules/tuning";
import { ART_PALETTE, frameNamed } from "../../testing/art_frames";
import {
  CONSTELLATION,
  PILOT_SIZES,
  SEATS,
  eyesCommands,
  eyesFrame,
  fuzzballCommands,
  lookingFrom,
  pilotFrame,
} from "./pilot_art";
import { WINDOW } from "./ship_art";

/** How many strands of fur the fuzzball's path draws, one for each move in it. */
const STRANDS = FUZZBALL.fur.d.split("M").length - 1;

describe("the pilot's sizes", () => {
  it("seats a pilot as wide as the ship's window", () => {
    expect(PILOT_SIZES.seated).toBe(2 * WINDOW.radius);
  });

  it("draws a pilot adrift wider than its bubble's radius", () => {
    expect(PILOT_SIZES.adrift).toBeGreaterThan(STRAY_RADIUS);
  });
});

describe("a pilot's frames", () => {
  it.each(SEATS)(
    "names each pilot apart, and each seat's apart from the other's, %s",
    (seat) => {
      const names = Array.from({ length: PILOT_COLORS }, (_, pilot) =>
        pilotFrame(pilot, seat),
      );
      const other = SEATS.filter((each) => each !== seat).map((each) =>
        pilotFrame(0, each),
      );

      expect(new Set([...names, ...other]).size).toBe(PILOT_COLORS + 1);
    },
  );

  it.each(SEATS)("draws each pilot %s in its own ink", (seat) => {
    const colors = Array.from({ length: PILOT_COLORS }, (_, pilot) => [
      ...new Set(
        frameNamed(pilotFrame(pilot, seat)).commands.map(
          (command) => command.color,
        ),
      ),
    ]);

    expect(colors).toEqual(ART_PALETTE.pilots.map((ink) => [ink]));
  });

  it("refuses a pilot's color no pilot has", () => {
    expect(() => pilotFrame(PILOT_COLORS, "seated")).toThrow(RangeError);
  });

  it("draws the fuzzball's body, then each strand round at its ends, as wide as its grid says", () => {
    const [body, ...fur] = fuzzballCommands(32, 7);
    const lines = fur.filter((command) => command.kind === "line");
    const dots = fur.filter((command) => command.kind === "circle");

    expect({
      body,
      strands: lines.length,
      lineWidths: new Set(
        lines.map((command) => ("width" in command ? command.width : 0)),
      ),
      dotWidths: new Set(
        dots.map((command) => ("radius" in command ? 2 * command.radius : 0)),
      ),
    }).toEqual({
      body: { kind: "circle", x: 0, y: 0, radius: FUZZBALL.body.r, color: 7 },
      // Each strand is a curve of eight straight pieces.
      strands: 8 * STRANDS,
      lineWidths: new Set([FUZZBALL.fur.width]),
      dotWidths: new Set([FUZZBALL.fur.width]),
    });
  });
});

describe("a pilot's eyes", () => {
  it.each(SEATS)("draws the eyes in their own frame, %s", (seat) => {
    const frame = frameNamed(eyesFrame(seat));

    expect(
      frame.commands.filter((command) => command.color === ART_PALETTE.eyes),
    ).toHaveLength(FUZZBALL.eyes.length);
  });

  it("glints the eyes in the glint's color where each glint is half a pixel or more", () => {
    const glints = eyesCommands(19, ART_PALETTE)
      .slice(FUZZBALL.eyes.length)
      .map((command) => [command.kind, command.color]);

    expect(glints).toEqual(
      FUZZBALL.glints.map(() => ["circle", ART_PALETTE.glint]),
    );
  });

  it("leaves the glints out where they'd be under half a pixel, as they'd only turn the eyes grey", () => {
    expect(eyesCommands(18, ART_PALETTE)).toHaveLength(FUZZBALL.eyes.length);
  });

  it("lays the eyes about the body's middle, as the fuzzball's grid has them", () => {
    const [left] = eyesCommands(32, ART_PALETTE);
    const xs = left?.kind === "polygon" ? left.points.map(({ x }) => x) : [];

    expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(
      (FUZZBALL.eyes[0]?.cx ?? NaN) - FUZZBALL.body.cx,
    );
  });
});

describe("lookingFrom", () => {
  it.each([
    ["far off", 1],
    ["near", 0.1],
  ])("looks straight at what the pilot watches, %s", (_, scale) => {
    const watched = { x: 10 + 3 * scale, y: 20 + 4 * scale };

    const look = lookingFrom(10, 20, watched, 0, { x: 0, y: 0 });

    expect(look.x).toBeCloseTo(0.6, 9);
    expect(look.y).toBeCloseTo(0.8, 9);
  });

  it.each([
    ["nothing", null],
    ["what is right there", { x: 10, y: 20 }],
  ])("looks along its heading where it watches %s", (_, watched) => {
    const look = lookingFrom(10, 20, watched, Math.PI / 2, { x: 0, y: 0 });

    expect([look.x, look.y]).toEqual([Math.cos(Math.PI / 2), 1]);
  });

  it("writes the way into the record it is given", () => {
    const into = { x: 0, y: 0 };

    expect(lookingFrom(10, 20, null, 0, into)).toBe(into);
  });
});

describe("CONSTELLATION", () => {
  it("traces the fuzzball by every other strand's tip, and its eyes by two", () => {
    expect([CONSTELLATION.specks.length, CONSTELLATION.eyes.length]).toEqual([
      Math.ceil(STRANDS / 2),
      FUZZBALL.eyes.length,
    ]);
  });

  it("places its specks as shares of the fuzzball's size, within it", () => {
    const places = [...CONSTELLATION.specks, ...CONSTELLATION.eyes];

    expect(
      places.every(({ x, y }) => Math.abs(x) <= 0.5 && Math.abs(y) <= 0.5),
    ).toBe(true);
  });

  it("places its first speck at the first strand's tip, from the body's middle", () => {
    const [first] = FUZZBALL_STRANDS;

    expect(CONSTELLATION.specks[0]).toEqual({
      x: (first?.to.x ?? NaN) / 32,
      y: (first?.to.y ?? NaN) / 32,
    });
  });
});
