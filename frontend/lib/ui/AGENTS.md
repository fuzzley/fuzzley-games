# @fz/ui

The `@fz/ui` library (`frontend/lib/ui`): the Angular components, services
and tokens the site and the games share, so each app's frame looks and
behaves alike. Its styles come from `@fz/style`
([frontend/lib/style/AGENTS.md](../style/AGENTS.md)), which it depends on.
The frontend's rules, in [frontend/AGENTS.md](../../AGENTS.md), and the
repository's, in [.agents/AGENTS.md](../../../.agents/AGENTS.md), apply here
too. Paths are relative to `frontend/lib/ui/`.

## What it holds

One folder under `src/` per entry point, each with an `index.ts` that names
what it exports; an app imports it as `@fz/ui/<folder>`.

- `src/storage/`: `BROWSER_STORAGE`, the browser's `localStorage`, or `null`
  where the browser refuses it, which a service injects rather than reading
  the global, so a spec can hand it another; and `LocalStorageService`, which
  reads and writes strings and JSON through it, warning rather than throwing
  where the store is missing or refuses. What an app keeps from one visit
  to the next goes through `writeVersioned()`, which stores a version
  beside its fields, refusing a value with a `version` of its own, and
  `readVersioned()`, which reads any other version as nothing, so a change
  of shape drops what it can't read. `storedSignal({ key, version, read })`
  holds such an entry in a signal: it reads it as it is made, through the
  app's `read`, which turns what was stored, or null for nothing of that
  version, into the value, and stores every change made to it, through a
  `write` where the value isn't kept as it is, such as a set.
  `keepSaved({ key, version, save, restore, track })` keeps a game under
  way with them: it hands `restore` what was kept as it is called, then
  writes what `save` returns, or forgets what was kept where it returns
  null, as what `track` reads changes, or without `track` as what `save`
  reads does, and as the page is hidden or goes away. It writes on leaving
  through `keepOnLeave(save)`, which the entry doesn't export: it calls
  `save` as the page is hidden and as it goes away, until the injector it
  was called in is destroyed.
- `src/theme/`: `ThemeService`, which applies the palette in use, remembers
  it, takes up one chosen in another tab, gives, each as the palette is put
  on the page, a role's color as a signal (`role("felt")`), several roles'
  colors as one record under the keys a record of their names gives
  (`roles({ ground: "field" })`), a new record only when one of them
  changes, and whether the palette is light or dark (`mode`), offers the
  palettes as a chooser lists them (`options`), and draws the tab's icon,
  where the page links one, as the fuzzball in the palette's accent;
  `<fz-theme-menu>`, the menu a player picks one from; and
  `<fz-theme-picker>`, the same choice as radios, for a settings panel.
  `THEME_COLOR_ROLE` names the palette role the browser's own toolbar takes
  (`bar` unless an app provides another, such as `felt` for a game whose
  table runs to the top, or `null` for an app that sets it itself).
- `src/confirm/`: `ConfirmService`, whose `ask()` takes a title, a
  message, the buttons' labels and a tone (`accent`, or `danger` for what
  can't be undone) and resolves to the player's answer; and
  `<fz-confirm-dialog>`, the alert dialog that shows it, which an app puts
  in its root template once. Cancel comes first, so the dialog focuses it,
  and Escape or a click outside answers no. It wears `@fz/style`'s
  `.fz-button` classes, on a card of its `--fz-float`.
- `src/announcer/`: `AnnouncerService`, whose `say()` tells a screen reader
  what the page just did, such as what a move did; and `<fz-announcer>`,
  the polite live region that says it, which an app puts in its root
  template once, so it is in the page before the first words, and once more
  in each modal dialog that speaks while open: a modal hides the page behind
  it from a screen reader, and a closed one hides its own region. The same
  words said twice end the second time with a no-break space, so a screen
  reader says them again. Words said before any region has rendered, such
  as a game taken up as the app starts, wait until a region has been in the
  page a moment (`ARRIVAL_MS`), as a screen reader doesn't announce a region
  that arrives with its words; a region that arrives later holds what was
  said last from the start, so it doesn't say it again.
