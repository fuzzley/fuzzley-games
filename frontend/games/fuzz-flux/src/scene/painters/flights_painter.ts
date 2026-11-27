import { itemAt } from "@fz/core/records";
import { type Playing, Turns } from "@fz/core/turns";
import type { GameObjects, Scene } from "phaser";
import { placeOf } from "../../view/board/spaces";
import { FEEL } from "../../view/timeline/feel";
import { lookAt } from "../../view/timeline/looks";
import { sampleFlight } from "../../view/timeline/sample";
import type { Flight, Sampled } from "../../view/timeline/timeline";
import type { PaintContext, Painter } from "./painter";
import { PieceSprite } from "./piece_sprite";

/**
 * How many copies may fly at once: twice the most a move lets fly, as a
 * move's copies may still be flying as the board takes the next swap and
 * that move's set off. A tuning that lets more fly than the design does
 * cuts the oldest short.
 */
const MOST_FLYING = 2 * FEEL.mostFlights;

/** Describes a fuzzball's copy flying to its goal, from its moment on the scene's clock. */
interface Flying extends Playing {
  readonly sprite: PieceSprite;
  /** Where it flies as it is sampled, written each frame. */
  readonly sampled: Sampled;
  /** The flight as the timeline spawned it, or null for none flying. */
  flight: Flight | null;
}

/**
 * Draws each fuzzball's copy flying from the board to its goal's picture
 * on the bar, from its moment, a sprite of a pool as large as the most
 * that may fly at once, each played in turn; a copy still flying as the
 * next play starts flies on, to where its goal's picture then lies.
 */
export class FlightsPainter implements Painter {
  /** A copy for each that may fly at once. */
  readonly flights: Turns<Flying>;
  /** Where the goal's picture the copy being drawn flies to lies, in squares, written for each. */
  private readonly to = { x: 0, y: 0 };

  /** Makes every copy's sprite, hidden, in a layer. */
  constructor(scene: Scene, layer: GameObjects.Layer) {
    this.flights = new Turns(MOST_FLYING, () => ({
      at: Number.NEGATIVE_INFINITY,
      x: 0,
      y: 0,
      sprite: new PieceSprite(scene, layer),
      sampled: {
        ...lookAt({ x: 0, y: 0 }),
        shown: false,
        face: "happy",
        drawn: null,
      },
      flight: null,
    }));
  }

  /** Sets each flight whose moment comes in the frame flying, and draws every copy flying at the frame's moment. */
  draw(context: Readonly<PaintContext>): void {
    const { play, clock, metrics, pixelRatio, goals } = context;
    const { flights } = play.timeline;
    for (let index = 0; index < flights.length; index++) {
      const flight = itemAt(flights, index);
      if (!clock.starts(flight.atMs)) continue;
      const flying = this.flights.play(
        flight.from.x,
        flight.from.y,
        clock.nowOf(flight.atMs),
      );
      flying.flight = flight;
    }
    const all = this.flights.all;
    for (let index = 0; index < all.length; index++) {
      const flying = itemAt(all, index);
      const { flight, sprite, sampled } = flying;
      if (flight === null) continue;
      const goal = goals[flight.goal];
      if (goal !== undefined) {
        placeOf(metrics, pixelRatio, goal, this.to);
        sampleFlight(
          flight,
          this.to,
          play.feel,
          flight.atMs + clock.nowMs - flying.at,
          sampled,
        );
      }
      if (goal === undefined || !sampled.shown) {
        flying.flight = null;
        sprite.hide();
        continue;
      }
      sprite.paint(sampled, flight.drawn, context);
    }
  }
}
