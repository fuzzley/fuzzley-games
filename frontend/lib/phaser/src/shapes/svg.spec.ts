import {
  type DrawCommand,
  circle,
  line,
  polygon,
  polyline,
  rect,
  ring,
  roundRect,
} from "./shapes";
import { type Drawing, svgOf } from "./svg";

/** Returns a drawing written as SVG, read back by the browser's parser. */
function parsed(drawing: Drawing): SVGSVGElement {
  const xml = new DOMParser().parseFromString(svgOf(drawing), "image/svg+xml");
  const root = xml.documentElement;
  if (!(root instanceof SVGSVGElement)) {
    throw new Error(`Not an SVG document: ${root.outerHTML}`);
  }
  return root;
}

/** Returns an element's attributes by name. */
function attributesOf(element: Element): Record<string, string> {
  return Object.fromEntries(
    Array.from(element.attributes, ({ name, value }) => [name, value]),
  );
}

/** Returns the one shape a drawing of one command is written as: its name and its attributes. */
function shapeOf(drawing: Drawing): {
  readonly name: string;
  readonly attributes: Record<string, string>;
} {
  const shapes = Array.from(parsed(drawing).children);
  const [shape] = shapes;
  if (shapes.length !== 1 || !shape) {
    throw new Error(`Not one shape: ${String(shapes.length)}`);
  }
  return { name: shape.localName, attributes: attributesOf(shape) };
}

/** Returns the opacities a command is written with, each its name and its value. */
function opacitiesOf(command: DrawCommand): [string, string][] {
  const { attributes } = shapeOf(drawingOf(command));
  return Object.entries(attributes).filter(([name]) =>
    name.endsWith("opacity"),
  );
}

/** Returns a square drawing of one command. */
function drawingOf(command: DrawCommand): Drawing {
  return { width: 40, height: 40, commands: [command] };
}