- `src/dialog/`: `<fz-dialog>`, which shows what it holds in a native
  modal `<dialog>`, so the browser traps focus, makes the page behind it
  inert and gives focus back on close. The host owns `open`: the dialog
  asks to close through `closed`, on Escape or a backdrop click unless
  `dismissible` is off, or on Escape alone with `closesOnBackdrop` off,
  and never closes itself. It paints only the
  backdrop, which an app tints with `--fz-dialog-backdrop`, or leaves clear
  with `backdrop="clear"` for a panel about what the page shows; the host
  styles the panel. `DialogService` says whether any `<fz-dialog>` in the
  page is open (`anyOpen`): each counts while its `open` input holds,
  `<fz-confirm-dialog>`'s among them, so an app lists none of its dialogs.
- `src/fuzzball/`: `<fz-fuzzball>`, `@fz/style`'s fuzzball drawn inline,
  its body and fur in the text's color and its eyes dark, or in
  `--fz-fuzzball-eyes` where it is set, which the wordmark and a game's own
  fuzzballs draw; 16 device pixels across or
  less, as 16 px is at about a device pixel to a CSS pixel, it leaves out
  the glints, as `fuzzballSvg()` says to. It is hidden from assistive
  technology.
- `src/icon/`: `<fz-icon name="…">`, the icons, drawn as outlines but for
  a few filled ones; `ICON_NAMES` lists them. A new icon is a name there and
  a case in the template. An icon takes the text's color. Its size comes
  from `width` and `height`, or from `--fz-icon-size`, which it inherits,
  so a fragment in one of `@fz/style`'s layers can size it too, though the
  component's unlayered `:host` outranks the fragment's own `width`. An
  outline's weight comes from `--fz-icon-stroke`.
- `src/radio_group/`: `[fzRadioGroup]`, which gives a group of
  `role="radio"` buttons one tab stop and the arrow keys, Home and End.
  Angular Aria has no radio group. The arrows move focus without choosing,
  since a choice can cost something, such as a game's rule dealing a new
  game; a group where choosing is free can use native radios instead, as
  `<fz-theme-picker>` does. `<fz-choice-list>` is a `[fzRadioGroup]` of tiles,
  drawn with `@fz/style`'s `choice-list`: a setting's choices, each its name
  over a few words of detail, each named by all its words, as a voice command
  reads it. Its `options` are `ChoiceOption<Id>` data, the shape of
  `@fz/game-ui`'s `BarChoiceOption`, so one list feeds a bar's menu too;
  `value` is the one checked, `labelledBy` and `describedBy` name the elements
  that name and describe it, and `choose` emits every press, the checked
  choice's too, for the app to decide what pressing it again does.
- `src/testing/`: what an app's specs need to drive these components, for
  its specs only: `installDialogPolyfill`, for its spec setup file, which
  gives jsdom's `<dialog>` the `showModal()`, `close()` and Escape it lacks;
  `provideMemoryStorage()`, which gives the app a store in memory for the
  browser's, a new one unless a spec hands it the `MemoryStorage` it holds,
  to store an entry in, read one back from, or hand the app again after
  `TestBed.resetTestingModule()`; `setPageVisibility(state)`, which hides
  the page or shows it again, as switching tabs does, until the test
  finishes; `figure(term)`, `figureValue(term)` and `figures()`, which read
  the figures a `<dl>` shows, such as a bar's or a result card's: the text
  of the value a term names, that value's element, or each term with its
  value, in order, looking in the element a spec hands them or else the
  whole page, and throwing when a term is missing or no `<dd>` follows it;
  and `installFakeViewport()`, which stands in for the
  `matchMedia` jsdom lacks, until the test that installs it finishes, in the
  test or a `beforeEach`, at a size a spec sets and changes, for a light
  system with no wish for less motion until a spec says otherwise
  (`setColorScheme()`, `setReducedMotion()`), pointed at with a mouse until
  a spec says a finger (`setCoarsePointer()`), at the window's pixel ratio
  until a spec zooms the page (`setPixelRatio()`), which changes
  `devicePixelRatio` and the `resolution` a query matches. Each change tells
  the queries it changes, as the browser does. It is here, not in
  `@fz/game-ui`, since `ThemeService` asks the color scheme;
  `@fz/game-ui/testing` hands it on to the games.
