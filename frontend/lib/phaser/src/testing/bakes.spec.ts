import { type Bake, drawsIn, fillsIn, recordBakes, stampsIn } from "./bakes";

/** Something a bake is handed to draw. */
const LINES = { lines: true };

/** A bake under a key that takes every command and draws nothing. */
class QuietBake implements Bake {
  constructor(readonly key: string) {}

  fill(..._command: unknown[]): this {
    return this;
  }

  stamp(..._command: unknown[]): this {
    return this;
  }

  draw(..._command: unknown[]): this {
    return this;
  }

  clear(..._command: unknown[]): this {
    return this;
  }

  render(..._command: unknown[]): this {
    return this;
  }
}

describe("recordBakes", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reads the commands a bake is handed in the order it is handed them", () => {
    const bake = new QuietBake("ground");
    const baked = recordBakes(bake);

    bake.clear();
    bake.fill(0x123456, 1, 1, 2, 30, 40);
    bake.stamp("atlas", "dot", 5, 6, { scale: 2 });
    bake.clear(1, 2, 3, 4);
    bake.stamp("atlas", 7);
    bake.fill(0x654321);
    bake.draw(LINES, -3, -4);
    bake.draw(LINES);
    bake.render();

    expect(baked("ground")).toEqual([
      { kind: "clear", rect: null },
      {
        kind: "fill",
        color: 0x123456,
        rect: { x: 1, y: 2, width: 30, height: 40 },
      },
      { kind: "stamp", frame: "dot", x: 5, y: 6, scale: 2 },
      { kind: "clear", rect: { x: 1, y: 2, width: 3, height: 4 } },
      { kind: "stamp", frame: "7", x: 0, y: 0, scale: 1 },
      {
        kind: "fill",
        color: 0x654321,
        rect: { x: 0, y: 0, width: 0, height: 0 },
      },
      { kind: "draw", drawn: LINES, x: -3, y: -4 },
      { kind: "draw", drawn: LINES, x: 0, y: 0 },
      { kind: "render" },
    ]);
  });

  it("reads every bake's commands, handed their prototype, those of the key asked for alone", () => {
    const baked = recordBakes(QuietBake.prototype);
    const ground = new QuietBake("ground");
    const wall = new QuietBake("wall");

    ground.fill(1);
    wall.fill(2);
    wall.render();
    ground.render();

    expect({ ground: baked("ground"), wall: baked("wall") }).toEqual({
      ground: [
        { kind: "fill", color: 1, rect: { x: 0, y: 0, width: 0, height: 0 } },
        { kind: "render" },
      ],
      wall: [
        { kind: "fill", color: 2, rect: { x: 0, y: 0, width: 0, height: 0 } },
        { kind: "render" },
      ],
    });
  });

  it("reads a clear of a place with no size as a clear of nothing", () => {
    const bake = new QuietBake("ground");
    const baked = recordBakes(bake);

    bake.clear(1, 2);

    expect(baked("ground")).toEqual([
      { kind: "clear", rect: { x: 1, y: 2, width: 0, height: 0 } },
    ]);
  });

  it("reads nothing a bake was handed before", () => {
    const bake = new QuietBake("ground");
    bake.render();
    const baked = recordBakes(bake);

    expect(baked("ground")).toEqual([]);
  });

  it("reads through the spies a spec already made, from the calls they hold now on", () => {
    const bake = new QuietBake("ground");
    vi.spyOn(bake, "fill");
    vi.spyOn(bake, "stamp");
    vi.spyOn(bake, "draw");
    vi.spyOn(bake, "clear");
    vi.spyOn(bake, "render");
    bake.fill(1);
    bake.stamp("atlas", "a");
    bake.draw(LINES);
    bake.clear();
    bake.render();
    const baked = recordBakes(bake);

    bake.fill(2);

    expect(baked("ground")).toEqual([
      { kind: "fill", color: 2, rect: { x: 0, y: 0, width: 0, height: 0 } },
    ]);
  });

  it("reads no command of a bake with no key", () => {
    const bake: Bake = {
      fill: () => undefined,
      stamp: () => undefined,
      draw: () => undefined,
      clear: () => undefined,
      render: () => undefined,
    };
    const baked = recordBakes(bake);

    bake.fill(1);
    bake.draw(LINES);
    bake.render();

    expect(baked("ground")).toEqual([]);
  });

  it("hands each command on to the bake", () => {
    const filled: number[] = [];
    const bake = new QuietBake("ground");
    bake.fill = function (this: QuietBake, color: unknown) {
      filled.push(Number(color));
      return this;
    };
    recordBakes(bake);

    bake.fill(0x123456);

    expect(filled).toEqual([0x123456]);
  });
});

describe("stampsIn, drawsIn and fillsIn", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("pick out the stamps, the draws and the fills among a bake's commands, in order", () => {
    const bake = new QuietBake("ground");
    const baked = recordBakes(bake);
    bake.fill(1);
    bake.stamp("atlas", "a");
    bake.draw(LINES, 1);
    bake.render();
    bake.stamp("atlas", "b");
    bake.draw(LINES, 2);
    bake.fill(2);

    expect({
      stamps: stampsIn(baked("ground")).map(({ frame }) => frame),
      draws: drawsIn(baked("ground")).map(({ x }) => x),
      fills: fillsIn(baked("ground")).map(({ color }) => color),
    }).toEqual({ stamps: ["a", "b"], draws: [1, 2], fills: [1, 2] });
  });
});
