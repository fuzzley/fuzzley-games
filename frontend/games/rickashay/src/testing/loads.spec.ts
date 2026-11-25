import { OFFLINE, heldLoad } from "./loads";

/** A component, as far as a load sees one: a class. */
class Shown {
  readonly shown = true;
}

/** Resolves to what a load has come to so far: its component, its error, or "waiting". */
async function settledOf(load: Promise<unknown>): Promise<unknown> {
  const waiting = new Promise((resolve) => setTimeout(resolve, 0, "waiting"));
  return Promise.race([load.catch((error: unknown) => error), waiting]);
}

describe("heldLoad", () => {
  it("keeps a load waiting until it is let arrive", async () => {
    const { load } = heldLoad(Shown);

    await expect(settledOf(load())).resolves.toBe("waiting");
  });

  it("hands the component to the earliest load waiting as it arrives", async () => {
    const held = heldLoad(Shown);
    const first = held.load();
    const second = held.load();

    held.arrive();

    expect([await settledOf(first), await settledOf(second)]).toEqual([
      Shown,
      "waiting",
    ]);
  });

  it("fails the earliest load waiting, as a chunk that can't be fetched does", async () => {
    const held = heldLoad(Shown);
    const first = held.load();
    const second = held.load();

    held.fail();

    expect([await settledOf(first), await settledOf(second)]).toEqual([
      OFFLINE,
      "waiting",
    ]);
  });
});
