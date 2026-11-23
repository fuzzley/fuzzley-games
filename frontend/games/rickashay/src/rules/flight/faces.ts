// What cast() meets as it flies the fuzzball's middle through the field:
// each face of the design's "The flight", a radius out from what it belongs
// to, in field units, x across from the left wall and y up from the floor.
// Every flat is a mirror and every 45° face a swap of the fuzzball's two
// speeds, so a flight keeps the eight directions its aim gave it.

/** Names what a face belongs to: a brick, by its wall cell, a side wall, or the ceiling. */
export type FaceOwner =
  | {
      readonly kind: "brick";
      /** Its wall cell, wall row × 9 + column, as a flight's events name a brick. */
      readonly cell: number;
    }
  | { readonly kind: "wall"; readonly side: "left" | "right" }
  | { readonly kind: "ceiling" };

/** Names the way a face looks along one of the field's two lines: toward the greater x or y (1), or the lesser (−1). */
export type Facing = 1 | -1;

/**
 * Describes a face the fuzzball's middle can meet.
 *
 * A face is met only by a fuzzball flying into it, against the way it
 * faces, so one flying away from a face, or along it, never meets it.
 */
export type Face =
  | {
      /**
       * A flat, which turns a fuzzball by changing the sign of its speed
       * across the flat: a brick's side, a side wall or the ceiling, its
       * line a radius out from theirs.
       */
      readonly kind: "flat";
      /** Whether it lies across the field, along a y, or up it, along an x. */
      readonly along: "across" | "up";
      /** Its line: the y of a flat across, the x of a flat up. */
      readonly line: number;
      /** Where along its line it starts and ends: the least and the most x of a flat across, or y of one up. */
      readonly from: number;
      readonly to: number;
      /** The way it faces, along the line it is met across: up or down for a flat across, right or left for one up. */
      readonly facing: Facing;
      readonly owner: FaceOwner;
    }
  | {
      /**
       * A 45° face, which turns a fuzzball by swapping its two speeds, with
       * the signs that send it away: a corner's cut, a ramp's long face or
       * one of a gem's four.
       */
      readonly kind: "slant";
      /** The way it faces across, right (1) or left (−1). */
      readonly facingX: Facing;
      /** The way it faces up, toward the ceiling (1) or the floor (−1). */
      readonly facingY: Facing;
      /**
       * Its line's c: x + y = c for a face that faces right and up, or left
       * and down, and x − y = c for one that faces right and down, or left
       * and up.
       */
      readonly c: number;
      /** The least and the most x it spans. */
      readonly from: number;
      readonly to: number;
      /**
       * Whether it is a long face, a ramp's or a gem's, which turns a
       * fuzzball the flats have turned if it still flies into it; a
       * corner's cut, which isn't, turns one only where nothing else did
       * at that moment (C3).
       */
      readonly long: boolean;
      readonly owner: Extract<FaceOwner, { readonly kind: "brick" }>;
    }
  | {
      /**
       * The floor, its line a radius up, from side wall to side wall,
       * which a fuzzball holding a floor bounce turns off as off a flat and
       * one holding none lands on.
       */
      readonly kind: "floor";
    }
  | {
      /**
       * A hatch's bar, a flat across the top of its cell, a radius up,
       * facing the ceiling, which a fuzzball flying up passes as air and
       * one coming down is held up by: a hold, not a strike. Its ends'
       * cuts, where nothing stands beside it, are slants its hatch owns.
       */
      readonly kind: "bar";
      /** Its line's y. */
      readonly line: number;
      /** The least and the most x it spans. */
      readonly from: number;
      readonly to: number;
      readonly owner: Extract<FaceOwner, { readonly kind: "brick" }>;
    }
  | {
      /**
       * A portal's eye, the square of `EYE` at the middle of its cell, which
       * takes a fuzzball as its middle crosses into it and sets it down at
       * the same place in its twin's eye, flying the same way.
       */
      readonly kind: "eye";
      /** Its middle, its cell's. */
      readonly x: number;
      readonly y: number;
      readonly owner: Extract<FaceOwner, { readonly kind: "brick" }>;
    };

/** A face's kind, such as "slant". */
export type FaceKind = Face["kind"];
