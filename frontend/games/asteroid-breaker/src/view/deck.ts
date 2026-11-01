import { clamp } from "@fz/core/math";
import type { Viewport } from "@fz/phaser/layout";
import type { Place, Torus } from "../rules/torus";
import { type BoardSetting, type PixelRect, deckLayout } from "./field_metrics";
import { STICK_RADIUS_CSS_PX } from "./stick";

/** The radius of Fire, in CSS pixels. */
export const FIRE_RADIUS_CSS_PX = 32;

/** The radius of Dash, in CSS pixels. */
export const DASH_RADIUS_CSS_PX = 24;

/** How far past a button's edge a press still takes it, in CSS pixels. */
export const BUTTON_SLACK_CSS_PX = 12;

/**
 * How far the stick at rest and the buttons keep from the stage's sides,
 * in CSS pixels, so none lies where a thumb starts the browser's own swipe.
 */
export const DECK_EDGE_CSS_PX = 16;

/** How far the stick at rest and the buttons keep from the top and bottom of their zones, in CSS pixels. */
export const DECK_GAP_CSS_PX = 10;

/** Names a button on the deck. */
export type DeckButton = "fire" | "dash";

/** Describes a circle on the canvas, in device pixels. */
export interface Circle {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

/** Says where the deck's parts lie on the canvas, in device pixels. */
export interface Deck {
  /** Where a finger pressed takes the stick. */
  readonly stickZone: PixelRect;
  /** Where the stick sits at rest, its radius the knob's reach. */
  readonly stick: Circle;
  /** Where Fire lies, or null where fire is held by itself. */
  readonly fire: Circle | null;
  /** Where Dash lies, in Fire's place where fire is held by itself. */
  readonly dash: Circle;
  /** How far past a button's edge a press still takes it. */
  readonly slack: number;
}

/** Says where a part lies in its zone, in shares of the zone's width and height, with the stick on the left. */
interface Spot {
  readonly across: number;
  readonly down: number;
}

/** Says where the deck's parts lie one way of laying it out, with the stick on the left. */
interface Spots {
  readonly stick: Spot;
  readonly fire: Spot;
  /** How far Dash lies from Fire, in CSS pixels. */
  readonly dashFromFireCss: Place;
}

/** Where the parts lie under the field: low in each zone, Dash up from Fire and toward the middle. */
const UNDER: Spots = {
  stick: { across: 0.42, down: 0.58 },
  fire: { across: 0.66, down: 0.62 },
  dashFromFireCss: { x: -70, y: -34 },
};

/** Where the parts lie beside the field: low in each zone, Dash above Fire. */
const BESIDE: Spots = {
  stick: { across: 0.5, down: 0.66 },
  fire: { across: 0.56, down: 0.7 },
  dashFromFireCss: { x: -6, y: -80 },
};

/**
 * Returns where the deck's parts lie on a canvas around a field of a
 * shape, or null where it doesn't show: the stick at rest low in its zone,
 * and Fire low in the buttons' with Dash above it, or Dash in Fire's place
 * where fire is held by itself; each mirrored with the stick on the right,
 * and kept within its zone.
 */
export function deckOf(
  viewport: Viewport,
  board: BoardSetting,
  torus: Torus,
): Deck | null {
  const layout = deckLayout(viewport, board, torus);
  if (!layout) return null;
  const { pixelRatio } = viewport;
  const spots = layout.under ? UNDER : BESIDE;
  const mirror = board.stickOnRight ? -1 : 1;
  // Each zone has one side at the stage's: the left one's left, and the
  // right one's right.
  const stickSide = board.stickOnRight ? "right" : "left";
  const buttonsSide = board.stickOnRight ? "left" : "right";
  const fire = circleIn(
    layout.buttons,
    spotIn(layout.buttons, spots.fire, mirror),
    FIRE_RADIUS_CSS_PX,
    pixelRatio,
    buttonsSide,
  );
  const dashAt = board.fireByItself
    ? fire
    : {
        x: fire.x + spots.dashFromFireCss.x * mirror * pixelRatio,
        y: fire.y + spots.dashFromFireCss.y * pixelRatio,
      };
  return {
    stickZone: layout.stick,
    stick: circleIn(
      layout.stick,
      spotIn(layout.stick, spots.stick, mirror),
      STICK_RADIUS_CSS_PX,
      pixelRatio,
      stickSide,
    ),
    fire: board.fireByItself ? null : fire,
    dash: circleIn(
      layout.buttons,
      dashAt,
      DASH_RADIUS_CSS_PX,
      pixelRatio,
      buttonsSide,
    ),
    slack: BUTTON_SLACK_CSS_PX * pixelRatio,
  };
}

/**
 * Returns the button a place on the canvas presses, within its slack of
 * it, or null; where it is within both's, the one whose edge is nearer.
 */
export function buttonAt(deck: Deck, place: Place): DeckButton | null {
  const fire = deck.fire ? pastEdge(deck.fire, place) : Infinity;
  const dash = pastEdge(deck.dash, place);
  if (Math.min(fire, dash) > deck.slack) return null;
  return fire < dash ? "fire" : "dash";
}

/** Returns where a spot lies in a zone, mirrored across it where the mirror is -1. */
function spotIn(zone: PixelRect, spot: Spot, mirror: 1 | -1): Place {
  const across = mirror > 0 ? spot.across : 1 - spot.across;
  return {
    x: zone.x + zone.width * across,
    y: zone.y + zone.height * spot.down,
  };
}

/**
 * Returns a circle of a radius in CSS pixels at a place, moved as little as
 * keeps it within a zone, its gap from the zone's top and bottom, and its
 * edge from the zone's side at the stage's.
 */
function circleIn(
  zone: PixelRect,
  place: Place,
  radiusCss: number,
  pixelRatio: number,
  stageSide: "left" | "right",
): Circle {
  const radius = radiusCss * pixelRatio;
  const edge = DECK_EDGE_CSS_PX * pixelRatio;
  const gap = radius + DECK_GAP_CSS_PX * pixelRatio;
  return {
    x: clamp(
      place.x,
      zone.x + radius + (stageSide === "left" ? edge : 0),
      zone.x + zone.width - radius - (stageSide === "right" ? edge : 0),
    ),
    y: clamp(place.y, zone.y + gap, zone.y + zone.height - gap),
    radius,
  };
}

/** Returns how far a place lies past a circle's edge, less than 0 inside it. */
function pastEdge(circle: Circle, place: Place): number {
  return Math.hypot(place.x - circle.x, place.y - circle.y) - circle.radius;
}
