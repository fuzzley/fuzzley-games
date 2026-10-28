# Plan: Snake on Phaser, with the Phaser plumbing lifted out of the Solitaire Collection first

Proposed 2026-10-27, answered the same day, and built on 2026-10-27 and
28: the user took the recommendation in every decision but three, listed
under "The user's answers" below, and asked for a detailed work log, regular
commits, and QA of both games once the work was done; during S5 they added
"When done, merge to main and push." Part 1 was built on the branch
`phaser-lift`, cut from `main`, and Part 2 on `snake`, cut from
`phaser-lift` rather than from `main` after a merge, so the two were merged
to `main` together once Part 2 and the QA were done. Each phase is its own
commit with `yarn verify` green; the "As built" notes under each phase say
what came of it. The work log is in git's history as
`docs/snake-worklog.md`. The plan and its notes describe the code as it
was, so check a path against the tree before following one.

This plan has two parts.

- **Part 1 lifts what any Phaser game needs out of the Solitaire Collection**
  into a new library, `@fz/phaser` (`frontend/lib/phaser`). The Solitaire
  Collection adopts the library before anything else is built on it. This
  part is merged to `main` on its own first, because it changes a live game.
- **Part 2 builds Snake on that library,** as the fourth game hosted on
  fuzzley.games, at `/play/snake/`. Its rules are plain TypeScript, its board
  is a Phaser scene, and its shell is Angular on the shared libraries, as the
  other games' shells are.

Snake is small, but the plan treats it as the model for bigger Phaser games
to come. So it settles the questions every Phaser game here will meet: who
owns time, who owns the keys, how Angular and a scene talk, how the palette
reaches a canvas, how a scene is tested without a GPU, and how Phaser is kept
out of the page until it is needed. "What a bigger Phaser game would add",
near the end, says which parts of Phaser such a game would add on top.

## The user's answers

Where the user chose otherwise than the plan recommended, their answer
stands over what the sections below say:

- **Decision 3:** headless Phaser in jsdom for Snake, as recommended. How it
  compares with the Solitaire Collection's mocks then decides whether that
  game's scene specs move off them; the work log records the comparison.
- **Decision 5, Phaser's input:** the scene takes the keys and the swipes
  itself. Phaser's keyboard plugin listens on the board's focusable element
  (`input.keyboard.target`), not on `window`, so it hears keys only while the
  board has focus, which keeps the dialogs' and the menu's keys their own and
  meets WCAG 2.1.4 for the character keys. Its pointer turns swipes into
  turns. What a key or a swipe means stays out of Phaser, in `view/` (a key
  map and a swipe reader, plain functions), and the scene hands each turn to
  the shell through `SnakeSceneOptions`. The on-screen arrows are DOM
  buttons, and stay the shell's.
- **Decision 9, walls only:** no "Wrap around" setting, so no wrapped
  drawing, no dashed walls, and stats and bests kept per speed alone.
- **Decision 12:** the snake glides, with "Step" as a setting, as
  recommended.
- **Decision 16, an Arcade category:** the site gets a third category,
  Arcade, with Snake as its first game, and Classics keeps its description.

Every other decision took its first option.

## Where things start

- **The site doesn't list Snake.** Its Classics are Minesweeper, Sudoku and
  Reversi, still to come (`frontend/site/src/app/provider/games.ts`). The
  category's description, "Puzzles and board games beyond cards"
  (`frontend/site/src/app/provider/categories.ts`), doesn't fit an arcade
  game.
- **One game uses Phaser.** The Solitaire Collection draws its table with
  Phaser 4.2.1 inside an Angular shell. Minesweeper and Sudoku are Angular
  alone: rules in `src/rules/` behind an ESLint fence, the shell in
  `src/app/`, one folder per feature.
- **Its Phaser plumbing is its own.** Under
  `frontend/games/solitaire/src/engine/render/phaser/`:
  - `host/phaser_host.ts` (179 lines) keeps one Phaser game, and so one WebGL
    context, for the canvas's life, swaps each board scene into it, and frees
    the context when it is destroyed;
  - `host/viewport_scaler.ts` (335 lines) sizes the canvas in device pixels,
    budgeted above 2×, so the board is sharp on a phone, and reads how far the
    chrome lies over each edge from `--board-inset-*`;
  - `scene/board_scene.ts` repeats three patterns any scene needs: releasing
    what it follows on `SHUTDOWN` or `DESTROY` (`whenSceneEnds()`), following
    the game's scale manager, which outlives the scene, and baking a texture
    again after a lost WebGL context;
  - `src/ui/app/component/game_canvas/` makes the host, waits for the board
    to say it is ready (giving up after 8 seconds), shows a skeleton until
    then, and tears the host down with the component.

  `vite.config.ts` puts Phaser in a chunk of its own, and `eslint.config.js`
  lets the Phaser adapter off `no-unnecessary-condition`, because Phaser's
  types claim a scene's systems are always there when they aren't.

- **Its scene specs run against hand-written mocks.** Seven spec files
  replace the `phaser` module with `vi.mock("phaser")`, from
  `test/support/phaser_mocks.ts` (956 lines). The mocks have to be kept in
  step with every part of Phaser a scene starts to use.
- **Real Phaser runs in jsdom, as tried today.** Phaser's `HEADLESS` renderer
  runs a game with no drawing. With two stand-ins it boots inside jsdom: a 2D
  context that draws nothing, which Phaser sniffs at import, and `data:`
  images that load at once, since Phaser boots only after its default
  textures load. On that game, `create()` and `update()` ran, a `Graphics`
  recorded its commands, a `Grid` shape laid itself out, a delayed call
  fired, particles exploded, and the camera shook. With the loop put to sleep
  (`game.loop.sleep()`), frames stepped by hand (`game.headlessStep(time,
delta)`). Two catches came to light. Tweens time themselves by
  `Date.now()`, not the loop, so a spec has to move that clock as well. And
  `generateTexture()` throws, because `HEADLESS` has no renderer to draw
  with.
- **The Phaser skills are the Solitaire Collection's.** The `phaser-*` skills
  sit in `frontend/games/solitaire/.agents/skills/`, so Claude Code loads
  them only while working on that game. `phaser-core` and
  `phaser-canvas-performance` were written here, and both are about cards.
  The rest are copies of the skills in Phaser's package, which
  `.prettierignore` and `.agents/check-skill-references.mjs` treat as
  upstream. The package holds more, unused so far, under
  `frontend/node_modules/phaser/skills/`: tweens, time, particles, sound,
  groups and containers among them.
- **Weights, measured from the builds in the tree.** Phaser's stock build,
  the chunk the Solitaire Collection ships, is 1,367 kB, or 352 kB gzipped.
  Sudoku's whole script, Angular and the libraries included, is 101 kB
  gzipped. A Phaser bundle trimmed to its `phaser-core.js` entry, with WebGL
  only and no sound, measured 226 kB gzipped.
- **Ports.** 9000 to 9002 are taken, so Snake's dev server takes 9003.
- **Screenshot palettes.** Minesweeper's screenshots are on Casino night,
  Sudoku's on Midnight blue and the Solitaire Collection's on its green felt,
  so Snake's go on Soft pastel.

## Why Phaser, and what the plan does about its costs

Snake could be drawn without Phaser, and the first draft of this plan
recommended that. It is drawn with Phaser instead because the next games
will need Phaser, and Snake is a small, safe place to set up the pattern they
will follow. Each cost the first draft weighed has an answer here:

| Cost                                                  | What the plan does                                                                                                                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 352 kB gzipped more than the game itself              | Phaser loads with the scene, after the shell has painted, behind a drawing of the empty board (decision 6). A trimmed build waits until two games can share it            |
| The host, scaler and canvas belong to another game    | Part 1 lifts them into `@fz/phaser`, which the Solitaire Collection adopts first                                                                                          |
| Two frameworks in one game                            | Clear owners: Phaser owns time and drawing; Angular owns state, keys, words, dialogs and storage. They talk through one interface of plain functions, `SnakeSceneOptions` |
| Phaser's keyboard plugin listens on `window`          | It is off. Keys are the shell's, as in every other game (decision 5)                                                                                                      |
| A canvas can't read `var()`                           | `view/palette.ts` turns the palette's roles into numbers, mixing the washes exactly as CSS's `color-mix()` does, and the contrast spec checks the result                  |
| A canvas blurs on a phone                             | The lifted `ViewportScaler`, and a board whose squares are whole device pixels                                                                                            |
| Thick WebGL lines have plain joins                    | The snake's bends and ends are drawn as circles over its lines                                                                                                            |
| Specs need 956 lines of mocks                         | New scenes are tested on real Phaser, headless in jsdom, through `@fz/phaser/testing` (decision 3)                                                                        |
| A lost WebGL context loses textures drawn at run time | `bakeTexture()` in `@fz/phaser/scene` bakes them again on `RESTORE_WEBGL` by itself                                                                                       |

