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

- [x] **Save the chosen felt theme instead of its colour.** Presentation
      settings own the felt; a colour saved by an earlier build is read as its
      felt. `ThemeService` is gone.

## Build tooling

- [x] Stop type-checking from writing into `dist/`. Done with `--noEmit` on
      the `tsc` scripts, not in `tsconfig.json`: the Angular Vite plugin emits
      through that config, and `noEmit` there left the build with 4 modules
      instead of 428 while still reporting success. The output options stay for
      the same reason.
- [x] Remove the unused `concurrently` and `@types/core-js` packages.
- [x] Move `eslint` into devDependencies.
- [x] Delete `register.cjs` and add an `engines` field for Node instead, which
      mirrors `@angular/core`, the strictest of the toolchain.
- [x] Remove the references to the empty `custom_typings` directory.
- [x] Correct the coverage floor quoted in `.agents/AGENTS.md`, and in the
      vitest skill, by pointing at `vitest.config.ts` instead of quoting it.

## Formatting

- [x] Add a `.gitattributes` file that forces LF endings.
- [x] ~~List any renormalize commit in a blame-ignore file.~~ Not needed: every
      committed file was already LF, so renormalizing changed no content and
      there is no commit to ignore.
- [x] Add a check-only Prettier step to lint, and fix the files that drifted.

## Types and lint

- [x] **Lint the rule that only the provider folder names a game.**
- [x] **Enable `noUncheckedIndexedAccess`.** On for source, where its 45
      errors were fixed with `for...of`, guards, and a checked `itemAt` for
      positions a loop guarantees. Off for specs, whose 1,120 errors were all
      positional reads like `game.tableaus[0]`, noted in `tsconfig.spec.json`.

## CI

- [x] Run the verify job on pull requests, and deploy only on pushes.
- [x] Cache Yarn packages. Done with `actions/cache` on the folder Yarn
      reports, not `setup-node`'s `cache: yarn`, which looks it up before
      Corepack has installed Yarn 4.
- [x] Add a concurrency group so two deploys can't race. Untested until the
      workflow next runs on GitHub; it parses and passes Prettier locally.

## New findings

Found while working through the list above, and not yet part of it.

- [x] **WebGL contexts outlive their games.** Switching games quickly makes
      Chrome warn "Too many active WebGL contexts. Oldest context will be
      lost." `PhaserHost.destroy` does not release the context explicitly, so
      each switch leaves one for the garbage collector. The collector was not
      slow: it could not free them at all, because a destroyed board never
      unsubscribed from the presentation's root effects (`a571377`). The
      host now keeps one game, and so one context, for the canvas component's
      whole life and swaps each board into it (`03472aa`). It loses the
      context when it is destroyed (`abbe7a6`). Over ten switches the
      session created 2 contexts instead of 12 and kept 1 `BoardScene` instead
      of 11. The median switch fell from 124 ms to 17 ms.
