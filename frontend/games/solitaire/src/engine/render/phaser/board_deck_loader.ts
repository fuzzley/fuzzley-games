import { GameObjects, Loader, Textures } from "phaser";

import { CardDeckId } from "../card_deck";
import { CardDeckStatus } from "../presentation";
import { cardDeckTextureKey, loadCardDeck } from "./card_deck_atlas";

/** What a deck loader needs of the scene it draws into. */
export interface DeckLoaderHost {
  /** The texture cache, for testing what is resident and releasing what is not. */
  readonly textures: Textures.TextureManager;
  /** The loader, for fetching a deck that is not resident. */
  readonly load: Loader.LoaderPlugin;
  /** Every sprite drawn from the deck texture, cards and placeholders alike. */
  texturedSprites(): Iterable<GameObjects.Sprite>;
  /** Says how the deck the player asked for is getting on. */
  reportCardDeckStatus(status: CardDeckStatus): void;
}

/**
 * Which deck the board is drawn from, and how it gets there.
 *
 * Lifted out of {@link BoardScene}, where it was about a sixth of the file and
 * shared nothing with the rest of it but the sprite maps it iterates. Fetching
 * an atlas, guarding against a stale arrival, repointing every sprite and
 * releasing the texture being left is asset management, not board drawing.
 */
export class BoardDeckLoader {
  /**
   * The deck a load is running for, or null when none is.
   *
   * What makes a late arrival safe to ignore: a player who switches away and
   * back while the first load is still running should end on the deck they
   * chose last, not on whichever load happened to finish last.
   */
  private awaiting: CardDeckId | null = null;

  /**
   * @param host The scene to load into and draw from.
   * @param current The deck the board booted on.
   */
  constructor(
    private readonly host: DeckLoaderHost,
    private current: CardDeckId,
  ) {}

  /**
   * The deck being drawn. Every sprite's texture, and the one new sprites are
   * made from.
   */
  get deckId(): CardDeckId {
    return this.current;
  }

  /**
   * Draws the board from a different deck.
   *
   * Fetches it first unless it is already in the texture cache, and leaves the
   * board on the deck it has if that fetch fails: a texture that never arrived
   * would draw every card as a blank rectangle, which is worse than the deck
   * they were trying to leave.
   *
   * @param deckId The deck to switch to.
   */
  use(deckId: CardDeckId): void {
    if (deckId === this.current) {
      this.awaiting = null;
      // Said again rather than passed over in silence: this is the branch the
      // deck the board booted on arrives through, and the one a revert comes
      // back through, and both are answers somebody is waiting for.
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
      // Ignored unless this is still the deck being waited for: switching away
      // and back mid-load would otherwise let the stale arrival win — and
      // answer for a question that is no longer being asked.
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
   * Repoints every sprite at the given deck's texture, and lets go of the one
   * being left.
   *
   * Frame names are the same in every deck, so each sprite keeps the frame it
   * was already showing and the per-frame reconciliation in
   * {@link PhaserTableRenderer} has nothing to undo.
   *
   * The origin has to be put back after each swap. A `Sprite` takes its
   * `setTexture` from the TextureCrop component, which passes the frame on to
   * `setFrame` with `updateOrigin` left at its default — and every card frame
   * records a custom pivot at its centre, while the board places cards by their
   * top left corner. `setFrame`'s own `updateOrigin` parameter is not reachable
   * from here without first setting the texture to its `__BASE` frame.
   *
   * The outgoing deck is dropped rather than kept for a quick return: a page is
   * 4032x3732, which is sixty megabytes of texture memory once uploaded, and
   * three of those resident is more than a mobile GPU should be asked to hold
   * for a preference. Coming back re-reads it from the browser's cache, so what
   * a return actually costs is a decode and an upload rather than a download.
   */
  private apply(deckId: CardDeckId): void {
    const previousKey = cardDeckTextureKey(this.current);
    this.current = deckId;
    const textureKey = cardDeckTextureKey(deckId);

    for (const sprite of this.host.texturedSprites()) {
      sprite.setTexture(textureKey, sprite.frame.name);
      sprite.setOrigin(0, 0);
    }

    // After the sprites, never before: releasing a texture still being drawn
    // from would blank the board for a frame.
    this.host.textures.remove(previousKey);

    this.host.reportCardDeckStatus({ kind: "drawn", deckId });
  }
}
