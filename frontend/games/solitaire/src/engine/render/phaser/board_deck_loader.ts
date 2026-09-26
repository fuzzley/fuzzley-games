import { GameObjects, Loader, Textures } from "phaser";

import { CardDeckId } from "../card_deck";
import { CardDeckStatus } from "../presentation";
import { cardDeckTextureKey, loadCardDeck } from "./card_deck_atlas";

/** Gives a deck loader what it needs of the scene it draws into. */
export interface DeckLoaderHost {
  /** The texture cache, to check what is resident and release what is not. */
  readonly textures: Textures.TextureManager;
  /** The loader, for fetching a deck that is not resident. */
  readonly load: Loader.LoaderPlugin;
  /** Returns every card and placeholder sprite drawn from the deck texture. */
  texturedSprites(): Iterable<GameObjects.Sprite>;
  /** Says how the deck the player asked for is getting on. */
  reportCardDeckStatus(status: CardDeckStatus): void;
}

/** Loads the deck the board is drawn from and repoints every sprite at it. */
export class BoardDeckLoader {
  /** The deck a load is running for, or null when none is. */
  private awaiting: CardDeckId | null = null;

  /**
   * Creates a loader for a scene.
   *
   * @param current The deck the board booted on.
   */
  constructor(
    private readonly host: DeckLoaderHost,
    private current: CardDeckId,
  ) {}

  /** The deck every sprite, old or new, is drawn from. */
  get deckId(): CardDeckId {
    return this.current;
  }

  /**
   * Draws the board from a deck, fetching it first if needed and staying on the
   * current deck if the fetch fails.
   */
  use(deckId: CardDeckId): void {
    if (deckId === this.current) {
      this.awaiting = null;
      // Reported even though nothing changed: the boot deck and a revert both
      // arrive here, and someone is waiting on each.
      this.host.reportCardDeckStatus({ kind: "drawn", deckId });
      return;
    }

    if (this.host.textures.exists(cardDeckTextureKey(deckId))) {
      this.awaiting = null;
      this.apply(deckId);
      return;
    }

    this.awaiting = deckId;
    this.host.reportCardDeckStatus({ kind: "loading", deckId });
    const textureKey = loadCardDeck(this.host.load, deckId);
    this.host.load.once(Loader.Events.COMPLETE, () => {
      // A player who switched again mid-load wants their later choice, not
      // whichever load finishes last.
      if (this.awaiting !== deckId) return;
      this.awaiting = null;
      if (this.host.textures.exists(textureKey)) {
        this.apply(deckId);
      } else {
        this.host.reportCardDeckStatus({ kind: "unavailable", deckId });
      }
    });
    this.host.load.start();
  }

  /**
   * Repoints every sprite at a deck's texture and releases the old one.
   *
   * The old texture is not kept for a quick return because each deck takes
   * about sixty megabytes of texture memory, and a mobile GPU should not have
   * to hold several.
   */
  private apply(deckId: CardDeckId): void {
    const previousKey = cardDeckTextureKey(this.current);
    this.current = deckId;
    const textureKey = cardDeckTextureKey(deckId);

    for (const sprite of this.host.texturedSprites()) {
      sprite.setTexture(textureKey, sprite.frame.name);
      // setTexture moves the origin to the frame's centred pivot, but the board
      // places cards by their top left corner.
      sprite.setOrigin(0, 0);
    }

    // After the sprites, never before: releasing a texture still being drawn
    // from would blank the board for a frame.
    this.host.textures.remove(previousKey);

    this.host.reportCardDeckStatus({ kind: "drawn", deckId });
  }
}
