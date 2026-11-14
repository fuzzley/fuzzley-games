import type { PixelRect } from "./layout";
import { sidePanels } from "./side_panels";

/** A roomy window's room at 1×, 1280 by 800 CSS px from the canvas's corner. */
const ROOM: PixelRect = { x: 0, y: 0, width: 1280, height: 800 };

/** Returns a field in the middle of a room, some device pixels across, 20 in from its top and its bottom. */
function middleOf(room: PixelRect, width: number): PixelRect {
  return {
    x: room.x + Math.floor((room.width - width) / 2),
    y: room.y + 20,
    width,
    height: room.height - 40,
  };
}

/** Returns a room at a pixel ratio, and a field 400 CSS px across in its middle, the room sparing some device pixels each side of it. */
function sparing(spare: number, ratio: number): [PixelRect, PixelRect] {
  const width = 400 * ratio;
  const room = { x: 0, y: 0, width: width + 2 * spare, height: 800 * ratio };
  return [room, middleOf(room, width)];
}

describe("sidePanels", () => {
  it("stands the widest panel either side of a field the room spares plenty beside, the gap from it, as tall as it and level with it", () => {
    const panels = sidePanels(ROOM, middleOf(ROOM, 400), 1);

    expect(panels).toEqual({
      left: { x: 108, y: 20, width: 320, height: 760 },
      right: { x: 852, y: 20, width: 320, height: 760 },
    });
  });

  it("makes both panels as wide as the narrower side spares past the gap, where it is the left", () => {
    const room = { x: 10, y: 0, width: 1000, height: 600 };

    // 240 spare on the left, 260 on the right.
    const panels = sidePanels(
      room,
      { x: 250, y: 0, width: 500, height: 600 },
      1,
    );

    expect(panels).toEqual({
      left: { x: 10, y: 0, width: 228, height: 600 },
      right: { x: 762, y: 0, width: 228, height: 600 },
    });
  });

  it("makes both panels as wide as the narrower side spares past the gap, where it is the right", () => {
    const room = { x: 10, y: 0, width: 1000, height: 600 };

    // 260 spare on the left, 240 on the right.
    const panels = sidePanels(
      room,
      { x: 270, y: 0, width: 500, height: 600 },
      1,
    );

    expect(panels).toEqual({
      left: { x: 30, y: 0, width: 228, height: 600 },
      right: { x: 782, y: 0, width: 228, height: 600 },
    });
  });

  it("spares the panels whole device pixels of a room whose width isn't whole", () => {
    const room = { x: 0, y: 0, width: 999.5, height: 600 };

    // 250 spare on the left, 249.5 on the right.
    const panels = sidePanels(
      room,
      { x: 250, y: 0, width: 500, height: 600 },
      1,
    );

    expect(panels?.right.width).toBe(237);
  });

  it("gives the panels in CSS pixels at a pixel ratio", () => {
    const room = { x: 0, y: 0, width: 2560, height: 1600 };

    const panels = sidePanels(room, middleOf(room, 800), 2);

    expect(panels).toEqual({
      left: { x: 108, y: 10, width: 320, height: 780 },
      right: { x: 852, y: 10, width: 320, height: 780 },
    });
  });

  it.each([1, 2, 3])(
    "stands panels of the least width where a room at %i× spares 184 CSS px a side",
    (ratio) => {
      const [room, field] = sparing(184 * ratio, ratio);

      const panels = sidePanels(room, field, ratio);

      expect([panels?.left.width, panels?.right.width]).toEqual([172, 172]);
    },
  );

  it.each([1, 2, 3])(
    "stands no panels where a room at %i× spares a device pixel under 184 CSS px a side",
    (ratio) => {
      const [room, field] = sparing(184 * ratio - 1, ratio);

      expect(sidePanels(room, field, ratio)).toBeNull();
    },
  );

  it("stands no panels where only one side spares too little", () => {
    const room = { x: 0, y: 0, width: 1000, height: 600 };

    // 300 spare on the left, 183 on the right.
    const field = { x: 300, y: 0, width: 517, height: 600 };

    expect(sidePanels(room, field, 1)).toBeNull();
  });

  it("stands the least panel at 2.625× once a side spares 484 device pixels, as the gap rounds up to 32 and the least, 451.5, to 452", () => {
    const [room, field] = sparing(484, 2.625);

    expect(sidePanels(room, field, 2.625)?.left.width).toBe(452 / 2.625);
  });

  it("stands no panels at 2.625× where a side spares just 184 CSS px, 483 device pixels", () => {
    const [room, field] = sparing(483, 2.625);

    expect(sidePanels(room, field, 2.625)).toBeNull();
  });

  it("rounds the widest panel to whole device pixels where it isn't whole", () => {
    const room = { x: 0, y: 0, width: 2000, height: 600 };

    // At 1.33×, the widest, 425.6 device pixels, rounds to 426.
    const panels = sidePanels(
      room,
      { x: 700, y: 0, width: 600, height: 600 },
      1.33,
    );

    expect(panels?.left.width).toBe(426 / 1.33);
  });

  it("counts a least a float's hair over a whole device pixel as that pixel", () => {
    const ratio = 51 / 43;
    const room = { x: 0, y: 0, width: 1000, height: 600 };

    // The least, 172 × 51 / 43, comes to 204.00000000000003, and the gap
    // rounds to 14: 218 spare on each side.
    const panels = sidePanels(
      room,
      { x: 218, y: 0, width: 564, height: 600 },
      ratio,
    );

    expect(panels?.left.width).toBe(204 / ratio);
  });

  it("stands no panels in a room with no area, as a hidden board's", () => {
    const empty = { x: 0, y: 0, width: 0, height: 0 };

    expect(sidePanels(empty, empty, 1)).toBeNull();
  });
});