- `src/wordmark/`: `<fz-wordmark>`, the fuzzball in the palette's accent and
  the "Fuzzley Games" name in its own type, set in lower case as fuzzley.info
  sets its own. It is text: an app that links it puts it in its own `<a>`,
  with a `routerLink` or an `href`, and the link takes its name from it.

## How an app uses it

- **From source, never built.** An app lists `"@fz/ui": "workspace:*"` in its
  `package.json`, beside `@fz/style`, and imports the entry points `exports`
  names (`@fz/ui/theme`). Its Angular compiler compiles the library's
  components along with its own.
- **An app loads `@fz/style`'s global stylesheet.** The components read its
  tokens with `var()` and style nothing outside themselves.
- **Imports go one way.** This library imports `@fz/style` and Angular, never
  the site or a game; `yarn constraints` fails a dependency on either. Its
  testing entry imports `@testing-library/dom` too, with which `figure()`
  and `figures()` find a term, and which `package.json` declares an optional
  peer, as `@fz/game-ui` does.

## Rules

- **Everything it defines carries `fz`**: `fz-theme-menu`, `--fz-icon-stroke`.
  ESLint requires the prefix on every component and directive selector, so an
  app's own `app-` components never collide with the library's.
- **A component knows nothing of the page around it.** It reads no viewport
  width and no app's breakpoint: what changes with the layout is an input,
  such as the theme menu's `compact`, which the app binds to its own
  breakpoint. What differs between apps is an injection token with a default,
  such as `THEME_COLOR_ROLE`.
- **Relative imports name the folder or the file, without an extension**
  (`../storage`, `./theme.service`). Only bundlers load this library, unlike
  `@fz/style`'s Vite plugin, which Node does.
- **Accessibility is the component's job.** Each one meets the
  `web-game-accessibility` skill's rules by itself, so an app can't forget
  them: menus are built on Angular Aria, every control has an accessible
  name at every size, and the specs find elements by role and name.
- **The strictest compiler options.** `tsconfig.json` extends `@fz/dev`'s
  Angular preset, the strict flags and template checks every workspace is
  checked with, since each app compiles these files with its own.

## Checks

The root's `yarn lint`, `yarn typecheck` and `yarn test` run the library's
own, which `yarn workspace @fz/ui <script>` runs alone.

- **`lint`** runs ESLint (`eslint.config.js`): `@fz/dev`'s TypeScript,
  Angular and template blocks, Angular's template accessibility checks among
  them, with the `fz` selector prefix, and the `scripts()` block over
  `eslint.config.js` and `stylelint.config.js`. Then `lint:styles` runs
  stylelint with `@fz/style`'s preset.
- **`typecheck`** runs the Angular compiler's checks over the sources
  (`tsconfig.lib.json`), emitting nothing, then `tsc` over the specs
  (`tsconfig.spec.json`), the Vitest config (`tsconfig.node.json`) and the
  two lint configs from their JSDoc (`tsconfig.scripts.json`).
- **`test`** runs Vitest with jsdom and Testing Library, as the site's specs
  do; the repository's `angular-testing` skill
  ([.agents/skills/angular-testing/SKILL.md](../../../.agents/skills/angular-testing/SKILL.md))
  covers the patterns. Each spec sits
  beside the file it tests. It collects coverage too, and fails below the
  floor `vitest.config.ts` sets, which sits just under the figures and rises
  as they rise. Coverage counts `src/testing/`, as `frontend/AGENTS.md` asks
  of every library. `yarn vitest run <path>` runs one spec without coverage.
