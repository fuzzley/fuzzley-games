import {GameObjects, Scene} from "phaser";

import {ALL_PLAYING_CARD_IDS, PlayingCardId, Suit, Type} from "../../card/playing_card";

export class BoardScene extends Scene {
    private static readonly CARD_WIDTH_PX = 221;
    private static readonly CARD_HEIGHT_PX = 313;

    private tableauPh : GameObjects.Sprite;
    private cardHeartsAce : GameObjects.Sprite;

    constructor() {
        super('board-scene');
    }

    create() {
        console.log(CARD_FILES);

        this.tableauPh = this.add.sprite(100, 0, 'card_assets', 'card-placeholder');
        this.tableauPh.setOrigin(0, 0);

        this.addCardSprites(ALL_PLAYING_CARD_IDS);
    }

    private addCardSprites(cardIds: PlayingCardId[]): Map < PlayingCardId,
    GameObjects.Sprite > {
        return new Map<PlayingCardId, GameObjects.Sprite>(cardIds.map((id, index) => [
            id, 
            this.add
            .sprite(100 + (index * 50), 100 + (index * 50), 'card_assets', CARD_FILES.get(id))
            .setOrigin(0, 0),
        ]));
    }
}

function playingCardIdToFileName(playingCardId: PlayingCardId): string {
    function suitToFileName(suit: Suit) {
        switch (suit) {
            case Suit.SPADE:
                return 'spades';
            case Suit.HEART:
                return 'clubs';
            case Suit.DIAMOND:
                return 'diamonds';
            case Suit.CLUB:
                return 'clubs';
        }

        throw new Error(`Unknown Suit: $suit`);
    }

    function typeToFileName(type: Type) {
        switch (type) {
            case Type.ACE:
                return 'ace';
            case Type.TWO:
                return '2';
            case Type.THREE:
                return '3';
            case Type.FOUR:
                return '4';
            case Type.FIVE:
                return '5';
            case Type.SIX:
                return '6';
            case Type.SEVEN:
                return '7';
            case Type.EIGHT:
                return '8';
            case Type.NINE:
                return '9';
            case Type.TEN:
                return '10';
            case Type.JACK:
                return 'jack';
            case Type.QUEEN:
                return 'queen';
            case Type.KING:
                return 'king';
        }

        throw new Error(`Unknown Type: $type`);
    }

    return `card-${
        suitToFileName(playingCardId.suit)
    }-${
        typeToFileName(playingCardId.type)
    }`;
}

const CARD_FILES = new Map<PlayingCardId, string>(ALL_PLAYING_CARD_IDS.map((id) => [id, playingCardIdToFileName(id)]));
