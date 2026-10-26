# Fuzzley Games site

The `site` workspace: the Fuzzley Games portal and gallery, an Angular
single-page app built with Vite, and the build the image serves, with the
games under `/play/`. These rules are the site's. The repository's, which
apply here too, are in [.agents/AGENTS.md](../../.agents/AGENTS.md). Paths
are relative to `frontend/site/`.

## Technology Stack

- **UI:** [Angular](https://angular.dev/) (standalone components, Signals,
  zoneless change detection)
- **Build Toolchain:** [Vite](https://vitejs.dev/) + [AnalogJS Vite Angular Plugin](https://analogjs.org/)
- **Test Framework:** [Vitest](https://vitest.dev/) with jsdom
- **Language:** TypeScript (ES2022 output target) / HTML / SCSS (Dart Sass)

## Layout

- `src/app/` is the application, laid out like the Solitaire Collection's
  shell (`frontend/games/solitaire/src/ui/app/`).
  `main.ts` bootstraps it with the providers in `app.config.ts`, and
  `routes.ts` declares the pages.
- `src/app/component/` holds one folder per component, named in snake_case
  (`game_tile/game_tile.component.ts`), with its template and stylesheet.
- `src/app/model/` holds the types the site is built around, such as
  `Game`, with the pure functions over them (a game's play address, its
  screenshot, how its players and length read).
- `src/app/provider/` holds data and nothing else: the games (`games.ts`)
  and the categories. The palettes are `@fz/style`'s (`frontend/lib/style`).
  A union of ids, such as `CategoryId`, is
  derived from its list (`as const satisfies`), so the two can't disagree.
- `src/app/service/` holds the injectable services. `GameCatalog` answers
  every question about the games (find, group, search, which are new);
  components ask it rather than importing the data, and specs give it a
  small catalog of their own through `CATALOG_DATA`. The palette's
  `ThemeService` and the theme menu are `@fz/ui`'s (`frontend/lib/ui`),
  shared with the games, and so are the icons and the wordmark.
- `src/app/testing/` holds what specs share, such as `TEST_CATALOG` and
  `provideTestCatalog()`. The app's tsconfig leaves it out.
- `src/app/styles/` holds the one global stylesheet, `global.scss`, and
  the Sass partials it and the components `@use`. `global.scss` loads
  `@fz/style`'s shared one first (the palettes and the other tokens, the
  reset and the element defaults, in cascade layers that any rule of the
  site's own wins over), then `_layout.scss` (the page's width and gutter)
  and `_shared.scss` (the few classes components share that aren't
  `@fz/style`'s, such as `.page`; a button is `.fz-button` and a badge
  `.fz-badge`).
  `_breakpoints.scss` (`below(sm | md | lg | xl)`) is for the components,
  and `breakpoints.ts` gives the same widths to one that binds an input to
  them, as the header does the theme menu's `compact`; its spec keeps the
  two in step.
- Every spec sits beside the file it tests, named after it.
- `public/` is copied into the build as is, including the runtime config
  placeholder `env.js` and `thumbnails/<slug>.svg`, the drawing of each
  game still to come. A hosted game's thumbnail is its build's own
  screenshot. The build fails if either is missing. The games are put
  into `public/play/`, which git ignores.
- `games.json` lists each game's build: a workspace, by its folder in
  `frontend/` (`games/minesweeper`), or one build pinned from its
  repository's `site-build` release. `tools/` holds the scripts that put
  the games in `public/play/` before every build (`fetch-games.mjs`), move
  the pins (`update-games.mjs`), and add the analytics tags to each game's
  page, with what they share in `script.mjs`, and the site's Vite plugins
  in `vite-plugins.ts`. `vite.config.ts` also adds `@fz/style`'s
  `fuzzleyStyle()`, which makes `/theme.js`, the first script `index.html`
  loads, which picks the palette before the page paints, from the same list
  of palettes the app imports, so the two can't drift. `docs/operations.md`
  covers the details.
- A script exports its logic as functions and runs only when it is the
  file Node was started with (`if (import.meta.main)`), so
  `tools/*.spec.ts` can import and test it. A dependency a test needs to
  replace, such as `fetch`, is a parameter with the real one as default.
- `dist/` is the build the image serves: the site, with the games under
  `play/`.

## Checks

The root's `yarn lint`, `yarn typecheck` and `yarn test` run the site's
own, which `yarn workspace site <script>` runs alone.

- **`lint`** runs ESLint over `src`, `tools` and `vite.config.ts`, then
  `lint:styles`. The ESLint config, `eslint.config.js`, is `@fz/dev`'s
  blocks (`frontend/lib/dev/AGENTS.md`): typescript-eslint's strict and
  stylistic type-checked rules, explicit return types on exported functions
  and public methods, `import type` for type-only imports, Angular's
  recommended and template accessibility rules, and JSDoc types on every
  script. Each file is type-checked with the
  tsconfig that includes it, found through the solution in `tsconfig.json`.
- **`lint:styles`** runs stylelint over every stylesheet with `@fz/style`'s
  preset (`stylelint.config.js`): the standard SCSS rules, no hex, named or
  functional color at all, no `@import`, nesting at most three deep.
- **`typecheck`** runs the Angular compiler's checks over the app, emitting
  nothing, then `tsc` over the specs (`tsconfig.spec.json`), over
  `vite.config.ts` (`tsconfig.node.json`), and over the `tools` scripts from
  their JSDoc (`tsconfig.scripts.json`), each extending `@fz/dev`'s
  compiler options.
- **`test`** runs Vitest once, with coverage, and fails below the floors
  the `test` block of `vite.config.ts` sets, one for the app and one for
  the tools. The site's `vitest-testing` skill, in `.agents/skills/`,
  covers its setup and its specs' patterns.

## Angular & Styling

- **Templates bind, they do not compute.** Expose a `computed()` view model
  instead of calling a method from a template, which re-runs on every change
  detection pass, or working out a label, a comparison or a plural there.
  Wording that depends on data ("1 game", "2–4 players") comes from the
  `describe*` functions in `src/app/model/game.ts`. An ICU plural would
  need `@angular/localize` at runtime (`$localize`), which the site doesn't
  load.
- **Colors come from the palette.** Anything that should follow the theme
  reads a palette role with `var()`, as `var(--fz-accent)`; stylelint
  rejects a color written anywhere else. The palettes are `@fz/style`'s,
  shared with the games, so a new role goes there, in every palette at
  once (`frontend/lib/style/AGENTS.md`).
- **`@keyframes` are global.** Angular's emulated encapsulation rewrites
  selectors, not at-rule names, so two components defining the same animation
  name silently overwrite each other. Declare them once, in a partial that
  `src/app/styles/global.scss` uses.
- **Accessibility helpers.** The rules are the `web-game-accessibility`
  skill's; these are the site's means to them.
  - An icon-only button gets a label only screen readers read, from
    `@fz/style`'s global `.fz-visually-hidden` class, or, to hide it only
    at some widths, its `visually-hidden` mixin: `@use "@fz/style" as fz;`
    then `@include fz.visually-hidden;`.
  - A page tells a screen reader what changed with `@fz/ui`'s
    `AnnouncerService.say()`, through the one `<fz-announcer>` in the root
    template, which is in the page from the start. The home page says what
    each search found, and clears it when it goes, since the region
    outlives every page.
  - Menus and pickers are built on Angular Aria (`@angular/aria`), not by
    hand: `@fz/ui`'s theme menu is an `ngMenuTrigger` button opening an
    `ngMenu` of `menuitemradio` items.
    Bind `aria-checked` yourself (Angular Aria sets the role, not the checked
    state), and give each item a `searchTerm`, or typing a name finds
    nothing.

## Sass

Every stylesheet is SCSS, compiled by Dart Sass (`sass`).

- **Modules, never `@import`.** A stylesheet loads a partial with `@use`
  and reaches its members through the namespace:
  `@use "../../styles/breakpoints" as bp;` then `@include bp.below(sm)`.
  `@import` is deprecated in Dart Sass. A partial's private members start
  with `-`.
- **Runtime values are custom properties; build-time values are Sass.**
  Palette colors and `--gutter` change while the page runs, so they are CSS
  custom properties read with `var()`, and so are `@fz/style`'s other
  tokens, such as `var(--fz-shadow-raised)`, so a part of a page can change
  one. Sass variables and mixins hold what is fixed at build time:
  breakpoints and the visually-hidden rules. A custom property of the
  site's own has no prefix; `--fz-` marks `@fz/style`'s.
- **Breakpoints by name.** `@include bp.below(sm) { … }`, never a bare
  `max-width`; the widths live in `_breakpoints.scss`.
- **Nest for states and parts** (`&:hover`, `&::before`, `> span`), no more
  than three levels deep. Rules whose order decides the cascade, such as
  media queries that override one another, stay flat and together, in
  order.
- **`//` comments.** Sass drops them from the output; a `/* */` comment
  ships, and inside a nested rule it even leaves an empty rule behind.
- **Icons are `@fz/ui`'s `<fz-icon name="…">`.** A new icon is a new name
  in `ICON_NAMES` and a case in `IconComponent`'s template, in
  `frontend/lib/ui/src/icon/`, never an `<svg>` pasted into another
  template. The parent sizes it (`width`/`height` on `fz-icon`, or
  `--fz-icon-size`) and colors it (`color`); `--fz-icon-stroke` sets an
  outline's weight. Icons
  are hidden from assistive technology, so the text beside one, or the
  control's label, says what it means.
- **Visible state is announced state.** A control that looks selected carries
  `aria-checked`/`aria-current`/`aria-pressed`. See the
  `web-game-accessibility` skill.
