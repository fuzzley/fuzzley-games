import { cellArea } from "@fz/brick-wall/view/art";
import { frameNamed } from "@fz/phaser/testing/pure";
import { ART_PALETTE, ART_SCALE } from "../testing/art_frames";
import {
  DRAWN_KINDS,
  brickLayers,
  wallAtlasFrames,
} from "../view/art/atlas_frames";
import { FRAMES as FRAME_NAMES } from "../view/art/frames";
import { PICTURE_FRAMES, atlasWithPictures, pictureFrames } from "./pictures";

/** The field's frames as the art draws them, which the pictures are drawn from. */
const FRAMES = wallAtlasFrames(ART_PALETTE, ART_SCALE);

/** Returns the commands of the frames a brick's layers name, one over another. */
function layered(layers: readonly string[]): unknown[] {
  return layers.flatMap((layer) => frameNamed(FRAMES, layer).commands);
}

describe("PICTURE_FRAMES", () => {
  it("names a picture of each drawn kind of brick", () => {
    expect(Object.keys(PICTURE_FRAMES.bricks)).toEqual(DRAWN_KINDS);
  });

  it("names a floor bounce's spring, unlit and lit, as the band draws it", () => {
    expect(PICTURE_FRAMES.springs).toEqual({
      off: FRAME_NAMES.bounceOff,
      on: FRAME_NAMES.bounceOn,
    });
  });
});

describe("pictureFrames", () => {
  it("draws each picture its frame names, in a brick's cell", () => {
    const { width, height } = cellArea(ART_SCALE);

    const frames = pictureFrames(FRAMES, ART_SCALE);

    expect(
      frames.map((frame) => [frame.name, frame.width, frame.height]),
    ).toEqual(
      Object.values(PICTURE_FRAMES.bricks).map((name) => [name, width, height]),
    );
  });

  it("draws a kind's whole brick as the legend first writes it, in the first ink, its layers one over another", () => {
    const frames = pictureFrames(FRAMES, ART_SCALE);

    const tough = frames.find((frame) => frame.name === "picture-tough");

    expect(tough?.commands).toEqual(
      layered(
        brickLayers({ kind: "tough", tint: 0, hits: 2, full: 2, plates: 0 }),
      ),
    );
  });
});

describe("pictureFrames, short of a layer", () => {
  it("throws for a layer the frames hold no frame of, naming it", () => {
    const layer = FRAME_NAMES.tile(0);
    const short = FRAMES.filter(({ name }) => name !== layer);

    const drawing = (): unknown => pictureFrames(short, ART_SCALE);

    expect(drawing).toThrow(
      new RangeError(`The art draws no frame named ${layer}.`),
    );
  });
});

describe("atlasWithPictures", () => {
  it("bakes the field's frames, then the kinds' pictures drawn from them", () => {
    const frames = atlasWithPictures(ART_PALETTE, ART_SCALE);

    expect(frames).toEqual([...FRAMES, ...pictureFrames(FRAMES, ART_SCALE)]);
  });
});
