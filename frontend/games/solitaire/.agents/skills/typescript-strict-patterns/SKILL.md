---
name: typescript-strict-patterns
description: Immutable game state modeling, strict type narrowing, ESLint restricted import enforcement, pure card primitives, and Google TypeScript style compliance for fSolitaire. Triggers on: typescript, type safety, strict mode, discriminated union, immutable state, card primitives, google ts style.
---

# TypeScript Strict Patterns & Type Safety

> TypeScript coding standards, strict type safety rules, discriminated unions, and Google TypeScript style guidelines for fSolitaire.

## Pure Card Primitives (`src/engine/core`)

- Core primitives (`Suit`, `Rank`, `PlayingCard`, `CardPile`, `Deck`) must be pure TypeScript structures.
- **Strict Prohibition:** `src/engine/core` MUST NEVER import Phaser, Angular, RxJS, DOM elements, or higher-level tableau renderers.
- Use explicit enums or string literal unions for Suits and Ranks:

```ts
export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type SuitColor = 'red' | 'black';

export function getSuitColor(suit: Suit): SuitColor {
  return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
}
```

## Discriminated Unions for Solitaire Move Actions

Model solitaire engine actions using tagged discriminated unions to ensure exhaustive `switch`/`case` type checking:

```ts
export type TableauMoveAction =
  | { type: 'MOVE_CARDS'; fromZone: string; toZone: string; cards: readonly PlayingCard[] }
  | { type: 'DEAL_STOCK'; count: number }
  | { type: 'FLIP_CARD'; cardId: string }
  | { type: 'AUTO_COMPLETE' };

export function processAction(action: TableauMoveAction, state: GameState): GameState {
  switch (action.type) {
    case 'MOVE_CARDS':
      return applyMove(state, action.fromZone, action.toZone, action.cards);
    case 'DEAL_STOCK':
      return applyStockDeal(state, action.count);
    case 'FLIP_CARD':
      return applyCardFlip(state, action.cardId);
    case 'AUTO_COMPLETE':
      return applyAutoComplete(state);
  }
}
```

## Architectural Tier Import Boundaries (`@typescript-eslint/no-restricted-imports`)

TypeScript architectural boundaries are enforced as hard errors in ESLint (`eslint.config.cjs`). Each tier may depend ONLY on tiers below it:

| Tier | Directory | Allowed Imports | Explicit Restrictions |
|---|---|---|---|
| 1 | `src/engine/core` | Standard TS primitives | `engine/render/*`, `engine/tableau/*`, `games/*`, `ui/*`, `phaser`, `@angular/*`, `rxjs` |
| 2 | `src/engine/render` | `engine/core` | `phaser`, `engine/render/phaser/*`, `engine/tableau/*`, `games/*`, `ui/*` |
| 3 | `src/engine/render/phaser` | `engine/core`, `engine/render`, `phaser` | `engine/tableau/view/table_view_builder`, `games/*`, `ui/*`, `@angular/*` |
| 4 | `src/engine/tableau` | `engine/core`, `engine/render` | `phaser`, `engine/render/phaser/*`, `games/*`, `ui/*` |
| 5 | `src/games/*` | `engine/*` | `ui/*`, `@angular/*` |

## TypeScript Best Practices

- **Avoid `any`:** Never use `as any`. Use generic constraints or `unknown` with type guards if unknown.
- **Explicit Return Types:** Specify explicit return types on all exported functions and public service methods.
- **Readonly Collections:** Mark array properties on immutable state objects as `readonly PlayingCard[]` or `ReadonlyArray<T>` to prevent accidental direct mutation.
