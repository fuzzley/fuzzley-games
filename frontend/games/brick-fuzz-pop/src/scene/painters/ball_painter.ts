import { shareDone } from "@fz/core/math";
import { FUZZBALL_LOOK } from "@fz/phaser/fuzzball";
import type { GameObjects, Scene } from "phaser";
import { AIMS } from "../../rules/aims";
import type { FlightEvent } from "../../rules/flight/events";
import type { Crew } from "../../rules/round/round";
import {
  COLUMNS,
  LAUNCH_GAP,
  MOST_FUZZBALLS,
  RADIUS,
  TRIPLE_MATES,
} from "../../rules/tuning";
import { CHARGES, FRAMES, type FrameName, INKS } from "../../view/art/frames";
import { fuzzballGrid } from "../../view/art/fuzzball_art";
import { flareScale } from "../../view/effects/flourish";
import { FLARE_MS } from "../../view/effects/timing";
import { type Place, toCanvas } from "../../view/field/field_metrics";
import type { BallView } from "../../view/round_play";
import { ATLAS } from "../atlas";
import type { PaintContext, Painter } from "./painter";

/** The player's fuzzball's frame with no charge, which a charge or an ink no frame has falls back on. */
const UNCHARGED: FrameName = FRAMES.fuzzball(0);

/** The player's fuzzball's frame at each charge, by charge, named once. */
const CHARGED: readonly FrameName[] = CHARGES.map((charge) =>
  FRAMES.fuzzball(charge),
);

/** A friend's frame in each ink, by ink, named once. */
export const INKED: readonly FrameName[] = INKS.map((ink) =>
  FRAMES.friend(ink),
);

/** The way a fuzzball looks that has no heading yet, and the aim straight up's: up the field. */
const UP: Readonly<Look> = { x: 0, y: 1 };

/** The way of the aim straight up, as `AIMS` writes a way. */
const UP_WAY: readonly [number, number] = [UP.x, UP.y];

/** A launch, which says how a fuzzball sets off. */
type Launch = Extract<FlightEvent, { kind: "launch" }>;

/** Describes the way a fuzzball looks, across the field and up it, a unit long. */
interface Look {
  x: number;
  y: number;
}

/** Describes how large a fuzzball is drawn: its scale over the atlas's, and its grid's unit in device pixels, which its eyes move by. */
interface Size {
  scale: number;
  grid: number;
}

/**
 * Draws the fuzzballs: each in the air, at its middle, in its frame, its
 * eyes looking the way it flies; and the player's waiting on the floor, its
 * fur combed by the charge, looking along the aim, as a hot shot where it
 * carries that boon, or with a triple shot's two mates beside it, toward
 * the middle of the floor. A boon earned flares in.
 *
 * Each fuzzball is a body and its eyes over it, from a pool made once, as
 * many as may show at once: those in the air, at most
 * {@link MOST_FUZZBALLS}, the player's among them until it lands.
 */
export class BallPainter implements Painter {
  /** Each fuzzball's body that may show at once: the waiting one and its mates first, then those in the air. */
  readonly bodies: readonly GameObjects.Image[];
  /** Each body's eyes, over it. */
  readonly eyes: readonly GameObjects.Image[];
  /** The way each fuzzball looks, by its number in the round, as its launch, its turns and a yawn set it. */
  private readonly looks: Look[] = [];
  /** The ink each friend flies in, by its number in the round. */
  private readonly inks: number[] = [];
  /** How many friends have launched in the round in play, who launch in the order they were freed. */
  private friendsLaunched = 0;
  /** When the waiting fuzzball last flared into its boon, in the scene's time. */
  private flaredAt = Number.NEGATIVE_INFINITY;
  /** The frame each body shows, or null before it shows one, so a frame unchanged isn't set again. */
  private readonly shown: (FrameName | null)[];
  /** Where a fuzzball is drawn, written for each. */
  private readonly place: Place = { x: 0, y: 0 };
  /** The way the waiting fuzzball looks, along the aim, written each frame it waits. */
  private readonly aimLook: Look = { x: UP.x, y: UP.y };
  /** How large the fuzzballs are drawn, written before each group is drawn (those in the air, a triple shot's mates, the player's own), so drawing one hands over no number made for it. */
  private readonly size: Size = { scale: 1, grid: 1 };

  constructor(scene: Scene, layer: GameObjects.Layer) {
    this.bodies = Array.from({ length: MOST_FUZZBALLS }, () =>
      scene.add.image(0, 0, ATLAS, CHARGED[0]).setVisible(false),
    );
    this.eyes = Array.from({ length: MOST_FUZZBALLS }, () =>
      scene.add.image(0, 0, ATLAS, FRAMES.eyes).setVisible(false),
    );
    this.shown = this.bodies.map(() => null);
    // Each body's eyes just over it, so a fuzzball over another hides its eyes.
    layer.add(this.bodies.flatMap((body, at) => [body, this.eyes[at] ?? body]));
  }

  /**
   * Takes a fuzzball's launch: the way it looks, and, for a friend, its ink,
   * the crew's friends launching in the order they were freed.
   */
  launch(event: Readonly<Launch>, crew: Crew): void {
    this.head(event.ball, event.dx, event.dy);
    if (event.role === "player") this.friendsLaunched = 0;
    if (event.role !== "friend") return;
    this.inks[event.ball] = crew.friends[this.friendsLaunched] ?? 0;
    this.friendsLaunched++;
  }

