import { GameObjects, Loader, Textures } from "phaser";

import { CardDeckId } from "../card_deck";
import { CardArtScale } from "../layout/card_metrics";
import { CardDeckStatus } from "../presentation";
import {
  CardAtlas,
  cardAtlasTextureKey,
  chooseCardAtlas,
  loadCardAtlas,
  residentCardAtlases,
  sameCardAtlas,
} from "./card_deck_atlas";

/** Gives a deck loader what it needs of the scene it draws into. */
export interface DeckLoaderHost {
  /** The texture cache, to check what is resident and release what is not. */
  readonly textures: Textures.TextureManager;
  /** The loader, for fetching an atlas that is not resident. */
  readonly load: Loader.LoaderPlugin;
  /** Returns every card and placeholder sprite drawn from the deck texture. */
  texturedSprites(): Iterable<GameObjects.Sprite>;
  /** Returns the density the board's current size calls for. */
  wantedArtScale(): CardArtScale;
  /**
   * Redraws whatever was drawn from the atlas at its old density, once every
   * sprite has been repointed at the new one.
   */
  artScaleChanged(): void;
  /** Says how the deck the player asked for is getting on. */
  reportCardDeckStatus(status: CardDeckStatus): void;
}

/** Loads the atlas the board is drawn from and repoints every sprite at it. */
export class BoardDeckLoader {
  /** The atlas a load is running for, or null when none is. */
  private awaiting: CardAtlas | null = null;

  /**
   * Creates a loader for a scene.
   *
   * @param current The atlas the board booted on, which must be resident.
   */
  constructor(
    private readonly host: DeckLoaderHost,
    private current: CardAtlas,
  ) {}

  /** The atlas every sprite, old or new, is drawn from. */
  get atlas(): CardAtlas {
    return this.current;
  }

  /** The deck every sprite, old or new, is drawn from. */
  get deckId(): CardDeckId {
    return this.current.deckId;
  }

  /**
   * Draws the board from a deck, fetching it first if needed and staying on the
   * current deck if the fetch fails.
   */
  use(deckId: CardDeckId): void {
    const target = chooseCardAtlas(
      deckId,
      this.host.wantedArtScale(),
      residentCardAtlases(this.host.textures),
    );

    if (deckId === this.current.deckId) {
      // The boot deck and a revert both arrive here, and each is reported even
      // though the deck is unchanged, because someone is waiting on it. A
      // denser copy it still needs follows without a word.
      this.host.reportCardDeckStatus({ kind: "drawn", deckId });
    } else if (
      !this.host.textures.exists(cardAtlasTextureKey(target)) &&
      !sameCardAtlas(target, this.awaiting)
    ) {
      this.host.reportCardDeckStatus({ kind: "loading", deckId });
    }

    this.moveTo(target);
  }

  /**
   * Moves to a denser copy of the deck once the board has grown past what its
   * atlas can draw without enlarging it.
   *
   * It never moves to a less dense one, so a window dragged back and forth
   * cannot keep reloading the deck; the next deck or board picks the cheaper
   * density.
   */
  refit(): void {
    const heading = this.awaiting ?? this.current;
    const wanted = this.host.wantedArtScale();
    if (wanted <= heading.artScale) return;

    this.moveTo(
      chooseCardAtlas(
        heading.deckId,
        wanted,
        residentCardAtlases(this.host.textures),
      ),
    );
  }

  /** Draws the board from an atlas, fetching it first if it is not resident. */
  private moveTo(target: CardAtlas): void {
    if (sameCardAtlas(target, this.current)) {
      // Anything still loading is no longer wanted.
      this.awaiting = null;
      this.releaseOtherAtlases();
      return;
    }
    if (sameCardAtlas(target, this.awaiting)) return;

    if (this.host.textures.exists(cardAtlasTextureKey(target))) {
      this.awaiting = null;
      this.apply(target);
      return;
    }
    this.fetch(target);
  }

  /** Loads an atlas and draws the board from it, if it is still wanted. */
  private fetch(target: CardAtlas): void {
    this.awaiting = target;
    const textureKey = loadCardAtlas(this.host.load, target);
    this.host.load.once(Loader.Events.COMPLETE, () => {
      // A player who switched again mid-load wants their later choice, not
      // whichever load finishes last.
      if (!sameCardAtlas(this.awaiting, target)) {
        this.releaseOtherAtlases();
        return;
      }
      this.awaiting = null;
      if (this.host.textures.exists(textureKey)) {
        this.apply(target);
      } else if (target.deckId !== this.current.deckId) {
        // A denser copy of the deck on the table that fails to load leaves the
        // board drawing the copy it has, which is nothing to report.
        this.host.reportCardDeckStatus({
          kind: "unavailable",
          deckId: target.deckId,
        });
      }
    });
    this.host.load.start();
  }

  /** Repoints every sprite at an atlas's texture and releases the old one. */
  private apply(target: CardAtlas): void {
    const previous = this.current;
    this.current = target;
    const textureKey = cardAtlasTextureKey(target);

    for (const sprite of this.host.texturedSprites()) {
      sprite.setTexture(textureKey, sprite.frame.name);
      // setTexture moves the origin to the frame's centred pivot, but the board
      // places cards by their top left corner.
      sprite.setOrigin(0, 0);
    }
    if (target.artScale !== previous.artScale) {
      this.host.artScaleChanged();
    }

    // After the sprites, never before: releasing a texture still being drawn
    // from would blank the board for a frame.
    this.releaseOtherAtlases();

    if (target.deckId !== previous.deckId) {
      this.host.reportCardDeckStatus({ kind: "drawn", deckId: target.deckId });
    }
  }

  /**
   * Releases every loaded atlas but the one the board is drawn from and the one
   * on its way.
   *
   * None is kept for a quick return because a deck takes about sixty
   * megabytes of texture memory at 2x, and a mobile GPU should not have to
   * hold several.
   */
  private releaseOtherAtlases(): void {
    for (const atlas of residentCardAtlases(this.host.textures)) {
      if (
        !sameCardAtlas(atlas, this.current) &&
        !sameCardAtlas(atlas, this.awaiting)
      ) {
        this.host.textures.remove(cardAtlasTextureKey(atlas));
      }
    }
  }
}
