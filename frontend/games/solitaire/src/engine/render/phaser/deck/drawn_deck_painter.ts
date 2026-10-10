import type { Textures } from "phaser";

import { CARD_ART_SCALES, CardArtScale } from "../../deck/card_art_scale";
import { CardDeckId } from "../../deck/card_deck";
import { CardAtlas, cardAtlasTextureKey } from "./card_deck_atlas";
import {
  CardFrameVectors,
  hasCardDeckVectors,
  loadCardDeckVectors,
} from "./card_deck_vectors";
import {
  DeckPaintContext,
  DrawnDeckPlan,
  ImageFrame,
  LoadSvgImage,
  loadSvgImage,
  paintDrawnDeck,
  planDrawnDeck,
} from "./drawn_card_deck";

/** Describes the slice of the texture cache a painter works with. */
export interface DrawnDeckTextures {
  exists(textureKey: string): boolean;
  /** Returns the names of a texture's frames. */
  frameNames(textureKey: string): string[];
  /** Returns where a frame lies in a texture's images, or null if it has none. */
  frame(textureKey: string, frameName: string): ImageFrame | null;
  /** Registers a painted canvas as a texture, with the frames a plan lays out. */
  addCanvas(
    textureKey: string,
    canvas: HTMLCanvasElement,
    plan: DrawnDeckPlan,
  ): void;
  remove(textureKey: string): void;
}

/** A canvas to paint a deck on, with its 2D context. */
export interface PaintSurface {
  readonly canvas: HTMLCanvasElement;
  readonly context: DeckPaintContext;
}

/** Gives a painter what it draws with, which a spec can stand in for. */
export interface DrawnDeckServices {
  readonly textures: DrawnDeckTextures;
  /** Returns whether a deck's frames can be drawn at any size. */
  hasVectors(deckId: CardDeckId): boolean;
  /** Loads a deck's frame vectors, or null for a deck without them. */
  loadVectors(deckId: CardDeckId): Promise<CardFrameVectors | null>;
  /** Makes a canvas of a size, or returns null where the host has none. */
  createCanvas(width: number, height: number): PaintSurface | null;
  readonly loadSvg: LoadSvgImage;
}

/** Gives a painter what it needs of the board it draws for. */
export interface DrawnDeckHost {
  /** The texture the cards, their shadows and the placeholders draw from. */
  readonly cardTextureKey: string;
  /** Points every sprite at a texture whose frames are at a texel scale. */
  drawCardsFrom(textureKey: string, artScale: number): void;
}

/** Says which drawing of the deck a painter is showing or waiting to make. */
interface DrawingFor {
  /** The built atlas it is drawn alongside, and copies its other frames from. */
  readonly builtKey: string;
  /** The layout scale it is drawn for, which is its texel scale. */
  readonly artScale: number;
}

/**
 * Draws the deck on the table at exactly the size the board shows it, once
 * the board has held one size for a moment, and puts the built atlas back the
 * moment it changes size or deck.
 *
 * Only a deck with frame vectors is drawn, and only at a layout scale no
 * built atlas already matches.
 */
export class DrawnDeckPainter {
  /**
   * How long the layout scale must hold before the deck is drawn at it, so a
   * window dragged to a new size is drawn once it stops, not at every step.
   */
  public static readonly SETTLE_MS = 250;

  /** The drawing the sprites draw from, or null when they draw from built. */
  private shown: (DrawingFor & { readonly textureKey: string }) | null = null;

  /** The drawing the board would want, and when it first wanted it. */
  private settling: (DrawingFor & { readonly sinceMs: number }) | null = null;

  /** Whether a drawing is being made. */
  private drawing = false;

  /** How many drawings have been made, which numbers each one's texture. */
  private drawsStarted = 0;

  /** Drawings that failed, which are not tried again. */
  private readonly failed = new Set<string>();

  private disposed = false;

  /** Creates a painter for a board. */
  constructor(
    private readonly host: DrawnDeckHost,
    private readonly services: DrawnDeckServices,
  ) {}

  /**
   * Follows the board for one frame: the built atlas it draws from and the
   * layout scale it lays out at.
   */
  follow(built: CardAtlas, layoutScale: number, nowMs: number): void {
    const wanted: DrawingFor = {
      builtKey: cardAtlasTextureKey(built),
      artScale: layoutScale,
    };
    if (
      this.shown &&
      !(
        sameDrawing(this.shown, wanted) &&
        this.host.cardTextureKey === this.shown.textureKey
      )
    ) {
      this.withdraw(built);
    }
    if (this.shown || !this.worthDrawing(built.deckId, wanted)) {
      this.settling = null;
      return;
    }

    if (!this.settling || !sameDrawing(this.settling, wanted)) {
      this.settling = { ...wanted, sinceMs: nowMs };
      return;
    }
    if (
      this.drawing ||
      nowMs - this.settling.sinceMs < DrawnDeckPainter.SETTLE_MS
    ) {
      return;
    }
    void this.draw(built.deckId, wanted);
  }

  /** Releases the drawing, for a board that is ending. */
  dispose(): void {
    this.disposed = true;
    this.settling = null;
    if (this.shown) {
      this.services.textures.remove(this.shown.textureKey);
      this.shown = null;
    }
  }

