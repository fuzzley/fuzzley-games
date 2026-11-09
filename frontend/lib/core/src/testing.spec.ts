import { FRAME_MS, playFor, playUntil } from "./testing";

/** A game that keeps each frame it is played, as its length and its steering. */
class Recorded {
  readonly frames: [ms: number, steer: string][] = [];

  tick(ms: number, steer: string): void {
    this.frames.push([ms, steer]);
  }
}

/** Says how a ship is steered: a turn left, none or right, and whether it fires. */
interface ShipSteer {
  readonly turn: -1 | 0 | 1;
  readonly fire: boolean;
}

/** A game that keeps each steer it is played with, all a ship steers by. */
class Ship {
  readonly steers: ShipSteer[] = [];

  tick(_ms: number, steer: ShipSteer): void {
    this.steers.push(steer);
  }
}

describe("FRAME_MS", () => {
  it("is a frame's length at 60 a second", () => {
    expect(FRAME_MS * 60).toBeCloseTo(1000);
  });
});

describe("playUntil", () => {
  it("plays a frame at a time, steered as the rule says for each, until it comes to pass", () => {
    const game = new Recorded();

    playUntil(
      game,
      (played) => `frame ${played.frames.length}`,
      () => game.frames.length === 3,
    );

    expect(game.frames).toEqual([
      [FRAME_MS, "frame 0"],
      [FRAME_MS, "frame 1"],
      [FRAME_MS, "frame 2"],
    ]);
  });

  it("plays nothing when it has come to pass already", () => {
    const game = new Recorded();

    playUntil(
      game,
      () => "on",
      () => true,
    );

    expect(game.frames).toEqual([]);
  });

  it("takes, as a type, only a rule that steers by all the game steers by", () => {
    const ship = new Ship();

    playUntil(
      ship,
      // @ts-expect-error A steer without a turn isn't all the ship steers by.
      () => ({ fire: true }),
      () => true,
    );
    playUntil(
      ship,
      () => ({ turn: 1, fire: true }),
      () => ship.steers.length === 1,
    );

    expect(ship.steers).toEqual([{ turn: 1, fire: true }]);
  });

  it("takes, as a type, a rule written inline that steers by a literal", () => {
    const ship = new Ship();

    playUntil(
      ship,
      () => ({ turn: 1, fire: false }),
      () => ship.steers.length === 1,
    );
    playUntil(
      ship,
      (played) => ({ turn: played.steers.length > 1 ? 0 : -1, fire: true }),
      () => ship.steers.length === 3,
    );

    expect(ship.steers).toEqual([
      { turn: 1, fire: false },
      { turn: -1, fire: true },
      { turn: 0, fire: true },
    ]);
  });

  it("plays frames of the length asked", () => {
    const game = new Recorded();

    playUntil(
      game,
      () => "on",
      () => game.frames.length === 2,
      50,
    );

    expect(game.frames).toEqual([
      [50, "on"],
      [50, "on"],
    ]);
  });

  it("fails past a minute's frames at 60 a second when it never comes to pass", () => {
    const game = new Recorded();

    expect(() => {
      playUntil(
        game,
        () => "on",
        () => false,
      );
    }).toThrow("It never came to pass.");
    expect(game.frames).toHaveLength(3601);
  });
});

describe("playFor", () => {
  it("plays a frame at a time for a while, steered the same throughout", () => {
    const game = new Recorded();

    playFor(game, 50, "left");

    expect(game.frames).toEqual([
      [FRAME_MS, "left"],
      [FRAME_MS, "left"],
      [FRAME_MS, "left"],
    ]);
  });

  it("plays nothing for no time", () => {
    const game = new Recorded();

    playFor(game, 0, "left");

    expect(game.frames).toEqual([]);
  });

  it("takes, as a type, only a steer that is all the game steers by", () => {
    const ship = new Ship();
    const firing = { fire: true };

    // @ts-expect-error A steer without a turn isn't all the ship steers by.
    playFor(ship, 0, firing);
    playFor(ship, 20, { turn: -1, fire: true });

    expect(ship.steers).toEqual([
      { turn: -1, fire: true },
      { turn: -1, fire: true },
    ]);
  });
});