describe("svgOf", () => {
  it.each([
    ["square", 40, 40],
    ["twice as wide as tall", 80, 40],
  ])(
    "writes a %s drawing as an SVG document of its size, its box its own",
    (_, width, height) => {
      const svg = parsed({ width, height, commands: [] });

      expect([
        svg.namespaceURI,
        svg.getAttribute("width"),
        svg.getAttribute("height"),
        svg.getAttribute("viewBox"),
      ]).toEqual([
        "http://www.w3.org/2000/svg",
        String(width),
        String(height),
        `0 0 ${String(width)} ${String(height)}`,
      ]);
    },
  );

  it("writes each shape in turn, so each lies over those before it", () => {
    const svg = parsed({
      width: 80,
      height: 40,
      commands: [
        rect({ x: 0, y: 0, width: 80, height: 40 }, { color: 0x112233 }),
        circle({ x: 60, y: 20 }, 10, { color: 0x445566 }),
        line({ x: 0, y: 0 }, { x: 80, y: 40 }, { color: 0x778899, width: 2 }),
      ],
    });

    expect(Array.from(svg.children, (shape) => shape.localName)).toEqual([
      "rect",
      "circle",
      "line",
    ]);
  });

  it("fills a rectangle over its area", () => {
    const shape = shapeOf(
      drawingOf(
        rect({ x: 2, y: 3, width: 30, height: 10 }, { color: 0xff8000 }),
      ),
    );

    expect(shape).toEqual({
      name: "rect",
      attributes: {
        x: "2",
        y: "3",
        width: "30",
        height: "10",
        fill: "#ff8000",
      },
    });
  });

  it("rounds a rounded rectangle's corners by its radius", () => {
    const shape = shapeOf(
      drawingOf(
        roundRect({ x: 2, y: 3, width: 30, height: 10 }, 4, {
          color: 0x0000ff,
        }),
      ),
    );

    expect(shape).toEqual({
      name: "rect",
      attributes: {
        x: "2",
        y: "3",
        width: "30",
        height: "10",
        rx: "4",
        fill: "#0000ff",
      },
    });
  });

  it("fills a circle about its middle", () => {
    const shape = shapeOf(
      drawingOf(circle({ x: 12, y: 30 }, 5, { color: 0x10 })),
    );

    expect(shape).toEqual({
      name: "circle",
      attributes: { cx: "12", cy: "30", r: "5", fill: "#000010" },
    });
  });

  it("strokes a ring about its middle, filling nothing", () => {
    const shape = shapeOf(
      drawingOf(ring({ x: 12, y: 30 }, 5, { color: 0xabcdef, width: 3 })),
    );

    expect(shape).toEqual({
      name: "circle",
      attributes: {
        cx: "12",
        cy: "30",
        r: "5",
        fill: "none",
        stroke: "#abcdef",
        "stroke-width": "3",
      },
    });
  });

  it("strokes a line from a point to another, its ends cut straight across as SVG cuts them unless told", () => {
    const shape = shapeOf(
      drawingOf(
        line({ x: 1, y: 30 }, { x: 35, y: 4 }, { color: 0x123456, width: 2 }),
      ),
    );

    expect(shape).toEqual({
      name: "line",
      attributes: {
        x1: "1",
        y1: "30",
        x2: "35",
        y2: "4",
        stroke: "#123456",
        "stroke-width": "2",
      },
    });
  });

  it("strokes a polyline through its points, filling nothing, its corners mitred as far as a canvas mitres them", () => {
    const points = [
      { x: 1, y: 2 },
      { x: 20, y: 30 },
      { x: 39, y: 2 },
    ];

    const shape = shapeOf(
      drawingOf(polyline(points, { color: 0xff0000, width: 4 })),
    );

    expect(shape).toEqual({
      name: "polyline",
      attributes: {
        points: "1,2 20,30 39,2",
        fill: "none",
        stroke: "#ff0000",
        "stroke-width": "4",
        "stroke-miterlimit": "10",
      },
    });
  });

  it("fills a polygon within its points", () => {
    const points = [
      { x: 20, y: 2 },
      { x: 38, y: 38 },
      { x: 2, y: 38 },
    ];

    const shape = shapeOf(drawingOf(polygon(points, { color: 0x00ff00 })));

    expect(shape).toEqual({
      name: "polygon",
      attributes: { points: "20,2 38,38 2,38", fill: "#00ff00" },
    });
  });

  it.each<[string, string, DrawCommand]>([
    [
      "a rectangle",
      "fill-opacity",
      rect({ x: 2, y: 3, width: 30, height: 10 }, { color: 1, alpha: 1 / 3 }),
    ],
    [
      "a rounded rectangle",
      "fill-opacity",
      roundRect({ x: 2, y: 3, width: 30, height: 10 }, 4, {
        color: 1,
        alpha: 1 / 3,
      }),
    ],
    [
      "a circle",
      "fill-opacity",
      circle({ x: 12, y: 30 }, 5, { color: 1, alpha: 1 / 3 }),
    ],
    [
      "a ring",
      "stroke-opacity",
      ring({ x: 12, y: 30 }, 5, { color: 1, width: 3, alpha: 1 / 3 }),
    ],
    [
      "a line",
      "stroke-opacity",
      line(
        { x: 1, y: 30 },
        { x: 35, y: 4 },
        { color: 1, width: 2, alpha: 1 / 3 },
      ),
    ],
    [
      "a polyline",
      "stroke-opacity",
      polyline(
        [
          { x: 1, y: 2 },
          { x: 20, y: 30 },
        ],
        { color: 1, width: 4, alpha: 1 / 3 },
      ),
    ],
    [
      "a polygon",
      "fill-opacity",
      polygon(
        [
          { x: 20, y: 2 },
          { x: 38, y: 38 },
          { x: 2, y: 38 },
        ],
        { color: 1, alpha: 1 / 3 },
      ),
    ],
  ])(
    "writes %s at its alpha as its %s alone, to a thousandth",
    (_name, opacity, command) => {
      expect(opacitiesOf(command)).toEqual([[opacity, "0.333"]]);
    },
  );

  it.each<[string, string, DrawCommand]>([
    [
      "a rectangle",
      "fill-opacity",
      rect({ x: 2, y: 3, width: 30, height: 10 }, { color: 1, alpha: 0 }),
    ],
    [
      "a line",
      "stroke-opacity",
      line({ x: 1, y: 30 }, { x: 35, y: 4 }, { color: 1, width: 2, alpha: 0 }),
    ],
  ])(
    "writes %s at an alpha of 0 as its %s of 0, unseen",
    (_name, opacity, command) => {
      expect(opacitiesOf(command)).toEqual([[opacity, "0"]]);
    },
  );

  it("writes each number to a thousandth of a pixel, and never as -0", () => {
    const shape = shapeOf(
      drawingOf(circle({ x: 1 / 3, y: -0.0001 }, 2.0006, { color: 0 })),
    );

    expect(shape.attributes).toEqual({
      cx: "0.333",
      cy: "0",
      r: "2.001",
      fill: "#000000",
    });
  });
});
