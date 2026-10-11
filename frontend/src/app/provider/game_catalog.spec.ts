import { describe, it, expect } from 'vitest';
import { CATEGORIES, GAMES, findGame, gamesIn, isNew, matchesQuery } from './game_catalog';

describe('catalog', () => {
  const klondike = findGame('klondike')!;

  it('gives every game a unique slug and a known category', () => {
    expect(new Set(GAMES.map((game) => game.slug)).size).toBe(GAMES.length);
    const ids = CATEGORIES.map((category) => category.id);
    GAMES.forEach((game) => expect(ids).toContain(game.category));
  });

  it('matches on name, category and blurb, ignoring case', () => {
    expect(matchesQuery(klondike, 'KLON')).toBe(true);
    expect(matchesQuery(klondike, 'solitaire')).toBe(true);
    expect(matchesQuery(klondike, 'ace')).toBe(true);
    expect(matchesQuery(klondike, 'mine')).toBe(false);
  });

  it('needs every word of the query to match', () => {
    expect(matchesQuery(klondike, 'solitaire classic')).toBe(true);
    expect(matchesQuery(klondike, 'solitaire hearts')).toBe(false);
  });

  it('lists the games in a category', () => {
    expect(gamesIn('classics').map((game) => game.slug)).toEqual(['minesweeper', 'sudoku', 'reversi']);
  });

  it('marks a game as new for 30 days, but never one still to come', () => {
    const added = new Date(klondike.added);
    const days = (n: number) => new Date(added.getTime() + n * 24 * 60 * 60 * 1000);
    expect(isNew(klondike, days(29))).toBe(true);
    expect(isNew(klondike, days(31))).toBe(false);
    expect(isNew(findGame('sudoku')!, new Date(findGame('sudoku')!.added))).toBe(false);
  });
});
