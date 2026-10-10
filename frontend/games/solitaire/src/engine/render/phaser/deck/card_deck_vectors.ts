import { CardDeckId } from "../../deck/card_deck";

/**
 * The SVG of every frame a deck can draw at any size, by frame name: each a
 * document of the card's design size, with no text, since an SVG a browser
 * draws as an image cannot load a font.
 */
export type CardFrameVectors = Readonly<Record<string, string>>;

/**
 * Loads each deck's frame vectors, which `yarn build:atlas` writes beside its
 * atlases for a deck that has them. Loaded only when a board draws the deck,
 * since a board that draws from the built atlases never needs them.
 */
const vectorLoaders: Partial<
  Record<CardDeckId, () => Promise<CardFrameVectors>>
> = {
  mobile: async () =>
    (await import("../../assets/sprites/atlas/mobile/vectors.json")).default,
};

/** Returns whether a deck's frames can be drawn at any size. */
export function hasCardDeckVectors(deckId: CardDeckId): boolean {
  return vectorLoaders[deckId] !== undefined;
}

/**
 * Loads the frame vectors of a deck, or resolves to null for a deck that has
 * none.
 */
export async function loadCardDeckVectors(
  deckId: CardDeckId,
): Promise<CardFrameVectors | null> {
  return (await vectorLoaders[deckId]?.()) ?? null;
}
