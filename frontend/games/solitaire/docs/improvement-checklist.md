# Improvement checklist

Tracks the changes recommended by the September 2026 codebase review, in the
order they are being made. Each item is ticked in the commit that finishes it,
so this file and `git log` agree on where the work stands.

**To resume:** check out `chore/improvement-checklist`, read this file, and
start at the first unticked item. Delete this file once every item is done.

## Bugs

- [x] **Reset the won flag and stopwatch whenever the game changes.** Commit
      `ac8ecbf`, which also fixes the stopwatch that stuck at zero after loading
      a position mid-game.
- [x] **Ask before Back throws away a game in progress.** A guard on the game
      route asks first. Declining restores the browser's place in history,
      except for an entry typed into the address bar, which Angular cannot
      place.
- [x] **Load a reported position in one step.** The catalog's `load` records
      the rules and deals once, or not at all when nothing changes.

## Engine and game structure

- [ ] **One place to record game actions.** A single engine method counts the
      move, records it and checks for a win, so no game increments the move
      count by hand.
- [ ] **Shared deal-and-collect helper.** Spider, Spiderette and Scorpion use
      one helper instead of three copies.
- [ ] **Set each game's zones once, when the game is built.** Replace the zones
      callback with a plain list and delete the memoizer and cache logic.
- [ ] **Pass Klondike a draw count instead of a settings object.** The tests
      that change draw mode mid-game build a new game instead.
- [ ] **Replace the per-game board files with a gesture map.** Each game id maps
      to its gestures, and the layout comes from the catalog entry.
- [ ] **Share Klondike's stock and scoring with Double Klondike.** One object
      owns the recycle count, drawing, recycling and scoring.
- [ ] **Use options objects in game constructors.** Remove the placeholder
      `undefined` arguments, type option values so the casts go away, and share
      one create-and-deal helper.
- [ ] **Update the add-game skill.** Change it in the same commit as any item
      above that changes its recipe.

## Rendering

- [ ] **Pass placeholder data to the board scene.** Removes the Phaser adapter's
      only import from the tableau engine.
- [ ] **Block tableau imports in the Phaser adapter's lint rule.**
- [ ] **Slim the board input manager.** The scene owns the drag controller, and
      the input manager only binds Phaser events.

## UI

- [ ] **Save the chosen felt theme instead of its colour.** Includes a one-time
      migration of colours already saved.

## Build tooling

- [ ] Add `noEmit` to `tsconfig.json` so type-checking stops writing into
      `dist/`, and drop the options that only matter for output.
- [ ] Remove the unused `concurrently` and `@types/core-js` packages.
- [ ] Move `eslint` into devDependencies.
- [ ] Delete `register.cjs` and add an `engines` field for Node instead.
- [ ] Remove the references to the empty `custom_typings` directory.
- [ ] Correct the coverage floor quoted in `.agents/AGENTS.md`.

## Formatting

- [ ] Add a `.gitattributes` file that forces LF endings.
- [ ] List any renormalize commit in a blame-ignore file.
- [ ] Add a check-only Prettier step to lint, and fix the files that drifted.

## Types and lint

- [ ] **Lint the rule that only the provider folder names a game.**
- [ ] **Enable `noUncheckedIndexedAccess`.**

## CI

- [ ] Run the verify job on pull requests, and deploy only on pushes.
- [ ] Cache Yarn packages in the Node setup step.
- [ ] Add a concurrency group so two deploys can't race.
