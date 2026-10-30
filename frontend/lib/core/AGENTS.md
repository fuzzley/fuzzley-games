# @fz/core

The `@fz/core` library (`frontend/lib/core`): the small helpers the games
share that need no framework and no platform, so a game's rules, which keep
every framework out, can import them, in the browser and in the scripts that
run them in Node. The frontend's rules, in
[frontend/AGENTS.md](../../AGENTS.md), and the repository's, in
[.agents/AGENTS.md](../../../.agents/AGENTS.md), apply here too. Paths are
relative to `frontend/lib/core/`.

## What it holds

Each file is an entry point of its own, imported by name, such as
`@fz/core/random`:

- `src/random.ts`: `createRandom(seed)`, a seeded source of numbers from 0
  up to 1 (Mulberry32), `drawAt(seed, n)`, the `n`th of a seed's draws made
  on its own, for a game that keeps a count of its draws rather than a
  source, `randomSeed()`, a whole number of 32 bits for a new deal, and
  `shuffled()`, a list in an order a source picks.
- `src/json.ts`: `isRecord()`, `isWhole()` and `isCount()`, for reading
  back what was stored as JSON, which may have been edited or cut short.
- `src/format.ts`: `count()`, a count with its noun, such as "1 hint" or
  "2 hints".
- `src/math.ts`: `clamp()`, a number kept between a least and a most.

Every game but the Solitaire Collection takes some of them, and `@fz/ui`'s
storage takes `isRecord()`. The Solitaire Collection keeps its own seeded
random and JSON reader in its engine for now.

## Rules

- **Nothing but plain TypeScript.** No framework, no DOM and no Node: the
  library imports nothing but its own files, as its ESLint config checks,
  and its `tsconfig.json` gives it neither the DOM's types nor Node's. A
  game's rules allow `@fz/core` past the fence that keeps every other
  library out of them.
- **Mulberry32's sequence never changes,** nor do `drawAt()`'s numbers or
  the order `shuffled()` gives a seed. The screenshot scripts deal by seed
  and play moves that fit only the deal it gives, a Minesweeper game saved
  before its first move keeps only its seed, and Snake's and Brick
  Breaker's runs keep a seed and a count of draws, so the numbers a seed
  gives are a contract. `src/random.spec.ts` pins the first of them; a
  change that moves them is a new function, not an edit.
- **A helper belongs here once two workspaces need it,** or beside one
  that does, as `shuffled()` sits by the seeded random. One only a game
  uses stays in that game.
- **Every line is covered:** `vitest.config.ts` holds the library to 100%.

## Development Commands

Run these from `frontend/lib/core/`, or as `yarn workspace @fz/core
<script>` from `frontend/`.

- **Run Tests:** `yarn test` (Vitest in Node, with coverage).
- **Type Checking:** `yarn typecheck`.
- **Linting:** `yarn lint`.
