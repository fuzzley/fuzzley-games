---
name: solitaire-solver-and-hints
description: Solitaire board winnability solver algorithms, heuristic graph search (A*, BFS/DFS), deadlock detection, and hint engine implementations for fSolitaire variants (Klondike, FreeCell, Spider, Yukon). Triggers on: solver, hint, winnability, deadlock, auto-complete, heuristic search, solitaire solver.
---

# Solitaire Solver & Hint Engine

> Guidelines for implementing winnability analysis, graph search solvers ($A^*$, BFS/DFS), deadlock detection, and hint calculation engines for fSolitaire.

## Architectural Boundaries

- **Location:** Solver algorithms and hint providers belong in `src/engine/tableau` (generic solvers) or `src/games/<variant>/` (variant-specific move heuristics).
- **Framework Isolation:** Solvers MUST be pure TypeScript functions. They must never import Phaser, Angular, or DOM APIs.
- **Immutability & Speed:** State exploration must perform lightweight state cloning or reversible move application to maintain high performance during tree search.

## Core Concepts

### 1. Board State Encoding & Memoization

To prevent infinite loops during graph exploration and speed up state lookup:
- Compute a compact, canonical string or hash key for every `TableGame` state.
- Include column suit/rank sequences, freecell/reserve contents, foundation top ranks, and stock/waste indices in the state hash.
- Store visited state hashes in a native JavaScript `Set<string>`.

```ts
export function serializeGameState(game: TableGame): string {
  const foundationKey = game.foundations.map(f => f.topCard?.id ?? '').join('|');
  const columnsKey = game.tableau.map(col => col.cards.map(c => `${c.id}${c.faceUp ? 'U' : 'D'}`).join(',')).join(';');
  const wasteKey = game.waste?.topCard?.id ?? '';
  return `${foundationKey}#${columnsKey}#${wasteKey}`;
}
```

### 2. Heuristic Functions by Variant

When using $A^*$ search for hints or solve verification, evaluate board priority with variant-specific heuristics:

- **Klondike:**
  - Weight face-down cards remaining in tableau (highest penalty).
  - Reward cards moved to foundations.
  - Reward empty tableau columns for King placements.
- **FreeCell:**
  - Reward empty freecells and empty tableau cascades.
  - Penalize cards buried under non-sequential rank/suit sequences.
- **Spider:**
  - Reward same-suit contiguous runs (e.g. ♠K down to ♠A).
  - Penalize cross-suit card stacking.
  - Major bonus for clearing a column completely.

### 3. Hint Engine Contract

Implement hint generation via a stateless helper that evaluates valid moves from the current game state and ranks them by heuristic score:

```ts
export interface SolitaireHint {
  fromZone: string;
  toZone: string;
  cardCount: number;
  weight: number; // Higher is better
  explanation: string;
}

export function findBestHint(game: TableGame): SolitaireHint | null {
  const validMoves = getLegalMoves(game);
  if (validMoves.length === 0) return null;
  
  // Rank moves: Foundation moves > Face-down card reveals > Column organization > Stock draw
  validMoves.sort((a, b) => scoreMove(b, game) - scoreMove(a, game));
  return validMoves[0];
}
```

### 4. Auto-Complete Detection

A game board is auto-completable when:
1. All cards in the tableau are face-up.
2. The stock and waste piles are empty.
3. No blockades exist preventing cards from moving directly to foundations.

When triggered, queue an automated sequence of foundation moves with tweened card animations.
