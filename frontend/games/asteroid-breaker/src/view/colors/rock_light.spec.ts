import { FLAT } from "../art/rocks/cut";
import { litBy } from "../art/rocks/light";
import {
  ROCK_LIGHTS,
  faceExtremes,
  farLight,
  inLight,
  lightAt,
} from "./rock_light";

/** A field on the canvas, wider than it is tall, away from the canvas's corner. */
const FIELD = { x: 20, y: 10, width: 800, height: 500 } as const;

describe("lightAt", () => {
  it.each([0.3, 0.786, 1])(
    "stands the light at a height of %f, its way of length 1",
    (height) => {
      const { x, y, z } = lightAt(height, 0.5).way;

      expect([Math.hypot(x, y, z), z]).toEqual([expect.closeTo(1, 12), height]);
    },
  );

  it("stands the light off to the upper left, as the art kit's", () => {
    const { x, y } = lightAt(0.5, 0.5).way;

    expect([Math.sign(x), Math.sign(y), y / x]).toEqual([
      -1,
      -1,
      expect.closeTo(0.62 / 0.52, 12),
    ]);
  });

  it.each([
    [0.786, 0.486],
    [0.365, 0.74],
  ])(
    "shows a face toward the viewer in its own ink, at a height of %f and an ambient of %f",
    (height, ambient) => {
      expect(litBy(FLAT, 0, lightAt(height, ambient))).toBeCloseTo(1, 12);
    },
  );

  it("leaves the ambient on a face turned away from the light", () => {
    const light = lightAt(0.5, 0.4);
    const away = { x: -light.way.x, y: -light.way.y, z: -light.way.z };

    expect(litBy(away, 0, light)).toBe(0.4);
  });
});

describe("ROCK_LIGHTS", () => {
  it("stands a light palette's light higher than a dark one's, and leaves it less ambient", () => {
    const { light, dark } = ROCK_LIGHTS;

    expect([light.way.z > dark.way.z, light.ambient < dark.ambient]).toEqual([
      true,
      true,
    ]);
  });
});

describe("inLight", () => {
  it("multiplies each channel by the light's strength, rounded", () => {
    expect(inLight(0x806040, 0.5)).toBe(0x403020);
  });

  it("keeps each channel within a byte", () => {
    expect(inLight(0x80c0ff, 1.5)).toBe(0xc0ffff);
  });
});

describe("faceExtremes", () => {
  it("shows an ink at the ambient on its darkest face, and at the ambient and the light on its brightest", () => {
    const light = { way: FLAT, ambient: 0.5, intensity: 0.75 };

    expect(faceExtremes(0x808080, light)).toEqual({
      darkest: 0x404040,
      brightest: 0xa0a0a0,
    });
  });
});

describe("farLight", () => {
  it.each([ROCK_LIGHTS.light, ROCK_LIGHTS.dark])(
    "stands the light a hundred of the field's longer sides off its way from its middle, %o",
    (light) => {
      const place = farLight(FIELD, light);
      const off = {
        x: place.x - (FIELD.x + FIELD.width / 2),
        y: place.y - (FIELD.y + FIELD.height / 2),
        z: place.z,
      };
      const far = Math.hypot(off.x, off.y, off.z);

      expect({
        way: [off.x / far, off.y / far, off.z / far],
        far: Math.round(far),
      }).toEqual({
        way: [
          expect.closeTo(light.way.x, 12),
          expect.closeTo(light.way.y, 12),
          expect.closeTo(light.way.z, 12),
        ],
        far: 100 * FIELD.width,
      });
    },
  );

  it("reaches far enough that it fades by less than a part in a hundred thousand across the field", () => {
    const place = farLight(FIELD, ROCK_LIGHTS.light);
    // How far the field's farthest corner is from the light, at the most.
    const farthest =
      Math.hypot(place.x - FIELD.x, place.y - FIELD.y, place.z) +
      Math.hypot(FIELD.width, FIELD.height);

    expect(1 - (farthest / place.radius) ** 2).toBeGreaterThan(1 - 1e-5);
  });
});
