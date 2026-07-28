import { describe, it, expect } from "vitest";
import {
  FOUNDATION_COUNT,
  KlondikeRole,
  STOCK_PILE_ID,
  TABLEAU_COUNT,
  WASTE_PILE_ID,
  klondikeZoneSpec,
  klondikeZoneSpecs,
} from "@/games/klondike/klondike_zones";

const zonesOfRole = (role: string, drawCount: 1 | 3 = 3) =>
  klondikeZoneSpecs(drawCount).filter((zone) => zone.role === role);

describe("klondikeZoneSpecs", () => {
  it("declares every pile the board has", () => {
    expect(klondikeZoneSpecs(3).length).toBe(
      2 + FOUNDATION_COUNT + TABLEAU_COUNT,
    );
  });

  it("gives every zone a distinct id", () => {
    const ids = klondikeZoneSpecs(3).map((zone) => zone.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("puts every zone in a distinct grid cell", () => {
    const cells = klondikeZoneSpecs(3).map(
      (zone) => `${zone.slot.column}:${zone.slot.row}`,
    );

    expect(new Set(cells).size).toBe(cells.length);
  });

  it("leaves column 2 of the top row clear for the waste fan", () => {
    const topRow = klondikeZoneSpecs(3).filter((zone) => zone.slot.row === 0);

    expect(topRow.map((zone) => zone.slot.column)).not.toContain(2);
  });

  it("fans the waste in Draw 3", () => {
    const [waste] = zonesOfRole(KlondikeRole.WASTE, 3);

    expect(waste.layout).toEqual({
      kind: "fan-right",
      gap: 55,
      maxVisible: 3,
    });
  });

  it("shows a single waste card in Draw 1", () => {
    const [waste] = zonesOfRole(KlondikeRole.WASTE, 1);

    expect(waste.layout).toEqual({
      kind: "fan-right",
      gap: 55,
      maxVisible: 1,
    });
  });

  it("returns the same zones for a repeated draw mode", () => {
    expect(klondikeZoneSpecs(3)).toBe(klondikeZoneSpecs(3));
  });

  it("draws the stock face-down whatever its cards say", () => {
    const [stock] = zonesOfRole(KlondikeRole.STOCK);

    expect(stock.face).toBe("always-down");
  });

  it("makes the stock clickable but not draggable", () => {
    const [stock] = zonesOfRole(KlondikeRole.STOCK);

    expect(stock.draggable).toBe(false);
  });

  it("lets a tableau give up any face-up card", () => {
    const tableaus = zonesOfRole(KlondikeRole.TABLEAU);

    expect(tableaus.every((zone) => zone.grab.kind === "any-face-up")).toBe(
      true,
    );
  });

  it("lets a foundation give up only its top card", () => {
    const foundations = zonesOfRole(KlondikeRole.FOUNDATION);

    expect(foundations.every((zone) => zone.grab.kind === "top-only")).toBe(
      true,
    );
  });

  it("makes the stock and the waste no kind of destination at all", () => {
    const [stock] = zonesOfRole(KlondikeRole.STOCK);
    const [waste] = zonesOfRole(KlondikeRole.WASTE);

    expect([stock.accept, waste.accept]).toEqual([null, null]);
  });

  it("makes every foundation and tableau a destination", () => {
    const destinations = klondikeZoneSpecs(3).filter(
      (zone) => zone.accept !== null,
    );

    expect(destinations.length).toBe(FOUNDATION_COUNT + TABLEAU_COUNT);
  });
});

describe("klondikeZoneSpec", () => {
  it("finds a zone by its pile id", () => {
    expect(klondikeZoneSpec(STOCK_PILE_ID, 3)?.role).toBe(KlondikeRole.STOCK);
  });

  it("finds the waste", () => {
    expect(klondikeZoneSpec(WASTE_PILE_ID, 3)?.role).toBe(KlondikeRole.WASTE);
  });

  it("is undefined for a pile the board does not declare", () => {
    expect(klondikeZoneSpec("nowhere", 3)).toBeUndefined();
  });
});