## Part 1: `@fz/phaser`

### What is lifted, and from where

| Piece                                                  | From the Solitaire Collection                                    | To                                      | What changes                                                                                                                                                      |
| ------------------------------------------------------ | ---------------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PhaserHost`                                           | `src/engine/render/phaser/host/phaser_host.ts`                   | `@fz/phaser/host`                       | The title, the background and the parts of Phaser's config a game may set come in as options; a scene is any `Phaser.Scene` with a unique `key`, not `BoardScene` |
| `ViewportScaler`, `watchDevicePixels`                  | `src/engine/render/phaser/host/viewport_scaler.ts`               | `@fz/phaser/host`                       | The insets are read from `--fz-canvas-inset-*`, a library's property, where they were `--board-inset-*`                                                           |
| `Insets`, `NO_INSETS`                                  | `src/engine/render/layout/viewport.ts`                           | `@fz/phaser/insets`                     | None. The Solitaire Collection's `Viewport` stays and imports them                                                                                                |
| `whenSceneEnds()` and the patterns beside it           | private to `BoardScene`, and repeated in `TableLight` and others | `@fz/phaser/scene`                      | Exported functions any scene calls                                                                                                                                |
| The device pixel ratio a scene draws at                | `BoardScene.pixelRatio`                                          | `@fz/phaser/scene`, as `pixelRatioOf()` | A function of the scene                                                                                                                                           |
| What the canvas component does for any game            | `src/ui/app/component/game_canvas/`                              | `@fz/phaser/canvas`                     | A component of its own, `<fz-phaser-canvas>`, which the Solitaire Collection's canvas wraps, keeping its skeleton and deck badge                                  |
| The host's and the scaler's specs, and their stand-ins | `test/engine/render/phaser/host/`, part of `phaser_mocks.ts`     | the library, beside the code            | Moved with the code                                                                                                                                               |
| The Phaser chunk                                       | `vite.config.ts`                                                 | `@fz/dev/vite`'s `gameConfig()`         | Every game's build splits Phaser off if it uses it; for the others it's a no-op                                                                                   |
| The adapter's loosened lint rule                       | `eslint.config.js`                                               | `@fz/dev/eslint`, as `phaser()`         | A block any Phaser folder takes, with its reason                                                                                                                  |
| The Phaser skills                                      | `frontend/games/solitaire/.agents/skills/phaser-*`               | the repository's `.agents/skills/`      | `phaser-core` rewritten for any game; the card parts of it and of `phaser-canvas-performance` move to a new `solitaire-phaser` skill                              |

### What stays the Solitaire Collection's

The card atlas and its tool, the deck loader and the drawn deck, the card
factory, the table renderer, the drag input, the felt's light, the render
layers, the board's layout maths, its event emitter and its mocks of
everything a board scene calls. They are about cards, and nothing in Snake
needs them. The mocks stay because rewriting eight specs against the
headless harness is a change of its own, for when a board scene next
changes (decision 3).

### The library

`frontend/lib/phaser`, workspace `@fz/phaser`, laid out as `@fz/game-ui`
is: one folder under `src/` per entry point, each with an `index.ts`, and a
spec beside each file. Phaser is a peer dependency, and so is Angular, for
the one Angular entry. `@fz/ui` is a dependency, for the palette.

The entries are split by what they import, so an app can take the pure ones
without loading Phaser:

| Entry                | Imports                   | Holds                                                                                                            |
| -------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `@fz/phaser/insets`  | nothing                   | `Insets`, `NO_INSETS`                                                                                            |
| `@fz/phaser/color`   | nothing                   | `colorNumber()`, `mixColors()`                                                                                   |
| `@fz/phaser/host`    | Phaser                    | `PhaserHost`, `ViewportScaler`, `watchDevicePixels`, `HostOptions`, `MakeScene`, `SceneSurroundings`             |
| `@fz/phaser/scene`   | Phaser                    | `whenSceneEnds()`, `onScaleResize()`, `onContextRestored()`, `onFirstFrame()`, `pixelRatioOf()`, `bakeTexture()` |
| `@fz/phaser/canvas`  | Angular; the host, lazily | `<fz-phaser-canvas>`, `SceneSource`                                                                              |
| `@fz/phaser/testing` | Phaser, Angular, Vitest   | `installHeadlessPhaser()`, `runScene()`, `provideFakePhaserCanvas()`, `fakeHostedGame()`                         |

#### `@fz/phaser/insets` and `@fz/phaser/color`

Plain TypeScript, which a game's Phaser-free layers may import.

- `Insets` and `NO_INSETS`, as the Solitaire Collection has them.
- `colorNumber("#2f7d4f")` turns a palette role, written as a hex color in
  `@fz/style`'s `_palettes.scss` (three digits or six, with whatever space
  `getPropertyValue()` leaves around it), into the number Phaser takes. It
  throws on anything else, so a palette written another way fails a
  spec rather than drawing black.
- `mixColors(a, b, weight)` mixes two colors as `color-mix(in srgb, a
weight%, b)` does. The washes are `color-mix()` over the text color, which
  `getComputedStyle()` returns unresolved, so a canvas computes them itself.

#### `@fz/phaser/host`

```ts
/** Says what a scene may ask of the page around its canvas. */
export interface SceneSurroundings {
  /** Returns how far the app's chrome lies over each edge of the canvas, in CSS pixels. */
  readonly insets: () => Insets;
  /** Says the scene has drawn its first frame. */
  readonly ready: () => void;
}

/** Builds a scene, whose key no other scene in the game shares. */
export type MakeScene = (surroundings: SceneSurroundings) => Scene;

/** Says how a host sets up its game. */
export interface HostOptions {
  /** Names the game in Phaser's config. */
  readonly title: string;
  /** Fills the canvas before a scene draws: a color, or "transparent" to show the page. */
  readonly background: string;
  /** Overrides Phaser's config, but for what the host sets itself. */
  readonly config?: Omit<
    Types.Core.GameConfig,
    "parent" | "scale" | "scene" | "title"
  >;
}
```

- `PhaserHost` keeps what it does today: one game for its parent's life, the
  Solitaire Collection's settings as its defaults (`type: AUTO`, `antialias`,
  `roundPixels`, `autoFocus`), so that game's behavior doesn't change, the
  scale mode `NONE` with `ViewportScaler` sizing the canvas, a scene shown
  before the game boots waiting for it, the scene before it stopped and then
  removed, and the WebGL context released with `WEBGL_lose_context` once
  Phaser's own teardown has run. New: `background` may be `"transparent"`,
  which sets Phaser's `transparent` so the page shows until the scene draws,
  and `ready()` reaches the scene through `SceneSurroundings`, where the
  Solitaire Collection passed `onReady` through its own options.
- `ViewportScaler` is unchanged but for the names of the inset properties.

#### `@fz/phaser/scene`

Each of these releases what it set up when the scene ends, so a scene that
uses them leaks nothing into a game that outlives it:

- `whenSceneEnds(scene, release)`: runs `release` once, on `SHUTDOWN` or
  `DESTROY`, whichever comes first, since Phaser destroys a removed scene
  without shutting it down.
- `onScaleResize(scene, listener)`: follows the game's scale manager, which
  outlives the scene.
- `onContextRestored(scene, listener)`: follows `Renderer.Events.RESTORE_WEBGL`.
- `onFirstFrame(scene, listener)`: runs once, after the scene's first
  `POST_UPDATE`.
- `pixelRatioOf(scene)`: the device pixels per CSS pixel the canvas renders
  at, from the scale manager's `displayScale`, as `BoardScene.pixelRatio`
  reads it.
- `bakeTexture(scene, key, width, height, draw)`: draws into a texture once,
  with a throwaway `Graphics` and `generateTexture()`, replacing any texture
  of that key, and draws it again whenever a lost context is restored. In a
  `HEADLESS` game, where nothing can draw, it registers a blank texture of
  the same size instead, so a scene runs the same way in a spec as in a
  browser.

#### `@fz/phaser/canvas`

`<fz-phaser-canvas>`, the one place an app makes a `PhaserHost`:

```html
<fz-phaser-canvas
  [scene]="loadScene"
  [options]="hostOptions"
  label="Snake board"
>
  <div fzCanvasPlaceholder class="empty-board"></div>
