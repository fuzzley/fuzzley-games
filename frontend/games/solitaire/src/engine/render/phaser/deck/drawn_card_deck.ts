import { Size } from "../../layout/geometry";
import { cardFrameTexels } from "../../deck/card_art_scale";
import { CardFrameVectors } from "./card_deck_vectors";

/** Says where a drawn deck puts one frame, by its top left corner in pixels. */
export interface DrawnFrameSlot {
  readonly name: string;
  readonly x: number;
  readonly y: number;
}

/**
 * Lays out a deck drawn at one density: how big its canvas is and where each
 * frame goes on it.
 */
export interface DrawnDeckPlan {
  /** Texels per design unit: the layout scale the deck is drawn for. */
  readonly artScale: number;
  /** Every frame's size, in pixels. */
  readonly frame: Size;
  /** The canvas's width, in pixels. */
  readonly width: number;
  /** The canvas's height, in pixels. */
  readonly height: number;
  readonly slots: readonly DrawnFrameSlot[];
}

/**
 * Describes the slice of a canvas's 2D context a drawn deck is painted with.
 */
export type DeckPaintContext = Pick<
  CanvasRenderingContext2D,
  | "drawImage"
  | "save"
  | "restore"
  | "beginPath"
  | "rect"
  | "clip"
  | "roundRect"
  | "stroke"
  | "globalCompositeOperation"
  | "lineWidth"
  | "strokeStyle"
  | "imageSmoothingEnabled"
  | "imageSmoothingQuality"
>;

/** Says where a frame lies in an image already loaded, such as an atlas page. */
export interface ImageFrame {
  readonly image: CanvasImageSource;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Draws an SVG document as an image of exactly a size. */
export type LoadSvgImage = (
  svg: string,
  size: Size,
) => Promise<CanvasImageSource>;

/**
 * Pixels left clear between frames and around the canvas, so a frame's edge
 * never samples its neighbour.
 */
const GUTTER_PX = 2;

/**
 * The longest side of canvas to draw a deck on: the largest texture some older
 * mobile GPUs allow.
 *
 * Mirrors `MAX_PAGE_PX` in `tools/card-atlas/atlas-writer.mjs`.
 */
export const MAX_DRAWN_DECK_PX = 4096;

/**
 * The hairline edge stamped onto every card, as the atlas tool stamps it, in
 * design units.
 *
 * Mirrors `CARD_EDGE` in `tools/card-atlas/atlas-writer.mjs`.
 */
const CARD_EDGE = {
  widthUnits: 2,
  color: "rgba(0, 0, 0, 0.55)",
  radiusUnits: 1,
};

/**
 * Lays out a deck's frames drawn at a density, or returns null when they would
 * not all fit on one canvas.
 *
 * @param artScale Texels per design unit.
 */
export function planDrawnDeck(
  frameNames: readonly string[],
  artScale: number,
): DrawnDeckPlan | null {
  const frame = cardFrameTexels(artScale);
  const pitchX = frame.width + GUTTER_PX;
  const pitchY = frame.height + GUTTER_PX;
  const maxColumns = Math.floor((MAX_DRAWN_DECK_PX - GUTTER_PX) / pitchX);
  if (maxColumns < 1 || frameNames.length === 0) return null;

  // As few rows as fit, spread over as few columns as keep them.
  const rows = Math.ceil(frameNames.length / maxColumns);
  const columns = Math.ceil(frameNames.length / rows);
  const height = GUTTER_PX + rows * pitchY;
  if (height > MAX_DRAWN_DECK_PX) return null;

  return {
    artScale,
    frame,
    width: GUTTER_PX + columns * pitchX,
    height,
    slots: frameNames.map((name, index) => ({
      name,
      x: GUTTER_PX + (index % columns) * pitchX,
      y: GUTTER_PX + Math.floor(index / columns) * pitchY,
    })),
  };
}

/**
 * Paints every frame a plan lays out: from its SVG where the deck has one,
 * given the card edge the atlas tool stamps, or else copied from the built
 * atlas, which has its edge already.
 *
 * @param builtFrame Returns where a frame lies in the built atlas.
 */
export async function paintDrawnDeck(
  context: DeckPaintContext,
  plan: DrawnDeckPlan,
  vectors: CardFrameVectors,
  builtFrame: (name: string) => ImageFrame | null,
  loadSvg: LoadSvgImage,
): Promise<void> {
  // Every image loads before any is painted, so the canvas is painted at once.
  const images = await Promise.all(
    plan.slots.map((slot) => {
      const svg = vectors[slot.name];
      return svg === undefined
        ? Promise.resolve(null)
        : loadSvg(svg, plan.frame);
    }),
  );

  const { width, height } = plan.frame;
  plan.slots.forEach((slot, index) => {
    const image = images[index];
    if (image) {
      context.drawImage(image, slot.x, slot.y, width, height);
      stampCardEdge(context, slot, plan);
      return;
    }

    const built = builtFrame(slot.name);
    if (!built) throw new Error(`No artwork for the frame ${slot.name}`);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(
      built.image,
      built.x,
      built.y,
      built.width,
      built.height,
      slot.x,
      slot.y,
      width,
      height,
    );
  });
}

/** Strokes the card edge around a frame, a whole number of pixels wide. */
function stampCardEdge(
  context: DeckPaintContext,
  slot: DrawnFrameSlot,
  plan: DrawnDeckPlan,
): void {
  const { width, height } = plan.frame;
  const stroke = Math.max(1, Math.round(CARD_EDGE.widthUnits * plan.artScale));
  context.save();
  context.beginPath();
  context.rect(slot.x, slot.y, width, height);
  context.clip();
  // Atop the frame, so the edge stays inside the card's own silhouette.
  context.globalCompositeOperation = "source-atop";
  context.lineWidth = stroke;
  context.strokeStyle = CARD_EDGE.color;
  context.beginPath();
  context.roundRect(
    slot.x + stroke / 2,
    slot.y + stroke / 2,
    width - stroke,
    height - stroke,
    CARD_EDGE.radiusUnits * plan.artScale,
  );
  context.stroke();
  context.restore();
}

/**
 * Returns an SVG document set to draw at exactly a size, its artwork
 * stretched to fill it.
 */
export function sizeSvg(svg: string, size: Size): string {
  return svg.replace(/<svg\b[^>]*>/, (root) =>
    root
      .replace(/\s(width|height|preserveAspectRatio)="[^"]*"/g, "")
      .replace(
        /^<svg/,
        `<svg width="${size.width}" height="${size.height}"` +
          ` preserveAspectRatio="none"`,
      ),
  );
}

/**
 * Draws an SVG as an image in the browser, through a blob URL it lets go of
 * once the image has decoded.
 */
export const loadSvgImage: LoadSvgImage = async (svg, size) => {
  const url = URL.createObjectURL(
    new Blob([sizeSvg(svg, size)], { type: "image/svg+xml" }),
  );
  try {
    const image = new Image(size.width, size.height);
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
};
