import { RING_GIVE, Stick, THRUST_RING, TURN_RING } from "./stick";

/** How far the knob reaches in these specs, in device pixels. */
const REACH = 100;

/** Where the stick is pressed in these specs. */
const AT = { x: 200, y: 300 };

/** Returns a stick held by finger 1, pressed at {@link AT}. */
function heldStick(): Stick {
  const stick = new Stick(REACH);
  stick.press(1, AT);
  return stick;
}

/** Returns a place a share of the reach from {@link AT}, along a heading. */
function out(share: number, heading = 0): { x: number; y: number } {
  return {
    x: AT.x + Math.cos(heading) * share * REACH,
    y: AT.y + Math.sin(heading) * share * REACH,
  };
}

describe("Stick", () => {
  it("sets its base and knob where the finger lands, asking nothing", () => {
    const stick = new Stick(REACH);

    stick.press(1, AT);

    expect([stick.held, stick.base, stick.knob]).toEqual([true, AT, AT]);
    expect([stick.heading(), stick.thrust()]).toEqual([null, 0]);
  });

  it("keeps the finger that holds it, whoever else presses", () => {
    const stick = heldStick();

    const taken = stick.press(2, { x: 0, y: 0 });

    expect([taken, stick.base]).toEqual([false, AT]);
  });

  it("follows only the finger that holds it", () => {
    const stick = heldStick();

    const moved = stick.move(2, out(1));

    expect([moved, stick.knob]).toEqual([false, AT]);
  });

  it("turns the ship nowhere up to its turn ring", () => {
    const stick = heldStick();

    stick.move(1, out(TURN_RING));

    expect(stick.heading()).toBeNull();
  });

  it.each([
    ["right", 0],
    ["down", Math.PI / 2],
    ["left", Math.PI],
    ["up", -Math.PI / 2],
  ])(
    "turns the ship %s where it points past its turn ring",
    (_way, heading) => {
      const stick = heldStick();

      stick.move(1, out(TURN_RING + 0.01, heading));

      expect(stick.heading()).toBeCloseTo(heading);
    },
  );

  it("keeps turning the ship as its knob comes back within the give of its turn ring", () => {
    const stick = heldStick();
    stick.move(1, out(TURN_RING + 0.01));

    stick.move(1, out(TURN_RING - RING_GIVE + 0.01));

    expect(stick.heading()).toBe(0);
  });

  it("stops turning the ship as its knob comes back past the give of its turn ring", () => {
    const stick = heldStick();
    stick.move(1, out(TURN_RING + 0.01));

    stick.move(1, out(TURN_RING - RING_GIVE - 0.01));

    expect(stick.heading()).toBeNull();
  });

  it("pushes nothing up to its thrust ring", () => {
    const stick = heldStick();

    stick.move(1, out(THRUST_RING));

    expect([stick.thrusting, stick.thrust()]).toEqual([false, 0]);
  });

  it.each([
    [THRUST_RING + 0.01, 0.02],
    [0.75, 0.5],
    [1, 1],
  ])(
    "pushes from nothing at its thrust ring to full at its edge: %s out, %s",
    (share, push) => {
      const stick = heldStick();

      stick.move(1, out(share));

      expect(stick.thrusting).toBe(true);
      expect(stick.thrust()).toBeCloseTo(push);
    },
  );

  it("keeps thrusting, pushing nothing, as its knob comes back within the give of its thrust ring", () => {
    const stick = heldStick();
    stick.move(1, out(0.75));

    stick.move(1, out(THRUST_RING - RING_GIVE + 0.01));

    expect([stick.thrusting, stick.thrust()]).toEqual([true, 0]);
  });

  it("stops thrusting as its knob comes back past the give of its thrust ring", () => {
    const stick = heldStick();
    stick.move(1, out(0.75));

    stick.move(1, out(THRUST_RING - RING_GIVE - 0.01));

    expect(stick.thrusting).toBe(false);
  });

  it("is at full push only at its edge", () => {
    const stick = heldStick();

    stick.move(1, out(0.99));

    expect(stick.full).toBe(false);
  });

  it("stops its knob at its edge and moves its base after a finger dragged past it", () => {
    const stick = heldStick();

    stick.move(1, out(1.5));

    expect([stick.knob, stick.base, stick.full]).toEqual([
      out(1.5),
      out(0.5),
      true,
    ]);
  });

  it("measures its knob from where its base followed to", () => {
    const stick = heldStick();
    stick.move(1, out(1.5));

    stick.move(1, out(1.25));

    expect(stick.thrust()).toBeCloseTo(0.5);
  });

  it("lets go as the finger holding it lifts", () => {
    const stick = heldStick();
    stick.move(1, out(1));

    const lifted = stick.lift(1);

    expect([
      lifted,
      stick.held,
      stick.heading(),
      stick.thrust(),
      stick.thrusting,
      stick.full,
    ]).toEqual([true, false, null, 0, false, false]);
  });

  it("stays held as another finger lifts", () => {
    const stick = heldStick();

    const lifted = stick.lift(2);

    expect([lifted, stick.held]).toEqual([false, true]);
  });

  it("lets go of its finger as the game pauses, so another may take it", () => {
    const stick = heldStick();

    stick.letGo();

    expect(stick.press(2, AT)).toBe(true);
  });

  it("reaches as far as it is measured to", () => {
    const stick = new Stick(REACH);
    stick.measure(2 * REACH);
    stick.press(1, AT);

    stick.move(1, out(1.5));

    expect(stick.thrust()).toBeCloseTo(0.5);
  });

  // At twice the reach, the knob 75 out becomes 150 out, laid from where
  // the finger next moves to.
  it("lays its base afresh as the finger next moves, once the canvas changes under it, so it asks what it did", () => {
    const stick = heldStick();
    stick.move(1, out(0.75));
    stick.measure(2 * REACH);

    stick.move(1, { x: 0, y: 0 });

    expect([stick.base, stick.heading(), stick.thrust()]).toEqual([
      { x: -150, y: 0 },
      0,
      0.5,
    ]);
  });

  it("lays its base afresh down the canvas as across it", () => {
    const stick = heldStick();
    stick.move(1, { x: AT.x, y: AT.y + 75 });
    stick.measure(2 * REACH);

    stick.move(1, { x: 0, y: 0 });

    expect(stick.base).toEqual({ x: 0, y: -150 });
  });

  it("lays its base afresh only once, at the first move after the canvas changes", () => {
    const stick = heldStick();
    stick.move(1, out(0.75));
    stick.measure(2 * REACH);
    stick.move(1, { x: 0, y: 0 });

    stick.move(1, { x: 10, y: 0 });

    expect(stick.base).toEqual({ x: -150, y: 0 });
  });

  it("carries its base's place through two changes of the canvas before the finger moves", () => {
    const stick = heldStick();
    stick.move(1, out(0.75));
    stick.measure(2 * REACH);
    stick.measure(4 * REACH);

    stick.move(1, { x: 0, y: 0 });

    expect(stick.base).toEqual({ x: -300, y: 0 });
  });

  it("forgets a change of the canvas under its finger as the finger lifts", () => {
    const stick = heldStick();
    stick.move(1, out(0.75));
    stick.measure(2 * REACH);
    stick.lift(1);
    stick.press(2, AT);

    stick.move(2, AT);

    expect(stick.base).toEqual(AT);
  });

  it("lays its base where a finger lands after the canvas changes with none on it", () => {
    const stick = new Stick(REACH);
    stick.measure(2 * REACH);
    stick.press(1, AT);

    stick.move(1, AT);

    expect(stick.base).toEqual(AT);
  });
});
