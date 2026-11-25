// @vitest-environment jsdom
import { thirdsOf } from "@fz/brick-wall/rules/wall";
import { fieldMetrics, fieldShape } from "@fz/brick-wall/view/field_metrics";
import type { BoardBox } from "@fz/dev/layout";
import { recordingPrinter } from "@fz/dev/script";
import {
  type Viewport,
  cssRectOf,
  rectAttribute,
  roomInside,
} from "@fz/phaser/layout";
import { SCREENSHOT_API } from "../src/testing/screenshot_api";
import {
  checkLayout,
  inspectField,
  keepRun,
  keepingNone,
  keepingRun,
} from "./check-layout.mjs";
import { LAYOUT_RUN, SAVED_GAME_KEY, storedRun } from "./stored_run.mjs";

/** Describes what the board says of the field it laid out, as the inspection reads it, null for what it leaves unsaid. */
interface LaidField {
  /** Where the field lies on the canvas, its lintel to its band, as `data-field` says it. */
  readonly field: string | null;
  /** Where its room lies on the canvas, as `data-room` says it. */
  readonly room: string | null;
  readonly depth: number;
  /** The band and the lintel, in CSS px. */
  readonly band: number | null;
  readonly lintel: number | null;
  readonly ratio: number | null;
  readonly outcome: string;
  /** The field row the wall's lowest row stands in, as `data-wall` says it. */
  readonly wall: number;
  /**
   * The row the run the page took up kept its wall on, as the check says it
   * before the page loads, null for a level waiting for its first shot, or
   * undefined where the check said nothing.
   */
  readonly kept: number | null | undefined;
  /** Where the field lies in the window, and its unit, as the board's own inspection hands it over. */
  readonly box: BoardBox;
}

/**
 * Returns the field as the library lays it out on a canvas of a size, in
 * CSS px, at a pixel ratio, inside the board's margin, 24 CSS px as a roomy
 * screen keeps it unless given, as a level waits for its first shot: its
 * shape worked out from the room, as the board hands it the room, and its
 * wall on the row the level opens on.
 */
function laidOut(
  width: number,
  height: number,
  ratio: number,
  margin = 24,
): LaidField {
  const viewport: Viewport = {
    width: width * ratio,
    height: height * ratio,
    pixelRatio: ratio,
    insets: { top: margin, right: margin, bottom: margin, left: margin },
  };
  const shape = fieldShape(viewport);
  const { css, framed } = fieldMetrics(viewport, shape);
  return {
    field: rectAttribute(framed),
    room: rectAttribute(cssRectOf(roomInside(viewport), ratio)),
    depth: shape.depth,
    band: framed.y + framed.height - css.y - css.height,
    lintel: css.y - framed.y,
    ratio,
    outcome: "ready",
    wall: thirdsOf(shape.depth).opensOn,
    kept: null,
    box: { ...framed, left: framed.x, top: framed.y, unit: framed.width / 9 },
  };
}

/** Lays a board in the document, as the page has it, saying what it laid out and leaving out what it leaves unsaid. */
function lay(laid: LaidField): void {
  document.body.innerHTML = "<fz-wall-board></fz-wall-board>";
  const board = document.querySelector("fz-wall-board");
  if (!(board instanceof HTMLElement)) throw new Error("No board.");
  const attributes = {
    "data-field": laid.field,
    "data-room": laid.room,
    "data-depth": String(laid.depth),
    "data-outcome": laid.outcome,
    "data-wall": String(laid.wall),
  };
  const properties = {
    "--pixel-ratio": laid.ratio === null ? null : String(laid.ratio),
    "--band": laid.band === null ? null : `${String(laid.band)}px`,
    "--lintel": laid.lintel === null ? null : `${String(laid.lintel)}px`,
  };
  for (const [name, value] of Object.entries(attributes)) {
    if (value !== null) board.setAttribute(name, value);
  }
  for (const [name, value] of Object.entries(properties)) {
    if (value !== null) board.style.setProperty(name, value);
  }
  if (laid.kept === undefined) Reflect.deleteProperty(window, "keptWallRow");
  else Reflect.set(window, "keptWallRow", laid.kept);
}

