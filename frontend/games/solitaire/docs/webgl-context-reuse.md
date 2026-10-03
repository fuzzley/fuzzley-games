# Plan: one WebGL context for the whole session

This plan addresses the last item in `docs/improvement-checklist.md`. Switching
games quickly makes Chrome warn "Too many active WebGL contexts. Oldest context
will be lost." Instead of releasing each context faster, the canvas keeps one
`Phaser.Game`, and so one context, for as long as the page is open. A new deal
swaps the board scene inside that game. This is option 4 of
`docs/mobile-performance-options.md`.

Delete this file once the checklist item is ticked.

## Progress

**To resume:** check out `perf/webgl-context-reuse`, read the log below, and
start at the first step not marked done. Each step is one commit.

| Step | What                             | State   |
| ---- | -------------------------------- | ------- |
| 0    | Baseline                         | pending |
| 1    | End a board's subscriptions      | pending |
| 2    | Release the context on destroy   | pending |
| 3    | Let a board load its own deck    | pending |
| 4    | Keep one game and swap boards    | pending |
| 5    | Measure, then tick the checklist | pending |

### Log

- 2026-10-02: Plan written; branch `perf/webgl-context-reuse` created from
  `main` at `db1114c`.

## What happens today

Every deal builds a new game. The catalog replaces its session when the player
picks another game, changes a rule, or loads a saved or reported position. The
effect in `src/ui/app/component/game_canvas/game_canvas.component.ts` then
destroys the old `PhaserHost` and starts a new one. Each new game:

- creates a WebGL context and compiles its shaders;
- fetches, decodes and uploads the deck's atlas, about 65 MB of GPU memory;
- leaves the old context for the garbage collector, because Phaser never calls
  `loseContext()` (it appears nowhere in `node_modules/phaser/src`).

New game and Restart are not affected. They re-deal the same game object, so
the session and the board stay.

Reading Phaser's source for this plan turned up two leaks.

- **A destroyed board never unsubscribes.** `Game.destroy` reaches each scene
  through `SceneManager.destroy`, which calls `Systems.destroy`. That emits
  `DESTROY` but never `SHUTDOWN`. `BoardScene` releases its subscriptions on
  `SHUTDOWN` (`followTheModel`, `redrawShadowAfterContextLoss`), so they are
  never released. The presentation service's colour and deck effects live in
  the root injector. They hold every board ever built, with its game and
  gestures, and run all of them on every felt or deck change. A dead board
  that hears about a deck change will try to load it on its destroyed loader.
- **The resize listener is never removed.** `wireInput` calls
  `this.scale.on("resize", ...)` and nothing calls `off`. The scale manager
  belongs to the game, so today the listener dies with it. Once the game is
  shared, each board would leave one behind.

## The design

1. **One game per canvas component.** The `:gameId` route keeps the same route
   config when only the id changes, so Angular's default reuse strategy keeps
   `GameCanvasComponent` alive across game switches. The component creates
   its host once and destroys it in `DestroyRef.onDestroy`.
2. **The host swaps boards.** `PhaserHost.show(makeBoardScene)` stops the
   current board, which emits `SHUTDOWN`, then removes it, which frees its
   sprites, input plugin and loader. Then it adds the new board and starts it.
   A `show` that arrives before the game is ready only replaces the board
   waiting to be mounted, so a quick switch during the first boot mounts the
   latest board and nothing else.
3. **Each board gets its own scene key.** Phaser takes the key from the scene
   instance and throws if that key is already in use. When it has to queue
   operations, it also runs every add before every remove. A fixed
   `"board-scene"` key would therefore throw whenever a swap was queued. A
   counter in `BoardScene` (`board-scene-1`, `board-scene-2`, ...) avoids that.
4. **The deck belongs to the game, not the board.** A new board boots on the
   deck that is already resident. Its `onCardDeck` subscription fires straight
   away, so if the player has chosen a different deck, `BoardDeckLoader.use`
   loads it through the existing path. That path already shows the corner
   badge and falls back if the deck is unavailable. A board loads a deck in
   `preload` only when none is resident, which happens on the first boot. This
   takes over `LoadingScene`'s job, so `LoadingScene` is deleted.
5. **Only one deck is ever resident.** A deck switch interrupted by a game
   switch can leave the new deck's texture landing after its board has gone.
   So the deck loader releases every other `cards:*` texture when a board
   boots and whenever it applies a deck, not only the previous one.
6. **Final teardown releases the context.** `PhaserHost.destroy` calls
   `WEBGL_lose_context.loseContext()` once Phaser has destroyed the game. With
   reuse in place this only runs when the component goes, in specs and after a
   hot reload, but it closes the checklist item as written.

Restarting one long-lived board scene with new options was considered and
rejected. `BoardScene` keeps per-game state in readonly fields and maps, and a
restart keeps the same key, so it would hit the queue-ordering problem in point 3.

## Steps

Each step is one commit that passes `yarn verify` on its own. Steps 1 and 2 are
worth shipping even if the rest waits.

### 0. Take a baseline

Use the DevTools probe from `docs/mobile-performance-options.md`, on a dev build,
across ten game switches:

- count contexts created, by wrapping `HTMLCanvasElement.prototype.getContext`;
- time from choosing a game to the board's `onReady`;
- take a heap snapshot after the tenth switch and count `BoardScene` instances.

Record the numbers in the commit message for step 4, or under option 4 in the
mobile performance doc.

### 1. End a board's subscriptions however it ends (S)

- `BoardScene` runs one cleanup the first time either `SHUTDOWN` or `DESTROY`
  fires, and that cleanup releases everything `create` subscribed: the
  presentation, the game model, the renderer's `RESTORE_WEBGL`, and the scale
  manager's `resize`, which is new.
- Specs in `test/engine/render/phaser/board_scene.spec.ts`: emitting `DESTROY`
  without `SHUTDOWN` releases every subscription, and both events together
  release each one exactly once. `createMockScaleManager` in
  `test/support/phaser_mocks.ts` needs an `off` and a way to count listeners.

This fixes today's leak with no other change.

### 2. Release the context when the host is destroyed (S)

- `PhaserHost` takes a game factory, with `config => new Phaser.Game(config)` as
  the default, so a spec can hand it a fake.
- `destroy` waits for the game's `DESTROY` event, then calls
  `loseContext()` if the renderer is WebGL. Phaser defers its own teardown to
  the next step, so calling it straight away would only make that last step
  render to a lost context.
- New `test/engine/render/phaser/phaser_host.spec.ts`: the context is lost once,
  after the game is destroyed; a canvas renderer and a game destroyed before it
  booted are both handled.

This step alone stops the Chrome warning, but every switch still pays for a new
context and a new atlas upload.

### 3. Let a board load its own deck (M)

- `BoardScene.preload` finds the resident deck, preferring the one the
  presentation asks for. If none is resident, it queues that one with
  `loadCardDeck`. `BoardDeckLoader` starts from the deck the board booted on.
- A helper in `card_deck_atlas.ts` lists the resident decks.
  `BoardDeckLoader` uses it to release every `cards:*` texture except the one in
  use, both at boot and in `apply`.
- `LoadingScene` is deleted. The host's game config lists only the board, and
  `PhaserHost` no longer needs the presentation.
- `BoardSceneOptions.cardDeckId` keeps its name, but its doc changes to "the
  deck to load when none is resident".
- Specs: a board boots on a resident deck without loading, prefers the requested
  deck when both are resident, loads the requested deck when none is, and
  releases stray decks.

The host still builds one game per deal after this step, so behaviour does not
change. It makes the swap in step 4 a host-only change.

### 4. Keep one game and swap boards (M)

- `PhaserHost` replaces `start` with `show(makeBoardScene)`. The first call
  creates the game. Calls before `READY` replace the waiting board. Later calls
  run `stop`, then `remove`, then `add(key, board, true)`.
- `BoardScene` takes a unique key from a module counter.
- `GameCanvasComponent` creates the host on the first session and calls `show`
  on every later one. The effect's cleanup clears only the ready timeout and
  the console global. The host is destroyed with the component.
- Specs:
  - `phaser_host.spec.ts`: one game across several `show` calls; the old board
    is stopped before it is removed; a `show` before `READY` mounts only the
    latest board.
  - `game_canvas.component.spec.ts`: one host across session changes, destroyed
    with the component.
  - `app`, `routes` and `game_catalog.service` specs: their `PhaserHost` mocks
    need the new shape.
- Update the docs that describe the host: `.agents/AGENTS.md` (the layer
  breakdown and the note under the lint table), `phaser-core` and
  `add-solitaire-game` ("mounts whatever board it is handed" becomes "swaps
  in"), and `vite-bundle-optimization`, which names `loading_scene.ts`.
  `yarn skills:check` fails until that last one is fixed.

### 5. Measure, then tick the checklist (S)

Repeat step 0. Expected results:

- one context for the whole session, and no Chrome warning however fast the
  switches come;
- a switch costs one frame plus making the sprites, with no fetch, decode,
  upload or shader compile;
- one `BoardScene`, one `cards:*` texture and one `card-shadow` texture in the
  heap after ten switches.

Then mark option 4 done in the mobile performance doc, and tick the checklist
item with the numbers.

## Things to check by hand

Unit tests cannot cover these, so check each one in the browser after step 4.

- **Context loss over a long session.** One context now carries the whole
  session, and mobile browsers drop contexts from background tabs. After a few
  switches, use `WEBGL_lose_context` to lose and restore the context. Cards and
  shadows should come back. Only the live board should re-bake the shadow,
  which step 1 guarantees.
- **A switch during the first boot.** `SceneManager.stop` abandons a preload
  that is still running. However, Phaser's loader drops its file lists when it
  is destroyed, and a file still downloading may throw when it lands. Look for
  errors in the console. This can already happen today.
- **A switch during a deck change.** Afterwards, `game.textures` should hold one
  `cards:*` key, and the corner badge should clear.
- **The cursor.** Switch with the pointer over a card, for example with a
  keyboard shortcut. Make sure the hand cursor does not stay on the canvas.
- **A switch mid-drag.** The new board should ignore the release of a drag it
  never saw start.
- **The loading overlay.** It now shows for about one frame per switch. If its
  fade is visible, show it only after a short delay.