</fz-phaser-canvas>
```

- **`scene`** is a `SceneSource`: a `MakeScene`, or a function that returns
  a promise of one. A game that passes `() => import("…").then(…)` keeps
  Phaser out of its first download: the component imports the host, and so
  Phaser, only when it first needs one. Each new `scene` swaps into the same
  game, as each deal does in the Solitaire Collection.
- **`state`** is `loading`, `ready` or `failed`, as a signal and as
  `data-state` on the element, so a stylesheet, a spec and the layout check
  can all read it. A scene that hasn't called `ready()` within 8 seconds
  fails, as the Solitaire Collection's board does now; the app decides what
  failure says.
- **The placeholder** (`[fzCanvasPlaceholder]`) is projected over the canvas
  until the scene is ready, then fades out, at once if the player prefers
  reduced motion.
- **The canvas is hidden from assistive technology** unless `label` is
  given, in which case it is an image of that name, as the Solitaire
  Collection's table is. A game that is played from the keyboard puts its own
  focusable element around it.
- **`refreshInsets()`** reads the insets again, for chrome that moved
  without the canvas changing size, as the Solitaire Collection's rail does.
- **It destroys the host with itself**, which frees the WebGL context.

#### `@fz/phaser/testing`

The testing pattern every new Phaser game follows. Specs never assert on
pixels; they assert on the state of the scene's game objects, and pixels are
left to the layout check and the screenshots, in a real browser.

- **`installHeadlessPhaser()`**, called from a workspace's `test-setup.ts`
  before anything imports Phaser: a 2D context that draws nothing, and
  immediate loading for `data:` images only, so no other spec's images
  change.
- **`runScene(make, { width, height })`** boots a `HEADLESS` game, adds the
  scene, waits for its `create()`, puts the loop to sleep, and returns a
  `SceneRun`. `run.advance(ms, frameMs = 16)` steps frames with
  `headlessStep()` and moves the clock Phaser's tweens read with them.
  `run.ready` says whether the scene called `ready()`, and `run.destroy()`
  tears the game down, after which a spec can check that the scene let go of
  everything it followed.
- **`provideFakePhaserCanvas()`**, for an app's shell specs: a
  `<fz-phaser-canvas>` that loads no Phaser, records the scene source it was
  given, and reports `ready` at once, so the shell is tested on its own.
- **`fakeHostedGame()`**: the stand-in for a `Phaser.Game` the host's specs
  use, lifted from them.

The harness's own spec boots a tiny scene and checks each thing the trial
under "Where things start" found working, so a Phaser upgrade that breaks the harness fails there
first, not in a game's specs.

### Build, lint and skills

- **`gameConfig()`** in `@fz/dev/vite` gives every game's build the
  `manualChunks` that puts `node_modules/phaser` in a `phaser` chunk, and the
  Solitaire Collection drops its own. A game without Phaser has no such
  module, so nothing changes for it, as `src/vite.spec.ts` checks.
- **`phaser({ files })`** in `@fz/dev/eslint` turns off
  `@typescript-eslint/no-unnecessary-condition` for the files given, with
  the reason the Solitaire Collection's config gives. `@fz/dev`'s `AGENTS.md`
  says a loosening stays in its workspace; this one moves because every
  Phaser folder needs it, and the rule's sentence says so.
- **Constraints.** `phaser` keeps one range in every workspace that lists it,
  which `yarn.config.cjs` already checks, and the library's peer range is its
  devDependency's.
- **Skills, moved to the repository's `.agents/skills/`** so that every
  workspace loads them:
  - the copies of Phaser's own skills, as they are, and four more copied in
    from Phaser's package for what Snake uses: `phaser-tweens`,
    `phaser-time-and-timers`, `phaser-particles` and
    `phaser-audio-and-sound`, plus `phaser-groups-and-containers`, which
    covers `Layer`;
  - `phaser-core`, rewritten as how a Phaser game is built here: the library,
    the layers a game keeps, who owns what, the ports between Angular and a
    scene, the testing pattern, and the parts of Phaser in use, with a link to
    each part's skill;
  - `phaser-canvas-performance`, keeping what holds for any game (measure
    first, nothing allocated per frame, few texture switches, a clean
    teardown);
  - `solitaire-phaser`, new in the Solitaire Collection's skills, with what
    `phaser-core` and `phaser-canvas-performance` said about cards: sharp
    cards, the atlases and their densities, and `depthFor()`.

  `.prettierignore` and `PHASER_SKILLS_WRITTEN_HERE` in
  `.agents/check-skill-references.mjs` follow the move, and
  `node .agents/link-claude-skills.mjs` links the skills again.

### Rules the library keeps

These go in `frontend/lib/phaser/AGENTS.md`:

- **Imports go one way.** The library imports Phaser, Angular, `@fz/ui` and
  `@fz/style`, never a game or the site.
- **The pure entries import nothing,** as ESLint checks, so a game's
  Phaser-free layers can take them.
- **Only `@fz/phaser/canvas` makes a host,** and it imports the host lazily,
  so an app that loads its scene with `import()` keeps Phaser out of its
  first download.
- **Whatever a scene follows, it releases when it ends.** The helpers in
  `@fz/phaser/scene` do it for the scene; anything else it follows uses
  `whenSceneEnds()`.
- **A texture drawn at run time goes through `bakeTexture()`,** so it
  survives a lost context and runs headless.
- **Coverage:** every line of the pure entries, and a floor on the rest in
  `vitest.config.ts`.

### How the Solitaire Collection adopts it

- `PhaserHost`, `ViewportScaler`, `watchDevicePixels`, `Insets` and
  `NO_INSETS` come from the library, and its own copies go.
- `--board-inset-*` becomes `--fz-canvas-inset-*` in
  `game_canvas.component.scss`, and nowhere else.
- `BoardScene`, `TableLight` and `DrawnDeckPainter` use `whenSceneEnds()`,
  `onScaleResize()`, `onContextRestored()`, `onFirstFrame()` and
  `pixelRatioOf()`. The card shadow, baked at run time, moves onto
  `bakeTexture()`.
- `GameCanvasComponent` wraps `<fz-phaser-canvas>`: the skeleton becomes its
  placeholder, and the "timed out" text reads the component's `failed`
  state. The deck badge and the console handle (`window.fsolitaire`) stay
  as they are.
- Its Phaser chunk comes from `gameConfig()`, and its lint loosening from
  `phaser()`.
- Its scene specs keep their mocks. Its coverage floor is reviewed, since the
  host's and the scaler's well-covered lines leave with them.

## Part 2: Snake

### The game

As the first draft had it, and decisions 9 to 18 settle:

- A board of 17 by 17 squares. The snake starts three squares long, left of
  the middle, heading right, with an apple ahead of it. It doesn't move
  until the player's first direction.
- Each apple eaten makes the snake a square longer and a few milliseconds a
  step faster, and scores a point. Running into a wall or into the snake
  ends the run. Filling the board wins it.
- Three speeds: Slow steps every 160 ms, down to 100; Normal every 125 ms,
  down to 70; and Fast every 90 ms, down to 55. Edges are walls, or wrap
  around as a setting.
- The snake glides between squares, or steps from square to square as a
  setting.
- Arrow keys or W, A, S, D; on a touch screen, swipes and on-screen arrows.
  Up to two turns are queued, so "up, then left" both happen. A turn back
  the way the snake is heading is dropped.
- The game pauses itself when the page is hidden, the window loses focus,
  or a dialog or menu opens. Only the player resumes it.

### How a Phaser game is laid out here

Five layers, each a folder under `src/`, each fenced by ESLint so it may
import only the layers below it. This is the layout `phaser-core` will
describe for every Phaser game after Snake.

```
   src/app       Angular: state, keys, swipes, words, dialogs, storage, the canvas
      │ (loads src/scene with import(), and implements its options)
      ▼
   src/scene     Phaser: one scene and its painters, drawing what it is handed
      │
      ▼
   src/view      Plain TypeScript: board metrics, the frame, the shapes, the palette, the effects
      │
      ▼
   src/rules     Plain TypeScript: the game itself
