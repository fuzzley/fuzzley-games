import {Card} from './card';

export class PlayingCard implements Card {
    public faceUp: boolean;
    public suite: Suit;
    public type: Type;
}

export enum Suit {
    SPADE,
    HEART,
    DIAMOND,
    CLUB,
}

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