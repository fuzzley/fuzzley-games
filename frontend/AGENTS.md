# The frontend

These rules hold for every workspace under `frontend/`: the site (`site/`),
the games (`games/`) and the libraries they share (`lib/`, each named
`@fz/<folder>`). The repository's, in
[.agents/AGENTS.md](../.agents/AGENTS.md), apply here too. Paths are relative
to `frontend/`.

## Workspaces

- **A workspace lists everything it imports or runs in its own
  `package.json`.** Its configs sit in its folder, build on `@fz/dev`'s
  presets and add only what is its own, so every workspace is checked by
  the same rules. `yarn lint` holds every `package.json` to the constraints
  in `yarn.config.cjs`, and `yarn constraints --fix` settles a range that
  differs between workspaces.
- **Imports go one way.** The site and the games import a library, through
  a `workspace:` dependency, and a library may import another library, but
  never the site or a game. The site and the games never import each
  other's code.
- **Reach for a shared piece before writing one.** The `fuzzley-ui` skill
  says which library holds what, and how an app adopts it. The
  `phaser-core` skill covers `@fz/phaser`.
- **Before changing a library, read the `fuzzley-ui` skill's "Changing a
  library",** or `phaser-core` for `@fz/phaser`. A piece added to a library,
  or one whose name or inputs change, changes its row in that skill in the
  same change: no `AGENTS.md` lists what a library holds.
- **A workspace's exception to a lint rule goes in its own
  `eslint.config.js`, with its reason,** never into a preset. A block there
  that sets a rule a preset sets replaces the preset's options in its
  files, so it restates what it must keep. An import fence of its own uses
  `@typescript-eslint/no-restricted-imports`, which adds to the presets'
  fence on the `testing` entries, where ESLint's own rule would replace it.
- **What a browser stores outlives the code.** Renaming a storage key, or an
  id stored under one, such as a palette's, passes every check and loses
  what players saved.
- **Take the newest version past the age gate rather than lifting it.**
  `.yarnrc.yml` sets `npmMinimalAgeGate` to a day, so Yarn calls a version
  published since then "quarantined" and won't install it.

## Checking

- **`yarn typecheck` is the only check a spec's types get,** since Vitest
  strips types without checking them.
- **Run one spec with `yarn vitest run <path>` from its workspace,** naming
  its project where the workspace has several
  (`yarn vitest run --project pure <path>`), or Vitest starts every
  project. `yarn test --only <name>` runs one workspace's specs from here.
  A coverage floor holds for a whole suite, so `test:coverage` fails on
  one spec.
- **A coverage floor sits a little under the suite's figures,** and is
  raised as they rise.
- **A script that runs Vitest twice hands each run its arguments (`"$@"`).**
  Yarn adds them to a script's last command alone, so the first run would
  miss the root's `--maxWorkers`, take every core beside three other
  suites, and time their specs out: flaky, and no check fails.
- **A workspace's step reads nothing another workspace's step writes.** The
  root runs every workspace's `lint`, `typecheck`, `test` and `build` side
  by side, so none may wait on another's.
- **A script that takes the whole machine waits its turn in the queue
  `yarn verify:changed` keeps,** with `@fz/dev/queue`'s `waitForTurn()`,
  which waits in its `queueFolder()`, so it never runs beside a run of
  `yarn verify:changed` or of another such script.
- **A `tools/` script that a spec imports exports its logic as functions,
  and runs only as the file Node started** (`if (import.meta.main)`).
  Without the guard, importing it does its work: the site's would copy the
  games' builds or start dev servers in the middle of `yarn test`.
- **Format one file with `node_modules/.bin/prettier --write <path>`.**
  `yarn prettier` formats the whole repository, whatever follows it.
- **`yarn start` serves the games as they were built when it started.**
  `yarn dev:all` runs every app's own dev server, so an edit to a game or
  a library shows as soon as it is saved.
- **Don't run `yarn stop` while a build runs.** It stops the Dart Sass a
  build spawns, along with the dev servers.
- **Look at a UI or behavior change in the running page,** at
  `http://localhost:4200/`, through the `chrome-devtools-mcp` server. Close
  any browser you start when you are done with it.