  /** Takes the way a fuzzball now flies, across the field and up it, as it launches, turns or drops. */
  head(ball: number, dx: number, dy: number): void {
    const look = this.looks[ball];
    if (look) {
      look.x = dx;
      look.y = dy;
    } else {
      this.looks[ball] = { x: dx, y: dy };
    }
  }

  /** Writes the way a fuzzball looks into a record and returns it: straight up before it has launched. */
  lookOf(ball: number, into: Look): Look {
    const look = this.looks[ball] ?? UP;
    into.x = look.x;
    into.y = look.y;
    return into;
  }

  /** Flares the waiting fuzzball's boon in, from a time. */
  flare(now: number): void {
    this.flaredAt = now;
  }

  /** Draws the fuzzball waiting and those in the air, hiding the bodies left over. */
  draw(context: Readonly<PaintContext>): void {
    const { view, metrics, baked, waitingX } = context;
    const scale = metrics.unit / baked.unit;
    const grid = fuzzballGrid(baked) * scale;
    let at = 0;
    if (waitingX !== null) at = this.drawWaiting(context, waitingX, grid);
    const { size } = this;
    size.scale = scale;
    size.grid = grid;
    // Read by number, as a frame's round of the fuzzballs makes nothing,
    // and as many as there are bodies left.
    const { balls } = view;
    const most = Math.min(balls.length, this.bodies.length - at);
    for (let index = 0; index < most; index++) {
      const ball = balls[index];
      if (ball === undefined) break;
      this.drawOne(
        at++,
        this.frameOf(ball),
        toCanvas(metrics, ball.x, ball.y, this.place),
        this.looks[ball.ball] ?? UP,
        size,
      );
    }
    for (; at < this.bodies.length; at++) {
      this.bodies[at]?.setVisible(false);
      this.eyes[at]?.setVisible(false);
    }
  }

  /**
   * Draws the player's fuzzball waiting on the floor, looking along the
   * aim, a triple shot's mates beside it, and returns how many bodies it
   * took.
   */
  private drawWaiting(
    { steer, boon, metrics, baked, now }: Readonly<PaintContext>,
    x: number,
    grid: number,
  ): number {
    const scale = metrics.unit / baked.unit;
    // A boon's look flares in, the eyes as far from the middle as its size.
    const flare = flareScale(shareDone(this.flaredAt, now, FLARE_MS));
    const { aimLook: look, size } = this;
    const aim = AIMS[steer.aim] ?? UP_WAY;
    look.x = aim[0];
    look.y = aim[1];
    const charged = CHARGED[steer.charge] ?? UNCHARGED;
    const hot = boon === "hot";
    // A boon's fuzzballs flare: a triple shot's mates, and a hot shot.
    size.scale = boon === null ? scale : scale * flare;
    size.grid = boon === null ? grid : grid * flare;
    let at = 0;
    if (boon === "triple") {
      // The mates wait on the side with the more room, which a floor 9
      // wide always has for both, as a fuzzball waits half a unit from a
      // side; the furthest first, so the nearer stands over it.
      const side = x < COLUMNS / 2 ? 1 : -1;
      for (let mate = TRIPLE_MATES; mate > 0; mate--) {
        const place = toCanvas(
          metrics,
          x + side * mate * LAUNCH_GAP,
          RADIUS,
          this.place,
        );
        this.drawOne(at++, charged, place, look, size);
      }
      // The player's own waits unflared beside them.
      size.scale = scale;
      size.grid = grid;
    }
    this.drawOne(
      at++,
      hot ? FRAMES.hotShot : charged,
      toCanvas(metrics, x, RADIUS, this.place),
      look,
      size,
    );
    return at;
  }

  /** Returns the frame a fuzzball in the air shows: a friend's in its ink, a hot shot's, or the player's at its charge. */
  private frameOf(ball: Readonly<BallView>): FrameName {
    if (ball.role === "friend") {
      return INKED[this.inks[ball.ball] ?? 0] ?? UNCHARGED;
    }
    if (ball.hot) return FRAMES.hotShot;
    return CHARGED[ball.charge] ?? UNCHARGED;
  }

  /**
   * Shows a body of the pool in a frame at a place on the canvas, at a
   * size, and its eyes over it, moved the way it looks, across the field
   * and up it, by a unit of its grid's device pixels.
   */
  private drawOne(
    at: number,
    frame: FrameName,
    place: Readonly<Place>,
    look: Readonly<Look>,
    { scale, grid }: Readonly<Size>,
  ): void {
    const body = this.bodies[at];
    const eyes = this.eyes[at];
    if (!body || !eyes) return;
    if (frame !== this.shown[at]) {
      this.shown[at] = frame;
      body.setFrame(frame);
    }
    body.setPosition(place.x, place.y).setScale(scale).setVisible(true);
    eyes
      .setPosition(
        place.x + FUZZBALL_LOOK.across * grid * look.x,
        place.y - FUZZBALL_LOOK.down * grid * look.y,
      )
      .setScale(scale)
      .setVisible(true);
  }
}
