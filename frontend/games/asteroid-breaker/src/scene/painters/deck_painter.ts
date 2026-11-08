import type { GameObjects, Scene } from "phaser";
import { rechargeShare } from "../../rules/ship/ship";
import type { Place } from "../../rules/torus";
import { DECK_FRAMES } from "../../view/art/art";
import type { BeltPalette } from "../../view/colors/palette";
import {
  type Circle,
  type Deck,
  type Ring,
  rechargeRing,
} from "../../view/steering/deck";
import type { StickView } from "../../view/steering/stick";
import { DECK_ATLAS } from "../atlas";
import type { PaintContext, Painter } from "./painter";

/**
 * How opaque the stick's dashed rings are where they don't light: where it
 * waits, and its thrust ring while it doesn't thrust.
 */
export const REST_ALPHA = 0.4;

/** How opaque the stick's knob is at rest, fainter still. */
export const REST_KNOB_ALPHA = 0.25;

/** Where a ring starts to fill from: its top. */
const RING_TOP = -Math.PI / 2;

/** Holds a button's images: its disc, its ring and its symbol. */
interface ButtonImages {
  readonly disc: GameObjects.Image;
  readonly ring: GameObjects.Image;
  readonly symbol: GameObjects.Image;
  /** All three, back to front. */
  readonly parts: readonly GameObjects.Image[];
}

/**
 * Draws the deck off the field, in the canvas's pixels, from the deck's
 * own atlas: the stick, faint where it waits, and where a finger holds it
 * its base, its rings, lit as it thrusts and at full push, and its knob in
 * the accent; and Fire and Dash, filled in the accent while pressed, Dash
 * ringed as it recharges.
 */
export class DeckPainter implements Painter {
  /** The stick's base, while it is held. */
  readonly base: GameObjects.Image;
  /** The stick's edge, lit at full push. */
  readonly edge: GameObjects.Image;
  /** The ring the knob thrusts past, lit while it does. */
  readonly thrust: GameObjects.Image;
  /** The dashed ring where the stick waits at rest. */
  readonly rest: GameObjects.Image;
  readonly knob: GameObjects.Image;
  readonly fire: ButtonImages;
  readonly dash: ButtonImages;
  /** Dash's recharge, drawn again each frame it recharges. */
  readonly recharge: GameObjects.Graphics;
  /** Where Dash's recharge is drawn, written each frame it recharges. */
  private readonly ring: Ring = { x: 0, y: 0, radius: 0, width: 0 };

  /** Every image, back to front. */
  private readonly images: readonly GameObjects.Image[];
  /** The stick's images that show only while it is held. */
  private readonly held: readonly GameObjects.Image[];

  constructor(scene: Scene, layer: GameObjects.Layer) {
    const image = (frame: string): GameObjects.Image =>
      scene.add.image(0, 0, DECK_ATLAS, frame).setVisible(false);
    this.base = image(DECK_FRAMES.stickBase);
    this.edge = image(DECK_FRAMES.stickRing);
    this.thrust = image(DECK_FRAMES.stickThrust);
    this.rest = image(DECK_FRAMES.stickRest);
    this.knob = image(DECK_FRAMES.knob);
    this.fire = buttonImages(
      image(DECK_FRAMES.fireDisc),
      image(DECK_FRAMES.fireRing),
      image(DECK_FRAMES.fireSymbol),
    );
    this.dash = buttonImages(
      image(DECK_FRAMES.dashDisc),
      image(DECK_FRAMES.dashRing),
      image(DECK_FRAMES.dashSymbol),
    );
    this.recharge = scene.add.graphics();
    this.held = [this.base, this.edge, this.thrust];
    this.images = [
      ...this.held,
      this.rest,
      this.knob,
      ...this.fire.parts,
      ...this.dash.parts,
    ];
    layer.add([...this.images, this.recharge]);
  }

  /** Takes up each image's frame again, once the atlas has been baked again. */
  refresh(): void {
    for (const image of this.images) image.setFrame(image.frame.name);
  }

  /** Draws the deck where it lies, as the steering holds it, or nothing where it doesn't show. */
  draw({
    deck,
    steering,
    field,
    metrics,
    palette,
  }: Readonly<PaintContext>): void {
    this.recharge.clear();
    if (!deck) {
      for (const image of this.images) image.setVisible(false);
      return;
    }
    this.drawStick(deck, steering.stickView, palette);
    this.drawButton(this.fire, deck.fire, steering.isPressed("fire"), palette);
    this.drawButton(this.dash, deck.dash, steering.isPressed("dash"), palette);
    const charged = field.ship ? rechargeShare(field.ship) : 1;
    if (charged >= 1) return;
    const { x, y, radius, width } = rechargeRing(
      deck.dash,
      metrics.pixelRatio,
      this.ring,
    );
    this.recharge
      .lineStyle(width, palette.accent)
      .beginPath()
      .arc(x, y, radius, RING_TOP, RING_TOP + 2 * Math.PI * charged)
      .strokePath();
  }

  /** Draws the stick faint where it waits, or where a finger holds it, lit as it thrusts. */
  private drawStick(deck: Deck, stick: StickView, palette: BeltPalette): void {
    const { held } = stick;
    for (const image of this.held) image.setVisible(held);
    this.rest.setVisible(!held);
    this.knob.setVisible(true);
    if (!held) {
      place(this.rest, deck.stick, palette.muted, REST_ALPHA);
      place(this.knob, deck.stick, palette.muted, REST_KNOB_ALPHA);
      return;
    }
    place(this.base, stick.base, palette.deck, 1);
    place(this.edge, stick.base, stick.full ? palette.accent : palette.line, 1);
    place(
      this.thrust,
      stick.base,
      stick.thrusting ? palette.accent : palette.muted,
      stick.thrusting ? 1 : REST_ALPHA,
    );
    place(this.knob, stick.knob, palette.accent, 1);
  }

  /**
   * Draws a button where it lies, filled in the accent while pressed, or
   * nothing where the deck has none.
   */
  private drawButton(
    images: ButtonImages,
    circle: Circle | null,
    pressed: boolean,
    palette: BeltPalette,
  ): void {
    for (const image of images.parts) image.setVisible(circle !== null);
    if (!circle) return;
    const { disc, ring, symbol } = images;
    place(disc, circle, pressed ? palette.accent : palette.deck, 1);
    place(ring, circle, pressed ? palette.accent : palette.line, 1);
    place(symbol, circle, pressed ? palette.onAccent : palette.muted, 1);
  }
}

/** Returns a button's images, with the list of all three made once. */
function buttonImages(
  disc: GameObjects.Image,
  ring: GameObjects.Image,
  symbol: GameObjects.Image,
): ButtonImages {
  return { disc, ring, symbol, parts: [disc, ring, symbol] };
}

/** Puts one of the deck's images at a place on the canvas, in a color, so opaque. */
function place(
  image: GameObjects.Image,
  at: Place,
  color: number,
  alpha: number,
): void {
  image.setPosition(at.x, at.y).setTint(color).setAlpha(alpha);
}
