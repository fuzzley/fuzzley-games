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

- [x] **One place to record game actions.** `TableGame.commitAction` counts the
      move, records it and checks for a win. Montana's win moved from the
      removed `afterMove` hook to an `isWon` override.
- [x] **Shared deal-and-collect helper.** `dealRowCollectingRuns` in
      `games/common/row_deal.ts`.
- [x] **Set each game's zones once, when the game is built.** `TableGame`
      indexes the list in its constructor; `memoizeZones` is gone.
- [x] **Pass Klondike a draw count instead of a settings object.**
      `DrawCount` now lives in `klondike_rules.ts`.
- [x] **Replace the per-game board files with a gesture map.** `GESTURES` in
      `board_catalog.ts`; the catalog spec checks every rule option deals onto
      its entry's grid.
- [x] **Share Klondike's stock and scoring with Double Klondike.** Done as a
      shared base class, `KlondikeFamilyGame`, rather than the delegate object
      first proposed: everything the two games shared was an engine hook, which
      a delegate would have needed forwarding in both. Double Klondike now uses
      Klondike's gestures too.
- [x] **Use options objects in game constructors.** Every game takes one
      options object extending `DeckOptions`; `GameOptionSpec<T>` types each
      option's values; the catalog deals through `dealt`. `almostWin` became a
      readonly option.
- [x] **Update the add-game skill.** Updated in the same commit as each item
      above that changed its recipe.

## Rendering

- [x] **Pass placeholder data to the board scene.** `BoardSceneOptions` takes
      `backgrounds`, built by `pileBackgrounds` in `engine/tableau/view`.
- [x] **Block tableau imports in the Phaser adapter's lint rule.**
- [x] **Slim the board input manager.** The scene owns the drag controller;
      the input manager binds Phaser events through a narrow `InputHost`.

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

## New findings

Found while working through the list above, and not yet part of it.

- [ ] **WebGL contexts outlive their games.** Switching games quickly makes
      Chrome warn "Too many active WebGL contexts. Oldest context will be
      lost." `PhaserHost.destroy` does not release the context explicitly, so
      each switch leaves one for the garbage collector.