/** Returns what the inspection finds wrong with a field laid out on the page. */
function inspected(laid: LaidField): string[] {
  lay(laid);
  return inspectField(laid.box);
}

/**
 * A phone held upright, its room 684 × 1304 device px: its field 16 rows
 * deep, filling the room's width at a unit of 76, its band 50 and its
 * lintel 38, the room's height.
 */
const UPRIGHT = laidOut(390, 700, 2);

/**
 * A phone on its side, its room 1592 × 584 device px: its field 11 rows
 * deep, filling the room's height at a unit of 48, 24 CSS px, its band 32
 * and its lintel 24.
 */
const SIDEWAYS = laidOut(844, 340, 2);

describe("inspectField", () => {
  it.each([
    ["roomy", laidOut(1280, 700, 2)],
    ["a phone held upright", UPRIGHT],
    ["a phone on its side", SIDEWAYS],
    [
      "a small phone on its side, at 1× and a compact margin",
      laidOut(480, 320, 1, 12),
    ],
  ])(
    "finds nothing wrong with a field laid out as the library lays one out, %s, waiting on the row its level opens on",
    (_shape, laid) => {
      expect(inspected(laid)).toEqual([]);
    },
  );

  it("says a field deeper than its room asks for", () => {
    expect(inspected({ ...UPRIGHT, depth: 17 })).toContain(
      "The field is 17 rows deep, where its room asks for 16.",
    );
  });

  it("says a unit other than its room's", () => {
    const box = { ...UPRIGHT.box, unit: 39 };

    expect(inspected({ ...UPRIGHT, box })).toEqual([
      "The field's unit is 78 device px, where its room, 684 × 1304, asks for 76.",
    ]);
  });

  it("says a unit under 24 CSS px", () => {
    const box = { ...SIDEWAYS.box, unit: 23 };

    expect(inspected({ ...SIDEWAYS, box })).toContain(
      "The field's unit is 23 CSS px, under 24.",
    );
  });

  it("leaves a field the board's own inspection found nowhere to that inspection, finding nothing", () => {
    lay({ ...UPRIGHT, field: null });

    const problems = inspectField();

    expect(problems).toEqual([]);
  });

  it.each([
    ["--pixel-ratio", { ratio: null }],
    ["data-room", { room: null }],
  ])(
    "leaves a board that doesn't say its %s to the library's inspections, holding only its unit to 24 CSS px",
    (_unsaid, unsaid) => {
      const box = { ...SIDEWAYS.box, unit: 23 };

      expect(inspected({ ...SIDEWAYS, ...unsaid, box })).toEqual([
        "The field's unit is 23 CSS px, under 24.",
      ]);
    },
  );

  it.each([
    [{ band: null }, "fz-wall-board gives no --band."],
    [{ lintel: null }, "fz-wall-board gives no --lintel."],
  ])("says a band or a lintel unsaid, %j", (unsaid, problem) => {
    expect(inspected({ ...UPRIGHT, ...unsaid })).toEqual([problem]);
  });

  it.each([
    [
      { band: 24 },
      "The floor's band is 48 device px, where the field's room asks for 50.",
    ],
    [
      { lintel: 20 },
      "The lintel is 40 device px, where the field's room asks for 38.",
    ],
  ])("says a band or a lintel other than its room's, %j", (wrong, problem) => {
    expect(inspected({ ...UPRIGHT, ...wrong })).toEqual([problem]);
  });

  it("says a field that runs out of its room", () => {
    expect(inspected({ ...UPRIGHT, field: "12 24 342 652" })).toEqual([
      "The field runs out of its room.",
    ]);
  });

  it("says a field deeper than 11 rows that leaves 9 device px of its room's width, one a column", () => {
    expect(inspected({ ...UPRIGHT, field: "26.25 24 337.5 652" })).toEqual([
      "The field, 16 rows deep, leaves 9 device px of its room's width.",
    ]);
  });

  it("says a field 11 rows deep that leaves a device pixel of its room's height for each unit it asks for", () => {
    // 11 rows, the band and the lintel ask for 12.17 units.
    expect(inspected({ ...SIDEWAYS, field: "314 30.5 216 285.5" })).toEqual([
      "The field, 11 rows deep, leaves 13 device px of its room's height.",
    ]);
  });

  it("says a level that doesn't wait for its first shot", () => {
    expect(inspected({ ...UPRIGHT, outcome: "playing" })).toEqual([
      "The level doesn't wait for its first shot: it is playing.",
    ]);
  });

  it("says a wall on another row than the level opens on at the field's depth", () => {
    expect(inspected({ ...UPRIGHT, wall: 5 })).toEqual([
      "The wall stands on row 5, where a level 16 rows deep opens on 6.",
    ]);
  });
});

