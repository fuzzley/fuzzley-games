import { describe, it, expect } from "vitest";
import { ZoneSpec } from "@/engine/tableau/zone";
import { eightOffZoneSpecs } from "@/games/eight_off/eight_off_zones";
import { seahavenZoneSpecs } from "@/games/seahaven/seahaven_zones";

/**
 * The zones each board declares, checked against what they were before the
 * shared row builders replaced the hand-written loops.
 *
 * A mechanical migration across fourteen boards is exactly the kind of change
 * that passes every game's own tests while quietly moving a pile one column
 * over or dropping a placeholder. The expectations below are the boards as they
 * were, transcribed from the previous revision — so this fails if the
 * rewrite changed anything a player could see.
 *
 * Functions are compared by what they are rather than by identity: a rule is a
 * fresh closure on each build, so the useful question is whether a zone that
 * accepted cards still accepts them and one that never did still does not.
 */
interface ComparableZone {
  readonly id: string;
  readonly role: string;
  readonly column: number;
  readonly row: number;
  readonly layout: unknown;
  readonly capacity?: number;
  readonly acceptsAnything: boolean;
  readonly grabKind: string;
  readonly draggable: boolean;
  readonly face: string;
  readonly backgroundKey?: string;
  readonly emptyIsActionable?: boolean;
}

function comparable(zone: ZoneSpec): ComparableZone {
  return {
    id: zone.id,
    role: zone.role,
    column: zone.slot.column,
    row: zone.slot.row,
    layout: zone.layout,
    capacity: zone.capacity,
    acceptsAnything: zone.accept !== null,
    grabKind: zone.grab.kind,
    draggable: zone.draggable,
    face: zone.face,
    backgroundKey: zone.backgroundKey,
    emptyIsActionable: zone.emptyIsActionable,
  };
}

const STACKED = { kind: "stacked" };
const OPEN_COLUMN = {
  kind: "fan-down",
  faceUpGap: 45,
  faceDownGap: 45,
  hoverExpansion: 15,
};

/** A cell as every all-face-up game declared one. */
function cell(index: number, role: string, column: number): ComparableZone {
  return {
    id: `cell-${index}`,
    role,
    column,
    row: 0,
    layout: STACKED,
    capacity: 1,
    acceptsAnything: true,
    grabKind: "top-only",
    draggable: true,
    face: "always-up",
    backgroundKey: "card-placeholder",
    emptyIsActionable: undefined,
  };
}

/** A foundation as every game declared one. */
function foundation(index: number, role: string, column: number) {
  return {
    id: `foundation-${index}`,
    role,
    column,
    row: 0,
    layout: STACKED,
    capacity: undefined,
    acceptsAnything: true,
    grabKind: "top-only",
    draggable: true,
    face: "always-up",
    backgroundKey: "card-placeholder-full-border-circle",
    emptyIsActionable: undefined,
  };
}

/** An all-face-up, same-suit-run column. */
function openColumn(index: number, role: string, column: number) {
  return {
    id: `tableau-${index}`,
    role,
    column,
    row: 1,
    layout: OPEN_COLUMN,
    capacity: undefined,
    acceptsAnything: true,
    grabKind: "run",
    draggable: true,
    face: "always-up",
    backgroundKey: "card-placeholder",
    emptyIsActionable: undefined,
  };
}

function counted(count: number, build: (index: number) => ComparableZone) {
  return Array.from({ length: count }, (_, index) => build(index));
}

describe("board zones survive the move to shared row builders", () => {
  it("declares the Seahaven board exactly as it was", () => {
    const zones = seahavenZoneSpecs().map(comparable);

    expect(zones).toEqual([
      ...counted(4, (index) => cell(index, "cell", index)),
      ...counted(4, (index) => foundation(index, "foundation", 6 + index)),
      ...counted(10, (index) => openColumn(index, "tableau", index)),
    ]);
  });

  it("declares the Eight Off board exactly as it was", () => {
    const zones = eightOffZoneSpecs().map(comparable);

    expect(zones).toEqual([
      ...counted(8, (index) => cell(index, "cell", index)),
      ...counted(4, (index) => foundation(index, "foundation", 8 + index)),
      ...counted(8, (index) => openColumn(index, "tableau", 2 + index)),
    ]);
  });
});