```

| Folder       | May import                                                                                                | May not import                                                        |
| ------------ | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `src/rules/` | `@fz/core`                                                                                                | Phaser, Angular, RxJS, any other `@fz/*`, `view`, `scene`, `app`      |
| `src/view/`  | `rules`, `@fz/core`, `@fz/phaser/color`, `@fz/phaser/insets`                                              | Phaser, Angular, RxJS, the other `@fz/phaser` entries, `scene`, `app` |
| `src/scene/` | Phaser, `@fz/phaser/scene`, `@fz/phaser/color`, `@fz/phaser/insets`, `view`, `rules`                      | Angular, RxJS, `@fz/ui`, `@fz/game-ui`, `app`                         |
| `src/app/`   | Angular, every `@fz/*` library, `rules`, `view`; `scene` by type, or by `import()` from `app/board/` only | Phaser, and `scene` by a static import                                |

- **`rules` and `view` are tested in Node, without Phaser.** Everything a
  scene decides that isn't a Phaser call lives in `view`, so the scene is
  thin: it turns what `view` computed into game objects.
- **`app` never imports Phaser.** The only way in is the `import()` in
  `app/board/`, which ESLint's import fence doesn't see, and which Vite
  splits into chunks of their own. N10's size check confirms that the entry
  chunk holds no Phaser.

### Who owns what

| Concern                         | Owner                                     | Why                                                                                                                                    |
| ------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| The run, the score, the outcome | `GameService`, in signals                 | The bar, the dialogs, the announcer and storage all read it, and the shell's specs play the game without Phaser                        |
| Time                            | Phaser's loop                             | The scene's `update(time, delta)` hands the time to `GameService.tick()`, so there is one frame loop on the page, not two (decision 4) |
| Drawing and flourishes          | The scene                                 | What Phaser is for                                                                                                                     |
| Keys                            | The shell                                 | One owner for every key on the page, dialogs included; Phaser's keyboard is off (decision 5)                                           |
| Swipes                          | The shell, a directive on the board       | A swipe needs no hit testing. A game that picks objects under the pointer would use Phaser's input for that                            |
| Words for screen readers        | The shell, through `@fz/ui/announcer`     | A canvas says nothing                                                                                                                  |
| Pausing                         | The shell                                 | It knows when its dialogs open, the window blurs or the page hides. Phaser pauses its own loop on a hidden page too                    |
| Sound                           | The scene, through Phaser's sound manager | Phaser loads it, unlocks it on the first gesture and plays it; the shell only says whether it is wanted (decision 8)                   |
| What is kept across visits      | The shell, through `@fz/ui/storage`       | As in every game                                                                                                                       |

### How Angular and the scene talk

The scene is handed one object of plain functions. It never sees a signal,
a service or an injector, so it can't depend on Angular, and a spec can hand
it anything.

```ts
/** Gives the scene everything it needs from the game around it. */
export interface SnakeSceneOptions {
  /** Advances the game by the time since the last frame. */
  readonly tick: (deltaMs: number) => void;
  /** Returns what the board shows now, between the last step and the next. */
  readonly frame: () => SnakeFrame;
  /** Returns the board's colors, as a new object only when the palette changes. */
  readonly palette: () => SnakePalette;
  /** Returns whether the player allows motion beyond the snake's own. */
  readonly motion: () => boolean;
  /** Returns whether the player wants sound. */
  readonly sound: () => boolean;
  /** Says where the board lies on the canvas, in CSS pixels, after each layout. */
  readonly onLayout: (board: BoardRect) => void;
}

