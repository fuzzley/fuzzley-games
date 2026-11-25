import { CertificateLine } from "./certificate_line";

/** A line of two shots. */
const LINE = [2, 8];

describe("CertificateLine", () => {
  /** The run the spec's line is started in: its id and the level in play. */
  const RUN = { id: 3, level: 2 };

  /** Where the spec's line's rounds start: on the depth it was found on. */
  const ON_DEPTH = { depth: 12 };

  /** Returns a line of the spec's shots started in its run, on its depth. */
  function started(): CertificateLine<number> {
    const line = new CertificateLine<number>();
    line.start(LINE, 12, RUN);
    return line;
  }

  it("has no shot until it is started", () => {
    const line = new CertificateLine<number>();

    expect([line.next(RUN, ON_DEPTH), line.playing()]).toEqual([
      undefined,
      false,
    ]);
  });

  it("gives its first shot, and the same again till that shot flies", () => {
    const line = started();

    expect([line.next(RUN, ON_DEPTH), line.next(RUN, ON_DEPTH)]).toEqual([
      2, 2,
    ]);
  });

  it("gives each shot in turn as the one before flies, then none", () => {
    const line = started();

    const first = line.next(RUN, ON_DEPTH);
    line.flew();
    const second = line.next(RUN, ON_DEPTH);
    line.flew();

    expect([first, second, line.next(RUN, ON_DEPTH), line.playing()]).toEqual([
      2,
      8,
      undefined,
      false,
    ]);
  });

  it("plays while it has a shot left to fly", () => {
    const line = started();
    line.flew();

    expect([line.next(RUN, ON_DEPTH), line.playing()]).toEqual([8, true]);
  });

  it.each([
    ["another run", { ...RUN, id: 4 }, ON_DEPTH],
    ["another level", { ...RUN, level: 3 }, ON_DEPTH],
    ["another depth", RUN, { depth: 13 }],
  ])("drops its shots once %s is in play", (_, run, start) => {
    const line = started();

    const shot = line.next(run, start);

    expect([shot, line.next(RUN, ON_DEPTH), line.playing()]).toEqual([
      undefined,
      undefined,
      false,
    ]);
  });
});
