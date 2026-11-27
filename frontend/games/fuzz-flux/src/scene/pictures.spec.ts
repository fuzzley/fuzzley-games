import { itemAt } from "@fz/core/records";
import {
  type ArtFrame,
  type DrawCommand,
  atlasSize,
  extentOf,
} from "@fz/phaser/shapes";
import type { Fuzzball } from "../rules/catalog/pieces";
import { ART_PALETTE, ART_SCALE, billionths } from "../testing/art_frames";
import { MOVE_FIXTURES } from "../testing/move_fixtures";
import { DARK, startBoard } from "../testing/scene_shell";
import { BURRED_SCALE } from "../view/art/elements/burr";
import { DUSTY, FRAMES } from "../view/art/frame_names";
import { atlasFrames, bakedScale } from "../view/art/frames";
import { eyesSeatOn } from "../view/art/piece_frames";
import { PICTURE_FRAMES, atlasWithPictures, pictureFrames } from "./pictures";

/** The side of a page of the atlas's budget. */
const PAGE = 2048;

/** How many pages the atlas's budget gives it. */
const PAGES = 2;

/** The art's frames, at the art's specs' scale. */
const FRAMES_DRAWN = atlasFrames(ART_PALETTE, ART_SCALE);

/** Returns the frame of a list a name names. */
function frameNamed(frames: readonly ArtFrame[], name: string): ArtFrame {
  const frame = frames.find((each) => each.name === name);
  if (frame === undefined) throw new Error(`No frame is named ${name}.`);
  return frame;
}

/** Returns the middle and the width of where some commands draw, across their frame. */
function spanOf(commands: readonly DrawCommand[]): {
  readonly x: number;
  readonly y: number;
  readonly width: number;
} {
  const extents = commands.map(extentOf);
  const left = Math.min(...extents.map(({ x }) => x));
  const right = Math.max(...extents.map(({ x, width }) => x + width));
  const top = Math.min(...extents.map(({ y }) => y));
  const bottom = Math.max(...extents.map(({ y, height }) => y + height));
  return {
    x: (left + right) / 2,
    y: (top + bottom) / 2,
    width: right - left,
  };
}

/** A wisp of the first kind, which a picture shows a special's fur on. */
const WISP: Fuzzball = {
  what: "fuzzball",
  id: 0,
  kind: "blue",
  special: "wisp",
  caged: false,
  burred: false,
};