## Angular and Sass

The site and the games are Angular apps on the shared libraries, and write
their templates and stylesheets alike.

- **Templates bind, they do not compute.** Expose a `computed()` view model
  instead of calling a method from a template, which re-runs on every change
  detection pass, or working out a label, a comparison or a plural there.
- **A `@switch` over a union ends in `@default never;`,** which has the
  compiler hold its cases to every member, as lint holds a TypeScript
  `switch`, so a new member, such as a card or an icon, fails to compile
  rather than showing nothing. The members that show nothing share one
  empty `@case` (`@case ("hidden") @case ("blank") {}`). The compiler can't
  narrow a call, so a signal's value is taken into a `@let` first
  (`@let shownCard = card();`). Over any other value, a `@default { … }`
  says what shows. Lint asks every `@switch` for a `@default`.
- **Visible state is announced state.** A control that looks selected
  carries `aria-checked`, `aria-current` or `aria-pressed`. A menu built
  on Angular Aria binds `aria-checked` itself, since Aria sets the role
  and not the state, and gives each item a `searchTerm`, without which
  typing a name finds nothing. The rules are the `web-game-accessibility`
  skill's; the template accessibility lint rules enforce the common cases.
- **An icon-only button has one name:** its `title`, which shows as its
  tooltip too, or an `aria-label` where no tooltip is wanted. Never both
  saying the same, which a browser reads as the name and again as the
  description.
- **The libraries' pieces first.** Overlays are `<fz-dialog>`, never a
  hand-rolled focus trap, Escape handler or z-index; the question before
  something is lost is `@fz/ui/confirm`'s `ConfirmService.ask()`; buttons
  are `@fz/style`'s `.fz-button`; what changed is said through
  `@fz/ui/announcer`; and icons are `<fz-icon name="…">`, never an inline
  `<svg>`. An icon is hidden from assistive technology, so the text beside
  it, or its control's label, says what it means, and a new one goes into
  `@fz/ui` (the `fuzzley-ui` skill says how). The `fuzzley-ui` skill lists the
  rest.
- **Colors and sizes are `@fz/style`'s tokens, by their own names**
  (`--fz-accent`, `--fz-space-3`, `--fz-radius-md`), read with `var()`.
  Stylelint, with `@fz/style`'s preset, rejects a color written anywhere
  else but the one stylesheet where a game keeps colors of its own (the
  Solitaire Collection's card artwork, Minesweeper's and Sudoku's inks). A
  game drawn on a canvas keeps colors of its own in its view's TypeScript
  instead, as Asteroid Breaker's rocks' inks are, since no stylesheet draws
  them; the inks such games share live in `@fz/phaser/color`. A custom
  property of an app's own has no `--fz-` prefix, and exists only where no
  `--fz-*` one will do.
- **Read a palette's roles, and never branch on a palette's id.** There are
  light palettes and dark ones, and an app's chrome wears whichever is in
  use.
- **Runtime values are custom properties; build-time values are Sass.**
  What changes while the page runs, such as the palette or a gutter, is a
  custom property read with `var()`, and so is what a part of a page may
  change for itself. Sass variables and mixins hold what is fixed at build
  time, such as breakpoints, or only feeds a token.
- **Sass modules, never `@import`.** A stylesheet loads a partial with
  `@use` and reaches its members through the namespace, or through `*` for
  an app's own toolkit; `@import` is deprecated in Dart Sass. A partial's
  private members start with `-`.
- **Breakpoints by name,** never a bare width: the site's `bp.below(sm)`, and
  the games' `below("tablet")` and the rest of `@fz/game-ui`'s mixins.
- **Nest for states and parts** (`&:hover`, `&::before`, `> span`), no more
  than three levels deep, which stylelint enforces. Rules whose order
  decides the cascade, such as media queries that override one another,
  stay flat and together, in order.
- **`@keyframes` used by several components are declared once, globally.**
  Angular renames a component's own `@keyframes`, and the animations using
  them, after the component, so one used by a single component may sit in
  its stylesheet, as the libraries' do.
- **Comment with `//`.** Sass drops it; a `/* */` comment ships, and inside
  a nested rule it even leaves an empty rule behind.