describe("inspectField, over a run taken up", () => {
  /** {@link UPRIGHT} over a run taken up paused, its wall kept on row 4. */
  const TAKEN_UP: LaidField = {
    ...UPRIGHT,
    outcome: "paused",
    wall: 4,
    kept: 4,
  };

  it("finds nothing wrong with a run taken up paused, its wall on the row the run kept it on", () => {
    expect(inspected(TAKEN_UP)).toEqual([]);
  });

  it("says a run kept that the page didn't take up paused", () => {
    expect(inspected({ ...TAKEN_UP, outcome: "ready" })).toEqual([
      "The run kept isn't taken up paused: it is ready.",
    ]);
  });

  it("says a wall on another row than the run kept it on", () => {
    expect(inspected({ ...TAKEN_UP, wall: 6 })).toEqual([
      "The wall stands on row 6, where the run kept it on 4.",
    ]);
  });

  it("says where nothing said which run the page shows", () => {
    expect(inspected({ ...TAKEN_UP, kept: undefined })).toEqual([
      "Nothing said which run the page shows.",
    ]);
  });
});

describe("what the page runs before its own scripts", () => {
  it("says, kept by no run, that the page shows a level waiting for its first shot", () => {
    Reflect.deleteProperty(window, "keptWallRow");

    keepingNone();

    expect(Reflect.get(window, "keptWallRow")).toBeNull();
  });

  it("keeps a run where it is told and says the row its wall stands on", () => {
    localStorage.clear();

    keepRun("a-key", "a run", 7);

    expect([
      localStorage.getItem("a-key"),
      Reflect.get(window, "keptWallRow"),
    ]).toEqual(["a run", 7]);
  });

  it("keeps the layout's run where the game keeps one, as the game stores it, its wall on row 4", () => {
    localStorage.clear();
    const { run, args } = keepingRun(SCREENSHOT_API);

    run(...args);

    expect([
      localStorage.getItem(SAVED_GAME_KEY),
      Reflect.get(window, "keptWallRow"),
    ]).toEqual([storedRun(SCREENSHOT_API, LAYOUT_RUN).stored, 4]);
  });
});

describe("checkLayout", () => {
  it("prints the usage asked for, naming the game, and exits with 0", async () => {
    const printer = recordingPrinter();

    const code = await checkLayout(["--help"], printer);

    expect({ code, out: printer.out, err: printer.err }).toEqual({
      code: 0,
      out: [
        expect.stringMatching(
          /^Usage: yarn check:layout[^]*Checks Rickashay's layout/,
        ) as unknown,
      ],
      err: [],
    });
  });

  it("prints what is wrong with a command line and the usage as an error, and exits with 2, before Chrome starts", async () => {
    const printer = recordingPrinter();

    const code = await checkLayout(["--pages", "0"], printer);

    expect({ code, out: printer.out, err: printer.err }).toEqual({
      code: 2,
      out: [],
      err: [
        expect.stringMatching(
          /^--pages takes a whole number from 1, not "0"\.\n\nUsage: yarn check:layout/,
        ) as unknown,
      ],
    });
  });
});