describe("pictureFrames", () => {
  it("draws every picture PICTURE_FRAMES names, beside the art's frames, each once", () => {
    const names = atlasWithPictures(ART_PALETTE, ART_SCALE).map(
      ({ name }) => name,
    );
    const pictured = [
      ...Object.values(PICTURE_FRAMES.kinds),
      ...Object.values(PICTURE_FRAMES.specials),
      PICTURE_FRAMES.frizzball,
      PICTURE_FRAMES.sleepyhead,
      PICTURE_FRAMES.caged,
      PICTURE_FRAMES.burred,
      ...PICTURE_FRAMES.dust,
      PICTURE_FRAMES.brick,
    ];

    expect(
      pictured.map((name) => names.filter((each) => each === name).length),
    ).toEqual(pictured.map(() => 1));
  });

  it("draws a fuzzball's picture as its body at rest, then its eyes at rest", () => {
    const body = frameNamed(FRAMES_DRAWN, FRAMES.body("red", "plain", "rest"));
    const eyes = frameNamed(FRAMES_DRAWN, FRAMES.eyes("rest"));

    const picture = frameNamed(
      pictureFrames(FRAMES_DRAWN, ART_SCALE),
      PICTURE_FRAMES.kinds.red,
    );

    expect(picture.commands.map(({ kind }) => kind)).toEqual(
      [...body.commands, ...eyes.commands].map(({ kind }) => kind),
    );
  });

  it("sits a special's eyes where they sit on its fur, as large as they are drawn there, about its square's middle", () => {
    const eyes = frameNamed(FRAMES_DRAWN, FRAMES.eyes("rest"));
    const seat = eyesSeatOn(WISP, "wisp");

    const picture = frameNamed(
      pictureFrames(FRAMES_DRAWN, ART_SCALE),
      PICTURE_FRAMES.specials.wisp,
    );
    const drawn = spanOf(picture.commands.slice(-eyes.commands.length));
    const own = spanOf(eyes.commands);

    expect([drawn.x, drawn.y, drawn.width].map(billionths)).toEqual(
      [
        picture.width / 2 +
          seat.x * ART_SCALE.unit +
          (own.x - eyes.width / 2) * seat.scale,
        picture.height / 2 +
          seat.y * ART_SCALE.unit +
          (own.y - eyes.height / 2) * seat.scale,
        own.width * seat.scale,
      ].map(billionths),
    );
  });

  it("pictures a burred fuzzball in its ring of thorns, its body as much smaller as it is drawn and its eyes cross", () => {
    const ring = frameNamed(FRAMES_DRAWN, FRAMES.burr);
    const body = frameNamed(FRAMES_DRAWN, FRAMES.body("blue", "plain", "rest"));
    const eyes = frameNamed(FRAMES_DRAWN, FRAMES.eyes("cross"));

    const picture = frameNamed(
      pictureFrames(FRAMES_DRAWN, ART_SCALE),
      PICTURE_FRAMES.burred,
    );
    const drawnBody = picture.commands.slice(
      ring.commands.length,
      ring.commands.length + body.commands.length,
    );

    expect({
      kinds: picture.commands.map(({ kind }) => kind),
      bodyWidth: billionths(spanOf(drawnBody).width),
    }).toEqual({
      kinds: [...ring.commands, ...body.commands, ...eyes.commands].map(
        ({ kind }) => kind,
      ),
      bodyWidth: billionths(spanOf(body.commands).width * BURRED_SCALE),
    });
  });

  it("draws each layer of dust over a square's well", () => {
    const well = frameNamed(FRAMES_DRAWN, FRAMES.square);
    const dust = frameNamed(FRAMES_DRAWN, FRAMES.dust(2));

    const picture = frameNamed(
      pictureFrames(FRAMES_DRAWN, ART_SCALE),
      itemAt(PICTURE_FRAMES.dust, DUSTY.indexOf(2)),
    );

    expect(picture.commands.map(({ kind }) => kind)).toEqual(
      [...well.commands, ...dust.commands].map(({ kind }) => kind),
    );
  });

  it("throws for a picture drawn from a frame the art lacks, naming it", () => {
    expect(() => pictureFrames([], ART_SCALE)).toThrow(
      new RangeError("The art draws no frame named body-blue-plain-rest."),
    );
  });

  it(`fits the atlas with its pictures at its largest, at a pixel ratio of 3, in the room of ${String(PAGES)} pages of ${String(PAGE)} × ${String(PAGE)}`, () => {
    const largest = bakedScale({ unit: 10_000, pixelRatio: 3 });

    const { width, height } = atlasSize(
      atlasWithPictures(ART_PALETTE, largest),
    );

    expect(width * height).toBeLessThanOrEqual(PAGES * PAGE * PAGE);
  });
});

describe("the scene's pictures", () => {
  it("are handed the shell as the atlas bakes, and again as it bakes in a new palette", async () => {
    const { shell, run } = await startBoard(MOVE_FIXTURES.bunch);
    const handed = shell.pictured.length;

    shell.colors = DARK;
    run.advance(16);

    expect([handed, shell.pictured.length]).toEqual([1, 2]);
  });

  it("picture each kind's fuzzball, once asked, as a PNG's data: URL", async () => {
    const { shell } = await startBoard(MOVE_FIXTURES.bunch);

    const pictures = shell.pictured[0]?.();

    expect(
      Object.values(pictures?.kinds ?? {}).map((picture) =>
        picture.startsWith("data:image/png"),
      ),
    ).toEqual(Object.values(PICTURE_FRAMES.kinds).map(() => true));
  });
});
