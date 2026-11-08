# @fz/dev

The `@fz/dev` library (`frontend/lib/dev`): what every workspace shares to
check, test and build itself and script its chores, which no app's own code
imports. The
frontend's rules, in [frontend/AGENTS.md](../../AGENTS.md), and the
repository's, in [.agents/AGENTS.md](../../../.agents/AGENTS.md), apply here
too. Paths are relative to `frontend/lib/dev/`.

## What it holds

- `src/eslint.ts`, `@fz/dev/eslint`: the blocks a workspace's
  `eslint.config.js` is made of, each given the files it covers:
  - `typescript()`: typescript-eslint's strict and stylistic type-checked
    rules, with the repository's own on top (explicit return types on what a
    module exports, `import type` for type-only imports, `@deprecated` APIs
    an error, and a `switch` over a union with a case for every member or a
    `default`), and the fence around every library's testing entry point,
    such as `@fz/ui/testing`. It needs the workspace's folder (`root`), whose
    `tsconfig.json` its project service starts from.
  - `angular()`: angular-eslint's rules for the TypeScript, and the prefix
    every component and directive selector carries (`fz` in a library,
    `app` in an app).
  - `templates()`: angular-eslint's rules for the templates, accessibility's
    among them, and a `@default` on every `@switch`.
  - `tests()`: what the specs, and the helpers only they use, may do that
    other code may not: assert with `!`, stub with an empty function, let a
    mock's type be what it builds, and import the libraries' testing helpers.
  - `scripts()`: the rules of the `.mjs` scripts, and of the workspace's
    own ESLint and Stylelint configs, which require JSDoc types on every
    parameter and returned value.
  - `phaser()`: what code that drives Phaser may do that other code may
    not: keep the guards `no-unnecessary-condition` would take out, since
    Phaser types a scene's systems as always there, though they aren't
    before it boots or after it ends.
  - `phaserGameLayers({ viewAllows, heldAsRules })`: the fences between the
    four layers of a game drawn with Phaser, each a folder under the game's
    `src/` importing only the layers below it: the rules (`rules/`), with
    no framework and no library but `@fz/core`; the view (`view/`), with no
    Phaser and no framework, and of the libraries only `@fz/core`,
    `@fz/phaser`'s pure entries and the entries the game lets in
    (`viewAllows`, each `@fz/<lib>/<entry>`, such as `@fz/style/fuzzball`:
    it throws for a package or a path below an entry, which the fence
    can't let in); the scene (`scene/`), which draws with Phaser and knows
    no framework, no shell's library and no canvas; and the shell (`app/`),
    which takes the scene and `@fz/phaser`'s host, scene helpers and sound
    by type alone, so its board loads the scene with `import()`. The rules
    know nothing of the specs' helpers either. The rules and the view, but
    their specs, are kept to what they are handed, so a run plays the same
    again from its seed and its frames, in Node as on the page: no clock or
    timer (`Date.now()`, an argument-less `new Date()` or `Date()`,
    `performance`, `setTimeout()`, frame callbacks), no number drawn from
    no seed (`Math.random()`, `crypto`, `@fz/core/random`'s
    `randomSeed()`), no seed mixed by hand (`Math.imul()`, where
    `@fz/core/random`'s `mixSeed()` mixes one in a named stream), nothing
    of the page (`window` under each of its names, `document`,
    `navigator`, `matchMedia()`, the window's size and listeners) and
    nothing stored or fetched (`localStorage`, `indexedDB`, `fetch()`).
    `heldAsRules` names the workspace's folder (`root`) and files of one
    folder outside the rules, by their paths from it (`files`), held to the
    rules' fence and kept to what they are handed as the rules are, as the
    helpers the breakers' scripts load are; the block lets them import
    nothing beside them but one another, so a file they import must join
    them, and throws for a glob or files of two folders, which the sibling
    pattern can't be built from, or a file the workspace doesn't have, which
    ESLint would pass over without a word.
- `tsconfig/`, `@fz/dev/tsconfig/*.json`: the compiler options a
  workspace's `tsconfig.json` extends.
  - `base.json`: the strict flags every workspace's TypeScript is checked
    with. An app compiles the libraries' sources into its own program, with
    its own options, so one set for all of them is what lets a library's code
    pass in every app. An app may add a flag of its own where the libraries'
    code it compiles passes it too, as Asteroid Breaker's configs add
    `exactOptionalPropertyTypes`, which this one leaves out until every
    workspace passes it.
  - `angular.json`: the base, with Angular's decorators and the Angular
    compiler's strictest checks, every extended diagnostic an error. Its
    `outDir` and `rootDir` are the extending workspace's own folder
    (`${configDir}`).
  - `scripts.json`: the `.mjs` scripts, type-checked from their JSDoc with
    the base's checks of indexes, returns and `switch` cases
    (`noUncheckedIndexedAccess` among them), so a script reads an index as
    maybe missing, as the TypeScript does. The checks the two share are kept
    in step: a flag added to one is added to the other.
- `src/vitest.ts`, `@fz/dev/vitest`: the Vitest settings every workspace's
  specs share. `angularTests()` is the whole config of a workspace that
  tests Angular code: Analog's plugin, every spec under `src/` in jsdom with
  the globals TestBed needs, after the workspace's `test-setup.ts` there,
  and V8 coverage of `src/`, less the setup file. `nodeTests()` is the same
  for specs that run in Node. Each is given the workspace's floors and,
  where they differ, the files coverage measures or leaves out.
  `angularTests()` given `projects`, as Snake, Brick Breaker and Asteroid
  Breaker give it, splits the specs into Vitest projects, each a config of
  its own (`extends: false`), so each starts only what its specs need:
  `pure`, the specs of the folders it names that touch no page, such as the
  rules' and the view's, in Node; `sim`, the specs of the folders that play
  or lay out every level or wave, in Node, where a game has any; and `dom`,
  every other spec, those `domSpecs` names in `pure`'s folders among them,
  in jsdom with Analog's plugin, so every spec runs in one project. A game
  with simulations runs `dom` and `pure` with coverage, then `sim` without
  (`yarn test` in `frontend/AGENTS.md`). Coverage adds up a file two
  projects load only where both compiled it alike, so `dom` leaves the code
  of `pure`'s folders, but not their specs, to Vite's oxc, as `pure`
  compiles it: it passes it by in the plugin's `transformFilter` and names
  it in `oxc.include`, since the plugin turns oxc off, or each of its
  functions would count twice. So the code of a pure folder must hold
  nothing Analog's plugin must compile, such as a decorated class. Vitest
  watches through the config's own server, so `dom` hands its own each file
  added or removed, for the plugin to take a new component into its program
  (`forwardAddedAndRemoved()`); and Vitest keys the modules it caches on
  disk without the config of a project declared with `extends: false`, so
  `dom` adds `src/vitest.ts`, the code it leaves to oxc and the workspace's
  `tsconfig.json` and `tsconfig.spec.json` to its key (`keyedBy()`), or a
  change to how the plugin compiles would be read from the cache. The
  pieces these are made of, `angularSpecs()`, `nodeSpecs()` and
  `coverage()`, are for a config of Vitest projects built by hand, such as
  the site's. `angularSpecs()` names Analog's pool, `vmThreads`: the plugin
  sets it in a config hook, after Vitest has taken the `test` options a
  project sharing the config's Vite server inherits, so such a project, as
  the site's `app` is, would run in `forks`.
- `src/vite.ts`, `@fz/dev/vite`: `gameConfig({ port, name, catalog })`, the Vite
  config every game built here shares: the `./` base that lets the site serve a
  build from `/play/<slug>/`, the Angular plugins, `@fz/style`'s
  `fuzzleyStyle()`, the game's manifest, a build in `dist/` with its files in
  `assets/` and Phaser, where a game has it, in a chunk of its own
  (`PHASER_CHUNK`), and a dev server on the game's own port, which its
  screenshot script defaults to: 9000 for the Solitaire Collection, 9001 for
  Minesweeper, 9002 for Sudoku, 9003 for Snake, 9004 for Brick Breaker and 9005
  for Asteroid Breaker; it opens no browser unless started with `--open`.
  The Angular plugins, `angularPlugins()`, which the
  site's config takes too, are Analog's with its live reload, which swaps an
  edited component's template or styles into the running page, and
  `componentUpdates()`, which makes that hold for every component and reloads
  the page for an edit to TypeScript, whose class code Angular can't swap.
  Analog announces an update under the component's path from the app's folder,
  where Angular compiled in its path from the app's `rootDir`, or its whole path
  for a file outside it, such as a library's, in lower case on Windows; so
  `componentUpdates()` renames each update to Angular's ID, and the page's
  request for it back to Analog's. It takes the app's `rootDir` to be its
  folder, as `tsconfig/angular.json` sets it; an app that moves its `rootDir`
  loses its updates without a word. `componentStylesheets()` has the server
  serve the stylesheet of a component with no encapsulation ID, as with
  `ViewEncapsulation.None`, such as `@fz/phaser`'s canvas: Angular links it with
  a bare `ngcomp`, which Analog takes only as `ngcomp=`, so it gives the bare
  one an empty ID, where the component would otherwise go unstyled. The last of
  them, `watchLibraries()`, watches `frontend/lib/` as a whole: Vite watches
  each file outside the app's folder on its own, and loses one that git replaces
  (a checkout, a stash, a branch switch), which a watched folder sees come back.
  A server logs a page reload for a library's template it never loaded, and
  sends one only for that template's own address, so no page reloads.
- `src/game_manifest.ts`, `@fz/dev/game-manifest`: what a game's build
  says it holds, in `game.json` at the top of its `dist/`: its name and,
  for a collection, the `id` and `name` of every game it opens.
  `gameManifest()` is the plugin that writes it, loading a collection's
  catalog module through Vite's `runnerImport()` with the build's own
  aliases; `isGameManifest()` is the guard the site reads it with, and
  `GameManifest` its type.
- `src/chrome.ts`, `@fz/dev/chrome`: what a script that drives a headless
  Chrome needs. `withChrome()` starts Chrome on a throwaway profile and
  hands over a `DevToolsConnection`; `withPage()` opens a `Page` in a
  browser context of its own at a viewport, which navigates, reloads, runs
  a function in the page, sent as its source, before the page loads
  (`beforeLoad()`) or after (`evaluate()`), and after it with helpers the
  function calls by their names sent beside it (`evaluateWith()`), which
  throws for a helper with no name it can be called by, as an anonymous or
  a bound function has none, or for a name two helpers share; listens to
  its events (`on()`); and takes a screenshot.
  `findChrome()` picks the Chrome to run: the one asked for, `CHROME_PATH`,
  or the first installed in a usual place. The games' screenshot scripts
  are built on it, and so is the layout check.
- `src/layout.ts`, `@fz/dev/layout`: a game's layout checked in a real
  browser. `checkLayout()` opens a game's page at each of `SHAPES` (a roomy
  window, and a large and a small phone, upright and on its side), waits for a
  selector and the fonts (for a board drawn with Phaser,
  `PHASER_CANVAS_READY`, which its canvas matches once the scene has drawn),
  and returns what is wrong at each: an error the page
  reports (an exception, `console.error`, or the browser's own, such as a
  refused resource), a page that scrolls, a control of the game bar out of the
  window, what is wrong with the check's `board`, where it has one, and what
  the game's own `inspect()`, run in the page, finds. `checkTurns()` does the
  same once it has turned the window, as a phone turns, through each of
  `TURNS` (upright to its side, and back), and given half a second to lay
  itself out again, which finds what follows a turn late, or not at all. A
  check's `before()` runs in the page ahead of its own scripts, to set it up
  as a player might have, such as with a setting stored. `SMALLEST`, a 320 ×
  480 phone held upright, and `shapesAt()` and `turnsAt()`, which copy shapes
  and turns at a pixel ratio, are there for a game drawn on a canvas, as
  Snake, Brick Breaker and Asteroid Breaker check theirs at 2×. A check's
  `board`, a `PhaserBoard`, names a board drawn with Phaser by its element,
  the attribute that says where the scene drew it, its shape in units, its
  width or its height read from a custom property of its element where it
  follows the room it is given, and its placeholder, focus ring and card, and
  the check holds it as every such board is held: its canvas ready and drawn
  at its size times the board element's `--pixel-ratio`, the board in its
  shape and in the window, the placeholder and the ring where the scene drew
  it, and the card on it. A board with a deck beside it, the zones its canvas
  draws for a touch screen's thumbs, names that too (`PhaserDeck`): the
  attribute that lists the zones, each by its name and where it lies on the
  canvas, the zones it must show, and the least a zone may be across and down;
  once the page says where the board lies, the check holds each zone named,
  shown once, on the canvas and in the window, off the board, the other zones
  and the bar's controls, and at least that size, so a game checks its layout
  with its deck shown. The game's `inspect()` is then handed where the board
  lies, a `BoardBox`, for what is its own, such as the least its unit may be.
  The functions it runs in the page are in `src/layout_page.ts`, which only a
  browser runs, but for `settle()`, which its spec runs in jsdom, so
  coverage leaves it out, and the board's and the deck's inspections,
  `inspectPhaserBoard()` and `inspectPhaserDeck()`, in `src/board_page.ts`,
  `@fz/dev/board-page`, which its spec runs in jsdom, beside the readers of
  the rectangles a board writes into its element's attributes:
  `readRect()`, one rectangle as "x y width height" in CSS px, as
  `@fz/phaser/layout`'s `rectAttribute()` writes it, and `readNamedRects()`,
  a list of them by name, as its `namedRectsAttribute()` writes one. That
  file imports nothing, so a board's spec reads what its board writes with
  the readers from `@fz/dev/board-page` without loading Vite or Chrome;
  `@fz/dev/layout` exports both again for the scripts, and
  `@fz/dev/screenshots` `readRect()`. The check sends both into the page
  with each inspection, the game's own among them, so a game's `inspect()`
  reads such an attribute by calling them by those names, as Asteroid
  Breaker's reads the field's room. A function the page runs calls them as
  names of its own module, as the inspections do, or from a script Node
  runs, as a game's `tools/check-layout.mjs` is, never through an import
  Vite rewrites: Vitest's module runner turns an imported `readRect(…)`
  into `(0, __vite_ssr_import_0__.readRect)(…)`, which is the source the
  page is sent, and which names nothing there. So such a function of this
  library's is kept in `src/board_page.ts`, as the screenshots'
  `describePhaserPage()` is. A game's
  `tools/check-layout.mjs` holds its inspection and which checks it runs, and
  hands them to `runLayoutScript()`, which reads the command line (`--chrome`,
  `--help`) with `@fz/dev/script`'s `readArgs()`, serves the build as
  `yarn preview` does, at 127.0.0.1 rather than `localhost`, which can name
  ::1 to the server and 127.0.0.1 to a client dialing it, and opening no
  browser of the desktop's, whatever the game's config asks, runs the checks
  in a headless Chrome and prints what is wrong, or that the layout holds,
  to the console unless a spec hands it a `Printer`, as
  `runScreenshotScript()` takes one. It returns the exit code, 1 for a
  layout that doesn't hold and 2 for an option it doesn't know, and throws
  where it can't check at all, such as for a game with no build, no Chrome
  to run, or a page that never draws: `settle()`, which waits in the page,
  resolves to false where nothing matched in time, and the check throws,
  naming the selector.
- `src/screenshots.ts`, `@fz/dev/screenshots`: the images the site shows of
  a game, `SITE_IMAGES` (`thumb.webp` at 576 × 324 and `preview.webp` at
  2560 × 1440, the names `screenshotUrl()` in the site's model asks for),
  the sharp calls that write them, and the screenshot scripts' runner.
  `writeSiteImages()` writes both from a capture into a folder, the
  thumbnail cropped to a region when given one, which `thumbRegionAround()`
  works out from a box on the page (a `Region`, sharp's): the box and a
  margin, grown to the thumbnail's shape and kept on the capture's whole
  pixels, rounded before it is kept there, so it never runs past the
  capture's edge; `writeImage()` writes one image of any size, as the
  Solitaire Collection's rules-page image is. A game's
  `tools/capture-screenshots.mjs` says what it captures and hands it to
  `runScreenshotScript()`, which reads the command line (`--url`, an http or
  https address, the game's own dev server by default, `--chrome`, `--help`,
  and the names after them for a script that takes them, as the Solitaire
  Collection's game ids), checks that a server answers there, starts a
  headless Chrome and hands it to the script's `capture()`, which returns
  the code to exit with; it returns 1, before Chrome starts, where nothing
  answers within five seconds, and 2 for a command line it can't read, and
  throws where it can't capture at all, such as for no Chrome to run. A
  capture sets its page up before the game starts with `setUpPage()`, given
  a `PageSetup` (the palette, entries stored, fields merged into what a game
  stores as it goes, such as its clock, and a seed for `Math.random`), waits
  for it to draw with `settled()`, which runs the layout check's `settle()`
  and returns false where nothing matched in time, a board drawn with Phaser
  waiting on `PHASER_CANVAS_SETTLED` or `PHASER_CANVAS_READY`, and hands its
  `Shot`, or why it `Missed`, to `keepShot()`, which writes the site's
  images, prints what the shot shows and each image's size, and returns the
  code. `describePhaserPage()` says what the page of a game drawn with
  Phaser shows once a wait has passed, 800 ms unless given (`waitMs`): its
  canvas's state, its board's outcome, the score, and where the scene drew
  the board, none where the page has no canvas or the board doesn't say
  where it lies. It reads the board's rectangle with `readRect()`, so it
  lives in `src/board_page.ts` beside it, and a capture sends it with that
  helper (`page.evaluateWith([readRect], describePhaserPage, board)`). What
  `setUpPage()` runs in the page is in `src/screenshot_page.ts`;
  `src/screenshot_page.spec.ts` runs it and `describePhaserPage()` in
  jsdom, each as the page is sent it, from its source alone.
- `src/script.ts`, `@fz/dev/script`: what a workspace's Node scripts
  share. `readArgs()` reads a command line's options, `--help` (`-h`) among
  them, which every script takes, and the words after them where the
  script takes any, or returns a `Stop`: the usage and 0 for `--help`, and
  what is wrong, a blank line, the usage and 2 for one it can't read, as
  `misread()` returns for a value the script itself refuses; `isStop()`
  tells a stop from what the script asked for. `stopWith()` prints a stop,
  the usage as output and the rest as what went wrong, and returns its
  code, and `wrapped()` breaks what a usage says into lines of 78 columns.
  A script's `run()` takes a `ScriptIo`: where it prints,
  `CONSOLE` unless a spec hands it another `Printer`, and what it loads, so
  its spec holds it whole. `importThroughVite()` loads a module of an app's
  TypeScript through Vite's `runnerImport()`, as Node can't load it as it
  is: its modules are named without extensions and import JSON, and
  `@fz/core` isn't written for Node to strip its types. It loads Vite only
  once called, so a script that loads nothing through it doesn't wait on
  Vite; the site loads its catalog with it too.
- `src/report.ts`, `@fz/dev/report`: the table a game's report prints of
  how its autopilot plays each wave or level at each speed, as Asteroid
  Breaker's `report:waves` and Brick Breaker's `report:levels` print
  theirs. `printReport()` is handed the entries, the speeds, how many seeds
  each is played from (`--seeds`, which `readSeeds()` reads, an option
  `SEEDS_OPTION` declares), how to play one, and the columns a speed shows
  of an entry's plays (`ReportColumns`). It plays each entry from its
  number, or from seeds of its own `SEED_STRIDE` apart, prints its line as
  it is played, the names as wide as the longest, then, under a blank line,
  each `Tally` that marked a play, and returns the code to exit with: 1
  where a tally that fails the report marked one. `timeOf()` writes steps
  as minutes and seconds, `-` for a play that didn't clear, and
  `middleAndMost()` gives the middle and the most of many plays' counts.
- `src/sounds.ts`, `@fz/dev/sounds`: a game's sound effects, synthesized. A
  `Sound` is a name, a length, a peak and a wave, made of `glide()` (a tone
  gliding between two pitches), `envelope()`, `thud()` (seeded noise),
  `note()` and `arpeggio()` (a chord's notes struck one after another, as a
  chime is), and `looped()`, a wave of noise that ends just as it starts, at
  an even loudness, for a sound marked `loop`, which a game loops as a held
  key's hum; `writeSoundSprite()` renders a list of them, throwing for an
  empty list, two of one name or a silent one, at 16,000 samples a second,
  each but a looping one faded out at its end, a tenth of a second apart,
  into `sounds.wav` and the spritemap Phaser plays it by, `sounds.json`, the
  same bytes every run. A game's `tools/build-sounds.mjs` holds its recipes
  and calls it.

## How a workspace uses it

- **A workspace's configs extend it, and add only what is their own.** Its
  `package.json` lists `"@fz/dev": "workspace:*"` beside `eslint` and
  `typescript`, which it runs. Its `eslint.config.js` passes the blocks to
  `defineConfig()`, then its own fences, such as Minesweeper's around its
  rules, and its `tsconfig.json` extends `@fz/dev/tsconfig/angular.json`
  (`base.json` without Angular), as `frontend/games/minesweeper/` shows. A
  rule raised here is raised everywhere at once.
- **Its `vitest.config.ts` is `angularTests()` or `nodeTests()`**, given its
  floors, unless its specs run another way: the Solitaire Collection's live
  under `test/`, mostly in Node, and keep a config of their own, and the
  site's are the projects of the `test` block in its `vite.config.ts`.
  Snake, Brick Breaker and Asteroid Breaker give `angularTests()` the
  folders of their projects, so the specs of their rules and their view
  run in Node, and the breakers' simulations without coverage. A game's
  `vite.config.ts` is `gameConfig()`, with what is the game's own merged in
  by Vite's `mergeConfig()`, as `frontend/games/solitaire/` does for the
  commit it was built from and its `@` alias. Analog's plugin, Vite and
  Vitest are peers, which the workspace lists and runs.
- **A game's screenshot script is run by `runScreenshotScript()`**, and
  keeps to itself which states it captures and how it sets them up; it
  writes the site's images with `keepShot()`, or, as the Solitaire
  Collection's does, what it writes of its own. A game's report on its
  autopilot prints its table with `printReport()`, and both read their
  command lines with `readArgs()`.
- **Its ESLint and Stylelint configs are checked as its scripts are:**
  `eslint.config.js` and `stylelint.config.js` are named in its `lint`, or
  under the folder it lints, and in its `scripts()` block, and type-checked
  from their JSDoc in its `tsconfig.scripts.json`, which its `typecheck`
  runs and its solution, `tsconfig.json`, references, so an editor checks
  them as `tsc` does.
- **A workspace's own import fences use
  `@typescript-eslint/no-restricted-imports`**, so that they add to the
  testing fence, which uses ESLint's own `no-restricted-imports`, rather
  than replace it.
- **A game drawn with Phaser takes its layers' fences from
  `phaserGameLayers()`**, rather than writing them again, so no game's
  fence goes stale or is tightened alone. What is its own goes in the
  options: what its view takes beyond the rest (`viewAllows`) and what it
  holds as the rules, by their paths from its folder (`heldAsRules`), as
  Asteroid Breaker's `eslint.config.js` does. ESLint takes a rule's options
  from the last block that sets it for a file, so a block of the game's own
  that restricts imports, properties, globals or syntax in a layer's folder
  would replace the layers' rules there rather than add to them.
- **A loosening stays in the workspace, with its reason,** unless every
  workspace of a kind needs it: `phaser()` is the one here, since every
  folder that drives Phaser does.

## Rules

- **It runs in Node as it is.** An app's ESLint config and scripts import
  these files, so relative imports name the file (`./eslint.ts`) and the
  TypeScript is only the kind Node can strip (`erasableSyntaxOnly`), as in
  `@fz/style`.
- **The scripts' helpers load Vite only when asked.** What
  `@fz/dev/script`, `/report` and `/screenshots` load imports Vite, and the
  modules here that import it, by type alone, so a script that loads
  nothing through `importThroughVite()` doesn't wait on Vite; lint holds
  them to it.
- **Nothing here reaches an app's bundle.** It holds only what checks,
  builds or scripts a workspace; what an app runs belongs in the other
  libraries.
- **It depends on `@fz/style`**, for the plugin `gameConfig()` adds, while
  `@fz/style` is checked with this library's presets. Yarn links the two
  either way round, and nothing in `lib/` is built, so neither has to come
  first.

## Checks

The root's `yarn lint`, `yarn typecheck` and `yarn test` run the library's
own, which `yarn workspace @fz/dev <script>` runs alone.

- **`lint`** runs ESLint with its own blocks (`eslint.config.js`), over
  that config too, and holds the modules the scripts load to Vite's types
  alone.
- **`typecheck`** runs `tsc` over the sources, the specs and the Vitest
  config (`tsconfig.lib.json`), then over the ESLint config from its
  JSDoc, with the blocks it imports (`tsconfig.scripts.json`); the
  solution, `tsconfig.json`, references both.
  Asteroid Breaker's `typecheck` holds those it compiles to
  `exactOptionalPropertyTypes` too, until `tsconfig/base.json` takes it.
- **`test`** runs Vitest in Node. `src/eslint.spec.ts` lints files written
  into a folder of their own with the blocks, so a block that stops catching
  what it should fails here; `src/vitest.spec.ts` and `src/vite.spec.ts`
  check the configs the presets return, and the first has Vitest itself
  place specs written into a folder of their own in a game's projects;
  `src/game_manifest.spec.ts` builds games with Vite in a folder of their
  own and reads the manifests they write; `src/screenshots.spec.ts` writes
  the site's images from a capture it draws, works out thumbnails' regions,
  and runs a screenshot script against a server it starts and a fake
  browser; `src/script.spec.ts` reads command lines and loads TypeScript it
  writes through Vite; `src/report.spec.ts` prints reports of plays it
  makes up; `src/sounds.spec.ts` renders sprites and reads them back;
  `src/chrome.spec.ts` and `src/layout.spec.ts` drive the DevTools helpers
  and the layout check against a fake browser, `src/testing/fake_browser.ts`,
  and the layout spec serves a build it writes with Vite's `preview()`;
  `src/board_page.spec.ts` runs the inspection of a board drawn with
  Phaser in jsdom, over the rectangles it hands each element, and holds
  the readers to reading back what a board writes and nothing malformed;
  `src/screenshot_page.spec.ts` the setup of a screenshot's page and the
  description of a page drawn with Phaser; and `src/layout_page.spec.ts`
  the wait for a page to draw; each run from the source the page is sent
  too, beside the readers where it calls them, the three specs here that
  do. Coverage counts `src/testing/` too, as `frontend/AGENTS.md` asks of
  every library. Starting a real Chrome is left to the screenshot scripts,
  so `src/chrome.ts` stays short of the rest; the floor in
  `vitest.config.ts` sits just under the figures, and rises as they rise.