  /**
   * Returns whether a drawing would do better than the built atlas: for a deck
   * with vectors, at a scale no built atlas matches, that fits one canvas, and
   * that has not failed before.
   */
  private worthDrawing(deckId: CardDeckId, wanted: DrawingFor): boolean {
    const { builtKey, artScale } = wanted;
    return (
      this.services.hasVectors(deckId) &&
      Number.isFinite(artScale) &&
      artScale > 0 &&
      !CARD_ART_SCALES.includes(artScale as CardArtScale) &&
      !this.failed.has(drawingName(wanted)) &&
      this.services.textures.exists(builtKey) &&
      planDrawnDeck(this.services.textures.frameNames(builtKey), artScale) !==
        null
    );
  }

  /**
   * Points the sprites back at the built atlas if they still draw from the
   * drawing, and releases it.
   */
  private withdraw(built: CardAtlas): void {
    const shown = this.shown;
    if (!shown) return;
    this.shown = null;
    if (this.host.cardTextureKey === shown.textureKey) {
      this.host.drawCardsFrom(cardAtlasTextureKey(built), built.artScale);
    }
    this.services.textures.remove(shown.textureKey);
  }

  /** Draws the deck and has the sprites draw from it, if it is still wanted. */
  private async draw(deckId: CardDeckId, wanted: DrawingFor): Promise<void> {
    this.drawing = true;
    const { builtKey, artScale } = wanted;
    const textureKey = `${builtKey}-drawn-${++this.drawsStarted}`;
    try {
      const { textures } = this.services;
      const plan = planDrawnDeck(textures.frameNames(builtKey), artScale);
      const vectors = await this.services.loadVectors(deckId);
      const surface =
        plan && this.services.createCanvas(plan.width, plan.height);
      if (!plan || !vectors || !surface) {
        this.failed.add(drawingName(wanted));
        return;
      }

      await paintDrawnDeck(
        surface.context,
        plan,
        vectors,
        (frameName) => textures.frame(builtKey, frameName),
        this.services.loadSvg,
      );
      if (!this.stillWanted(wanted)) return;

      textures.addCanvas(textureKey, surface.canvas, plan);
      this.shown = { ...wanted, textureKey };
      this.settling = null;
      this.host.drawCardsFrom(textureKey, artScale);
    } catch (error) {
      if (this.stillWanted(wanted)) {
        this.failed.add(drawingName(wanted));
        console.warn("Could not draw the deck at its exact size:", error);
      }
    } finally {
      this.drawing = false;
    }
  }

  /**
   * Returns whether the board still wants a drawing once it is made, having
   * neither ended nor moved on to another size or atlas meanwhile.
   */
  private stillWanted(wanted: DrawingFor): boolean {
    return (
      !this.disposed &&
      this.settling !== null &&
      sameDrawing(this.settling, wanted) &&
      this.services.textures.exists(wanted.builtKey)
    );
  }
}

/** Returns whether two drawings are of the same atlas at the same scale. */
function sameDrawing(a: DrawingFor, b: DrawingFor): boolean {
  return a.builtKey === b.builtKey && a.artScale === b.artScale;
}

/** Names a drawing, for remembering which ones failed. */
function drawingName(drawing: DrawingFor): string {
  return `${drawing.builtKey}@${drawing.artScale}`;
}

/** Returns the slice of Phaser's texture cache a painter works with. */
export function phaserDrawnDeckTextures(
  textures: Textures.TextureManager,
): DrawnDeckTextures {
  return {
    exists: (textureKey) => textures.exists(textureKey),
    frameNames: (textureKey) => textures.get(textureKey).getFrameNames(),
    frame: (textureKey, frameName) => {
      if (!textures.exists(textureKey)) return null;
      const frame = textures.getFrame(textureKey, frameName) as
        Textures.Frame | null | undefined;
      if (!frame) return null;
      return {
        image: frame.source.image as CanvasImageSource,
        x: frame.cutX,
        y: frame.cutY,
        width: frame.cutWidth,
        height: frame.cutHeight,
      };
    },
    addCanvas: (textureKey, canvas, plan) => {
      const texture = textures.addCanvas(textureKey, canvas);
      if (!texture) throw new Error(`The texture ${textureKey} is taken`);
      for (const slot of plan.slots) {
        texture.add(
          slot.name,
          0,
          slot.x,
          slot.y,
          plan.frame.width,
          plan.frame.height,
        );
      }
    },
    remove: (textureKey) => {
      textures.remove(textureKey);
    },
  };
}

/** Makes a canvas in the browser, or returns null outside one. */
export function createBrowserCanvas(
  width: number,
  height: number,
): PaintSurface | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  return context ? { canvas, context } : null;
}

/** Returns the services a painter draws with in the browser. */
export function browserDrawnDeckServices(
  textures: Textures.TextureManager,
): DrawnDeckServices {
  return {
    textures: phaserDrawnDeckTextures(textures),
    hasVectors: hasCardDeckVectors,
    loadVectors: loadCardDeckVectors,
    createCanvas: createBrowserCanvas,
    loadSvg: loadSvgImage,
  };
}
