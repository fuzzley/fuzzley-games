import { normalColor, litBy } from "./light";
import type { RockLight } from "./light";
import { unitFacing } from "./space";

/** The art kit's light: its way, 0.3 ambient and 0.95 more full on. */
const KIT_LIGHT: RockLight = {
  way: unitFacing({ x: -0.52, y: -0.62, z: 0.58 }),
  ambient: 0.3,
  intensity: 0.95,
};

// What the art kit's `litBy()` and `normalColor()` give for a face toward
// the viewer and three of its boulder's facets, at no turn and at 1.3
// radians, copied from the kit.
const KIT_LIGHTING = [
  {
    name: "a face toward the viewer",
    facing: [0, 0, 1],
    turn: 0,
    lit: 0.8534405192916994,
    normal: 0x8080ff,
  },
  {
    name: "a face toward the viewer",
    facing: [0, 0, 1],
    turn: 1.3,
    lit: 0.8534405192916994,
    normal: 0x8080ff,
  },
  {
    name: "the boulder's brightest facet",
    facing: [-0.42575367081872406, -0.6589834513003455, 0.6200601766737375],
    turn: 0,
    lit: 1.2442807398820057,
    normal: 0x49d4cf,
  },
  {
    name: "the boulder's brightest facet",
    facing: [-0.42575367081872406, -0.6589834513003455, 0.6200601766737375],
    turn: 1.3,
    lit: 0.731600500889311,
    normal: 0xc2cacf,
  },
  {
    name: "a middling facet",
    facing: [0.5221352323219518, -0.4524473794903894, 0.7229565463846227],
    turn: 0,
    lit: 0.7087080480199439,
    normal: 0xc2b9dc,
  },
  {
    name: "a middling facet",
    facing: [0.5221352323219518, -0.4524473794903894, 0.7229565463846227],
    turn: 1.3,
    lit: 0.3,
    normal: 0xc94fdc,
  },
  {
    name: "its darkest facet",
    facing: [0.1950141574551472, 0.7452247720567022, 0.6376594055646756],
    turn: 0,
    lit: 0.3,
    normal: 0x9820d1,
  },
  {
    name: "its darkest facet",
    facing: [0.1950141574551472, 0.7452247720567022, 0.6376594055646756],
    turn: 1.3,
    lit: 0.7542158272378183,
    normal: 0x2b4ed1,
  },
] as const;

describe("litBy()", () => {
  it.each(KIT_LIGHTING)(
    "lights $name as the kit does, at a turn of $turn",
    ({ facing: [x, y, z], turn, lit }) => {
      expect(litBy({ x, y, z }, turn, KIT_LIGHT)).toBeCloseTo(lit, 12);
    },
  );

  it("gives the ambient alone to a facet turned away from the light", () => {
    const away = { x: 0.52, y: 0.62, z: -0.58 };

    expect(litBy(away, 0, KIT_LIGHT)).toBe(0.3);
  });

  it("gives the ambient and the intensity to a facet turned straight at it", () => {
    expect(litBy(KIT_LIGHT.way, 0, KIT_LIGHT)).toBeCloseTo(1.25, 12);
  });
});

describe("normalColor()", () => {
  it.each(KIT_LIGHTING)(
    "holds the way of $name as the kit does, at a turn of $turn",
    ({ facing: [x, y, z], turn, normal }) => {
      expect(normalColor({ x, y, z }, turn)).toBe(normal);
    },
  );

  it("holds a face toward the viewer at no turn as blue alone, over grey", () => {
    expect(normalColor({ x: 0, y: 0, z: 1 })).toBe(0x8080ff);
  });
});
