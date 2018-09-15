import {Card} from './card';

/** A playing card that tracks it's suite, type, and other state properties. */
export class PlayingCard implements Card {

    /** @override */
    public faceUp: boolean;
    public suite: Suit;
    public type: Type;
}

/** Describes the standard suits that a playing card can have. */
export enum Suit {
    SPADE,
    HEART,
    DIAMOND,
    CLUB,
}

/** Describes the standard types that a playing card can have. */
export enum Type {
    ACE,
    ONE,
    TWO,
    THREE,
    FOUR,
    FIVE,
    SIX,
    SEVEN,
    EIGHT,
    NINE,
    TEN,
    JACK,
    QUEEN,
    KING,
}