/** Describes the board between one step and the next. */
export interface SnakeFrame {
  /** The run on the board, as of its last step. */
  readonly run: Run;
  /** How far the board is from the last step to the next, from 0 to 1. */
  readonly progress: number;
}
```

- **Each frame, the scene pulls.** `update()` calls `tick(delta)`, then
  `frame()`, then draws. Nothing is pushed into the scene, so there are no
  subscriptions to leak, and a frame drawn is always the latest state.
- **Effects come from what changed.** A `Run` counts its steps and records
  what its last step did (`ate`, `laid`, `crashed`, `won`). The scene
  remembers the last step it drew, and fires a new step's effects once. A new
  run carries a new `id`, which resets the scene's effects. So nothing about
  effects needs an event channel, and a spec drives them by handing the scene
  runs.
- **Values that change every frame never go into a signal a template
  reads.** `progress` is a plain field of `GameService`, read through
  `frame()`. The run, the score and the outcome change only on a step, ten
  or so times a second, so the bar's change detection runs no faster than
  that.
- **The palette** is a `computed()` over `ThemeService.role()` for `panel`,
  `text`, `accent` and `danger`, turned into numbers by `snakePalette()` in
  `view/palette.ts`. It is a new object only when the palette changes, so
  the scene compares by identity each frame and repaints, and re-bakes its
  textures, only then.

### The rules

`src/rules/`, each file with a spec beside it, as the first draft had them:

- `geometry.ts`: a square (`{ x, y }`), the four directions, a step, and the
  opposite direction.
- `arena.ts`: the board's size, its edges (walls or wrap), and where a step
  from a square lands, or that it hits a wall.
- `speed.ts`: the three speeds as the time a step lasts, and how it shortens
  as the snake grows.
- `run.ts`: `Run`, a value each move replaces, holding its `id`, the snake
  from head to tail, its heading, the turns queued, the apple, the score,
  the seed and the apples eaten, the speed and edges, the outcome (`ready`,
  `playing`, `paused`, `over` or `won`), why it ended (`wall` or `self`), the
  steps taken and what the last one did. The moves are `turn()`, `step()`,
  `pause()`, `resume()` and `restart()`. The head may move onto the square
  the tail is leaving, unless the snake grows on that step.
- `stepper.ts`: the fixed step. Given the time carried over, the frame's
  delta and the step's length, it says how many steps to take, at most two,
  and the progress toward the next.
- `apples.ts`: where an apple goes, on a free square chosen by
  `@fz/core/random`, seeded from the run's seed and how many apples have been
  eaten. A run is the same each time it is played the same way, and saving
  it needs no random state.
- `describe.ts`: what the announcer says.
- `saved_run.ts`: a run as JSON, and the checks that make a restored run
  trustworthy.

The specs draw runs as pictures with `runFrom` (`src/testing/run_picture.ts`):
`@` for the head, an arrow (`>`, `<`, `^`, `v`) on each other square of the
snake pointing toward the head, `*` for the apple and `.` for a free square.
The floor on `src/rules/` is Sudoku's: 100% of statements, functions and
lines, and 95% of branches.

### The view

`src/view/`, Phaser-free, tested in Node:

- `board_metrics.ts`: `boardMetrics(viewport)`, where the board lies on the
  canvas. It finds the largest square that fits the canvas less a margin,
  makes each square a whole number of device pixels so the lines are sharp,
  and centers the board on whole pixels. It returns the square's size, the
  board's origin and its rectangle, in device pixels and in CSS pixels, the
  latter for `onLayout`.
- `snake_shapes.ts`: `snakeShapes(frame, metrics, out)`, the snake as the
  scene draws it: the runs of straight line between bends, a circle at each
  bend and end, the head's circle and its eyes, each with its alpha. While
  the snake glides, the head eases toward the next square (the first queued
  turn's, or the heading's) and the tail toward the square after it, unless
  the snake is about to grow. With wrap-around, the snake is split where it
  crosses an edge, each piece clipped by the board. It writes into `out`, a
  buffer the painter keeps, so drawing a frame allocates nothing.
- `palette.ts`: `snakePalette(roles)`. The board is `panel`, with every
  other square a 3% wash of `text` over it, as `--fz-wash-1` is. The snake is
  `accent`, and its head a mix of `accent` and `text`. The apple is
  `danger`, or an ink of Snake's own if the contrast spec says `danger` can't
  do it. The walls are `text` at 20%.
- `effects.ts`: `effectsOf(run)`, what the last step calls for: crumbs and a
  sound where an apple was eaten, a pop where one was laid, a shake and a
  fade where the snake crashed, and a fanfare for a full board. Each effect
  is marked as motion or not, so the scene leaves out the motion when the
  player prefers less of it.
- `timing.ts`: how long each flourish lasts (the pop 180 ms, the fade
  600 ms, the shake 180 ms), which the scene animates and the shell waits on
  before it opens the result card.

### The scene

`src/scene/`, the only folder that imports Phaser:

- **`snake_scene.ts`**, `SnakeScene`, with a unique key, built by
  `makeSnakeScene(options)`:
  - `preload()` loads the sound sprite (decision 8). A file that fails to
    load leaves the game silent, not broken.
  - `create()` makes four layers with `this.add.layer()`, in the order they
    are drawn (the board, the apple, the snake, the effects), then the
    painters, and lays them out. It follows resizes with `onScaleResize()`,
    and calls `ready()` with `onFirstFrame()`.
  - `update(time, delta)` calls `options.tick(delta)`, reads
    `options.frame()` and `options.palette()`, repaints and re-bakes if the
    palette changed, fires the effects of a step it hasn't drawn yet, and
    has each painter draw the frame. It allocates nothing.
- **`board_painter.ts`:** the squares, as one `Grid` shape with
  `setAltFillStyle()` for the checker; and the walls, as a `Graphics` drawn
  on each layout, solid for walls and dashed for wrap-around.
- **`snake_painter.ts`:** one `Graphics`, cleared and redrawn each frame from
  `snakeShapes()`. Lines (`lineStyle()`, `lineBetween()`) run between bends,
  and circles (`fillCircle()`) round the bends and ends, because Phaser's
  WebGL `StrokePath` joins thick segments with a plain quad. The fade after
  a crash is drawn from an alpha per segment, which a counter tween moves
  from head to tail.
- **`apple_painter.ts`:** one `Image`, from an apple (a circle and a leaf)
  baked with `bakeTexture()` at the square's size in device pixels. The
  texture is baked again on a resize, a palette change or a restored
  context. A pop tween runs when an apple is laid, and a shrink tween toward
  the head when one is eaten.
- **`effects_painter.ts`:** a particle emitter for the crumbs, from a baked
  `crumb` texture tinted the apple's color; the camera's shake; the fade's
  counter tween; and the sounds. On a new run, `this.tweens.killAll()` stops
  whatever was playing.
- **`textures.ts`:** the bakes, each given the palette and the square's size.

### The Phaser config

Through `HostOptions` and `<fz-phaser-canvas>`:

```ts
const SNAKE_HOST: HostOptions = {
  title: "Snake",
  // The page's panel shows through until the scene draws, so nothing flashes.
  background: "transparent",
  config: {
    type: Phaser.AUTO,
    banner: false,
    // The board's own element takes the focus, not the window.
    autoFocus: false,
    disableContextMenu: true,
    render: {
      antialias: true,
      roundPixels: false,
      powerPreference: "low-power",
    },
    // Keys and swipes are the shell's; Phaser installs no listeners of its own.
    input: { keyboard: false, mouse: false, touch: false, gamepad: false },
    fps: { smoothStep: true },
  },
};
```

The host sets the parent, the scale mode `NONE` and the scene itself, for
every game.

### The parts of Phaser Snake uses

Each was checked against Phaser 4.2.1's source, and each has a skill, which
Part 1 puts in the repository's `.agents/skills/`.

| Part                   | The API                                                                                                                                                     | Where                                    | What for                                                                                            | Skill                                            |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| The game               | `new Phaser.Game()` with `type: AUTO`, `transparent`, `render`, `input`, `fps`, `banner`, `autoFocus`, `disableContextMenu`; `Core.Events.READY`, `DESTROY` | `@fz/phaser/host`                        | One game and one WebGL context for the page's life, with the canvas renderer where WebGL is missing | `phaser-game-setup-and-config`                   |
| Scaling                | `scale.mode: NONE`, `scale.setZoom()`, `scale.resize()`, `scale.refresh()`, `displayScale`, the `resize` event                                              | `ViewportScaler`, `onScaleResize()`      | A canvas in device pixels, and the board laid out again when it changes size                        | `phaser-scale-and-responsive`                    |
| The scene              | `Scene` with `preload()`, `create()`, `update(time, delta)`; `Scenes.Events.SHUTDOWN`, `DESTROY`, `POST_UPDATE`                                             | `SnakeScene`, `@fz/phaser/scene`         | The board's life, its frames, its first frame, and its teardown                                     | `phaser-scenes`                                  |
| The loop               | `TimeStep` through `update()`'s `delta`; `fps.smoothStep`; `loop.pause()` on `Core.Events.HIDDEN`                                                           | `SnakeScene`                             | The game's only clock, whatever the display's rate                                                  | `phaser-time-and-timers`, `phaser-events-system` |
| Layers                 | `this.add.layer()`                                                                                                                                          | `SnakeScene`                             | The board, the apple, the snake and the effects drawn in order, without depth numbers               | `phaser-groups-and-containers`                   |
| Shapes                 | `this.add.grid()`, `setFillStyle()`, `setAltFillStyle()`, `cellWidth` and `cellHeight`, `setSize()`                                                         | `board_painter.ts`                       | The checkered squares                                                                               | `phaser-graphics-and-shapes`                     |
| Graphics               | `this.add.graphics()`, `clear()`, `lineStyle()`, `lineBetween()`, `fillStyle()`, `fillCircle()`, `setAlpha()`                                               | `snake_painter.ts`, `board_painter.ts`   | The snake, its eyes, and the walls                                                                  | `phaser-graphics-and-shapes`                     |
| Textures drawn in code | `this.make.graphics()`, `generateTexture()`, `textures.exists()`, `textures.remove()`, `Renderer.Events.RESTORE_WEBGL`                                      | `bakeTexture()`, `textures.ts`           | The apple and the crumb, sized to the square, with nothing loaded                                   | `phaser-render-textures`                         |
| Images                 | `this.add.image()`, `setPosition()`, `setScale()`, `setTexture()`                                                                                           | `apple_painter.ts`                       | The apple                                                                                           | `phaser-sprites-and-images`                      |
| Tweens                 | `this.tweens.add()` with `Back.Out` and `Quad.In`, `this.tweens.addCounter()`, `this.tweens.killAll()`                                                      | `apple_painter.ts`, `effects_painter.ts` | The apple's pop and shrink; the fade after a crash, as a counter the snake painter reads            | `phaser-tweens`                                  |
| Particles              | `this.add.particles(0, 0, "crumb", { emitting: false, … })`, `emitter.explode(count, x, y)`                                                                 | `effects_painter.ts`                     | Crumbs where an apple is eaten                                                                      | `phaser-particles`                               |
| The camera             | `cameras.main.shake(duration, intensity)`                                                                                                                   | `effects_painter.ts`                     | A shake on a crash, left out when motion is unwelcome                                               | `phaser-cameras`                                 |
| The loader             | `this.load.audioSprite()`, `Loader.Events.FILE_LOAD_ERROR`                                                                                                  | `SnakeScene.preload()`                   | The sound sprite                                                                                    | `phaser-loading-assets`                          |
| Sound                  | `this.sound.playAudioSprite()`, `this.sound.mute`, `this.sound.locked`, `Sound.Events.UNLOCKED`                                                             | `effects_painter.ts`                     | Three short sounds, muted while the player wants none                                               | `phaser-audio-and-sound`                         |

**What Snake leaves alone, and why:**

- **Phaser's input:** keyboard, pointer and gamepad are all off. Keys and
  swipes are the shell's (decision 5).
- **Physics, Arcade or Matter:** a collision is a square the rules can name
  exactly.
- **Tile maps:** the board is the rules' grid.
- **`Rope`,** which would stretch a texture along the snake: it is WebGL
  only, with no canvas counterpart, and a snake's right-angle bends would
  need rounding before a texture could follow them.
- **`Text` and `BitmapText`:** every word is the shell's, in the DOM.
- **Containers, groups and pools:** the scene makes a fixed handful of
  objects once.
- **Sprite-sheet animations, filters, lights, `Gradient`,
  `SpriteGPULayer`:** the design is plain, and nothing in it needs them.

### Loading

- **The shell paints first.** `main.ts` loads Angular, the libraries and the
  shell, about Sudoku's 101 kB gzipped. The bar, the start card and a
  drawing of the empty board in CSS (the placeholder) appear at once.
- **Then the scene.** `app/board/` hands `<fz-phaser-canvas>` a source that
  `import()`s `src/scene/snake_scene.ts`, which brings the `phaser` chunk
  (352 kB gzipped) and the scene's own small chunk. Vite fetches them when
  the `import()` runs, not with the page. The board takes over from the
  placeholder once the scene has drawn its first frame.
- **The placeholder draws the same board** with a CSS grid over a
  `conic-gradient` checker, sized by the same rule as `boardMetrics()`, so
  the swap doesn't move anything. The layout check compares the two.
- **A failure says so.** If the scene isn't ready within 8 seconds, the
  start card says the board couldn't be drawn and offers to reload.

### Sharpness

- The lifted `ViewportScaler` renders the canvas at the display's pixel
  ratio, up to 3, within its budget.
- `boardMetrics()` makes every square a whole number of device pixels and
  puts the board on whole pixels, so the checker's edges are crisp.
- The apple and the crumb are baked at the square's size in device pixels,
  and baked again whenever that size changes, so they are never stretched.

### Sound (decision 8)

- **Three sounds:** an apple eaten, a crash and a new best. A full board
  plays the new best's.
- **Made by a script, like the card atlas.** `tools/build-sounds.mjs`
  synthesizes them from a few oscillators and envelopes, the same every run,
  into one WAV sprite and its JSON spritemap in `src/scene/sounds/`, which
  are committed. A WAV plays in every browser, and the three together come to
  about 30 kB.
- **Phaser does the rest:** `load.audioSprite()` in `preload()`, from the
  files' Vite `?url` addresses; `playAudioSprite()` for each effect; and Web
  Audio, which a browser keeps locked until the first gesture, here the
  first key press or swipe, which also starts the run.
- **The player decides.** A Sound button in the bar, which is pressed
  (`aria-pressed`) while sound is on, sets `this.sound.mute` through
  `options.sound()`. It is remembered in the settings.

### The shell

As in Sudoku, one folder per feature under `src/app/`:

- **`play/`:** `GameService` holds the run in a signal and the glide's
  progress in a field; `tick(ms)` runs `stepper.ts` and steps the run; and
  it makes the turns, pauses, resumes and restarts, says what happened
  through the announcer, asks before a new run throws one away, and keeps
  the score. `SavedGameService` keeps the run under way. The shell's specs
  call `tick()` themselves, so they need no frames.
- **`board/`:** `BoardComponent`, a focusable element around
  `<fz-phaser-canvas>`, which builds `SnakeSceneOptions` from the services,
  loads the scene with `import()`, and lays the start, pause and failure
  cards over the board. `board_keys.ts` maps keys to moves, as Sudoku's
  `boardKey()` does, and `SwipeDirective` turns swipes into turns. The board
  publishes its rectangle from `onLayout` as `data-board`, for the layout
  check.
- **`arrows/`:** the on-screen arrows, which turn on `pointerdown`.
- **`bar/`, `settings/`, `stats/`, `result/` and `help/`,** on the
  libraries' bar, overflow menu, dialogs and radio groups.
- **`styles/`:** `global.scss` and `_index.scss`, as in every game.

The design of these is the first draft's:

- **The bar:** the link home, "Snake" with the speed as a badge, the score
  and the best, then Pause, Sound, New game, How to play and Settings. On a
  compact screen, Pause and New game stay, and the rest go in the overflow
  menu.
- **Keys:** the arrow keys and Escape work anywhere outside a dialog or
  menu. W, A, S, D, P and Space work only while the board has focus, as WCAG
  2.1.4 asks. Keys are read by `event.code`, so Z, Q, S and D steer on an
  AZERTY keyboard.
- **Swipes** turn once the finger has moved 24 CSS px, and measure again
  from there, so one gesture can make two turns. The board sets
  `touch-action: none`.
- **The layout:** the three shapes the other games take. The board fills the
  stage, and the arrows sit below it on an upright phone and beside it on
  one on its side, by a container query, as Sudoku's pad does.
- **Settings:** the speed and the edges, each starting a new run after the
  question; the movement and the arrows; the sound; and the palette.
- **The result card:** why the run ended, the score, the best, the length
  and "New best!". New game comes first. It opens once the crash's fade has
  run, at once when motion is unwelcome.
- **What it keeps,** versioned: `snake-settings`, `snake-stats` (for each
  speed and edges, the runs, the best score and the longest snake), and
  `snake-game`, the run under way, taken up paused after a reload.

### Accessibility

Snake is a game of seeing and reacting, so the plan doesn't claim a screen
reader user can steer it. It does make sure that:

- every control around the board, and every dialog, is reached and named
  through the libraries' pieces;
- the board is played by keyboard alone, from a focusable element named
  "Snake, 17 by 17" with a description of its keys. The spike decides
  whether it is `role="application"` or a plain group, by listening with
  NVDA and Narrator. The canvas inside it is hidden from assistive
  technology;
- Slow is a speed of its own, and the game pauses on a key, on a button, and
  by itself whenever the player looks away;
- the announcer says when a run starts, pauses and resumes, why it ended,
  the score and a new best, but not each apple;
- color is never the only signal: the head has eyes, the apple a leaf and
  the walls a line. `src/view/contrast.spec.ts` holds the snake, its head and
  the apple to 3:1 against both shades of square in every palette, from
  `snakePalette()` and `@fz/style/testing`'s `contrast()`. A second spec
  checks that `snakePalette()`'s washes equal what `paint()` resolves the
  CSS tokens to, so the canvas and the page agree;
- the pop, the crumbs, the shake and the fade are left out when the player
  prefers reduced motion. The snake's own movement stays, since it is the
  game, but "Step" is a setting. Nothing flashes.

### Testing

Each layer is tested where it runs, from the bottom up:

| Layer    | Where                              | How                                                                                                                                                                                                                                                                                                                        |
| -------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rules`  | Node                               | Runs drawn with `runFrom`: the queue, each wall and each edge, the tail's square, growing, the last free square, a full board, the same seed laying the same apples, the stepper's cap                                                                                                                                     |
| `view`   | Node                               | Metrics on whole pixels for odd sizes and ratios; shapes for a straight, a bent, a gliding, a growing and a wrapping snake; the palette and the contrast spec; the effects of each kind of step                                                                                                                            |
| `scene`  | jsdom, real Phaser, `HEADLESS`     | `runScene()` with options a spec controls: `tick` gets each frame's delta; a new step's effects fire once (particles alive, the apple's tween, the shake running); none with motion off; a new run kills the tweens; a palette change re-bakes; the layout reaches `onLayout`; after `destroy()` no option is called again |
| `app`    | jsdom, `provideFakePhaserCanvas()` | Testing Library by role and name: keys, swipes and arrows turn; focus rules; pausing on hide, blur and dialogs; the cards; the bar; the dialogs; storage with an in-memory store; `tick()` advancing runs                                                                                                                  |
| The page | Headless Chrome, the build         | `tools/check-layout.mjs` on `@fz/dev/layout`, below                                                                                                                                                                                                                                                                        |

The scene's specs never look at pixels. What a frame looks like is checked
by the layout check, the screenshots and a person.

### Performance

- **`update()` allocates nothing.** The frame object is reused, the shapes
  are written into a buffer the painter keeps, and the painters make their
  game objects once, in `create()`.
- **A frame's work is small:** one `Graphics` of a few hundred commands,
  one `Grid` and one `Image`. N10 records a performance trace with the CPU
  throttled six times, at 60 and 120 Hz, and the budget is a frame under
  4 ms of script.
- **While nothing moves** (ready, paused or over, once the flourishes end),
  the scene still draws each frame. If N10's trace shows that costs
  anything worth having back, the host gains `sleep()` and `wake()` on
  Phaser's `TimeStep`, woken by any change of run, palette or size. It is
  measured before it is built.

## What a bigger Phaser game would add

Snake sets up the layers, the owners, the ports, the loading and the
testing. A game with more on its canvas would keep all of that and add:

- **Art loaded, not drawn:** a sprite atlas built by a script, as the card
  atlas is, loaded in `preload()` with `load.atlas()` or
  `load.multiatlas()`, behind a loading state the placeholder shows.
- **Several scenes,** for a level select or transitions on the canvas; the
  menus and dialogs stay Angular's.
- **Pools:** `Group`s of sprites reused rather than made and destroyed in
  play.
- **Physics:** Arcade physics for bodies that move and collide off a grid.
- **Sprite-sheet animations** through Phaser's animation manager.
- **A world larger than the screen,** with a camera that follows
  (`startFollow()`) within bounds.
- **Tile maps** for levels drawn in a tool.
- **Phaser's pointer input,** for picking objects under the pointer, as the
  Solitaire Collection's drag does.
- **A gamepad,** through Phaser's `GamepadPlugin` (`input.gamepad: true`),
  feeding the same moves as the keys.
- **A trimmed Phaser,** once two or more games run on it: a build of only
  the parts they use between them, through a Vite plugin for Phaser's
  `typeof` flags, measured at about 226 kB gzipped for `phaser-core`, with a
  spec that boots it in Chrome.

## Phases

Part 1 is built on the branch `phaser-lift`, cut from `main`, and merged on
the user's go-ahead before Part 2 starts. Part 2 is built on `snake`, cut
from `main` after the merge. Each phase is at least one commit, and ends
with `yarn verify` green and the docs it touches brought up to date. A work
log (`docs/snake-worklog.md`) records where things stand across both parts,
and is deleted at the end, as the earlier plans' logs were.

### Part 1

#### L0: a spike (small; first)

Thrown away, its answers in the work log:

- the headless harness inside Vitest's jsdom, beside Angular's TestBed and
  zoneless change detection: does `installHeadlessPhaser()` disturb
  anything, and do tweens, timers and particles step as the trial found;
- `bakeTexture()` under `HEADLESS`: does a blank canvas texture of the size
  stand in;
- `<fz-phaser-canvas>`'s inputs against what the Solitaire Collection's
  canvas does, deal by deal, with its skeleton and its rail's insets;
- the Solitaire Collection's screenshots (`yarn capture:screenshots`)
  captured now, as the baseline L7 compares against.

- **As built:** Phaser's own input works headless, with the keyboard aimed
  at an element and the canvas given a size. The baseline was a build of
  `main` and 42 seeded screenshots from a scratch script, since the game's
  own script deals at random; two runs of one build differed by up to 5
  pixels in 3 of 21 shots, the noise.

#### L1: the workspace (small)

`frontend/lib/phaser/`, laid out as `@fz/game-ui` is: `package.json`
(`@fz/phaser`, private, `phaser` and Angular as peers and devDependencies,
`@fz/ui` as a dependency, and the `lint`, `typecheck` and `test` scripts),
`tsconfig.json` and its projects, `eslint.config.js` with `@fz/dev`'s blocks
and the fence that keeps `insets` and `color` pure, `vitest.config.ts` on
`angularTests()` with its floor, `src/test-setup.ts`, `AGENTS.md` with
`CLAUDE.md` beside it, and `README.md`. Then `yarn install` from
`frontend/`.

- **As built:** as planned, with L5 first, since the library's lint needs
  `phaser()`.

#### L2: the host and the pure entries (medium)

`insets`, `color` with full specs, and `host`: `PhaserHost` and
`ViewportScaler` moved with their specs, `fakeHostedGame()` lifted from them,
and the host generalized as described. The Solitaire Collection imports them
from the library, deletes its copies, and renames `--board-inset-*`.

- **As built:** as planned. The insets are `--fz-canvas-inset-*`, the host's
  fake game stayed in its spec, and the Solitaire Collection's fences were
  anchored as `/phaser`, so they refuse Phaser and let the library through.

#### L3: the scene helpers (medium)

`@fz/phaser/scene`, each helper with a spec on the headless harness, which
this phase writes first, in `@fz/phaser/testing`, with its own spec. The
Solitaire Collection's `BoardScene`, `TableLight` and `DrawnDeckPainter`
adopt the helpers, and the card shadow moves onto `bakeTexture()`. Its mocks
gain what the helpers call.

- **As built:** the card shadow stayed a filtered `DynamicTexture`, redrawn
  through `onContextRestored()`, and `bakeTexture()` came new, for Snake.
  Headless Phaser needed a clock under `Date.now` for tweens, a step to
  deliver keys and to tear a game down, and a blank texture where
  `generateTexture()` throws.

#### L4: the canvas component (medium)

`<fz-phaser-canvas>` and `provideFakePhaserCanvas()`, with specs for the
states, the timeout, the placeholder, a swapped scene, a lazy source, the
insets and the teardown. The Solitaire Collection's `GameCanvasComponent`
wraps it, and its specs follow.

- **As built:** the canvas's stylesheet is unencapsulated, to fade the
  projected placeholder itself, and a scene ready after the timeout turns it
  `ready` after all. The Solitaire Collection's `index` chunk came out
  2 kB smaller, with the host a 1.75 kB chunk of its own.

#### L5: build and lint (small)

`gameConfig()`'s Phaser chunk and `phaser()`'s lint block in `@fz/dev`, with
their specs; the Solitaire Collection drops its own.

- **As built:** done with L1. Vite 8's Rolldown takes the chunk as a
  `codeSplitting` group, and the Solitaire Collection's build came out byte
  for byte the same.

#### L6: skills and docs (medium)

The skills moved, rewritten, split and copied in as described, the link
script run again, and `.prettierignore` and
`.agents/check-skill-references.mjs` brought into line. The library's
`AGENTS.md`; `.agents/AGENTS.md`, `frontend/AGENTS.md` and
`frontend/lib/dev/AGENTS.md`, which list the libraries; the Solitaire
Collection's `AGENTS.md`, its `solitaire-build` and `solitaire-testing`
skills; and the `fuzzley-ui` skill, which says which library to reach for.

- **As built:** as planned, with five more Phaser skills copied in for
  Snake, and what the skills said of cards moved to a new `solitaire-phaser`
  skill.

#### L7: nothing changed (medium)

- The Solitaire Collection's suite passes, its floor reviewed.
- Its compiled styles are compared rule by rule with `main`'s, as the Sudoku
  plan's library lift did, with only the inset properties' names differing.
- Its screenshots, captured again, are compared pixel for pixel with L0's.
- Its `phaser` chunk is the same size as before.
- By hand: Klondike, Spider and FreeCell played on a wide window and in
  Chrome's phone emulation, upright and on its side, with the rail moved,
  the deck changed, the window resized and the palette switched.
- Merge `phaser-lift` to `main` on the user's go-ahead, and push. Verify
  promotes `live`.

- **As built:** the suite (6,864 specs), the compiled styles (only the
  canvas component's rules differ), the screenshots (noise only) and the
  `phaser` chunk (the same hash) held, and it played by hand. The merge
  waited for Part 2, as the user's word had it.

### Part 2

#### S0: the mock and a spike (small; first)

- **Mock:** a private page from the real tokens, as Sudoku's was: the board
  mid-run on Soft pastel and Casino night on a wide screen, and in a dark
  palette on a phone upright and on its side; the placeholder; the start,
  pause, failure and result cards; a crash; the arrows; the bar with its
  menu open; the settings; and the new icons. Nothing is built until the
  user approves it.
- **Spike:** a bare `SnakeScene` on `@fz/phaser`, to settle by feel and by
  measurement the speeds, the glide and a turn pressed mid-glide, the queue
  at Fast, how long the scene takes to its first frame on a throttled phone,
  the canvas renderer's fallback (Chrome started with WebGL off), whether
  headless Chrome in CI gets a WebGL context, and what NVDA and Narrator do
  with the board as an application and as a group.

- **As built:** neither. The user asked for the game itself, L0 answered the
  headless questions, and the rest were checked where they were built. The
  board's role was reasoned rather than heard; NVDA and Narrator are left to
  the user.

#### S1: the workspace (small)

`frontend/games/snake/`, copied from Sudoku: `package.json` (`snake`, with
`phaser` and `@fz/phaser`), `vite.config.ts` (`gameConfig({ port: 9003,
name: "Snake" })`), `vitest.config.ts`, `eslint.config.js` with `@fz/dev`'s
blocks, `phaser()` for `src/scene/`, and the four fences in the table above,
the tsconfig solution, `stylelint.config.js`, `src/test-setup.ts` calling
`installHeadlessPhaser()`, `index.html`, `src/main.ts` with an empty shell,
`LICENSE`, `README.md`, `AGENTS.md` and `CLAUDE.md`. `games.json` doesn't
list it yet.

- **As built:** as planned, a probe file in each layer checking the fences.

#### S2: the rules (medium)

`src/rules/` and `runFrom`, with the floor.

- **As built:** a `Run` carries its board's size, so a spec draws a whole
  board as 3 × 3; a step is one `StepKind` (`moved`, `ate`, `crashed` or
  `won`); a new run replaces `restart()`; and the stepper steps the run
  itself, since each apple makes the next step 2 ms quicker.

#### S3: the view (medium)

`src/view/`, with its specs and the contrast spec, and `_inks.scss` if the
apple needs an ink of its own.

- **As built:** no `_inks.scss`: the palette's roles pass 3:1 in every
  palette. `controls.ts` holds the key map, by `event.code`, and
  `SwipeReader`, which decision 5 put in the view. A crashed snake fades by
  its color, since a translucent body would show its seams.

#### S4: the scene (large)

`src/scene/`: `SnakeScene`, the four painters and the textures, without
sound, specced on `runScene()`.

- **As built:** each painter in a `Layer` of its own; the layout checked each
  frame, since `refreshInsets()` raises no event; Phaser 4's `Grid` needs
  `cellPadding` set to 0. The 22 scene specs ran real Phaser on the first
  try.

#### S5: the play and the board (large)

`GameService`, `BoardComponent` with `<fz-phaser-canvas>`, the lazy load, the
placeholder, the cards, `onLayout`, and the pausing, specced with
`provideFakePhaserCanvas()`. The game is playable from the keyboard by the
end of it.

- **As built:** the board is `role="application"`, pauses whenever it loses
  the focus, and takes the focus on a press; the result card's wait is
  counted in the scene's time; the settings and stats came forward from S9.
  Three of the board's specs run the real scene in jsdom.

#### S6: the controls (medium)

`board_keys.ts`, `SwipeDirective` and `<app-arrows>`, with specs through
user-event.

- **As built:** by decision 5 the keys and swipes are the scene's, so S6 is
  `<app-arrows>`, which turn on `pointerdown` and keep the focus on the
  board, and `@fz/game-ui`'s new `isTouchScreen`.

#### S7: the icons, the bar and the dialogs (medium)

`pause`, `sound` and `sound-off` in `@fz/ui`'s icons, with their spec's
cases; `<app-bar>`; and the settings, result and How to play dialogs.

- **As built:** an `apple` icon too, for the score. Pause and Sound keep the
  focus through a press, and the board takes the focus whenever the last
  dialog closes.

#### S8: sound (medium; if decision 8 keeps it)

`tools/build-sounds.mjs` and the sprite it writes, `preload()`, the sounds
in `effects_painter.ts`, and the Sound button and setting.

- **As built:** a `SoundPlayer` of its own loads the sprite, a 41 kB WAV, in
  `create()` rather than `preload()`, so the board never waits for it, and
  plays a sound only once it is cached.

#### S9: storage (medium)

`SettingsService`, `StatsService` and `SavedGameService` under the three
keys, each reader dropping what it can't trust.

- **As built:** `SavedGameService` writes as a run starts, pauses, goes on or
  eats, and on `pagehide`, never at a step, and the run comes back paused
  (decision 15).

#### S10: the checks (medium)

- **`tools/check-layout.mjs`** on `@fz/dev/layout`, at a roomy window, an
  upright phone and one on its side: no error and no scrolling;
  `<fz-phaser-canvas>` reaches `data-state="ready"`; the canvas's backing
  size is its CSS size at the expected pixel ratio; the board (`data-board`)
  is square, its squares at least 16 CSS px, within the window, and where
  the placeholder was; and the arrows are within the window. If S0 found
  that headless Chrome on CI gets no WebGL context, `@fz/dev/chrome` gains
  the flag that gives it SwiftShader's.
- **Size:** the entry chunk holds no Phaser, and the gzipped sizes of the
  entry, the scene and the `phaser` chunk go in the work log.
- **By hand:** a run by keyboard, by touch in Chrome's device mode and on a
  real phone if one is at hand, at each speed and with each kind of edge, in
  a light palette and a dark one; tabs switched mid-run; an AZERTY layout;
  the context lost and restored (`WEBGL_lose_context` from the console);
  the accessibility tree in DevTools; Lighthouse's accessibility audit; and
  the performance trace.

- **As built:** the check runs at 2×, with and without the arrows, through a
  check's new `before()` in `@fz/dev/layout`, and found the placeholder
  and the focus ring 8.5 px off the board at 2×, which was fixed. The entry
  is 77.7 kB gzipped with no Phaser, the scene 4.0 kB, the `phaser` chunk
  351.7 kB. Headless Chrome here got WebGL with no flag. The hand QA ran as
  scripts in headless Chrome; a real phone, Lighthouse and a performance
  trace weren't done. Decision 3's comparison, in the work log: headless
  Phaser caught what mocks take on trust, and whether the Solitaire
  Collection's specs move to it is the user's call.

#### S11: screenshots and docs (small)

- **`tools/capture-screenshots.mjs`:** a seeded run at Normal, steered along
  a scripted route until the snake is long and bent, paused out of sight of
  its card, at 1280 × 720 and 2× on Soft pastel, written by
  `writeSiteImages()`.
- **Snake's docs:** its `AGENTS.md`, its `README.md`, and a `snake-testing`
  skill on `runFrom`, `runScene()`, `provideFakePhaserCanvas()` and the
  contrast spec. `phaser-core` revisited with whatever Snake taught.
- **Lists that name the games:** `.agents/AGENTS.md`, `frontend/AGENTS.md`,
  `frontend/games/AGENTS.md` ("9003 Snake's, so the next game takes 9004"),
  `frontend/lib/dev/AGENTS.md`, `docs/operations.md`, the root `README.md`,
  and the skills `fuzzley-ui`, `web-game-accessibility` (a game that moves by
  itself: pausing, speeds and what is announced) and `angular-testing`.
- **Finish:** delete the work log.

- **As built:** the screenshot is a stored run, taken up paused, rather than
  a steered one, so it is the same every time. The work log was kept through
  S12, and deleted as this plan was archived.

#### S12: ship (small)

- `frontend/site/games.json` gets `"snake": { "workspace": "games/snake" }`;
  the catalog gets Snake in Classics, with a blurb ("Eat, grow and keep clear
  of your own tail."), `players: SOLO`, `minutes: 3`, `added` on the day it
  ships and `play: { build: "snake" }`; the Classics description widens
  (decision 16); and the meta description in `frontend/site/index.html`
  names Snake.
- `yarn verify`, `yarn check:layout`, the Docker image built,
  `.github/scripts/check-image.sh`, and `/play/snake/` played in the image
  with the console open.
- Merge to `main` on the user's go-ahead, and push. Play it on
  fuzzley.games.
- Rollback: `git push --force origin <last good commit>:live`, then revert
  the merge on `main`.

- **As built:** Snake went in a new Arcade category, by decision 16, not in
  Classics. Docker was off here, so the image was left to CI's `docker`
  job, which gates `promote`. In the final QA the Solitaire Collection's 42
  screenshots matched L0's but for noise, and a scripted game played alike
  on the final build and the baseline.

## Decisions

The first option in each is the recommendation. The user's answers, where
they differ, are under "The user's answers" near the top.

**The library**

1. **One library, `@fz/phaser`,** with pure entries, Phaser entries and one
   Angular entry for the canvas. Or a framework-free `@fz/phaser` with the
   canvas component in `@fz/game-ui`, which would make every game's chrome
   library depend on Phaser's. Or copy the plumbing into Snake and lift it
   later.
2. **The Solitaire Collection adopts all of it in the lift,** the canvas
   component included. Or only the host, the scaler and the scene helpers,
   leaving its canvas component as it is.
3. **New scenes are tested on real Phaser, headless in jsdom; the Solitaire
   Collection keeps its mocks** until one of its board scenes next changes.
   Or mocks for Snake too, as the Solitaire Collection has. Or Vitest's
   browser mode, with real WebGL in headless Chrome, which brings a new
   dependency and a browser to every `yarn test`.

**Snake on Phaser**

4. **Phaser's loop drives the game:** the scene's `update()` hands the time
   to `GameService.tick()`. Or the shell runs a frame loop of its own and the
   scene only draws, which makes two loops on the page.
5. **Keys and swipes are the shell's; Phaser's input is off.** Or Phaser's
   keyboard, aimed at the board's element (`input.keyboard.target`), and its
   pointer for swipes.
6. **Phaser's stock build, in its own chunk, loaded with the scene after the
   shell has painted.** Or a trimmed build now, for Snake alone. Or loaded
   with the page, as the Solitaire Collection does.
7. **`Phaser.AUTO`:** WebGL, with the canvas renderer where WebGL is
   missing. Or WebGL only, with the failure card where it is missing.
8. **Sound: three effects through Phaser's loader and sound manager, on by
   default, with a Sound button in the bar.** Or off until the player turns
   it on. Or no sound in this plan.

**The game, as the first draft had them**

9. **Walls by default, with "Wrap around" as a setting.** Or walls only. Or
   wrap-around only.
10. **Three speeds, Slow, Normal and Fast, each quickening as the snake
    grows, with Normal first.** Or a fixed speed for each. Or one speed that
    quickens from slow to fast.
11. **One square board, 17 by 17.** Or three sizes. Or a board shaped like
    the screen.
12. **The snake glides between squares, with "Step" as a setting.** Or it
    steps only.
13. **Touch: swipes on the board, and on-screen arrows shown for touch.** Or
    swipes only. Or arrows only.
14. **The game pauses itself, and resumes only on the player's direction or
    Resume, at once.** Or a "3, 2, 1" before it resumes.
15. **It keeps the settings, the stats for each speed and edges, and the run
    under way, taken up paused.** Or the same without the run under way.
16. **Snake goes in Classics, whose description widens to "Puzzles, board
    games and arcade classics beyond cards".** Or a category of its own,
    Arcade.
17. **A point for each apple, with bests kept apart for each speed and
    edges.** Or points that grow with the speed, with one best.
18. **New icons: `pause`, `sound` and `sound-off`.**
19. **Shipping: the lift merges first, on its own; Snake merges once, linked
    from the catalog in the same commit, with `added` on that day.**

## Risks

- **The lift changes a live game.** The suite, the compared styles, the
  screenshots compared pixel for pixel, play by hand, and a merge of its
  own keep a regression apart from Snake.
- **The headless harness leans on Phaser's internals:** `headlessStep()`,
  the loop's `sleep()`, and tweens reading `Date.now()`. A Phaser upgrade
  may move them; the harness's own spec fails first, and says where.
- **Headless Chrome on CI may have no WebGL.** `Phaser.AUTO` falls back to
  the canvas renderer, which the layout check accepts, and SwiftShader's
  WebGL is a flag away. S0 finds out which.
- **Phaser is a third of a megabyte gzipped.** Loading it after the shell
  keeps the first paint quick, but the board waits on it, on a slow
  connection most. S0 measures the wait on a throttled phone, and the
  placeholder makes the wait look like the board.
- **The feel is everything,** and no spec can judge it. The speeds, the
  queue and the glide are settled by playing the spike, and again at S10.
- **A turn pressed mid-glide** may make the head seem to jump. S0 checks;
  "Step" is the fallback.
- **The arrow keys belong to menus too.** The game takes them only when the
  focus is outside a dialog or menu, which S6's specs hold it to.
- **Sound on by default may surprise a player.** It follows only the
  player's own play, never starts on load, and is one press from off;
  decision 8 can turn it the other way.
- **Two frameworks, two lifecycles.** The canvas component owns the host,
  the scene releases everything through `@fz/phaser/scene`, and the scene's
  specs check that nothing is called after `destroy()`.

## Not in this plan

- Mazes, obstacles, more than one apple, power-ups, two snakes, shared
  scores, a daily seed or a link that shares a run.
- A gamepad, Phaser's pointer input, physics, tile maps and sprite atlases,
  which "What a bigger Phaser game would add" leaves to the game that needs
  them.
- A trimmed Phaser build (decision 6).
- Moving the Solitaire Collection's scene specs off their mocks
  (decision 3).
- Sleeping Phaser's loop while nothing moves, unless S10's trace asks for it.
- A Content Security Policy for `/play/snake/`. No game carries one, and
  Snake loads nothing from another origin.
- Reversi, the other Classic still to come.
